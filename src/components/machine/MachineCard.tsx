/**
 * @file MachineCard.tsx — row card for the discover feed and owner listings.
 * @module src/components/machine
 *
 * Renders a single machine with a gradient thumbnail placeholder, brand/model,
 * distance, village, and hourly price. AvailabilityBadge is absolutely
 * positioned over the image top-right for instant visual scan. Shadow wrapper
 * provides Android elevation + iOS shadow without touching the Pressable.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CircleHelp,
  Droplets,
  Hammer,
  type LucideIcon,
  Tractor,
  Wheat,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { AvailabilityBadge } from '@/components/machine/AvailabilityBadge';
import { formatPaise } from '@/lib/money';
import { colors } from '@/theme/colors';
import type { Machine, MachineCategory } from '@/types/database';

interface MachineCardProps {
  machine: Machine;
  /** Distance in km from the renter's current location. `null` while location is resolving. */
  distanceKm: number | null;
  onPress: () => void;
}

const IMAGE_SIZE = 92;
const PLACEHOLDER_ICON_SIZE = 40;

// Why hard-coded: NativeWind tree-shaking requires literal class names.
const CATEGORY_ICON: Record<MachineCategory, LucideIcon> = {
  tractor: Tractor,
  harvester: Wheat,
  sprayer: Droplets,
  tiller: Hammer,
  other: CircleHelp,
};

function formatDistance(km: number | null): string {
  if (km === null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function MachineCard({ machine, distanceKm, onPress }: MachineCardProps) {
  const CategoryIcon =
    CATEGORY_ICON[machine.category as MachineCategory] ?? CircleHelp;
  const hasImage = !!machine.primary_image_url;
  const distance = formatDistance(distanceKm);

  return (
    // Shadow wrapper: shadow must sit on a View, not on Pressable (Android compat)
    <View className="shadow-card rounded-2xl bg-surface">
      <Pressable
        onPress={onPress}
        className="flex-row gap-3 p-3 bg-surface border border-border rounded-2xl min-h-[44px] active:opacity-75 overflow-hidden"
      >
        {/* Thumbnail — gradient placeholder or real image */}
        <View
          style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
          className="rounded-xl overflow-hidden"
        >
          {hasImage ? (
            <Image
              source={{ uri: machine.primary_image_url ?? undefined }}
              style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <LinearGradient
              colors={[colors.primaryLight, colors.border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
              className="items-center justify-center"
            >
              <CategoryIcon size={PLACEHOLDER_ICON_SIZE} color={colors.primary} />
            </LinearGradient>
          )}

          {/* Availability badge — absolute top-right over image */}
          <View className="absolute top-1.5 right-1.5">
            <AvailabilityBadge
              machineId={machine.id}
              initialValue={machine.is_currently_available}
            />
          </View>
        </View>

        {/* Content stack */}
        <View className="flex-1 justify-between py-0.5">
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
            {distance ? (
              <Text className="text-ink-mute text-xs mt-0.5">{distance}</Text>
            ) : null}
            <Text className="text-ink-mute text-xs mt-0.5" numberOfLines={1}>
              {machine.owner_village}
            </Text>
          </View>

          <Text className="text-primary text-base font-bold mt-2">
            {formatPaise(machine.hourly_rate_paise)}/hr
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
