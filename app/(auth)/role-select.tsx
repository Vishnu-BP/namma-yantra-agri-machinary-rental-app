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
import { ChevronDown, ShoppingCart, Tractor, Users } from 'lucide-react-native';
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
  role: z.enum(['renter', 'owner', 'both']),
  display_name: z.string().min(2, 'Enter your full name'),
  village: z.string().min(2, 'Enter your village'),
  district: z.string().min(1, 'Select a district'),
});
type FormValues = z.infer<typeof schema>;

// ─── Constants ────────────────────────────────────────────────────────────────

type RoleOption = { value: FormValues['role']; labelKey: string; icon: typeof Tractor };

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'renter', labelKey: 'auth.roleSelect.rentMachinery', icon: ShoppingCart },
  { value: 'owner', labelKey: 'auth.roleSelect.listMachinery', icon: Tractor },
  { value: 'both', labelKey: 'auth.roleSelect.both', icon: Users },
];

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
      role: 'renter',
      display_name: '',
      village: '',
      district: '',
    },
  });

  const role = watch('role');
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
        t('auth.roleSelect.errorTitle'),
        err instanceof Error ? err.message : t('common.tryAgain')
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
        <Text className="text-ink text-2xl font-bold mt-6 mb-1">
          {t('auth.roleSelect.title')}
        </Text>
        <Text className="text-ink-soft text-base mb-8">
          {t('auth.roleSelect.subtitle')}
        </Text>

        {/* ── Role chips ── */}
        <Text className="text-ink-soft text-sm font-medium mb-3">
          {t('auth.roleSelect.iWantTo')}
        </Text>
        <View className="flex-row gap-2 mb-6">
          {ROLE_OPTIONS.map((opt) => {
            const selected = role === opt.value;
            const RoleIcon = opt.icon;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  log.info('Role-select: role chosen', { role: opt.value });
                  setValue('role', opt.value);
                }}
                className={`flex-1 rounded-2xl py-4 items-center border-2 min-h-[72px] justify-center gap-1.5 ${
                  selected
                    ? 'bg-primary border-primary shadow-cta'
                    : 'bg-surface border-border shadow-card'
                }`}
              >
                <RoleIcon size={20} color={selected ? '#FFFFFF' : colors.primary} />
                <Text
                  className={`font-semibold text-xs text-center ${
                    selected ? 'text-white' : 'text-ink'
                  }`}
                  numberOfLines={2}
                >
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
