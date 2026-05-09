/**
 * @file _layout.tsx — root layout for the whole app.
 * @module app
 *
 * Composition order (outermost → innermost):
 *   SafeAreaProvider → QueryClientProvider → StatusBar + Stack.
 * Keep this thin — page screens own their own state. Providers added
 * here must be required by every screen; per-feature providers go in
 * their own subtree.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

// Why: 60s default cache + single retry matches CLAUDE.md TanStack defaults.
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
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
