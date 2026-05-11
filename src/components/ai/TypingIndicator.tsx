/**
 * @file TypingIndicator.tsx — three-dot pulse shown while the assistant is replying.
 * @module src/components/ai
 *
 * Reuses the shimmer pattern (single shared opacity value, withRepeat) from
 * `LoadingState` but staggers each dot by 200ms so they cascade rather than
 * pulse together — clearer "typing" affordance.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 350 }),
          withTiming(0.3, { duration: 350 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inkMute },
        style,
      ]}
    />
  );
}

export function TypingIndicator() {
  return (
    <View className="self-start max-w-[80%] my-1">
      <View className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3 flex-row items-center gap-1.5">
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </View>
    </View>
  );
}
