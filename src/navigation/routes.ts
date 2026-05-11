/**
 * @file routes.ts — route path constants, organized hierarchically.
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
    HOME: '/(owner)',
    // L3-L4 will add: REQUESTS, ADD_MACHINE, LISTINGS.
  },
} as const;
