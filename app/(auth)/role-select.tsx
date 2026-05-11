/**
 * @file (auth)/role-select.tsx — fresh-user profile setup.
 * @module app
 *
 * Reached only when there's an authenticated session but no `profiles`
 * row yet. Captures role + display name + village + district, inserts
 * the profile via RLS-protected `createProfile`, then bounces through
 * the root dispatcher which routes to the correct role home.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { KARNATAKA_DISTRICTS } from '@/constants/karnataka-districts';
import { auth } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';

const log = createLogger('AUTH');

const schema = z.object({
  role: z.enum(['renter', 'owner', 'both']),
  display_name: z.string().min(2, 'Enter your full name'),
  village: z.string().min(2, 'Enter your village'),
  district: z.string().min(1, 'Select a district'),
});
type FormValues = z.infer<typeof schema>;

const ROLE_OPTIONS: { value: FormValues['role']; label: string }[] = [
  { value: 'renter', label: 'Rent machinery' },
  { value: 'owner', label: 'List my machinery' },
  { value: 'both', label: 'Both' },
];

export default function RoleSelect() {
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    log.info('Role-select: page visited');
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'renter',
      display_name: '',
      village: '',
      district: '',
    },
  });

  const role = watch('role');
  const district = watch('district');

  // Defensive: root dispatcher should never let us reach here without session.
  if (!session) {
    log.warn('role-select reached without session — root dispatcher failure');
    return null;
  }

  const onSubmit = async (data: FormValues) => {
    log.info('Role-select: submit tapped', { role: data.role });
    setBusy(true);
    try {
      const profile = await auth.createProfile({
        id: session.user.id,
        role: data.role,
        display_name: data.display_name,
        village: data.village,
        district: data.district,
      });
      log.info('Role-select: profile created', { role: profile.role });
      setProfile(profile);
      // Why: navigate directly to the chosen role's home. We just got the
      // profile back so we know exactly which group to land in.
      router.replace(profile.role === 'owner' ? '/(owner)' : '/(renter)');
    } catch (err) {
      log.error('createProfile UI', err);
      Alert.alert(
        'Could not save profile',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Why: same responsive pattern as (auth)/index.tsx — see that file's note. */}
      <ScrollView
        className="flex-1 px-6 sm:px-8 md:max-w-2xl md:mx-auto md:w-full md:px-12 lg:max-w-3xl"
        contentContainerClassName="pb-12 sm:py-4 lg:py-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-ink text-2xl font-semibold mt-6 mb-2">
          Tell us about yourself
        </Text>
        <Text className="text-ink-soft text-base mb-8">
          A few quick details so we can match you with nearby machines or renters.
        </Text>

        <Text className="text-ink-soft text-sm mb-2">I want to</Text>
        <View className="flex-row gap-2 mb-6">
          {ROLE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                log.info('Role-select: role chosen', { role: opt.value });
                setValue('role', opt.value);
              }}
              className={`flex-1 rounded-xl py-3 items-center border min-h-[44px] justify-center ${
                role === opt.value
                  ? 'bg-primary border-primary'
                  : 'bg-surface border-border'
              }`}
            >
              <Text
                className={`${
                  role === opt.value ? 'text-white' : 'text-ink'
                } font-medium text-center`}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-ink-soft text-sm mb-2">Full name</Text>
        <Controller
          control={control}
          name="display_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Your full name"
              placeholderTextColor={colors.inkMute}
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-base mb-1"
            />
          )}
        />
        {errors.display_name && (
          <Text className="text-error text-sm mb-3">
            {errors.display_name.message}
          </Text>
        )}

        <Text className="text-ink-soft text-sm mb-2 mt-3">Village</Text>
        <Controller
          control={control}
          name="village"
          render={({ field: { onChange, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder="Village name"
              placeholderTextColor={colors.inkMute}
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-base mb-1"
            />
          )}
        />
        {errors.village && (
          <Text className="text-error text-sm mb-3">
            {errors.village.message}
          </Text>
        )}

        <Text className="text-ink-soft text-sm mb-2 mt-3">District</Text>
        <Pressable
          onPress={() => {
            log.info('Role-select: district picker opened');
            setDistrictPickerOpen(true);
          }}
          className="bg-surface border border-border rounded-xl px-4 py-3 mb-1 min-h-[44px] justify-center"
        >
          <Text
            className={
              district ? 'text-ink text-base' : 'text-ink-mute text-base'
            }
          >
            {district || 'Select a district'}
          </Text>
        </Pressable>
        {errors.district && (
          <Text className="text-error text-sm mb-3">
            {errors.district.message}
          </Text>
        )}

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={busy}
          className="bg-primary rounded-xl py-4 items-center mt-8 min-h-[44px] justify-center"
        >
          <Text className="text-white text-base font-semibold">
            {busy ? 'Saving…' : 'Continue'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={districtPickerOpen}
        animationType="slide"
        onRequestClose={() => setDistrictPickerOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-bg">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-border">
            <Text className="text-ink text-lg font-semibold">
              Select district
            </Text>
            <Pressable
              onPress={() => setDistrictPickerOpen(false)}
              hitSlop={12}
              className="min-h-[44px] justify-center"
            >
              <Text className="text-primary text-base">Close</Text>
            </Pressable>
          </View>
          <FlatList
            data={KARNATAKA_DISTRICTS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  // Why: district name is borderline-PII; log only that
                  // a selection happened, not which one.
                  log.info('Role-select: district picked');
                  setValue('district', item);
                  setDistrictPickerOpen(false);
                }}
                className="px-6 py-4 border-b border-border min-h-[44px] justify-center"
              >
                <Text className="text-ink text-base">{item}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
