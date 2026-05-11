/**
 * @file add-machine/details.tsx — Step 2: Machine specifications form.
 * @module app
 *
 * Collects: category, brand, model, year, horsepower (optional), features
 * (multi-select chips), title, and English description. All fields are
 * validated via Zod + React Hook Form before advancing to Step 3.
 * Values are persisted in addMachineStore so back-navigation preserves state.
 */
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';
import { useAddMachineStore } from '@/stores/addMachineStore';
import type { MachineCategory } from '@/types/database';

const log = createLogger('UI');

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1980;

const CATEGORIES: { value: MachineCategory; label: string }[] = [
  { value: 'tractor', label: 'Tractor' },
  { value: 'harvester', label: 'Harvester' },
  { value: 'sprayer', label: 'Sprayer' },
  { value: 'tiller', label: 'Tiller' },
  { value: 'other', label: 'Other' },
];

const BRANDS = [
  'Mahindra', 'Sonalika', 'John Deere', 'Eicher',
  'Massey Ferguson', 'New Holland', 'TAFE', 'Kubota', 'Force', 'Escorts',
];

const FEATURE_OPTIONS = [
  'GPS', 'AC Cabin', 'Power Steering', 'Rotavator', 'Front Loader', 'Hydraulics',
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  category: z.enum(['tractor', 'harvester', 'sprayer', 'tiller', 'other']),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  yearOfPurchase: z
    .number()
    .int()
    .min(MIN_YEAR, `Year must be ${MIN_YEAR} or later`)
    .max(CURRENT_YEAR, `Year can't be in the future`),
  horsepower: z.number().positive().optional(),
  features: z.array(z.string()),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  descriptionEn: z.string().min(10, 'Description must be at least 10 characters'),
});

type DetailsForm = z.infer<typeof detailsSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddMachineDetails() {
  const store = useAddMachineStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      category: store.category as DetailsForm['category'],
      brand: store.brand,
      model: store.model,
      yearOfPurchase: store.yearOfPurchase,
      horsepower: store.horsepower,
      features: store.features,
      title: store.title,
      descriptionEn: store.descriptionEn,
    },
  });

  const selectedFeatures = watch('features');
  const selectedCategory = watch('category');
  const selectedBrand = watch('brand');

  useEffect(() => {
    log.info('Add machine details: page visited');
  }, []);

  const toggleFeature = (feat: string) => {
    const current = selectedFeatures ?? [];
    const next = current.includes(feat)
      ? current.filter((f) => f !== feat)
      : [...current, feat];
    setValue('features', next);
  };

  const onSubmit = handleSubmit((data) => {
    log.info('Add machine details: continue tapped');
    store.set('category', data.category);
    store.set('brand', data.brand);
    store.set('model', data.model);
    store.set('yearOfPurchase', data.yearOfPurchase);
    store.set('horsepower', data.horsepower);
    store.set('features', data.features);
    store.set('title', data.title);
    store.set('descriptionEn', data.descriptionEn);
    router.push('/(owner)/add-machine/pricing' as Parameters<typeof router.push>[0]);
  });

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
          <Text className="text-ink-mute text-xs">Step 2 of 3</Text>
          <Text className="text-ink text-lg font-bold">Machine details</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Category */}
        <Text className="text-ink font-semibold text-sm mb-2">Category</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {CATEGORIES.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setValue('category', value as DetailsForm['category'])}
              className={`px-4 py-2 rounded-xl border ${
                selectedCategory === value
                  ? 'bg-primary border-primary'
                  : 'bg-surface border-border'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCategory === value ? 'text-white' : 'text-ink-soft'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Brand */}
        <Text className="text-ink font-semibold text-sm mb-2">Brand</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {BRANDS.map((b) => (
            <Pressable
              key={b}
              onPress={() => setValue('brand', b)}
              className={`px-3 py-2 rounded-xl border ${
                selectedBrand === b ? 'bg-primary border-primary' : 'bg-surface border-border'
              }`}
            >
              <Text
                className={`text-sm ${selectedBrand === b ? 'text-white' : 'text-ink-soft'}`}
              >
                {b}
              </Text>
            </Pressable>
          ))}
        </View>
        {errors.brand && (
          <Text className="text-error text-xs mb-2">{errors.brand.message}</Text>
        )}

        {/* Model */}
        <Text className="text-ink font-semibold text-sm mb-2">Model</Text>
        <Controller
          control={control}
          name="model"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              placeholder="e.g. 575 DI"
              placeholderTextColor={colors.inkMute}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.model && (
          <Text className="text-error text-xs mb-3">{errors.model.message}</Text>
        )}

        {/* Year */}
        <Text className="text-ink font-semibold text-sm mb-2">Year of purchase</Text>
        <Controller
          control={control}
          name="yearOfPurchase"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              placeholder={`${CURRENT_YEAR}`}
              placeholderTextColor={colors.inkMute}
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
            />
          )}
        />
        {errors.yearOfPurchase && (
          <Text className="text-error text-xs mb-3">{errors.yearOfPurchase.message}</Text>
        )}

        {/* Horsepower (optional) */}
        <Text className="text-ink font-semibold text-sm mb-2">
          Horsepower <Text className="text-ink-mute font-normal">(optional)</Text>
        </Text>
        <Controller
          control={control}
          name="horsepower"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-4"
              placeholder="e.g. 50"
              placeholderTextColor={colors.inkMute}
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(t) => {
                const n = parseFloat(t);
                onChange(isNaN(n) ? undefined : n);
              }}
            />
          )}
        />

        {/* Features */}
        <Text className="text-ink font-semibold text-sm mb-2">Features</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {FEATURE_OPTIONS.map((feat) => {
            const active = (selectedFeatures ?? []).includes(feat);
            return (
              <Pressable
                key={feat}
                onPress={() => toggleFeature(feat)}
                className={`px-3 py-2 rounded-xl border ${
                  active ? 'bg-accent border-accent' : 'bg-surface border-border'
                }`}
              >
                <Text className={`text-sm ${active ? 'text-white' : 'text-ink-soft'}`}>
                  {feat}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Title */}
        <Text className="text-ink font-semibold text-sm mb-2">Listing title</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              placeholder="e.g. Mahindra 575 with Rotavator"
              placeholderTextColor={colors.inkMute}
              value={value}
              onChangeText={onChange}
              maxLength={80}
            />
          )}
        />
        {errors.title && (
          <Text className="text-error text-xs mb-3">{errors.title.message}</Text>
        )}

        {/* Description */}
        <Text className="text-ink font-semibold text-sm mb-2">Description (English)</Text>
        <Controller
          control={control}
          name="descriptionEn"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              placeholder="Describe the machine's condition, attachments, and suitability."
              placeholderTextColor={colors.inkMute}
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          )}
        />
        {errors.descriptionEn && (
          <Text className="text-error text-xs mb-3">{errors.descriptionEn.message}</Text>
        )}
      </ScrollView>

      <View className="px-4 pb-6">
        <Pressable
          onPress={() => void onSubmit()}
          className="bg-primary rounded-2xl py-4 items-center min-h-[52px] justify-center"
        >
          <Text className="text-white font-bold text-base">Continue to pricing</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
