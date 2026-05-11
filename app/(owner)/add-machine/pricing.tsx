/**
 * @file add-machine/pricing.tsx — Step 3: Pricing, location, and publish.
 * @module app
 *
 * Collects: hourly rate (₹), daily rate (₹), minimum hours, village, district,
 * condition, and last service date. A MapView pin defaults to the owner's home
 * coordinates and can be dragged to the actual farm location.
 *
 * On "Publish listing":
 *   1. createMachine() → machineId
 *   2. Upload each image with uploadMachineImage()
 *   3. updateMachineImages() to patch URLs
 *   4. Reset addMachineStore
 *   5. Navigate to owner listings
 */
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MapLocationPicker } from '@/components/machine/MapLocationPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { createLogger } from '@/lib/logger';
import { rupeesToPaise } from '@/lib/money';
import { colors } from '@/theme/colors';
import { useAddMachineStore } from '@/stores/addMachineStore';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { useCreateMachine } from '@/hooks/useMachines';
import type { MachineCondition } from '@/types/database';

const log = createLogger('UI');

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITIONS: { value: MachineCondition; label: string }[] = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'needs_service', label: 'Needs service' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const pricingSchema = z.object({
  hourlyRupees: z.number().positive('Hourly rate must be greater than 0'),
  dailyRupees: z.number().positive('Daily rate must be greater than 0'),
  minimumHours: z.number().int().min(1).max(24),
  village: z.string().min(2, 'Village is required'),
  district: z.string().min(2, 'District is required'),
  condition: z.enum(['excellent', 'good', 'fair', 'needs_service']),
  lastServiceDate: z.string().optional(),
});

type PricingForm = z.infer<typeof pricingSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddMachinePricing() {
  const store = useAddMachineStore();
  const profile = useAuthStore((s) => s.profile);
  const coords = useLocationStore((s) => s.coords);
  const createMachineMutation = useCreateMachine();

  const [uploadStatus, setUploadStatus] = useState('');
  const [mapLat, setMapLat] = useState(
    store.locationLat !== 0 ? store.locationLat : (coords?.lat ?? 12.5218),
  );
  const [mapLng, setMapLng] = useState(
    store.locationLng !== 0 ? store.locationLng : (coords?.lng ?? 76.8951),
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      hourlyRupees: store.hourlyRupees || undefined,
      dailyRupees: store.dailyRupees || undefined,
      minimumHours: store.minimumHours,
      village: store.village || profile?.village || '',
      district: store.district || profile?.district || '',
      condition: store.condition,
      lastServiceDate: store.lastServiceDate || '',
    },
  });

  const selectedCondition = watch('condition');

  useEffect(() => {
    log.info('Add machine pricing: page visited');
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    if (!profile) return;
    log.info('Add machine pricing: publish tapped', { category: store.category });

    store.set('hourlyRupees', data.hourlyRupees);
    store.set('dailyRupees', data.dailyRupees);
    store.set('minimumHours', data.minimumHours);
    store.set('village', data.village);
    store.set('district', data.district);
    store.set('condition', data.condition);
    store.set('lastServiceDate', data.lastServiceDate ?? '');
    store.set('locationLat', mapLat);
    store.set('locationLng', mapLng);

    try {
      setUploadStatus('Creating listing…');
      await createMachineMutation.mutateAsync({
        input: {
          ownerId: profile.id,
          ownerName: profile.display_name,
          ownerPhone: profile.phone_number ?? null,
          ownerVillage: profile.village,
          category: store.category,
          brand: store.brand,
          model: store.model,
          yearOfPurchase: store.yearOfPurchase,
          horsepower: store.horsepower,
          features: store.features,
          title: store.title,
          descriptionEn: store.descriptionEn,
          descriptionKn: store.descriptionKn,
          hourlyRatePaise: rupeesToPaise(data.hourlyRupees),
          dailyRatePaise: rupeesToPaise(data.dailyRupees),
          minimumHours: data.minimumHours,
          locationLat: mapLat,
          locationLng: mapLng,
          village: data.village,
          district: data.district,
          condition: data.condition,
          lastServiceDate: data.lastServiceDate || undefined,
        },
        imageLocalUris: store.imageLocalUris,
        primaryIndex: store.primaryIndex,
      });
      log.info('Add machine pricing: machine published');
      store.reset();
      router.replace('/(owner)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      log.error('Add machine pricing: publish failed', err);
      Alert.alert('Publish failed', msg);
    } finally {
      setUploadStatus('');
    }
  });

  const isPending = createMachineMutation.isPending;

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
          <Text className="text-ink-mute text-xs">Step 3 of 3</Text>
          <Text className="text-ink text-lg font-bold">Pricing &amp; location</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Hourly rate */}
        <Text className="text-ink font-semibold text-sm mb-2">Hourly rate (₹)</Text>
        <Controller
          control={control}
          name="hourlyRupees"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              placeholder="e.g. 400"
              placeholderTextColor={colors.inkMute}
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(t) => onChange(parseFloat(t) || 0)}
            />
          )}
        />
        {errors.hourlyRupees && (
          <Text className="text-error text-xs mb-3">{errors.hourlyRupees.message}</Text>
        )}

        {/* Daily rate */}
        <Text className="text-ink font-semibold text-sm mb-2">Daily rate (₹)</Text>
        <Controller
          control={control}
          name="dailyRupees"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              placeholder="e.g. 2500"
              placeholderTextColor={colors.inkMute}
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(t) => onChange(parseFloat(t) || 0)}
            />
          )}
        />
        {errors.dailyRupees && (
          <Text className="text-error text-xs mb-3">{errors.dailyRupees.message}</Text>
        )}

        {/* Minimum hours */}
        <Text className="text-ink font-semibold text-sm mb-2">Minimum rental hours</Text>
        <Controller
          control={control}
          name="minimumHours"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[1, 2, 3, 4, 6, 8].map((h) => (
                <Pressable
                  key={h}
                  onPress={() => onChange(h)}
                  className={`px-4 py-2 rounded-xl border ${
                    value === h ? 'bg-primary border-primary' : 'bg-surface border-border'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${value === h ? 'text-white' : 'text-ink-soft'}`}
                  >
                    {h} hr
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />

        {/* Condition */}
        <Text className="text-ink font-semibold text-sm mb-2">Machine condition</Text>
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

        {/* Last service date */}
        <Text className="text-ink font-semibold text-sm mb-2">
          Last service date <Text className="text-ink-mute font-normal">(YYYY-MM-DD, optional)</Text>
        </Text>
        <Controller
          control={control}
          name="lastServiceDate"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-4"
              placeholder="e.g. 2025-03-15"
              placeholderTextColor={colors.inkMute}
              value={value ?? ''}
              onChangeText={onChange}
            />
          )}
        />

        {/* Village + District */}
        <Text className="text-ink font-semibold text-sm mb-2">Village</Text>
        <Controller
          control={control}
          name="village"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-1"
              placeholder="e.g. Maddur"
              placeholderTextColor={colors.inkMute}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.village && (
          <Text className="text-error text-xs mb-3">{errors.village.message}</Text>
        )}

        <Text className="text-ink font-semibold text-sm mb-2">District</Text>
        <Controller
          control={control}
          name="district"
          render={({ field: { onChange, value } }) => (
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 py-3 text-ink text-sm mb-4"
              placeholder="e.g. Mandya"
              placeholderTextColor={colors.inkMute}
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.district && (
          <Text className="text-error text-xs mb-3">{errors.district.message}</Text>
        )}

        {/* Map pin — uses platform-specific MapLocationPicker to avoid web bundling react-native-maps */}
        <Text className="text-ink font-semibold text-sm mb-2">Farm location</Text>
        <MapLocationPicker
          lat={mapLat}
          lng={mapLng}
          onLocationChange={(lat, lng) => {
            log.info('Add machine pricing: location changed', { lat, lng });
            setMapLat(lat);
            setMapLng(lng);
          }}
        />
      </ScrollView>

      <View className="px-4 pb-6">
        {uploadStatus !== '' && (
          <Text className="text-ink-mute text-xs text-center mb-2">{uploadStatus}</Text>
        )}
        <Pressable
          onPress={() => void onSubmit()}
          disabled={isPending}
          className="bg-primary rounded-2xl py-4 items-center min-h-[52px] justify-center"
        >
          {isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text className="text-white font-bold text-base">Publish listing</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
