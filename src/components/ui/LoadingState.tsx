/**
 * @file LoadingState.tsx — skeleton shimmer loading system.
 * @module src/components/ui
 *
 * Replaces the single ActivityIndicator spinner with layout-matched skeleton
 * shimmer cards that match the real content shape. All skeletons share one
 * Reanimated opacity value so they pulse in sync.
 *
 * Layouts:
 *  - 'card-list'   → matches MachineCard / BookingCard rows (discover, bookings, listings)
 *  - 'card-detail' → matches machine detail screen (hero + text + pricing)
 *  - 'spinner'     → legacy fallback (spinner + optional subtitle)
 */
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type SkeletonLayout = 'card-list' | 'card-detail' | 'spinner';

interface LoadingStateProps {
  layout?: SkeletonLayout;
  /** Number of skeleton rows for card-list layout. Default: 3. */
  count?: number;
  /** Text shown beneath the spinner (spinner layout only). */
  subtitle?: string;
}

// ─── Skeleton primitives ──────────────────────────────────────────────────────

function SkeletonBox({
  opacity,
  width,
  height,
  extraClass = '',
}: {
  opacity: ReturnType<typeof useSharedValue<number>>;
  width?: number;
  height?: number;
  extraClass?: string;
}) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[style, width !== undefined ? { width } : undefined, height !== undefined ? { height } : undefined]}
      className={`bg-primaryLight rounded-lg ${extraClass}`}
    />
  );
}

// ─── Card-list skeleton row ───────────────────────────────────────────────────

function SkeletonCardRow({ opacity }: { opacity: ReturnType<typeof useSharedValue<number>> }) {
  return (
    <View className="flex-row gap-3 p-3 bg-surface border border-border rounded-2xl">
      {/* Thumbnail */}
      <SkeletonBox opacity={opacity} width={92} height={92} extraClass="rounded-xl" />
      {/* Text lines */}
      <View className="flex-1 justify-between py-1">
        <View>
          <SkeletonBox opacity={opacity} width={200} height={16} extraClass="mb-2" />
          <SkeletonBox opacity={opacity} width={150} height={12} extraClass="mb-1.5" />
          <SkeletonBox opacity={opacity} width={110} height={12} />
        </View>
        <View className="flex-row justify-between items-center">
          <SkeletonBox opacity={opacity} width={90} height={16} />
          <SkeletonBox opacity={opacity} width={70} height={24} extraClass="rounded-full" />
        </View>
      </View>
    </View>
  );
}

// ─── Card-detail skeleton ─────────────────────────────────────────────────────

function SkeletonCardDetail({ opacity }: { opacity: ReturnType<typeof useSharedValue<number>> }) {
  return (
    <View className="flex-1">
      {/* Hero */}
      <SkeletonBox opacity={opacity} height={224} extraClass="rounded-none mb-5" />
      {/* Title block */}
      <View className="px-4 mb-6">
        <SkeletonBox opacity={opacity} width={240} height={24} extraClass="mb-2" />
        <SkeletonBox opacity={opacity} width={160} height={14} />
      </View>
      {/* Pricing grid */}
      <View className="px-4 flex-row gap-3">
        <View className="flex-1">
          <SkeletonBox opacity={opacity} height={80} extraClass="rounded-2xl" />
        </View>
        <View className="flex-1">
          <SkeletonBox opacity={opacity} height={80} extraClass="rounded-2xl" />
        </View>
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoadingState({ layout = 'spinner', count = 3, subtitle }: LoadingStateProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  if (layout === 'card-list') {
    return (
      <View className="flex-1 px-4 pt-4 gap-3">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCardRow key={i} opacity={opacity} />
        ))}
      </View>
    );
  }

  if (layout === 'card-detail') {
    return <SkeletonCardDetail opacity={opacity} />;
  }

  // Legacy spinner fallback
  return (
    <View className="flex-1 items-center justify-center p-8">
      <ActivityIndicator color={colors.primary} />
      {subtitle ? (
        <Text className="text-ink-soft text-sm mt-3 text-center">{subtitle}</Text>
      ) : null}
    </View>
  );
}
