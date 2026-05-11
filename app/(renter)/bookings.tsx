/**
 * @file (renter)/bookings.tsx — renter's My Bookings tab.
 * @module app
 *
 * Displays all bookings for the signed-in renter with filter pills
 * (All / Pending / Accepted / Past). Pull-to-refresh included.
 */
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'lucide-react-native';

import { BookingCard } from '@/components/booking/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useRenterBookings } from '@/hooks/useBookings';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import type { BookingStatus } from '@/types/database';

const log = createLogger('BOOKING');

// ─── Filter config ────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'pending' | 'accepted' | 'past';

const FILTERS: { key: FilterKey; label: string; statuses: BookingStatus[] | null }[] = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'accepted', label: 'Accepted', statuses: ['accepted'] },
  { key: 'past', label: 'Past', statuses: ['declined', 'cancelled', 'completed'] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RenterBookings() {
  const profile = useAuthStore((s) => s.profile);
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data: allBookings, isLoading, refetch, isRefetching } = useRenterBookings(profile?.id);

  useEffect(() => {
    log.info('RenterBookings: page visited');
  }, []);

  const activeStatuses = FILTERS.find((f) => f.key === filter)!.statuses;
  const visible = activeStatuses
    ? (allBookings ?? []).filter((b) => activeStatuses.includes(b.status))
    : (allBookings ?? []);

  if (isLoading) return <LoadingState subtitle="Loading your bookings…" />;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-ink text-2xl font-bold mb-4">My Bookings</Text>

        {/* Filter pills */}
        <View className="flex-row gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  log.info('RenterBookings: filter tapped', { filter: f.key });
                  setFilter(f.key);
                }}
                className={`px-4 py-2 rounded-full min-h-[36px] justify-center ${
                  active ? 'bg-primary' : 'bg-surface border border-border'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${active ? 'text-white' : 'text-ink-soft'}`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => <BookingCard booking={item} />}
        ListEmptyComponent={
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            body={
              filter === 'all'
                ? 'Browse the Discover tab and request a machine to get started.'
                : 'No bookings in this category.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}
