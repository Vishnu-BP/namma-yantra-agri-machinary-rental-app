/**
 * @file LoadingState.tsx — full-bleed loading indicator.
 * @module src/components/ui
 *
 * Default state for any data-fetch screen. Real skeleton loaders land in
 * the L7 polish sweep; this primitive is a deliberate placeholder so
 * every list/detail can adopt the same name now and be upgraded later
 * without touching each screen.
 */
import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface LoadingStateProps {
  subtitle?: string;
}

export function LoadingState({ subtitle }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <ActivityIndicator color={colors.primary} />
      {subtitle && (
        <Text className="text-ink-soft text-sm mt-3 text-center">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
