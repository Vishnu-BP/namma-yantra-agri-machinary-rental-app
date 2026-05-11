/**
 * @file dispatcher.ts — pure routing decision.
 * @module src/navigation
 *
 * Given the current auth + onboarding + profile + view-mode state, decide
 * whether the user should see a splash spinner or be redirected to a
 * specific route. No React, no router — just data in, decision out.
 * Used by both `app/index.tsx` (initial render) and `useNavigationGuard`
 * (state-change reaction).
 *
 * Why `href` is `string` and not `Href`:
 * - expo-router's `Href` type is generated per-project from the typed-
 *   routes manifest. Constraining the dispatcher to it would couple a
 *   pure utility to framework codegen. Callers cast at the boundary.
 */
import type { Session } from '@supabase/supabase-js';

import type { ViewMode } from '@/stores/authStore';
import type { Profile } from '@/types/database';

import { getHomeRoute, ROUTES } from './routes';

export type DispatcherState = {
  isAuthHydrated: boolean;
  hasSeenOnboarding: boolean;
  session: Session | null;
  profile: Profile | null;
  viewMode: ViewMode;
};

export type RouteDecision =
  | { kind: 'splash' }
  | { kind: 'redirect'; href: string };

/**
 * Compute the target route for the root dispatcher / navigation guard.
 *
 * Decision order (top match wins) — session check is FIRST so an
 * existing user with a persisted session goes straight to home and
 * never sees onboarding on cold start:
 *   1. Auth not hydrated                      → splash
 *   2. session + profile                      → getHomeRoute(profile, viewMode)
 *   3. session, no profile                    → /(auth)/role-select
 *   4. no session, !hasSeenOnboarding         → /(onboarding)
 *   5. no session, hasSeenOnboarding          → /(auth)
 */
export function computeRootRoute(state: DispatcherState): RouteDecision {
  if (!state.isAuthHydrated) {
    return { kind: 'splash' };
  }
  if (state.session && state.profile) {
    return { kind: 'redirect', href: getHomeRoute(state.profile, state.viewMode) };
  }
  if (state.session) {
    return { kind: 'redirect', href: ROUTES.AUTH.ROLE_SELECT };
  }
  if (!state.hasSeenOnboarding) {
    return { kind: 'redirect', href: ROUTES.ONBOARDING };
  }
  return { kind: 'redirect', href: ROUTES.AUTH.INDEX };
}
