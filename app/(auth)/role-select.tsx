/**
 * @file (auth)/role-select.tsx — fresh-user profile setup.
 * @module app
 *
 * Reached only when there's an authenticated session but no `profiles`
 * row yet. Captures display name + village + district and inserts the
 * profile via RLS-protected `createProfile` with `role='both'` baked in
 * — every new user can rent and list. Renter/owner UI is chosen later
 * from the Profile screen via the view-mode toggle.
 *
 * After insert, the navigation guard (mounted in _layout.tsx) detects
 * the new `session && profile` state and routes the user to their
 * default home — no manual `router.replace()` here.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { KARNATAKA_DISTRICTS } from '@/constants/karnataka-districts';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { auth } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';

const log = createLogger('AUTH');

const schema = z.object({
  display_name: z.string().min(2, 'Enter your full name'),
  village: z.string().min(2, 'Enter your village'),
  district: z.string().min(1, 'Select a district'),
});
type FormValues = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoleSelect() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
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
      display_name: '',
      village: '',
      district: '',
    },
  });

  const district = watch('district');

  const filteredDistricts = useMemo(
    () =>
      districtSearch.trim()
        ? KARNATAKA_DISTRICTS.filter((d) =>
            d.toLowerCase().includes(districtSearch.toLowerCase())
          )
        : KARNATAKA_DISTRICTS,
    [districtSearch]
  );

  // Defensive: root dispatcher should never let us reach here without session.
  if (!session) {
    log.warn('role-select reached without session — root dispatcher failure');
    return null;
  }

  const onSubmit = async (data: FormValues) => {
    log.info('Role-select: submit tapped');
    setBusy(true);
    try {
      // Why: every new user is created with role='both' so they can both
      // rent and list. The view-mode toggle in Profile lets them pick
      // which UI to see. No "I want to" question at signup.
      const profile = await auth.createProfile({
        id: session.user.id,
        role: 'both',
        display_name: data.display_name,
        village: data.village,
        district: data.district,
      });
      log.info('Role-select: profile created');
      setProfile(profile);
      // Why: navigation guard (mounted in _layout.tsx) sees the new
      // session+profile pair and routes to renter home automatically.
      // No manual router.replace() — single source of truth.
    } catch (err) {
      log.error('createProfile UI', err);
      Alert.alert(
        t('auth.roleSelect.errorTitle'),
        err instanceof Error ? err.message : t('common.tryAgain')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        className="flex-1 px-6 sm:px-8 md:max-w-2xl md:mx-auto md:w-full md:px-12 lg:max-w-3xl"
        contentContainerClassName="pb-12 sm:py-4 lg:py-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-ink text-2xl font-bold mt-6 mb-1">
          {t('auth.roleSelect.title')}
        </Text>
        <Text className="text-ink-soft text-base mb-8">
          {t('auth.roleSelect.subtitle')}
        </Text>

        {/* ── Form fields ── */}
        <Controller
          control={control}
          name="display_name"
          render={({ field: { onChange, value } }) => (
            <InputField
              label={t('auth.roleSelect.fullName')}
              value={value}
              onChangeText={onChange}
              placeholder={t('auth.roleSelect.fullNamePlaceholder')}
              autoCapitalize="words"
              autoComplete="name"
              error={errors.display_name?.message}
            />
          )}
        />

        <View className="mt-4">
          <Controller
            control={control}
            name="village"
            render={({ field: { onChange, value } }) => (
              <InputField
                label={t('auth.roleSelect.village')}
                value={value}
                onChangeText={onChange}
                placeholder={t('auth.roleSelect.villagePlaceholder')}
                autoCapitalize="words"
                error={errors.village?.message}
              />
            )}
          />
        </View>

        {/* ── District picker (styled as InputField) ── */}
        <View className="mt-4">
          <Text className="text-ink-soft text-sm font-medium mb-1.5">
            {t('auth.roleSelect.district')}
          </Text>
          <Pressable
            onPress={() => {
              log.info('Role-select: district picker opened');
              setDistrictSearch('');
              setDistrictPickerOpen(true);
            }}
            className={`flex-row items-center bg-surface rounded-xl px-4 min-h-[52px] border-2 ${
              errors.district ? 'border-error' : 'border-border'
            }`}
          >
            <Text
              className={`flex-1 text-base ${
                district ? 'text-ink' : 'text-ink-mute'
              }`}
            >
              {district || t('auth.roleSelect.districtPlaceholder')}
            </Text>
            <ChevronDown size={18} color={colors.inkMute} />
          </Pressable>
          {errors.district && (
            <Text className="text-error text-xs mt-1">
              {errors.district.message}
            </Text>
          )}
        </View>

        <Button
          label={busy ? t('common.saving') : t('auth.roleSelect.continue')}
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          size="lg"
          loading={busy}
          className="mt-8"
        />
      </ScrollView>

      {/* ── District picker modal ── */}
      <Modal
        visible={districtPickerOpen}
        animationType="slide"
        onRequestClose={() => setDistrictPickerOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-bg">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-border">
            <Text className="text-ink text-lg font-bold">
              {t('auth.roleSelect.selectDistrict')}
            </Text>
            <Pressable
              onPress={() => setDistrictPickerOpen(false)}
              hitSlop={12}
              className="min-h-[44px] justify-center"
            >
              <Text className="text-primary text-base font-medium">
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          {/* Search bar */}
          <View className="px-4 py-3 border-b border-border">
            <TextInput
              value={districtSearch}
              onChangeText={setDistrictSearch}
              placeholder={t('auth.roleSelect.searchDistrict')}
              placeholderTextColor={colors.inkMute}
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-base"
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filteredDistricts}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  // Why: district name is borderline-PII; log only that
                  // a selection happened, not which one.
                  log.info('Role-select: district picked');
                  setValue('district', item);
                  setDistrictPickerOpen(false);
                }}
                className="px-6 py-4 border-b border-border min-h-[52px] justify-center active:opacity-75"
              >
                <Text className="text-ink text-base">{item}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-ink-mute text-sm">
                  {t('auth.roleSelect.noDistrictFound')}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
