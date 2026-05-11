/**
 * @file MachineCard.tsx — row card for the discover feed.
 * @module src/components/machine
 *
 * Renders a single machine in the renter's discover list. Image on the
 * left (placeholder gradient + category icon when no primary_image_url —
 * real uploads land in L4), title/brand/distance/price stack on the
 * right, availability badge in the corner.
 *
 * Stays "pure" of stores: distance is passed in by the caller (computed
 * once against the renter's coords). Realtime availability badge updates
 * land in L5 — for now the column is read once at fetch time.
 */
import { Image } from 'expo-image';
import {
  CircleHelp,
  Droplets,
  Hammer,
  type LucideIcon,
  Tractor,
  Wheat,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { formatPaise } from '@/lib/money';
import { colors } from '@/theme/colors';
import type { Machine, MachineCategory } from '@/types/database';

interface MachineCardProps {
  machine: Machine;
  /** Distance in km from the renter's current location. `null` while location is resolving. */
  distanceKm: number | null;
  onPress: () => void;
}

// Why named: avoids inline px values; keeps the layout tweakable in one spot.
const IMAGE_SIZE = 80;
const PLACEHOLDER_ICON_SIZE = 36;

// Why hard-coded mapping: NativeWind tree-shaking requires literal class names.
// Same pattern as Badge variants. A computed `bg-${category}` won't compile.
const CATEGORY_ICON: Record<MachineCategory, LucideIcon> = {
  tractor: Tractor,
  harvester: Wheat,
  sprayer: Droplets,
  tiller: Hammer,
  other: CircleHelp,
};

function formatDistance(km: number | null): string {
  if (km === null) return '— km away';
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function MachineCard({ machine, distanceKm, onPress }: MachineCardProps) {
  // Why fallback: the DB column is `text` (FK to categories.id), so an
  // unexpected category id wouldn't crash — the help-circle keeps the row
  // renderable while we figure out what went wrong.
  const CategoryIcon =
    CATEGORY_ICON[machine.category as MachineCategory] ?? CircleHelp;
  const hasImage = !!machine.primary_image_url;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row gap-3 p-3 bg-surface border border-border rounded-2xl min-h-[44px]"
    >
      {hasImage ? (
        <Image
          source={{ uri: machine.primary_image_url ?? undefined }}
          style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
          className="rounded-xl"
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
          className="rounded-xl bg-primary/10 items-center justify-center"
        >
          <CategoryIcon size={PLACEHOLDER_ICON_SIZE} color={colors.primary} />
        </View>
      )}

      <View className="flex-1 justify-between">
        <View>
          <Text
            className="text-ink text-base font-semibold"
            numberOfLines={1}
          >
            {machine.title}
          </Text>
          <Text className="text-ink-soft text-xs mt-0.5" numberOfLines={1}>
            {machine.brand} · {machine.model}
          </Text>
          <Text className="text-ink-mute text-xs mt-0.5">
            {formatDistance(distanceKm)} · {machine.owner_village}
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-ink text-sm font-semibold">
            {formatPaise(machine.hourly_rate_paise)}/hr
          </Text>
          <Badge
            variant={machine.is_currently_available ? 'avail' : 'busy'}
            label={machine.is_currently_available ? 'Available' : 'In use'}
          />
        </View>
      </View>
    </Pressable>
  );
}

