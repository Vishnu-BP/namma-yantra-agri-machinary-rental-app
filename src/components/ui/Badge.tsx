/**
 * @file Badge.tsx — colored status pill.
 * @module src/components/ui
 *
 * Combines icon + color + text per CLAUDE.md "never color alone."
 * Variants map to the brand semantic colors (avail/busy/pending plus
 * accent for accepted, error for declined).
 */
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

export type BadgeVariant =
  | 'avail'
  | 'busy'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
}

// Why hard-coded mapping over a colors[variant] lookup: NativeWind v4
// requires class names to appear literally in source for tree-shaking.
// Computed strings like `bg-${variant}` won't get included in the CSS.
const VARIANT_CLASSES: Record<BadgeVariant, { bg: string; text: string }> = {
  avail: { bg: 'bg-avail', text: 'text-white' },
  busy: { bg: 'bg-busy', text: 'text-white' },
  pending: { bg: 'bg-pending', text: 'text-white' },
  accepted: { bg: 'bg-accent', text: 'text-white' },
  declined: { bg: 'bg-error', text: 'text-white' },
  cancelled: { bg: 'bg-busy', text: 'text-white' },
  completed: { bg: 'bg-accent', text: 'text-white' },
};

export function Badge({ variant, label, icon: Icon, size = 'sm' }: BadgeProps) {
  const v = VARIANT_CLASSES[variant];
  const iconSize = size === 'md' ? 14 : 12;
  const textClass = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <View
      className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${v.bg}`}
    >
      {Icon && <Icon size={iconSize} color="#FFFFFF" />}
      <Text className={`font-medium ${textClass} ${v.text}`}>{label}</Text>
    </View>
  );
}
