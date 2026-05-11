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
import { useEffect } from 'react';

import { auth, supabase } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

const log = createLogger('AUTH');

export function useAuthListener(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const markHydrated = useAuthStore((s) => s.markHydrated);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    let cancelled = false;
    log.info('Auth listener subscribed');

    void (async () => {
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
      log.info('Sign-out cleanup done (auth + onboarding cleared)');
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setSession, setProfile, markHydrated, clear]);
}
