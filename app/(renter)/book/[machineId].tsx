/**
 * @file (renter)/book/[machineId].tsx — multi-step booking flow.
 * @module app
 *
 * Three steps:
 *   1. Schedule — pick start date, start hour, duration, unit (hourly/daily).
 *   2. Review — show calculated total, optional renter note (React Hook Form).
 *   3. Confirm — booking submitted, link to Bookings tab.
 *
 * Disabled dates are derived from existing active bookings for the machine.
 * Price is computed client-side via calculateTotal for display; the edge
 * function recomputes server-side and ignores the client value.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { addHours, format, setHours, setMinutes, setSeconds } from 'date-fns';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';

import { LoadingState } from '@/components/ui/LoadingState';
import { useMachine } from '@/hooks/useMachines';
import { useCreateBooking, useMachineBookings } from '@/hooks/useBookings';
import { getDisabledDates } from '@/lib/booking-conflict';
import { calculateTotal } from '@/lib/pricing';
import { formatPaise } from '@/lib/money';
import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';

const log = createLogger('BOOKING');

// ─── Form schema ──────────────────────────────────────────────────────────────

const bookingSchema = z.object({
  renterNote: z.string().max(300).optional(),
});
type BookingForm = z.infer<typeof bookingSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_START_HOUR = 6;
const MAX_START_HOUR = 18;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({
  step,
  title,
  onBack,
}: {
  step: number;
  title: string;
  onBack: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
      <Pressable
        onPress={onBack}
        className="w-10 h-10 items-center justify-center rounded-full bg-surface border border-border"
      >
        <ArrowLeft size={18} color={colors.ink} />
      </Pressable>
      <View className="flex-1">
        <Text className="text-ink-mute text-xs">Step {step} of 3</Text>
        <Text className="text-ink text-lg font-bold">{title}</Text>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookMachine() {
  const { t } = useTranslation();
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { data: machine, isLoading: machineLoading } = useMachine(machineId);
  const { data: activeBookings } = useMachineBookings(machineId);
  const createBookingMutation = useCreateBooking();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Schedule state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startHour, setStartHour] = useState(8);
  const [durationHours, setDurationHours] = useState(2);
  const [durationUnit, setDurationUnit] = useState<'hourly' | 'daily'>('hourly');

  const { control, handleSubmit, formState: { errors } } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  });

  useEffect(() => {
    log.info('BookMachine: page visited', { machineId });
  }, [machineId]);

  if (machineLoading || !machine) return <LoadingState subtitle="Loading machine…" />;

  const disabledDates = getDisabledDates(activeBookings ?? []);
  const disabledDateMap = Object.fromEntries(
    disabledDates.map((d) => [d, { disabled: true, disableTouchEvent: true }]),
  );

  // Build Date objects from schedule state
  const buildTimes = (): { startTime: Date; endTime: Date } => {
    const base = new Date(selectedDate + 'T00:00:00');
    const start = setSeconds(setMinutes(setHours(base, startHour), 0), 0);
    const end =
      durationUnit === 'daily'
        ? setSeconds(setMinutes(setHours(new Date(base), 23), 59), 59)
        : addHours(start, durationHours);
    return { startTime: start, endTime: end };
  };

  const minHours = machine.minimum_hours ?? 2;
  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Step 1: Schedule ────────────────────────────────────────────────────────

  const canProceedToStep2 = selectedDate !== '' && selectedDate >= today;

  const { startTime, endTime } = selectedDate ? buildTimes() : { startTime: new Date(), endTime: new Date() };
  const pricing = selectedDate
    ? calculateTotal({
        startTime,
        endTime,
        durationUnit,
        hourlyRatePaise: machine.hourly_rate_paise,
        dailyRatePaise: machine.daily_rate_paise,
        minimumHours: minHours,
      })
    : null;

  if (step === 1) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <StepHeader step={1} title={t('booking.chooseDates')} onBack={() => router.back()} />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* Calendar */}
          <Calendar
            minDate={today}
            onDayPress={(day: { dateString: string }) => {
              log.info('BookMachine: date selected', { date: day.dateString });
              setSelectedDate(day.dateString);
            }}
            markedDates={{
              ...disabledDateMap,
              ...(selectedDate
                ? { [selectedDate]: { selected: true, selectedColor: colors.primary } }
                : {}),
            }}
            theme={{
              todayTextColor: colors.primary,
              selectedDayBackgroundColor: colors.primary,
              arrowColor: colors.primary,
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
            }}
            style={{ borderRadius: 16, marginBottom: 20 }}
          />

          {/* Duration unit toggle */}
          <Text className="text-ink font-semibold text-sm mb-2">{t('booking.rentalType')}</Text>
          <View className="flex-row gap-3 mb-4">
            {(['hourly', 'daily'] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => setDurationUnit(unit)}
                className={`flex-1 py-3 rounded-xl items-center border ${
                  durationUnit === unit
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-border'
                }`}
              >
                <Text
                  className={`font-semibold capitalize ${
                    durationUnit === unit ? 'text-white' : 'text-ink-soft'
                  }`}
                >
                  {t(`machine.${unit}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Start hour (hourly only) */}
          {durationUnit === 'hourly' && (
            <View className="mb-4">
              <Text className="text-ink font-semibold text-sm mb-2">
                {t('booking.startHour', { h: startHour })}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {Array.from({ length: MAX_START_HOUR - MIN_START_HOUR + 1 }, (_, i) => MIN_START_HOUR + i).map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setStartHour(h)}
                    className={`w-12 h-10 rounded-lg items-center justify-center border ${
                      startHour === h ? 'bg-primary border-primary' : 'bg-surface border-border'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${startHour === h ? 'text-white' : 'text-ink-soft'}`}
                    >
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Duration hours (hourly only) */}
          {durationUnit === 'hourly' && (
            <View className="mb-4">
              <Text className="text-ink font-semibold text-sm mb-2">
                {t('booking.duration', { n: Math.max(minHours, durationHours) })}
                {minHours > 1 && ` ${t('booking.minDuration', { n: minHours })}`}
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {[2, 3, 4, 6, 8, 10, 12].filter((h) => h >= minHours).map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setDurationHours(h)}
                    className={`px-4 py-2 rounded-lg border ${
                      durationHours === h ? 'bg-primary border-primary' : 'bg-surface border-border'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${durationHours === h ? 'text-white' : 'text-ink-soft'}`}
                    >
                      {h} hr
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Price preview */}
          {pricing && selectedDate && (
            <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
              <Text className="text-ink-mute text-xs mb-1">{t('booking.estimatedTotal')}</Text>
              <Text className="text-ink text-2xl font-bold">{formatPaise(pricing.totalPaise)}</Text>
              <Text className="text-ink-soft text-sm">{pricing.label}</Text>
            </View>
          )}
        </ScrollView>

        <View className="px-4 pb-6">
          <Pressable
            onPress={() => {
              log.info('BookMachine: proceed to review tapped');
              setStep(2);
            }}
            disabled={!canProceedToStep2}
            className={`rounded-2xl py-4 items-center min-h-[52px] justify-center ${
              canProceedToStep2 ? 'bg-primary' : 'bg-busy'
            }`}
          >
            <Text className="text-white font-bold text-base">
              {canProceedToStep2 ? t('booking.reviewBooking') : t('booking.selectDate')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 2: Review ──────────────────────────────────────────────────────────

  const onSubmit = handleSubmit(async (formData) => {
    log.info('BookMachine: submit booking tapped', { machineId, durationUnit });
    const { startTime: s, endTime: e } = buildTimes();
    try {
      await createBookingMutation.mutateAsync({
        machineId: machine.id,
        startTime: s,
        endTime: e,
        durationUnit,
        renterNote: formData.renterNote || undefined,
      });
      log.info('BookMachine: booking created successfully');
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      // 409 overlap is surfaced as a user-friendly alert
      Alert.alert('Booking failed', msg);
      log.error('BookMachine: createBooking failed', err);
    }
  });

  if (step === 2) {
    const { startTime: s, endTime: e } = buildTimes();
    const reviewPricing = calculateTotal({
      startTime: s,
      endTime: e,
      durationUnit,
      hourlyRatePaise: machine.hourly_rate_paise,
      dailyRatePaise: machine.daily_rate_paise,
      minimumHours: minHours,
    });

    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <StepHeader step={2} title={t('booking.reviewBooking')} onBack={() => setStep(1)} />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {/* Machine summary */}
          <View className="bg-surface rounded-2xl p-4 border border-border mb-4">
            <Text className="text-ink font-bold text-base mb-1">{machine.title}</Text>
            <Text className="text-ink-soft text-sm mb-3">
              {machine.brand} {machine.model} · {machine.village}
            </Text>
            <View className="h-px bg-border mb-3" />
            <Text className="text-ink-soft text-sm mb-1">
              {format(s, 'd MMM yyyy')}
              {durationUnit === 'hourly' ? ` · ${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}` : ' · Full day'}
            </Text>
            <Text className="text-ink-soft text-sm capitalize mb-3">{durationUnit} rental</Text>
            <Text className="text-ink text-2xl font-bold">{formatPaise(reviewPricing.totalPaise)}</Text>
            <Text className="text-ink-mute text-sm">{reviewPricing.label}</Text>
          </View>

          {/* Renter note */}
          <Text className="text-ink font-semibold text-sm mb-2">{t('booking.noteToOwner')}</Text>
          <Controller
            control={control}
            name="renterNote"
            render={({ field: { onChange, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-2xl p-4 text-ink text-sm mb-1"
                placeholder={t('booking.notePlaceholder')}
                placeholderTextColor={colors.inkMute}
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
            )}
          />
          {errors.renterNote && (
            <Text className="text-error text-xs mb-3">{errors.renterNote.message}</Text>
          )}
          <Text className="text-ink-mute text-xs mb-4">
            {t('booking.ownerNotified')}
          </Text>
        </ScrollView>

        <View className="px-4 pb-6">
          <Pressable
            onPress={() => void onSubmit()}
            disabled={createBookingMutation.isPending}
            className="bg-primary rounded-2xl py-4 items-center min-h-[52px] justify-center"
          >
            {createBookingMutation.isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text className="text-white font-bold text-base">{t('booking.sendRequest')}</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 3: Confirm ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6" edges={['top', 'bottom']}>
      <CheckCircle size={72} color={colors.accepted} />
      <Text className="text-ink text-2xl font-bold mt-6 mb-2 text-center">
        {t('booking.requestSent')}
      </Text>
      <Text className="text-ink-soft text-base text-center mb-10">
        {t('booking.requestSentBody')}
      </Text>
      <Pressable
        onPress={() => {
          log.info('BookMachine: go to bookings tapped');
          router.replace('/(renter)/bookings');
        }}
        className="bg-primary rounded-2xl py-4 px-8 items-center min-h-[52px] justify-center w-full"
      >
        <Text className="text-white font-bold text-base">{t('booking.viewMyBookings')}</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          log.info('BookMachine: continue browsing tapped');
          router.replace('/(renter)/discover');
        }}
        className="mt-4 py-3"
      >
        <Text className="text-primary font-semibold">{t('booking.continueBrowsing')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}
