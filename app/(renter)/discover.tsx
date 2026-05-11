/**
 * @file (renter)/discover.tsx — the renter's machines feed.
 * @module app
 *
 * Header (location pin + village) → category filter pills → FlatList of
 * MachineCards sorted by distance. Pull-to-refresh re-fires the TanStack
 * query; loading + empty states use the UI primitives from L2 Phase D.
 *
 * Distance is computed once per render against `useLocation` coords; for
 * the seed-scale demo (≤50 machines) sorting client-side is fine.
 */
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  CircleHelp,
  Droplets,
  Hammer,
  type LucideIcon,
  MapPin,
  Tractor,
  Wheat,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { MachineCard } from '@/components/machine/MachineCard';
import { useLocation } from '@/hooks/useLocation';
import { useMachines } from '@/hooks/useMachines';
import { supabase } from '@/integrations/supabase';
import { distanceKm } from '@/lib/distance';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import type { Machine, MachineCategory } from '@/types/database';

const log = createLogger('UI');

type FilterValue = 'all' | MachineCategory;

interface FilterOption {
  value: FilterValue;
  label: string;
  icon: LucideIcon;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'discover.filters.all', icon: CircleHelp },
  { value: 'tractor', label: 'discover.filters.tractor', icon: Tractor },
  { value: 'harvester', label: 'discover.filters.harvester', icon: Wheat },
  { value: 'sprayer', label: 'discover.filters.sprayer', icon: Droplets },
  { value: 'tiller', label: 'discover.filters.tiller', icon: Hammer },
];

const FILTER_ICON_SIZE = 16;

export default function Discover() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const { coords } = useLocation();
  const [filter, setFilter] = useState<FilterValue>('all');
  const queryClient = useQueryClient();

  const machinesQuery = useMachines({
    category: filter === 'all' ? undefined : filter,
  });

  useEffect(() => {
    log.info('Discover: page visited');
  }, []);

  // Feed-level realtime: one channel for the whole machines table patches
  // the TanStack cache so all visible cards update without re-fetching.
  useEffect(() => {
    const channel = supabase
      .channel('machines-feed')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'machines' },
        (payload) => {
          const updated = payload.new as { id: string };
          log.info('Discover: realtime machine update', { id: updated.id });
          queryClient.setQueriesData<Machine[]>({ queryKey: ['machines'] }, (old) => {
            if (!Array.isArray(old)) return old;
            return old.map((m) => (m.id === updated.id ? { ...m, ...payload.new } : m));
          });
          queryClient.setQueryData<Machine>(['machine', updated.id], (old) =>
            old ? { ...old, ...payload.new } : old,
          );
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  // Why memoized: distance sort is O(n log n) — keep it stable across
  // unrelated re-renders (e.g., refresh-control state flicks).
  const sortedMachines = useMemo<Machine[]>(() => {
    if (!machinesQuery.data) return [];
    if (!coords) return machinesQuery.data;
    return [...machinesQuery.data].sort((a, b) => {
      const da = distanceKm(coords, { lat: a.location_lat, lng: a.location_lng });
      const db = distanceKm(coords, { lat: b.location_lat, lng: b.location_lng });
      return da - db;
    });
  }, [machinesQuery.data, coords]);

  const handleSelectFilter = (value: FilterValue) => {
    log.info('Discover: filter tapped', { value });
    setFilter(value);
  };

  const handleOpenMachine = (machineId: string) => {
    log.info('Discover: machine card tapped');
    // Why: dynamic route. The expo-router typed-routes manifest picks up
    // `machine/[id]` after Metro regenerates `.expo/types`; until then we
    // cast at this single boundary (matches the L1 dispatcher pattern).
    const href = {
      pathname: '/(renter)/machine/[id]',
      params: { id: machineId },
    } as unknown as Parameters<typeof router.push>[0];
    router.push(href);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-ink text-2xl font-bold">{t('discover.title')}</Text>
        {/* Location pill */}
        <View className="flex-row items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1.5 mt-2 self-start">
          <MapPin size={14} color={colors.inkSoft} />
          <Text className="text-ink-soft text-sm">
            {profile?.village ?? 'Karnataka'}{profile?.district ? `, ${profile.district}` : ''}
          </Text>
        </View>
      </View>

      {/* Category filter pills + separator */}
      <View className="border-b border-border pb-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_OPTIONS}
          keyExtractor={(opt) => opt.value}
          contentContainerClassName="gap-2 px-4"
          renderItem={({ item }) => {
            const active = filter === item.value;
            const Icon = item.icon;
            return (
              <Pressable
                onPress={() => handleSelectFilter(item.value)}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full border min-h-[44px] ${
                  active
                    ? 'bg-primary border-primary shadow-card'
                    : 'bg-surface border-border'
                }`}
              >
                <Icon
                  size={FILTER_ICON_SIZE}
                  color={active ? '#FFFFFF' : colors.inkSoft}
                />
                <Text
                  className={`text-sm font-medium ${
                    active ? 'text-white' : 'text-ink'
                  }`}
                >
                  {t(item.label)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Body */}
      {machinesQuery.isLoading ? (
        <LoadingState layout="card-list" count={4} />
      ) : sortedMachines.length === 0 ? (
        <EmptyState
          icon={CircleHelp}
          title={t('discover.empty')}
          body={t('discover.emptyBody')}
        />
      ) : (
        <FlatList
          data={sortedMachines}
          keyExtractor={(m) => m.id}
          contentContainerClassName="px-4 pt-4 pb-8 gap-3"
          renderItem={({ item }) => (
            <MachineCard
              machine={item}
              distanceKm={
                coords
                  ? distanceKm(coords, {
                      lat: item.location_lat,
                      lng: item.location_lng,
                    })
                  : null
              }
              onPress={() => handleOpenMachine(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={machinesQuery.isRefetching}
              onRefresh={() => {
                log.info('Discover: pull-to-refresh');
                void machinesQuery.refetch();
              }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
