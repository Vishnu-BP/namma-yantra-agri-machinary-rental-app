/**
 * @file Button.tsx — unified CTA component with gradient primary variant.
 * @module src/components/ui
 *
 * Replaces all copy-pasted `Pressable + Text` CTAs. The primary variant
 * renders a LinearGradient (gold left → dark gold right) wrapped in a
 * shadow View for Android elevation compat. Press feedback is a Reanimated
 * scale spring. Haptic feedback fires on every press via expo-haptics.
 *
 * Usage:
 *   <Button label={t('common.continue')} onPress={fn} variant="primary" />
 *   <Button label={t('owner.accept')} onPress={fn} variant="primary" icon={CheckCircle} className="flex-1" />
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  /** Layout escape hatch — margin, flex-1, w-full, etc. Applied to outer wrapper. */
  className?: string;
}

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<ButtonSize, { container: string; text: string; iconSize: number }> = {
  sm: { container: 'py-2 px-4 min-h-[44px]', text: 'text-sm',  iconSize: 16 },
  md: { container: 'py-3.5 px-6 min-h-[48px]', text: 'text-base', iconSize: 18 },
  lg: { container: 'py-4 px-8 min-h-[56px]', text: 'text-lg',  iconSize: 20 },
};

// ─── AnimatedPressable ────────────────────────────────────────────────────────

function useScalePress() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withTiming(0.97, { duration: 80 }); };
  const onPressOut = () => { scale.value = withTiming(1, { duration: 120 }); };
  return { style, onPressIn, onPressOut };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const { style: scaleStyle, onPressIn, onPressOut } = useScalePress();
  const { container, text, iconSize } = SIZE_CLASSES[size];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // ── Primary — gradient + gold shadow ──────────────────────────────────────

  if (variant === 'primary') {
    return (
      <Animated.View
        style={scaleStyle}
        className={`rounded-2xl shadow-cta ${isDisabled ? 'opacity-50' : ''} ${className}`}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="rounded-2xl overflow-hidden"
        >
          <Pressable
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={isDisabled}
            className={`${container} items-center justify-center flex-row gap-2`}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                {Icon && iconPosition === 'left' && <Icon size={iconSize} color="white" />}
                <Text className={`text-white font-bold ${text}`}>{label}</Text>
                {Icon && iconPosition === 'right' && <Icon size={iconSize} color="white" />}
              </>
            )}
          </Pressable>
        </LinearGradient>
      </Animated.View>
    );
  }

  // ── Secondary — outlined gold border ──────────────────────────────────────

  if (variant === 'secondary') {
    return (
      <Animated.View
        style={scaleStyle}
        className={`rounded-2xl shadow-card ${isDisabled ? 'opacity-50' : ''} ${className}`}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          className={`${container} items-center justify-center flex-row gap-2 bg-surface border-2 border-primary rounded-2xl`}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              {Icon && iconPosition === 'left' && <Icon size={iconSize} color={colors.primary} />}
              <Text className={`text-primary font-bold ${text}`}>{label}</Text>
              {Icon && iconPosition === 'right' && <Icon size={iconSize} color={colors.primary} />}
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── Danger — solid red ────────────────────────────────────────────────────

  if (variant === 'danger') {
    return (
      <Animated.View
        style={scaleStyle}
        className={`rounded-2xl shadow-card ${isDisabled ? 'opacity-50' : ''} ${className}`}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          className={`${container} items-center justify-center flex-row gap-2 bg-error rounded-2xl`}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              {Icon && iconPosition === 'left' && <Icon size={iconSize} color="white" />}
              <Text className={`text-white font-bold ${text}`}>{label}</Text>
              {Icon && iconPosition === 'right' && <Icon size={iconSize} color="white" />}
            </>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  // ── Ghost — text only, no background ─────────────────────────────────────

  return (
    <Animated.View style={scaleStyle} className={`${isDisabled ? 'opacity-50' : ''} ${className}`}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        className={`${container} items-center justify-center flex-row gap-2`}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            {Icon && iconPosition === 'left' && <Icon size={iconSize} color={colors.primary} />}
            <Text className={`text-primary font-semibold ${text}`}>{label}</Text>
            {Icon && iconPosition === 'right' && <Icon size={iconSize} color={colors.primary} />}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}
