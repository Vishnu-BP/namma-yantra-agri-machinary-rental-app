/**
 * @file Card.tsx — pressable container primitive.
 * @module src/components/ui
 *
 * Renders a `<Pressable>` if `onPress` is given, otherwise a static
 * `<View>`. Default styling: white surface, border, rounded corners,
 * subtle shadow on native (no-op on web). All visual tokens come from
 * NativeWind classes; tap target ≥44pt per CLAUDE.md.
 */
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

const BASE_CLASSES =
  'bg-surface border border-border rounded-2xl p-4 min-h-[44px]';

export function Card({ children, onPress, className }: CardProps) {
  const classes = [BASE_CLASSES, className].filter(Boolean).join(' ');

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={classes}>
        {children}
      </Pressable>
    );
  }
  return <View className={classes}>{children}</View>;
}
