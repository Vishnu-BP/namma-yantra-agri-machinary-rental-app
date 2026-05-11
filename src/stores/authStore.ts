/**
 * @file authStore.ts — single source of truth for "who is logged in."
 * @module src/stores
 *
 * Holds the current Supabase session, the matching profile row (if any),
 * an `isHydrated` flag that screens read to know when the initial
 * session-check completes (so we don't flash auth screen for a logged-in
 * user on cold start), and a `viewMode` preference that lets users flip
 * between renter and owner UI without changing their DB role.
 *
 * Why no persistence here:
 * - Supabase already persists the session via AsyncStorage in
 *   `src/integrations/supabase/client.ts`. Re-persisting would risk drift.
 * - The profile is server-derived; refetched on every auth state change
 *   via `useAuthListener`.
 * - `viewMode` IS persisted to AsyncStorage, but the read happens in
 *   `useAuthListener` on boot; the store just holds the in-memory copy.
 */
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { Profile } from '@/types/database';

export type ViewMode = 'owner' | 'renter' | null;

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isHydrated: boolean;
  viewMode: ViewMode;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  markHydrated: () => void;
  setViewMode: (mode: ViewMode) => void;
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
  viewMode: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  markHydrated: () => set({ isHydrated: true }),
  setViewMode: (viewMode) => set({ viewMode }),
  clear: () => set({ session: null, profile: null, viewMode: null }),
}));
