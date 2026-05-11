/**
 * @file navigate.ts — typed wrappers around expo-router's imperative API.
 * @module src/navigation
 *
 * Use these helpers instead of `router.replace('/...')` with magic
 * strings. Everything goes through `ROUTES` so changing a path means
 * editing one constant.
 *
 * In L1 the navigation guard handles most state-driven redirects, so
 * screens rarely call these directly. Imperative use cases (cross-
 * group navigation that doesn't change auth state) land in later
 * layers.
 */
import { router } from 'expo-router';

import { ROUTES } from './routes';

export const navigate = {
  toRoot: () => router.replace(ROUTES.ROOT),
  toOnboarding: () => router.replace(ROUTES.ONBOARDING),
  toAuth: () => router.replace(ROUTES.AUTH.INDEX),
  toRoleSelect: () => router.replace(ROUTES.AUTH.ROLE_SELECT),
  toRenterHome: () => router.replace(ROUTES.RENTER.HOME),
  toOwnerHome: () => router.replace(ROUTES.OWNER.HOME),
} as const;
