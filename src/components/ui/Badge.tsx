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
  | 'declined';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  icon?: LucideIcon;
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
};

const ICON_SIZE = 12;

export function Badge({ variant, label, icon: Icon }: BadgeProps) {
  const v = VARIANT_CLASSES[variant];
  return (
    <View
      className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${v.bg}`}
    >
      {Icon && <Icon size={ICON_SIZE} color="#FFFFFF" />}
      <Text className={`text-xs font-medium ${v.text}`}>{label}</Text>
    </View>
  );
}
