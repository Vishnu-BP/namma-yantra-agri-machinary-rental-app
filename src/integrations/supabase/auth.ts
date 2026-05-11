/**
 * @file auth.ts — pure auth API wrappers.
 * @module src/integrations/supabase
 *
 * Thin functions over `supabase.auth.*` plus an OAuth flow helper that
 * routes through `expo-auth-session` so it works in Expo Go (Expo's
 * proxy) and in standalone builds (custom scheme). Every wrapper logs
 * via the tagged `AUTH` logger and rethrows so callers can present
 * inline error messages.
 *
 * No React. No Zustand. The `useAuthListener` hook in src/hooks owns
 * the side effects of binding session/profile state to the app store.
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { createLogger } from '@/lib/logger';
import type { Profile, ProfileInsert } from '@/types/database';

import { supabase } from './client';

// Required at module load so a deep-link arrival completes the
// in-flight WebBrowser auth session if the OS resumes the app.
WebBrowser.maybeCompleteAuthSession();

const log = createLogger('AUTH');

type OAuthProvider = 'google' | 'github';

// ─── OTP (email) ──────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to the user's email. Auto-creates the auth user
 * if the email is new (Supabase default `shouldCreateUser: true`).
 */
export async function sendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    log.error('sendOtp failed', error);
    throw error;
  }
  log.info('Send-OTP API resolved');
}

/**
 * Verify the 6-digit code the user just entered. Sets the session on
 * success; the auth listener picks it up and triggers profile fetch.
 */
export async function verifyOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) {
    log.error('verifyOtp failed', error);
    throw error;
  }
  log.info('Verify-OTP API resolved');
}

// ─── OAuth (Google + GitHub) ──────────────────────────────────────────

/**
 * Run the OAuth flow for the given provider via expo-auth-session.
 * Handles both PKCE (`?code=...`) and implicit (`#access_token=...`)
 * callbacks so we work regardless of provider config.
 *
 * @returns `true` on a completed sign-in, `false` if the user dismissed
 *   the in-app browser (so the caller knows not to navigate away).
 */
async function signInWithProvider(provider: OAuthProvider): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Why: web uses the redirect flow — Supabase navigates the whole tab
    // to the OAuth provider; after grant, the browser returns to
    // /auth/callback?code=... and our callback route exchanges the code.
    // Default `skipBrowserRedirect: false` lets Supabase do the
    // window.location.href navigation for us. WebBrowser.openAuthSessionAsync
    // (the native path below) doesn't work reliably on web — popup blockers
    // and cross-origin restrictions make result.type rarely === 'success'.
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      log.error(`signInWith ${provider} initiation failed`, error);
      throw error;
    }
    // The page is about to unload; the caller won't see this return value.
    // Returning true documents intent ("we did our part successfully").
    return true;
  }

  // ─── Native (mobile dev build / standalone APK) ────────────────────
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'nammayantra',
    path: 'auth/callback',
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUri,
      // Why: we open the browser ourselves so we can observe the redirect.
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    log.error(`signInWith ${provider} initiation failed`, error);
    throw error ?? new Error('No OAuth URL returned from Supabase');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type !== 'success' || !result.url) {
    log.warn(`OAuth flow ended without success for ${provider}`, {
      type: result.type,
    });
    return false;
  }

  const callback = new URL(result.url);

  // PKCE code-flow: exchange the code for a session.
  const code = callback.searchParams.get('code');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      log.error(`exchangeCodeForSession failed (${provider})`, exchangeError);
      throw exchangeError;
    }
    log.info(`Signed in via ${provider} (PKCE)`);
    return true;
  }

  // Implicit flow: tokens arrive in the URL fragment.
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');

  if (accessToken && refreshToken) {
    const { error: setError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (setError) {
      log.error(`setSession failed (${provider})`, setError);
      throw setError;
    }
    log.info(`Signed in via ${provider} (implicit)`);
    return true;
  }

  throw new Error(`OAuth callback for ${provider} contained neither code nor tokens`);
}

export const signInWithGoogle = (): Promise<boolean> => signInWithProvider('google');
export const signInWithGitHub = (): Promise<boolean> => signInWithProvider('github');

// ─── Sign-out ─────────────────────────────────────────────────────────

/** Tear down the current session. Auth listener clears the store. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    log.error('signOut failed', error);
    throw error;
  }
  log.info('Sign-out API resolved');
}

// ─── Profile ──────────────────────────────────────────────────────────

/**
 * Read the profile row for `userId`. Returns null if the row doesn't
 * exist yet (used to detect fresh users who still need role-select).
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    log.error('getProfile failed', error);
    throw error;
  }
  return data;
}

/**
 * Insert a brand-new profile row. Called from role-select after a fresh
 * sign-in. RLS enforces `auth.uid() = id`.
 */
export async function createProfile(input: ProfileInsert): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert(input)
    .select('*')
    .single();
  if (error) {
    log.error('createProfile failed', error);
    throw error;
  }
  return data;
}
