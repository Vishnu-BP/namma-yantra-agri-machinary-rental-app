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
 *
 * Also hosts the app-wide Toaster (sonner-native) and offline banner
 * so they render above all routes without needing per-screen wiring.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';

import '../global.css';
import '@/lib/i18n';
import '@/lib/nativewind-interop';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthListener } from '@/hooks/useAuthListener';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
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
        <ErrorBoundary>
          <RootStack />
        </ErrorBoundary>
        <Toaster />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// Why: separate component so `useAuthListener` runs inside the
// QueryClientProvider tree (in case a future TanStack-backed listener
// gets added) without polluting the providers themselves. The navigation
// guard runs alongside it — it reacts to store changes and replaces the
// route whenever the dispatcher's decision changes.
function RootStack() {
  useAuthListener();
  useNavigationGuard();
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      if (offline !== isOffline) {
        log.info('Network state changed', { isConnected: state.isConnected });
      }
      setIsOffline(offline);
    });
    return unsubscribe;
  }, [isOffline]);

  return (
    <>
      <StatusBar style="dark" />
      {isOffline && (
        <View className="bg-error px-4 py-2 items-center">
          <Text className="text-white text-xs font-medium">{t('errors.offline')}</Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
