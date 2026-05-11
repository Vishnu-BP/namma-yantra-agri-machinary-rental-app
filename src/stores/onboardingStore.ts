/**
 * @file onboardingStore.ts — in-memory onboarding-dismissed flag.
 * @module src/stores
 *
 * One in-memory boolean: `hasSeenOnboarding`. Defaults to `false` on
 * every cold launch. Flipped to `true` when the user taps Skip /
 * Get Started in the carousel. Reset to `false` by `useAuthListener`
 * when the user signs out — so a returning logged-out user sees the
 * carousel again on the next sign-in attempt.
 *
 * Why no persistence:
 * - The desired flow is "show onboarding whenever there's no session"
 *   (fresh install, post-logout, or post-reinstall all behave the same).
 * - Persisting the flag would skip onboarding for cold starts after
 *   sign-out — the opposite of what we want.
 * - Existing users skip onboarding because the dispatcher checks
 *   `session + profile` first; the flag is irrelevant for them.
 */
import { create } from 'zustand';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  markSeen: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  markSeen: () => set({ hasSeenOnboarding: true }),
  reset: () => set({ hasSeenOnboarding: false }),
}));
