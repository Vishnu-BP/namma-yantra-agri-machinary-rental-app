/**
 * @file _layout.tsx — root layout for the whole app.
 * @module app
 *
 * Mounts (outermost → innermost):
 *   SafeAreaProvider → QueryClientProvider → useAuthListener → StatusBar + Stack.
 *
 * `useAuthListener` runs on every app start to hydrate `authStore` from
 * the persisted Supabase session and subscribe to subsequent auth events.
 * Page screens read from the store; this layout never renders them itself.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';
import { useAuthListener } from '@/hooks/useAuthListener';
import { createLogger } from '@/lib/logger';

const log = createLogger('NAV');

// Why: anchors every session in the log stream — first line per cold start.
log.info('App booted');

// Why: force-hide the native splash once the JS app has mounted. Without
// this, expo-splash-screen on SDK 54 can leave the splash visible when the
// first route renders inside conditional branches (our dispatcher).
void SplashScreen.hideAsync().catch(() => {
  // Splash may have been hidden already — safe to ignore.
});

// Why: 60s default cache + single retry per CLAUDE.md TanStack defaults.
// Per-query overrides (bookings = 0s, single = 30s) live in their hooks.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootStack />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// Why: separate component so `useAuthListener` runs inside the
// QueryClientProvider tree (in case a future TanStack-backed listener
// gets added) without polluting the providers themselves.
function RootStack() {
  useAuthListener();
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
