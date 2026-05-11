/**
 * @file BookingCard.tsx — booking summary row used in renter and owner lists.
 * @module src/components/booking
 *
 * Renders: booking ID + date range + status badge + formatted total.
 * Owner variant shows Accept/Decline action buttons (via Button component)
 * when status is pending. Shadow wrapper for depth on both platforms.
 */
import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatPaise } from '@/lib/money';
import type { Booking, BookingStatus } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  onAccept?: () => void;
  onDecline?: () => void;
  isResponding?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<BookingStatus, BadgeVariant> = {
  pending: 'pending',
  accepted: 'accepted',
  declined: 'declined',
  cancelled: 'cancelled',
  completed: 'completed',
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd');
  if (sameDay) {
    return `${format(s, 'd MMM')} · ${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
  }
  return `${format(s, 'd MMM')} – ${format(e, 'd MMM yyyy')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingCard({ booking, onAccept, onDecline, isResponding }: BookingCardProps) {
  const { t } = useTranslation();
  const badge = { variant: STATUS_VARIANT[booking.status], label: t(`booking.status.${booking.status}`) };
  const isPending = booking.status === 'pending';
  const showActions = isPending && (onAccept || onDecline);

  return (
    <View className="shadow-card rounded-2xl bg-surface mb-3">
      <View className="bg-surface rounded-2xl p-4 border border-border">
        {/* Header row: booking ID + status badge */}
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <Text className="text-ink font-semibold text-base flex-1" numberOfLines={2}>
            Booking #{booking.id.slice(0, 8).toUpperCase()}
          </Text>
          <Badge variant={badge.variant} label={badge.label} size="sm" />
        </View>

        {/* Date range */}
        <Text className="text-ink-soft text-sm mb-1">
          {formatDateRange(booking.start_time, booking.end_time)}
        </Text>

        {/* Duration unit + total */}
        <Text className="text-ink-mute text-xs mb-3 capitalize">
          {booking.duration_unit} · {formatPaise(booking.total_paise)} {t('booking.total')}
        </Text>

        {/* Notes */}
        {booking.renter_note ? (
          <Text className="text-ink-soft text-xs italic mb-2">
            &ldquo;{booking.renter_note}&rdquo;
          </Text>
        ) : null}
        {booking.owner_note ? (
          <Text className="text-ink-soft text-xs italic mb-2">
            Owner: &ldquo;{booking.owner_note}&rdquo;
          </Text>
        ) : null}

        {/* Owner action buttons */}
        {showActions && (
          <View className="flex-row gap-3 mt-2">
            {onAccept && (
              <Button
                label={t('owner.accept')}
                onPress={onAccept}
                variant="primary"
                icon={CheckCircle}
                loading={isResponding}
                className="flex-1"
              />
            )}
            {onDecline && (
              <Button
                label={t('owner.decline')}
                onPress={onDecline}
                variant="danger"
                icon={XCircle}
                loading={isResponding}
                className="flex-1"
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}
