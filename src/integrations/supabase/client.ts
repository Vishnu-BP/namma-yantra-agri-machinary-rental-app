/**
 * @file client.ts — Supabase client singleton for the React Native app.
 * @module src/integrations/supabase
 *
 * The single place in the codebase that imports `@supabase/supabase-js`
 * (per CLAUDE.md folder rules). Every other file uses the `supabase`
 * named export via the folder barrel: `import { supabase } from '@/integrations/supabase'`.
 *
 * Why this lives in src/integrations/, not src/lib/:
 * - CLAUDE.md: src/lib/ is pure (no React, no Supabase, no Expo APIs).
 * - This file pulls in @supabase/supabase-js + AsyncStorage (Expo) — both
 *   are integration-layer dependencies, not pure utilities.
 *
 * Why throw at module load on missing env vars:
 * - Fail-fast: a misconfigured client should never silently degrade and
 *   cause confusing 401s deeper in the app. The error message tells the
 *   developer exactly what to fix in `.env`.
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Why: these are the two non-optional env vars. App can't run without them.
  throw new Error(
    'Missing Supabase env vars. Check `.env` for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Why: detectSessionInUrl is a web/oauth concern; RN never sees session in URL.
    detectSessionInUrl: false,
  },
});
