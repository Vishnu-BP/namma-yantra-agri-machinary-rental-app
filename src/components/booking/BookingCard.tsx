/**
 * @file BookingCard.tsx — booking summary row used in renter and owner lists.
 * @module src/components/booking
 *
 * Renders: machine title + date range + status badge + formatted total.
 * Owner variant shows Accept/Decline action buttons when status is pending.
 * All layout handled via NativeWind; no inline styles.
 */
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react-native';

import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { formatPaise } from '@/lib/money';
import { colors } from '@/theme/colors';
import type { Booking, BookingStatus } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  /** Shown for owner-side cards when booking is pending. */
  onAccept?: () => void;
  onDecline?: () => void;
  isResponding?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<BookingStatus, { variant: BadgeVariant; label: string }> = {
  pending: { variant: 'pending', label: 'Pending' },
  accepted: { variant: 'accepted', label: 'Accepted' },
  declined: { variant: 'declined', label: 'Declined' },
  cancelled: { variant: 'cancelled', label: 'Cancelled' },
  completed: { variant: 'completed', label: 'Completed' },
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
  const badge = STATUS_BADGE[booking.status];
  const isPending = booking.status === 'pending';
  const showActions = isPending && (onAccept || onDecline);

  return (
    <View className="bg-surface rounded-2xl p-4 mb-3 border border-border">
      {/* Header row: machine title + status badge */}
      <View className="flex-row items-start justify-between gap-2 mb-2">
        <Text className="text-ink font-semibold text-base flex-1" numberOfLines={2}>
          {/* Why: booking doesn't store machine title — we use owner_id as proxy label for now.
              Machine title will be joined in L4 when machine detail fetches are linked. */}
          Booking #{booking.id.slice(0, 8).toUpperCase()}
        </Text>
        <Badge variant={badge.variant} label={badge.label} />
      </View>

      {/* Date range */}
      <Text className="text-ink-soft text-sm mb-1">
        {formatDateRange(booking.start_time, booking.end_time)}
      </Text>

      {/* Duration unit + total */}
      <Text className="text-ink-mute text-xs mb-3 capitalize">
        {booking.duration_unit} · {formatPaise(booking.total_paise)} total
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

      {/* Owner action buttons — only shown on pending, when callbacks are provided */}
      {showActions && (
        <View className="flex-row gap-3 mt-1">
          {onAccept && (
            <Pressable
              onPress={onAccept}
              disabled={isResponding}
              className="flex-1 flex-row items-center justify-center gap-2 bg-accent rounded-xl py-3 min-h-[44px]"
            >
              {isResponding
                ? <ActivityIndicator color={colors.surface} size="small" />
                : <CheckCircle size={16} color={colors.surface} />
              }
              <Text className="text-white font-semibold text-sm">Accept</Text>
            </Pressable>
          )}
          {onDecline && (
            <Pressable
              onPress={onDecline}
              disabled={isResponding}
              className="flex-1 flex-row items-center justify-center gap-2 bg-error rounded-xl py-3 min-h-[44px]"
            >
              {isResponding
                ? <ActivityIndicator color={colors.surface} size="small" />
                : <XCircle size={16} color={colors.surface} />
              }
              <Text className="text-white font-semibold text-sm">Decline</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
