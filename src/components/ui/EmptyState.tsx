/**
 * @file EmptyState.tsx — friendly empty-list placeholder.
 * @module src/components/ui
 *
 * Always pairs icon + title + body so the user understands why the list is
 * empty and what to do. Optional CTA uses the Button component for
 * consistent press feedback and gradient styling.
 */
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

const ICON_SIZE = 52;

export function EmptyState({
  icon: Icon,
  title,
  body,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="bg-primary/10 rounded-full p-6 mb-5">
        <Icon size={ICON_SIZE} color={colors.primary} />
      </View>
      <Text className="text-ink text-xl font-bold text-center mb-2">
        {title}
      </Text>
      <Text className="text-ink-soft text-sm text-center max-w-[260px] leading-6">
        {body}
      </Text>
      {ctaLabel && onCtaPress && (
        <Button
          label={ctaLabel}
          onPress={onCtaPress}
          variant="primary"
          className="mt-6"
        />
      )}
    </View>
  );
}
