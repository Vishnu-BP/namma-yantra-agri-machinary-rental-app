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

import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { addHours, format, setHours, setMinutes, setSeconds } from 'date-fns';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
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
const TOTAL_STEPS = 3;

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 3-segment progress bar replaces "Step N of 3" text */
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
    <View className="px-4 pt-4 pb-2">
      {/* Progress segments */}
      <View className="flex-row gap-1.5 mb-4">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            className={`flex-1 h-1.5 rounded-full ${
              i < step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onBack}
          className="w-10 h-10 items-center justify-center rounded-full bg-surface border border-border shadow-card"
        >
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <Text className="text-ink text-lg font-bold flex-1">{title}</Text>
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

  if (machineLoading || !machine) return <LoadingState layout="card-detail" />;

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
          {/* Calendar with shadow wrapper */}
          <View className="shadow-card rounded-2xl mb-5 overflow-hidden">
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
              style={{ borderRadius: 16 }}
            />
          </View>

          {/* Duration unit toggle */}
          <Text className="text-ink font-semibold text-sm mb-2">{t('booking.rentalType')}</Text>
          <View className="flex-row gap-3 mb-4">
            {(['hourly', 'daily'] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => setDurationUnit(unit)}
                className={`flex-1 py-3 rounded-xl items-center border-2 ${
                  durationUnit === unit
                    ? 'bg-primary border-primary shadow-cta'
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

          {/* Start hour chips (hourly only) — larger touch targets */}
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
                    className={`w-14 h-12 rounded-xl items-center justify-center border-2 ${
                      startHour === h ? 'bg-primary border-primary shadow-cta' : 'bg-surface border-border'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${startHour === h ? 'text-white' : 'text-ink-soft'}`}
                    >
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Duration hours chips (hourly only) — larger touch targets */}
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
                    className={`w-14 h-12 rounded-xl items-center justify-center border-2 ${
                      durationHours === h ? 'bg-primary border-primary shadow-cta' : 'bg-surface border-border'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${durationHours === h ? 'text-white' : 'text-ink-soft'}`}
                    >
                      {h}h
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Price preview card — elevated */}
          {pricing && selectedDate && (
            <View className="bg-surfaceElevated rounded-2xl p-4 border border-primary/30 shadow-card mb-4">
              <Text className="text-ink-mute text-xs uppercase tracking-wide mb-1">{t('booking.estimatedTotal')}</Text>
              <Text className="text-primary text-3xl font-bold">{formatPaise(pricing.totalPaise)}</Text>
              <Text className="text-ink-soft text-sm mt-1">{pricing.label}</Text>
            </View>
          )}
        </ScrollView>

        <View className="px-4 pb-6">
          <Button
            label={canProceedToStep2 ? t('booking.reviewBooking') : t('booking.selectDate')}
            onPress={() => {
              log.info('BookMachine: proceed to review tapped');
              setStep(2);
            }}
            variant="primary"
            size="lg"
            disabled={!canProceedToStep2}
          />
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
          {/* Machine + booking summary — elevated card */}
          <View className="bg-surfaceElevated border border-primary/30 rounded-2xl p-4 shadow-card mb-5">
            <Text className="text-ink font-bold text-base mb-1">{machine.title}</Text>
            <Text className="text-ink-soft text-sm mb-3">
              {machine.brand} {machine.model} · {machine.village}
            </Text>
            <View className="h-px bg-border mb-3" />
            <Text className="text-ink-soft text-sm mb-1">
              {format(s, 'd MMM yyyy')}
              {durationUnit === 'hourly' ? ` · ${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}` : ' · Full day'}
            </Text>
            <Text className="text-ink-soft text-sm capitalize mb-4">{durationUnit} rental</Text>
            <Text className="text-primary text-3xl font-bold">{formatPaise(reviewPricing.totalPaise)}</Text>
            <Text className="text-ink-mute text-sm mt-0.5">{reviewPricing.label}</Text>
          </View>

          {/* Renter note via InputField */}
          <Controller
            control={control}
            name="renterNote"
            render={({ field: { onChange, value } }) => (
              <InputField
                label={t('booking.noteToOwner')}
                value={value ?? ''}
                onChangeText={onChange}
                placeholder={t('booking.notePlaceholder')}
                multiline
                numberOfLines={3}
                maxLength={300}
                error={errors.renterNote?.message}
                hint={t('booking.ownerNotified')}
              />
            )}
          />
        </ScrollView>

        <View className="px-4 pb-6">
          <Button
            label={t('booking.sendRequest')}
            onPress={() => void onSubmit()}
            variant="primary"
            size="lg"
            loading={createBookingMutation.isPending}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 3: Confirm ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6" edges={['top', 'bottom']}>
      {/* LinearGradient success circle */}
      <LinearGradient
        colors={[colors.accent, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 9999, padding: 28, marginBottom: 24 }}
      >
        <CheckCircle size={56} color="#FFFFFF" />
      </LinearGradient>
      <Text className="text-ink text-2xl font-bold mb-2 text-center">
        {t('booking.requestSent')}
      </Text>
      <Text className="text-ink-soft text-base text-center mb-10 max-w-[280px] leading-6">
        {t('booking.requestSentBody')}
      </Text>
      <Button
        label={t('booking.viewMyBookings')}
        onPress={() => {
          log.info('BookMachine: go to bookings tapped');
          router.replace('/(renter)/bookings');
        }}
        variant="primary"
        size="lg"
        className="w-full"
      />
      <Button
        label={t('booking.continueBrowsing')}
        onPress={() => {
          log.info('BookMachine: continue browsing tapped');
          router.replace('/(renter)/discover');
        }}
        variant="ghost"
        className="mt-2"
      />
    </SafeAreaView>
  );
}
