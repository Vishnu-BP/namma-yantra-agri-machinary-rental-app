/**
 * @file auth/callback.tsx — OAuth deep-link handler.
 * @module app
 *
 * After OAuth completes, the provider redirects to
 *   exp://<host>/--/auth/callback?code=...      (PKCE flow)
 *   exp://<host>/--/auth/callback#access_token=... (implicit flow)
 *
 * On Expo Go that URL is delivered to the app via deep linking rather
 * than captured by WebBrowser.openAuthSessionAsync (Expo Go intercepts
 * `exp://` schemes at the OS level). This route receives the params,
 * finalizes the Supabase session, and bounces to the root dispatcher.
 *
 * Why a separate route + the duplicate logic from auth.ts:
 * - auth.ts's path runs in standalone builds where WebBrowser cleanly
 *   captures the redirect.
 * - This route is the safety net for Expo Go.
 * - We check for an existing session first to avoid double-exchanging
 *   a one-time code.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { auth, supabase } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';

const log = createLogger('AUTH');

type CallbackParams = {
  code?: string;
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

/**
 * Pull tokens/code/error from the current URL's #fragment on web.
 * Some OAuth providers and Supabase's implicit flow return data in the
 * fragment (`#access_token=...&...`) rather than the query string, and
 * `useLocalSearchParams` only reads the query side. Returns empty fields
 * on native (no `window`) and when the fragment has none of the expected
 * keys.
 */
/**
 * After a successful sign-in (session is set in the supabase client),
 * fetch the profile and navigate to the right destination. Existing user
 * with a profile → their role's home. Fresh user → role-select.
 * Mirrors the helper in (auth)/index.tsx so the OAuth callback navigates
 * correctly without relying on a guard or app/index.tsx dispatcher.
 */
async function navigateAfterAuth(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    log.warn('OAuth callback: no session after sign-in');
    router.replace('/(auth)');
    return;
  }
  const profile = await auth.getProfile(session.user.id);
  useAuthStore.setState({ session, profile });
  if (!profile) {
    router.replace('/(auth)/role-select');
    return;
  }
  router.replace(profile.role === 'owner' ? '/(owner)' : '/(renter)');
}

function readFragmentParams(): CallbackParams {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return {};
  const sp = new URLSearchParams(hash);
  return {
    code: sp.get('code') ?? undefined,
    access_token: sp.get('access_token') ?? undefined,
    refresh_token: sp.get('refresh_token') ?? undefined,
    error: sp.get('error') ?? undefined,
    error_description: sp.get('error_description') ?? undefined,
  };
}

export default function OAuthCallback() {
  const queryParams = useLocalSearchParams<CallbackParams>();

  useEffect(() => {
    log.info('OAuth callback: page entered');
    void (async () => {
      try {
        // If a session is already set (auth.ts path won the race),
        // skip the redundant work and bounce straight to root.
        const {
          data: { session: existing },
        } = await supabase.auth.getSession();
        if (existing) {
          log.info('OAuth callback: session already present, bouncing');
          await navigateAfterAuth();
          return;
        }

        // Why: merge query-string params with URL-fragment params. PKCE flow
        // returns `?code=...` (caught by useLocalSearchParams). Implicit flow
        // returns `#access_token=...` (only readable via window.location.hash
        // on web). Checking both makes the callback resilient to whichever
        // flow Supabase / the provider chose.
        const fragmentParams = readFragmentParams();
        const params: CallbackParams = {
          code: queryParams.code ?? fragmentParams.code,
          access_token:
            queryParams.access_token ?? fragmentParams.access_token,
          refresh_token:
            queryParams.refresh_token ?? fragmentParams.refresh_token,
          error: queryParams.error ?? fragmentParams.error,
          error_description:
            queryParams.error_description ?? fragmentParams.error_description,
        };

        if (params.error) {
          log.error('OAuth callback returned error', {
            error: params.error,
            description: params.error_description,
          });
          router.replace('/(auth)');
          return;
        }

        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            params.code
          );
          if (error) throw error;
          log.info('OAuth callback: PKCE exchanged');
          await navigateAfterAuth();
          return;
        }

        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
          log.info('OAuth callback: implicit session set');
          await navigateAfterAuth();
          return;
        }

        log.warn('OAuth callback: no code, tokens, or error in URL');
        router.replace('/(auth)');
      } catch (err) {
        log.error('OAuth callback finalize failed', err);
        router.replace('/(auth)');
      }
    })();
  }, [
    queryParams.code,
    queryParams.access_token,
    queryParams.refresh_token,
    queryParams.error,
    queryParams.error_description,
  ]);

  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
