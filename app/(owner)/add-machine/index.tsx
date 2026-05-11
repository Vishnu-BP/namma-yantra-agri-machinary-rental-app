/**
 * @file add-machine/index.tsx — Step 1: Photo picker.
 * @module app
 *
 * Owner picks up to 5 photos from their gallery. Tapping a selected photo
 * marks it as the primary (starred) image shown in the listing card.
 * URIs are stored in addMachineStore; actual upload happens at the end of
 * Step 3 after the machine row is created.
 */
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ArrowLeft, Plus, Star, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';
import { useAddMachineStore } from '@/stores/addMachineStore';

const log = createLogger('UI');

const MAX_PHOTOS = 5;

export default function AddMachinePhotos() {
  const imageLocalUris = useAddMachineStore((s) => s.imageLocalUris);
  const primaryIndex = useAddMachineStore((s) => s.primaryIndex);
  const set = useAddMachineStore((s) => s.set);

  useEffect(() => {
    log.info('Add machine photos: page visited');
  }, []);

  const handlePickPhotos = async () => {
    log.info('Add machine photos: pick photos tapped');
    const remaining = MAX_PHOTOS - imageLocalUris.length;
    if (remaining <= 0) {
      Alert.alert('Maximum photos', `You can upload up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: remaining,
    });
    if (result.canceled) return;
    const newUris = result.assets.map((a) => a.uri);
    log.info('Add machine photos: photos selected', { count: newUris.length });
    set('imageLocalUris', [...imageLocalUris, ...newUris]);
  };

  const handleRemove = (index: number) => {
    log.info('Add machine photos: photo removed', { index });
    const next = imageLocalUris.filter((_, i) => i !== index);
    set('imageLocalUris', next);
    if (primaryIndex >= next.length) {
      set('primaryIndex', Math.max(0, next.length - 1));
    }
  };

  const handleSetPrimary = (index: number) => {
    log.info('Add machine photos: primary set', { index });
    set('primaryIndex', index);
  };

  const handleContinue = () => {
    log.info('Add machine photos: continue tapped');
    router.push('/(owner)/add-machine/details' as Parameters<typeof router.push>[0]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Header with progress bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row gap-1.5 mb-4">
          {[1, 2, 3].map((s) => (
            <View key={s} className={`flex-1 h-1.5 rounded-full ${s <= 1 ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-surface border border-border shadow-card"
          >
            <ArrowLeft size={18} color={colors.ink} />
          </Pressable>
          <Text className="text-ink text-lg font-bold flex-1">Add photos</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="text-ink-soft text-sm mb-4">
          Add up to {MAX_PHOTOS} photos. Tap the star to set your main listing photo.
        </Text>

        {/* Photo grid */}
        <View className="flex-row flex-wrap gap-3 mb-4">
          {imageLocalUris.map((uri, i) => (
            <View key={uri} className="relative shadow-card rounded-xl">
              <Image
                source={{ uri }}
                style={{ width: 100, height: 100 }}
                className="rounded-xl"
                contentFit="cover"
              />
              {/* Primary star */}
              <Pressable
                onPress={() => handleSetPrimary(i)}
                className={`absolute top-1 left-1 w-7 h-7 rounded-full items-center justify-center ${
                  primaryIndex === i ? 'bg-primary' : 'bg-black/40'
                }`}
              >
                <Star
                  size={14}
                  color={primaryIndex === i ? colors.surface : colors.surface}
                  fill={primaryIndex === i ? colors.surface : 'transparent'}
                />
              </Pressable>
              {/* Remove */}
              <Pressable
                onPress={() => handleRemove(i)}
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/50 items-center justify-center"
              >
                <X size={14} color={colors.surface} />
              </Pressable>
            </View>
          ))}

          {/* Add more button */}
          {imageLocalUris.length < MAX_PHOTOS && (
            <Pressable
              onPress={handlePickPhotos}
              style={{ width: 100, height: 100 }}
              className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 items-center justify-center"
            >
              <Plus size={28} color={colors.primary} />
              <Text className="text-ink-mute text-xs mt-1">Add photo</Text>
            </Pressable>
          )}
        </View>

        {imageLocalUris.length === 0 && (
          <Text className="text-ink-mute text-sm text-center mt-4">
            No photos selected yet. Tap &ldquo;Add photo&rdquo; to begin.
          </Text>
        )}
      </ScrollView>

      <View className="px-4 pb-6">
        <Button
          label={
            imageLocalUris.length > 0
              ? `Continue with ${imageLocalUris.length} photo${imageLocalUris.length > 1 ? 's' : ''}`
              : 'Select at least 1 photo'
          }
          onPress={handleContinue}
          variant="primary"
          size="lg"
          disabled={imageLocalUris.length === 0}
        />
      </View>
    </SafeAreaView>
  );
}
