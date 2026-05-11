/**
 * @file useNavigationGuard.ts — react to auth/onboarding/viewMode changes by re-routing.
 * @module src/hooks
 *
 * Mounted once at the app root (in `app/_layout.tsx`, after `useAuthListener`).
 * Subscribes to authStore + onboardingStore via Zustand selectors and runs
 * the pure `computeRootRoute()` decision on every change. If the dispatcher's
 * answer differs from the route group the user is currently in, the guard
 * fires `router.replace()`.
 *
 * Why this exists:
 * - `app/index.tsx` only renders when the user is sitting on the root route.
 *   After signing in, the user navigates away from `/` to a tab shell — but
 *   if `app/(auth)/index.tsx` ALSO does its own `router.replace()`, we get a
 *   race between the manual call and the dispatcher's reaction.
 * - This guard centralizes all post-auth routing in ONE place. Auth screens
 *   no longer need to know where the user should land — they just sign the
 *   user in (or out) and the guard handles navigation.
 *
 * Why `useSegments()` not `usePathname()`:
 * - `usePathname()` strips route groups, so `/(renter)/profile` reads as
 *   `/profile` — indistinguishable from `/(owner)/profile`. Toggling view
 *   mode from one to the other would look like a no-op.
 * - `useSegments()` keeps the parens, so we can compare the active group.
 */
import { router, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { createLogger } from '@/lib/logger';
import { computeRootRoute } from '@/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

const log = createLogger('NAV');

/**
 * Map a target href like `/(renter)` to its segment token (`(renter)`).
 * Returns `null` if the href doesn't include a route group.
 */
function targetGroup(href: string): string | null {
  const match = href.match(/^\/(\([^)]+\))/);
  return match ? match[1] : null;
}

/**
 * Re-evaluate the dispatcher whenever auth/onboarding/viewMode changes
 * and call `router.replace()` if the active route group differs from the
 * dispatcher's target. No-op if the dispatcher returns 'splash'.
 */
export function useNavigationGuard(): void {
  const isAuthHydrated = useAuthStore((s) => s.isHydrated);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const viewMode = useAuthStore((s) => s.viewMode);
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);

  const segments = useSegments();
  // Why: prevent infinite loops if a route briefly disappears mid-transition.
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const decision = computeRootRoute({
      isAuthHydrated,
      session,
      profile,
      viewMode,
      hasSeenOnboarding,
    });

    if (decision.kind !== 'redirect') return;

    const target = decision.href;
    const targetSeg = targetGroup(target);
    const activeSeg = segments[0] ?? null;

    // Already inside the right group — nothing to do.
    if (targetSeg && activeSeg === targetSeg) {
      lastTargetRef.current = target;
      return;
    }

    // For role-select (a leaf route under (auth)), require BOTH the group
    // and the leaf to match.
    if (target === '/(auth)/role-select') {
      if (activeSeg === '(auth)' && segments[1] === 'role-select') {
        lastTargetRef.current = target;
        return;
      }
    }

    if (lastTargetRef.current === target) return;
    lastTargetRef.current = target;

    log.info('Guard: replacing route', { from: segments.join('/'), to: target });
    router.replace(target as Parameters<typeof router.replace>[0]);
  }, [isAuthHydrated, session, profile, viewMode, hasSeenOnboarding, segments]);
}
