/**
 * @file (renter)/machine/[id].tsx — single-machine detail screen.
 * @module app
 *
 * Hero block (gradient + category icon — image carousel lands in L4) over
 * title/meta/availability/about/pricing/owner. Bottom CTA is rendered
 * disabled with a "Booking opens in Layer 3" note so the demo is honest
 * about scope.
 */
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CircleHelp,
  Droplets,
  Hammer,
  type LucideIcon,
  MapPin,
  Tractor,
  Wheat,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailabilityBadge } from '@/components/machine/AvailabilityBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useMachine } from '@/hooks/useMachines';
import { createLogger } from '@/lib/logger';
import { formatPaise } from '@/lib/money';
import { colors } from '@/theme/colors';
import type { MachineCategory } from '@/types/database';

const log = createLogger('UI');

const HERO_ICON_SIZE = 96;

const CATEGORY_ICON: Record<MachineCategory, LucideIcon> = {
  tractor: Tractor,
  harvester: Wheat,
  sprayer: Droplets,
  tiller: Hammer,
  other: CircleHelp,
};

export default function MachineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const machineQuery = useMachine(id);

  useEffect(() => {
    log.info('Machine detail: page visited');
  }, []);

  const handleBack = () => {
    log.info('Machine detail: back tapped');
    router.back();
  };

  if (machineQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <LoadingState subtitle="Loading machine…" />
      </SafeAreaView>
    );
  }

  const machine = machineQuery.data;
  if (!machine) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <EmptyState
          icon={CircleHelp}
          title="Machine not found"
          body="This listing may have been removed by the owner."
          ctaLabel="Back to Discover"
          onCtaPress={handleBack}
        />
      </SafeAreaView>
    );
  }

  const CategoryIcon =
    CATEGORY_ICON[machine.category as MachineCategory] ?? CircleHelp;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerClassName="pb-32">
        {/* Hero — placeholder image gradient with category icon. L4 swaps in carousel. */}
        <View className="bg-primary/10 h-48 items-center justify-center">
          <CategoryIcon size={HERO_ICON_SIZE} color={colors.primary} />
        </View>

        {/* Floating back button (above hero so it sits on the gradient) */}
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          className="absolute top-3 left-3 bg-surface border border-border rounded-full p-2 min-w-[44px] min-h-[44px] items-center justify-center"
        >
          <ArrowLeft size={20} color={colors.ink} />
        </Pressable>

        {/* Title + meta + availability */}
        <View className="px-4 pt-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-ink text-2xl font-semibold">
                {machine.title}
              </Text>
              <Text className="text-ink-soft text-sm mt-1">
                {machine.brand} · {machine.model} · {machine.year_of_purchase}
                {machine.horsepower != null ? ` · ${machine.horsepower} HP` : ''}
              </Text>
            </View>
            <AvailabilityBadge
              machineId={machine.id}
              initialValue={machine.is_currently_available}
              size="md"
            />
          </View>

          <View className="flex-row items-center mt-3">
            <MapPin size={14} color={colors.inkSoft} />
            <Text className="text-ink-soft text-sm ml-1">
              {machine.village}, {machine.district}
            </Text>
          </View>
        </View>

        {/* About */}
        {machine.description_en ? (
          <View className="px-4 mt-6">
            <Text className="text-ink text-base font-semibold mb-2">About</Text>
            <Text className="text-ink-soft text-sm leading-6">
              {machine.description_en}
            </Text>
          </View>
        ) : null}

        {/* Pricing */}
        <View className="px-4 mt-6">
          <Text className="text-ink text-base font-semibold mb-2">Pricing</Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface border border-border rounded-xl p-3">
              <Text className="text-ink-mute text-xs">Hourly</Text>
              <Text className="text-ink text-lg font-semibold mt-1">
                {formatPaise(machine.hourly_rate_paise)}
              </Text>
            </View>
            <View className="flex-1 bg-surface border border-border rounded-xl p-3">
              <Text className="text-ink-mute text-xs">Daily</Text>
              <Text className="text-ink text-lg font-semibold mt-1">
                {formatPaise(machine.daily_rate_paise)}
              </Text>
            </View>
          </View>
          <Text className="text-ink-mute text-xs mt-2">
            Minimum {machine.minimum_hours} hours
          </Text>
        </View>

        {/* Owner */}
        <View className="px-4 mt-6">
          <Text className="text-ink text-base font-semibold mb-2">Owner</Text>
          <View className="bg-surface border border-border rounded-xl p-3">
            <Text className="text-ink text-base font-medium">
              {machine.owner_name}
            </Text>
            <Text className="text-ink-soft text-sm mt-0.5">
              {machine.owner_village}
            </Text>
            <Text className="text-ink-mute text-xs mt-1">
              {machine.total_bookings} completed{' '}
              {machine.total_bookings === 1 ? 'rental' : 'rentals'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA — routes to booking flow */}
      <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border p-4 pb-6">
        <Pressable
          onPress={() => {
            log.info('Machine detail: request rental tapped', { machineId: machine.id });
            router.push(
              `/(renter)/book/${machine.id}` as unknown as Parameters<typeof router.push>[0],
            );
          }}
          disabled={!machine.is_currently_available}
          className={`rounded-xl py-4 items-center min-h-[44px] justify-center ${
            machine.is_currently_available ? 'bg-primary' : 'bg-busy'
          }`}
        >
          <Text className="text-white text-base font-semibold">
            {machine.is_currently_available ? 'Request rental' : 'Currently unavailable'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
