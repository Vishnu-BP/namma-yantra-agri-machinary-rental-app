/**
 * @file (owner)/requests.tsx — owner's incoming booking requests tab.
 * @module app
 *
 * Displays all bookings for the owner's machines with filter pills
 * (Pending / Accepted / Past). Pending bookings show Accept + Decline buttons.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList } from 'lucide-react-native';

import { BookingCard } from '@/components/booking/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useOwnerBookings, useRespondToBooking } from '@/hooks/useBookings';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import type { Booking, BookingStatus } from '@/types/database';

const log = createLogger('BOOKING');

// ─── Filter config ────────────────────────────────────────────────────────────

type FilterKey = 'pending' | 'accepted' | 'past';

const FILTERS: { key: FilterKey; label: string; statuses: BookingStatus[] }[] = [
  { key: 'pending', label: 'owner.filters.pending', statuses: ['pending'] },
  { key: 'accepted', label: 'owner.filters.accepted', statuses: ['accepted'] },
  { key: 'past', label: 'owner.filters.past', statuses: ['declined', 'cancelled', 'completed'] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OwnerRequests() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const { data: allBookings, isLoading, refetch } = useOwnerBookings(profile?.id);
  const respondMutation = useRespondToBooking();

  useEffect(() => {
    log.info('OwnerRequests: page visited');
  }, []);

  const activeStatuses = FILTERS.find((f) => f.key === filter)!.statuses;
  const visible = (allBookings ?? []).filter((b) => activeStatuses.includes(b.status));

  const handleRespond = useCallback(
    async (booking: Booking, action: 'accept' | 'decline') => {
      log.info('OwnerRequests: respond tapped', { bookingId: booking.id, action });
      setRespondingId(booking.id);
      try {
        await respondMutation.mutateAsync({ bookingId: booking.id, action });
        log.info('OwnerRequests: respond completed', { bookingId: booking.id, action });
      } catch (err) {
        log.error('OwnerRequests: respond failed', err);
      } finally {
        setRespondingId(null);
      }
    },
    [respondMutation],
  );

  if (isLoading) return <LoadingState layout="card-list" count={3} />;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-ink text-2xl font-bold mb-4">{t('owner.requests')}</Text>

        {/* Filter pills */}
        <View className="flex-row gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  log.info('OwnerRequests: filter tapped', { filter: f.key });
                  setFilter(f.key);
                }}
                className={`px-4 py-2 rounded-full min-h-[36px] justify-center ${
                  active ? 'bg-primary shadow-card' : 'bg-surface border border-border'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${active ? 'text-white' : 'text-ink-soft'}`}
                >
                  {t(f.label)}
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
            refreshing={false}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            isResponding={respondingId === item.id}
            onAccept={
              item.status === 'pending'
                ? () => void handleRespond(item, 'accept')
                : undefined
            }
            onDecline={
              item.status === 'pending'
                ? () => void handleRespond(item, 'decline')
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={ClipboardList}
            title={t('owner.noRequests')}
            body={t('owner.noRequestsBody')}
          />
        }
      />
    </SafeAreaView>
  );
}
