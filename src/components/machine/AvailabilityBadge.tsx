/**
 * @file AvailabilityBadge.tsx — live availability indicator with pulse animation.
 * @module src/components/machine
 *
 * Subscribes to `useAvailability` so the badge updates in real-time across
 * devices when an owner accepts or cancels a booking. The green dot pulses
 * via Reanimated to give immediate visual feedback that the state is live.
 */
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useAvailability } from '@/hooks/useAvailability';
import { colors } from '@/theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AvailabilityBadgeProps {
  machineId: string;
  /** Pre-fetched value from the query cache — skips the initial DB round-trip. */
  initialValue?: boolean;
  size?: 'sm' | 'md';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AvailabilityBadge({
  machineId,
  initialValue,
  size = 'sm',
}: AvailabilityBadgeProps) {
  const { t } = useTranslation();
  const { isAvailable, isLoading } = useAvailability(machineId, initialValue);
  const opacity = useSharedValue(1);

  // Pulse the green dot when available — stops automatically when state flips.
  useEffect(() => {
    if (isAvailable) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1, // infinite
      );
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isAvailable, opacity]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const textCls = size === 'md' ? 'text-sm' : 'text-xs';

  if (isLoading) {
    return (
      <View className="bg-busy/20 px-2 py-1 rounded-full">
        <Text className={`${textCls} text-ink-mute`}>···</Text>
      </View>
    );
  }

  if (isAvailable) {
    return (
      <View className="flex-row items-center gap-1.5 bg-avail/15 px-2 py-1 rounded-full">
        <Animated.View
          style={[
            { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.avail },
            dotStyle,
          ]}
        />
        <Text className={`${textCls} text-avail font-semibold`}>{t('machine.available')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1.5 bg-busy/20 px-2 py-1 rounded-full">
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.busy }} />
      <Text className={`${textCls} text-ink-soft font-semibold`}>{t('machine.inUse')}</Text>
    </View>
  );
}
