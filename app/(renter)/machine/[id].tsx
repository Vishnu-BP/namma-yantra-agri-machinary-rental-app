/**
 * @file (renter)/machine/[id].tsx — single-machine detail screen.
 * @module app
 *
 * Hero block (gradient + category icon — image carousel lands in L4) over
 * title/meta/availability/about/pricing/owner. Bottom CTA is rendered
 * disabled with a "Booking opens in Layer 3" note so the demo is honest
 * about scope.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  CircleHelp,
  Droplets,
  Hammer,
  type LucideIcon,
  MapPin,
  Tractor,
  User,
  Wheat,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailabilityBadge } from '@/components/machine/AvailabilityBadge';
import { Button } from '@/components/ui/Button';
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
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  log.info('Machine detail: mount start', { id });
  const machineQuery = useMachine(id);
  log.info('Machine detail: query state', {
    isLoading: machineQuery.isLoading,
    hasData: !!machineQuery.data,
    isError: machineQuery.isError,
  });

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
        <LoadingState layout="card-detail" />
      </SafeAreaView>
    );
  }

  const machine = machineQuery.data;
  if (!machine) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <EmptyState
          icon={CircleHelp}
          title={t('common.error')}
          body={t('errors.generic')}
          ctaLabel={t('common.back')}
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
        {/* Hero — gold gradient with large category icon. L4 swaps in carousel. */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 224, alignItems: 'center', justifyContent: 'center' }}
        >
          <CategoryIcon size={HERO_ICON_SIZE} color="rgba(255,255,255,0.9)" />
        </LinearGradient>

        {/* Floating back button (above hero so it sits on the gradient) */}
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          className="absolute top-3 left-3 bg-surface border border-border rounded-full p-2 min-w-[44px] min-h-[44px] items-center justify-center shadow-card"
        >
          <ArrowLeft size={20} color={colors.ink} />
        </Pressable>

        {/* Title + meta + availability */}
        <View className="px-4 pt-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-ink text-2xl font-bold">
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
            <Text className="text-ink text-base font-semibold mb-2">{t('machine.about')}</Text>
            <Text className="text-ink-soft text-sm leading-6">
              {machine.description_en}
            </Text>
          </View>
        ) : null}

        {/* Pricing — elevated cards */}
        <View className="px-4 mt-6">
          <Text className="text-ink text-base font-semibold mb-3">{t('machine.pricing')}</Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surfaceElevated border border-border rounded-2xl p-4 shadow-card">
              <Text className="text-ink-mute text-xs uppercase tracking-wide">{t('machine.hourly')}</Text>
              <Text className="text-primary text-2xl font-bold mt-1">
                {formatPaise(machine.hourly_rate_paise)}
              </Text>
            </View>
            <View className="flex-1 bg-surfaceElevated border border-border rounded-2xl p-4 shadow-card">
              <Text className="text-ink-mute text-xs uppercase tracking-wide">{t('machine.daily')}</Text>
              <Text className="text-primary text-2xl font-bold mt-1">
                {formatPaise(machine.daily_rate_paise)}
              </Text>
            </View>
          </View>
          <Text className="text-ink-mute text-xs mt-2">
            {t('machine.minHours', { n: machine.minimum_hours })}
          </Text>
        </View>

        {/* Owner — with avatar placeholder */}
        <View className="px-4 mt-6">
          <Text className="text-ink text-base font-semibold mb-3">{t('machine.owner')}</Text>
          <View className="bg-surface border border-border rounded-2xl p-4 shadow-card flex-row items-center gap-3">
            <View className="w-10 h-10 bg-primary/15 rounded-full items-center justify-center">
              <User size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-ink text-base font-semibold">
                {machine.owner_name}
              </Text>
              <Text className="text-ink-soft text-sm mt-0.5">
                {machine.owner_village}
              </Text>
              <Text className="text-ink-mute text-xs mt-1">
                {machine.total_bookings}{' '}
                {t('machine.rentals', { count: machine.total_bookings })}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* CTA — gradient fade above button, routes to booking flow */}
      <View className="absolute bottom-0 left-0 right-0">
        <LinearGradient
          colors={['transparent', colors.surface]}
          style={{ height: 24 }}
        />
        <View className="bg-surface px-4 pb-6 pt-2">
          <Button
            label={machine.is_currently_available ? t('machine.requestRental') : t('machine.unavailable')}
            onPress={() => {
              log.info('Machine detail: request rental tapped', { machineId: machine.id });
              router.push(
                `/(renter)/book/${machine.id}` as unknown as Parameters<typeof router.push>[0],
              );
            }}
            variant={machine.is_currently_available ? 'primary' : 'secondary'}
            size="lg"
            disabled={!machine.is_currently_available}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
