/**
 * @file authStore.ts — single source of truth for "who is logged in."
 * @module src/stores
 *
 * Holds the current Supabase session, the matching profile row (if any),
 * and an `isHydrated` flag that screens read to know when the initial
 * session-check completes (so we don't flash auth screen for a logged-in
 * user on cold start).
 *
 * Why no persistence here:
 * - Supabase already persists the session via AsyncStorage in
 *   `src/integrations/supabase/client.ts`. Re-persisting would risk drift.
 * - The profile is server-derived; refetched on every auth state change
 *   via `useAuthListener`.
 */
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isHydrated: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  markHydrated: () => void;
  clear: () => void;
}

/**
 * Zustand store. Subscribe via `useAuthStore(s => s.session)` etc.
 * Mutating actions are stable references — safe in dependency arrays.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isHydrated: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  markHydrated: () => set({ isHydrated: true }),
  clear: () => set({ session: null, profile: null }),
}));
