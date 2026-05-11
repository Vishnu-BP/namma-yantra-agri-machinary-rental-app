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
import { AlertTriangle, ArrowLeft, CircleHelp, Trash2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
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

  if (isLoading) return <LoadingState layout="card-detail" />;
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
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <InputField label="Title" value={value ?? ''} onChangeText={onChange} maxLength={80} error={errors.title?.message} />
          )}
        />

        {/* Brand */}
        <View className="mt-4">
          <Controller
            control={control}
            name="brand"
            render={({ field: { onChange, value } }) => (
              <InputField label="Brand" value={value ?? ''} onChangeText={onChange} error={errors.brand?.message} />
            )}
          />
        </View>

        {/* Model */}
        <View className="mt-4">
          <Controller
            control={control}
            name="model"
            render={({ field: { onChange, value } }) => (
              <InputField label="Model" value={value ?? ''} onChangeText={onChange} error={errors.model?.message} />
            )}
          />
        </View>

        {/* Year */}
        <View className="mt-4">
          <Controller
            control={control}
            name="yearOfPurchase"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Year of purchase"
                value={value ? String(value) : ''}
                onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
                keyboardType="numeric"
              />
            )}
          />
        </View>

        {/* Description */}
        <View className="mt-4">
          <Controller
            control={control}
            name="descriptionEn"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Description"
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                numberOfLines={4}
                maxLength={500}
                error={errors.descriptionEn?.message}
              />
            )}
          />
        </View>

        {/* Pricing */}
        <View className="mt-4">
          <Controller
            control={control}
            name="hourlyRupees"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Hourly rate"
                prefix="₹"
                value={value ? String(value) : ''}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                keyboardType="numeric"
                error={errors.hourlyRupees?.message}
              />
            )}
          />
        </View>

        <View className="mt-4">
          <Controller
            control={control}
            name="dailyRupees"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Daily rate"
                prefix="₹"
                value={value ? String(value) : ''}
                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                keyboardType="numeric"
                error={errors.dailyRupees?.message}
              />
            )}
          />
        </View>

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
        <View className="mt-4">
          <Controller
            control={control}
            name="village"
            render={({ field: { onChange, value } }) => (
              <InputField label="Village" value={value ?? ''} onChangeText={onChange} error={errors.village?.message} />
            )}
          />
        </View>

        <View className="mt-4 mb-6">
          <Controller
            control={control}
            name="district"
            render={({ field: { onChange, value } }) => (
              <InputField label="District" value={value ?? ''} onChangeText={onChange} error={errors.district?.message} />
            )}
          />
        </View>

        {/* Danger zone */}
        <View className="bg-error/5 border border-error/30 rounded-2xl p-4">
          <View className="flex-row items-center gap-2 mb-2">
            <AlertTriangle size={16} color={colors.error} />
            <Text className="text-error font-semibold text-sm">Danger zone</Text>
          </View>
          <Text className="text-ink-mute text-sm mb-4">
            Deleting this listing removes all photos and cannot be undone.
          </Text>
          <Button
            label="Delete listing"
            onPress={handleDelete}
            variant="danger"
            icon={Trash2}
            loading={deleteMutation.isPending}
            disabled={isBusy}
          />
        </View>
      </ScrollView>

      <View className="px-4 pb-6">
        <Button
          label="Save changes"
          onPress={() => void onSave()}
          variant="primary"
          size="lg"
          loading={updateMutation.isPending}
          disabled={isBusy}
        />
      </View>
    </SafeAreaView>
  );
}
