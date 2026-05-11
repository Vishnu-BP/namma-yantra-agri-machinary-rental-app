/**
 * @file (owner)/machine/[id]/edit.tsx — machine edit and delete screen.
 * @module app
 *
 * Pre-fills all editable fields from the existing machine row. Owner can:
 *   - Update specs, pricing, location, and status (active/paused/archived).
 *   - Delete the listing (with confirmation alert).
 *
 * Status toggle controls visibility in the renter's Discover feed:
 *   active   → appears in feed
 *   paused   → hidden from renters, preserved for re-activation
 *   archived → soft-deleted, stays in owner's history
 */
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CircleHelp } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useMachine, useDeleteMachine, useUpdateMachine } from '@/hooks/useMachines';
import { createLogger } from '@/lib/logger';
import { paiseToRupees, rupeesToPaise } from '@/lib/money';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/stores/authStore';
import type { MachineCondition, MachineStatus } from '@/types/database';

const log = createLogger('UI');

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITIONS: { value: MachineCondition; label: string }[] = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'needs_service', label: 'Needs service' },
];

const STATUSES: { value: MachineStatus; label: string; desc: string }[] = [
  { value: 'active', label: 'Active', desc: 'Visible to renters' },
  { value: 'paused', label: 'Paused', desc: 'Hidden from renters' },
  { value: 'archived', label: 'Archived', desc: 'Soft-deleted' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const editSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  yearOfPurchase: z.number().int().min(1980).max(CURRENT_YEAR),
  descriptionEn: z.string().min(10, 'Description must be at least 10 characters'),
  hourlyRupees: z.number().positive('Must be positive'),
  dailyRupees: z.number().positive('Must be positive'),
  minimumHours: z.number().int().min(1).max(24),
  village: z.string().min(2, 'Village is required'),
  district: z.string().min(2, 'District is required'),
  condition: z.enum(['excellent', 'good', 'fair', 'needs_service']),
  status: z.enum(['active', 'paused', 'archived']),
  lastServiceDate: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditMachine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const { data: machine, isLoading } = useMachine(id);
  const updateMutation = useUpdateMachine();
  const deleteMutation = useDeleteMachine();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const selectedCondition = watch('condition');
  const selectedStatus = watch('status');

  // Pre-fill form once machine data loads
  useEffect(() => {
    if (!machine) return;
    reset({
      title: machine.title,
      brand: machine.brand,
      model: machine.model,
      yearOfPurchase: machine.year_of_purchase,
      descriptionEn: machine.description_en,
      hourlyRupees: paiseToRupees(machine.hourly_rate_paise),
      dailyRupees: paiseToRupees(machine.daily_rate_paise),
      minimumHours: machine.minimum_hours,
      village: machine.village,
      district: machine.district,
      condition: machine.condition,
      status: machine.status,
      lastServiceDate: machine.last_service_date ?? '',
    });
  }, [machine, reset]);

  useEffect(() => {
    log.info('Edit machine: page visited', { id });
  }, [id]);

  const onSave = handleSubmit(async (data) => {
    if (!profile || !id) return;
    log.info('Edit machine: save tapped', { id });
    try {
      await updateMutation.mutateAsync({
        id,
        ownerId: profile.id,
        patch: {
          title: data.title,
          brand: data.brand,
          model: data.model,
          year_of_purchase: data.yearOfPurchase,
          description_en: data.descriptionEn,
          hourly_rate_paise: rupeesToPaise(data.hourlyRupees),
          daily_rate_paise: rupeesToPaise(data.dailyRupees),
          minimum_hours: data.minimumHours,
          village: data.village,
          district: data.district,
          condition: data.condition,
          status: data.status,
          last_service_date: data.lastServiceDate || null,
        },
      });
      log.info('Edit machine: save completed', { id });
      router.back();
    } catch (err) {
      log.error('Edit machine: save failed', err);
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Please try again.');
    }
  });

  const handleDelete = () => {
    if (!profile || !id) return;
    log.info('Edit machine: delete tapped', { id });
    Alert.alert(
      'Delete listing',
      'This will permanently remove the listing and all its photos. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            log.info('Edit machine: delete confirmed', { id });
            try {
              await deleteMutation.mutateAsync({ id, ownerId: profile.id });
              log.info('Edit machine: delete completed', { id });
              router.replace('/(owner)');
            } catch (err) {
              log.error('Edit machine: delete failed', err);
              Alert.alert('Delete failed', err instanceof Error ? err.message : 'Please try again.');
            }
          },
        },
      ],
    );
  };

  if (isLoading) return <LoadingState subtitle="Loading machine…" />;
  if (!machine) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <EmptyState
          icon={CircleHelp}
          title="Machine not found"
          body="This listing may have been removed."
          ctaLabel="Back"
          onCtaPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-surface border border-border"
        >
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-ink text-lg font-bold" numberOfLines={1}>
            Edit: {machine.title}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Status toggle */}
        <Text className="text-ink font-semibold text-sm mb-2">Status</Text>
        <View className="gap-2 mb-5">
          {STATUSES.map(({ value, label, desc }) => (
            <Pressable
              key={value}
              onPress={() => setValue('status', value)}
              className={`flex-row items-center gap-3 p-3 rounded-xl border ${
                selectedStatus === value ? 'bg-primary/10 border-primary' : 'bg-surface border-border'
              }`}
            >
              <View
                className={`w-4 h-4 rounded-full border-2 ${
                  selectedStatus === value ? 'bg-primary border-primary' : 'border-border'
                }`}
              />
              <View>
                <Text
                  className={`text-sm font-semibold ${
                    selectedStatus === value ? 'text-primary' : 'text-ink'
                  }`}
                >
                  {label}
                </Text>
                <Text className="text-ink-mute text-xs">{desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Title */}
        <Text className="text-ink font-semibold text-sm mb-2">Title</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              value={value}
              onChangeText={onChange}
              maxLength={80}
            />
          )}
        />
        {errors.title && <Text className="text-error text-xs mb-3">{errors.title.message}</Text>}

        {/* Brand */}
        <Text className="text-ink font-semibold text-sm mb-2">Brand</Text>
        <Controller
          control={control}
          name="brand"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.brand && <Text className="text-error text-xs mb-3">{errors.brand.message}</Text>}

        {/* Model */}
        <Text className="text-ink font-semibold text-sm mb-2">Model</Text>
        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.model && <Text className="text-error text-xs mb-3">{errors.model.message}</Text>}

        {/* Year */}
        <Text className="text-ink font-semibold text-sm mb-2">Year of purchase</Text>
        <Controller
          control={control}
          name="yearOfPurchase"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-4"
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
            />
          )}
        />

        {/* Description */}
        <Text className="text-ink font-semibold text-sm mb-2">Description</Text>
        <Controller
          control={control}
          name="descriptionEn"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-4"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          )}
        />

        {/* Pricing */}
        <Text className="text-ink font-semibold text-sm mb-2">Hourly rate (₹)</Text>
        <Controller
          control={control}
          name="hourlyRupees"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(t) => onChange(parseFloat(t) || 0)}
            />
          )}
        />
        {errors.hourlyRupees && (
          <Text className="text-error text-xs mb-3">{errors.hourlyRupees.message}</Text>
        )}

        <Text className="text-ink font-semibold text-sm mb-2">Daily rate (₹)</Text>
        <Controller
          control={control}
          name="dailyRupees"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-4"
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(t) => onChange(parseFloat(t) || 0)}
            />
          )}
        />

        {/* Condition */}
        <Text className="text-ink font-semibold text-sm mb-2">Condition</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {CONDITIONS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setValue('condition', value)}
              className={`px-3 py-2 rounded-xl border ${
                selectedCondition === value ? 'bg-primary border-primary' : 'bg-surface border-border'
              }`}
            >
              <Text
                className={`text-sm ${selectedCondition === value ? 'text-white' : 'text-ink-soft'}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Village + district */}
        <Text className="text-ink font-semibold text-sm mb-2">Village</Text>
        <Controller
          control={control}
          name="village"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-4"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Text className="text-ink font-semibold text-sm mb-2">District</Text>
        <Controller
          control={control}
          name="district"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-6"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        {/* Delete zone */}
        <View className="border border-error/30 rounded-2xl p-4">
          <Text className="text-ink font-semibold mb-1">Danger zone</Text>
          <Text className="text-ink-mute text-sm mb-3">
            Deleting this listing removes all photos and cannot be undone.
          </Text>
          <Pressable
            onPress={handleDelete}
            disabled={isBusy}
            className="bg-error rounded-xl py-3 items-center min-h-[44px] justify-center"
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">Delete listing</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <View className="px-4 pb-6">
        <Pressable
          onPress={() => void onSave()}
          disabled={isBusy}
          className="bg-primary rounded-2xl py-4 items-center min-h-[52px] justify-center"
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text className="text-white font-bold text-base">Save changes</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
