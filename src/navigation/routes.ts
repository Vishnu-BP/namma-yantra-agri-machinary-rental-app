/**
 * @file routes.ts — route path constants + helpers.
 * @module src/navigation
 *
 * Three levels of structure:
 *   Level 0 — root dispatcher (`/`)
 *   Level 1 — top-level route groups (onboarding / auth / renter / owner)
 *   Level 2 — screens within each group
 *
 * `as const` preserves literal types so expo-router's typed-routes
 * inference (from `experiments.typedRoutes: true` in app.json) accepts
 * these wherever it accepts string literals.
 */
import type { Profile } from '@/types/database';

import type { ViewMode } from '@/stores/authStore';

export const ROUTES = {
  // ─── Level 0: root dispatcher ───────────────────────────────────────
  ROOT: '/',

  // ─── Level 1: pre-auth groups ───────────────────────────────────────
  ONBOARDING: '/(onboarding)',
  AUTH: {
    INDEX: '/(auth)',
    ROLE_SELECT: '/(auth)/role-select',
  },

  // ─── Level 1: post-auth groups ──────────────────────────────────────
  RENTER: {
    HOME: '/(renter)',
    // L2 will add: DISCOVER, BOOKINGS, PROFILE.
  },
  OWNER: {
    // Why: owner's first visible tab is now Requests (Machines tab was
    // removed; listings live behind a Profile-screen button). Direct the
    // home route to /requests so the user lands on a real tab, not on
    // the hidden /listings index.
    HOME: '/(owner)/requests',
    LISTINGS: '/(owner)/listings',
  },
} as const;

/**
 * Resolve which post-auth shell a given user should land in.
 *
 * - If the user has explicitly chosen a `viewMode` (via the Profile toggle),
 *   that wins.
 * - Otherwise, fall back to their DB role: owners go owner-side, everyone
 *   else (renter or both) goes renter-side. This matches pre-existing
 *   default behavior.
 *
 * Pure function — no React, no router, no store. Caller passes both inputs.
 */
export function getHomeRoute(profile: Profile, viewMode: ViewMode): string {
  const effective: 'owner' | 'renter' =
    viewMode ?? (profile.role === 'owner' ? 'owner' : 'renter');
  return effective === 'owner' ? ROUTES.OWNER.HOME : ROUTES.RENTER.HOME;
}
