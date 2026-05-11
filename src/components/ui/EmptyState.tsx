/**
 * @file EmptyState.tsx — friendly empty-list placeholder.
 * @module src/components/ui
 *
 * Used by the discover feed when the active category yields zero results,
 * and by future list screens (My Bookings, Owner Listings, etc.). Always
 * pairs an icon + title + body so the user understands why the list is
 * empty and what to do.
 */
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

const ICON_SIZE = 48;

export function EmptyState({
  icon: Icon,
  title,
  body,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="bg-primary/10 rounded-full p-4 mb-4">
        <Icon size={ICON_SIZE} color={colors.primary} />
      </View>
      <Text className="text-ink text-lg font-semibold text-center mb-1">
        {title}
      </Text>
      <Text className="text-ink-soft text-sm text-center max-w-[280px] leading-5">
        {body}
      </Text>
      {ctaLabel && onCtaPress && (
        <Pressable
          onPress={onCtaPress}
          className="bg-primary rounded-xl py-3 px-6 mt-6 min-h-[44px] justify-center"
        >
          <Text className="text-white font-semibold">{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
