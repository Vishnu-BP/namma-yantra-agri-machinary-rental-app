/**
 * @file useAuthListener.ts — bind Supabase auth state to authStore.
 * @module src/hooks
 *
 * Mounts once at the app root (in `app/_layout.tsx`). On boot, fetches
 * the persisted session and the matching profile, then subscribes to
 * `onAuthStateChange` so subsequent sign-in / sign-out / token refresh
 * events stay in sync with the store.
 *
 * Why a fire-and-forget hook (returns void):
 * - The store is the public surface; consumers read from `useAuthStore`.
 * - Returning anything from this hook would tempt callers to use it
 *   like a React Query observer, which it isn't.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { auth, supabase } from '@/integrations/supabase';
import i18n from '@/lib/i18n';
import { createLogger } from '@/lib/logger';
import { useAuthStore, type ViewMode } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

const log = createLogger('AUTH');

export const VIEW_MODE_STORAGE_KEY = 'nammayantra:viewMode';

function isViewMode(v: string | null): v is Exclude<ViewMode, null> {
  return v === 'owner' || v === 'renter';
}

export function useAuthListener(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setViewMode = useAuthStore((s) => s.setViewMode);
  const markHydrated = useAuthStore((s) => s.markHydrated);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    let cancelled = false;
    log.info('Auth listener subscribed');

    void (async () => {
      // Why: hydrate the persisted view-mode preference BEFORE marking
      // hydrated, so the dispatcher's first render already knows whether
      // a 'both' user (or anyone who toggled) wants the owner shell.
      try {
        const stored = await AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (!cancelled && isViewMode(stored)) {
          setViewMode(stored);
          log.info('viewMode hydrated', { viewMode: stored });
        }
      } catch (err) {
        log.error('viewMode hydrate failed', err);
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) log.error('getSession on hydrate failed', error);

      setSession(session);

      if (session?.user) {
        try {
          const profile = await auth.getProfile(session.user.id);
          if (!cancelled) {
            setProfile(profile);
            if (profile?.preferred_language) {
              void i18n.changeLanguage(profile.preferred_language);
            }
            log.info('Profile loaded', { hasProfile: !!profile });
          }
        } catch (err) {
          log.error('getProfile on hydrate failed', err);
          if (!cancelled) setProfile(null);
        }
      } else {
        setProfile(null);
      }

      if (!cancelled) markHydrated();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      log.info('Auth event', { event, hasSession: !!session });

      if (session?.user) {
        // Why: load profile BEFORE writing to the store, then set both
        // fields in a single Zustand `setState` call. If we set session
        // first and profile after the await, the navigation guard would
        // see the intermediate {session: set, profile: null} state and
        // briefly redirect existing users to /(auth)/role-select before
        // the profile loaded. One atomic update = one guard re-run = no
        // flash. Existing users go straight to home; fresh users (whose
        // getProfile resolves to null) land on role-select cleanly.
        try {
          const profile = await auth.getProfile(session.user.id);
          useAuthStore.setState({ session, profile });
          if (profile?.preferred_language) {
            void i18n.changeLanguage(profile.preferred_language);
          }
          log.info('Profile loaded', { hasProfile: !!profile });
        } catch (err) {
          log.error('getProfile on state change failed', err);
          useAuthStore.setState({ session, profile: null });
        }
        return;
      }

      // Why: signed out → reset onboarding so the next pre-auth flow
      // starts with the carousel (matches Vishnu-set flow: fresh user,
      // post-logout, and post-reinstall all see onboarding again).
      clear();
      useOnboardingStore.getState().reset();
      void AsyncStorage.removeItem(VIEW_MODE_STORAGE_KEY).catch(() => {
        // Best-effort cleanup; if storage is unavailable we already
        // cleared the in-memory copy via clear().
      });
      log.info('Sign-out cleanup done (auth + onboarding cleared)');
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setSession, setProfile, setViewMode, markHydrated, clear]);
}
