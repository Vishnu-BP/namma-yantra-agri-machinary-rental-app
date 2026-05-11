/**
 * @file index.tsx — root routing dispatcher.
 * @module app
 *
 * Renders nothing of its own; just inspects auth + onboarding state and
 * `<Redirect>`s to the right route group via the pure
 * `computeRootRoute` function from `@/navigation`. The companion
 * `useNavigationGuard` hook (mounted in _layout.tsx) handles redirects
 * triggered by state changes after the initial render.
 */
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { createLogger } from '@/lib/logger';
import { computeRootRoute } from '@/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { colors } from '@/theme/colors';

const log = createLogger('NAV');

export default function Index() {
  const isAuthHydrated = useAuthStore((s) => s.isHydrated);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);

  const decision = computeRootRoute({
    isAuthHydrated,
    session,
    profile,
    hasSeenOnboarding,
  });

  // Why: stable string key so the effect only fires on actual target changes.
  const target =
    decision.kind === 'redirect' ? decision.href : 'splash';

  useEffect(() => {
    log.info('Routing target', { target });
  }, [target]);

  if (decision.kind === 'splash') {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Why: dispatcher returns a plain string for purity; expo-router's
  // Href is a typed-routes union — cast at this single boundary.
  return (
    <Redirect href={decision.href as Parameters<typeof Redirect>[0]['href']} />
  );
}
