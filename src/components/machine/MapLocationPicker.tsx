/**
 * @file MapLocationPicker.tsx — location picker for Add Machine step 3.
 * @module src/components/machine
 *
 * Why no MapView:
 * - react-native-maps requires a Google Maps API key on Android. Without
 *   one the app crashes the moment <MapView/> mounts. For the demo we
 *   skip the interactive pin and just let owners (a) accept the
 *   pre-filled coordinates from their device GPS, or (b) tap "Use my
 *   current location" to refresh from expo-location. The lat/lng feeds
 *   the geohash so renters can sort by proximity — pixel-perfect pin
 *   placement isn't needed for the MVP.
 */
import * as Location from 'expo-location';
import { Crosshair, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { createLogger } from '@/lib/logger';
import { colors } from '@/theme/colors';

const log = createLogger('LOC');

interface MapLocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function MapLocationPicker({
  lat,
  lng,
  onLocationChange,
}: MapLocationPickerProps) {
  const [busy, setBusy] = useState(false);

  const handleUseCurrent = async () => {
    log.info('MapLocationPicker: use-current tapped');
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Allow location access to set your farm location automatically.',
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      log.info('MapLocationPicker: location received');
      onLocationChange(pos.coords.latitude, pos.coords.longitude);
    } catch (err) {
      log.error('MapLocationPicker: getCurrentPosition failed', err);
      Alert.alert('Could not get location', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="bg-surface border border-border rounded-2xl p-4 mb-4 shadow-card">
      <View className="flex-row items-center gap-2 mb-3">
        <MapPin size={18} color={colors.primary} />
        <Text className="text-ink text-sm font-semibold">Farm coordinates</Text>
      </View>

      <View className="bg-bg rounded-xl px-3 py-3 mb-3">
        <Text className="text-ink-mute text-xs mb-1">Latitude</Text>
        <Text className="text-ink text-sm font-medium mb-2">{lat.toFixed(6)}</Text>
        <Text className="text-ink-mute text-xs mb-1">Longitude</Text>
        <Text className="text-ink text-sm font-medium">{lng.toFixed(6)}</Text>
      </View>

      <Pressable
        onPress={handleUseCurrent}
        disabled={busy}
        className={`flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 border-primary/40 bg-primary/5 ${
          busy ? 'opacity-50' : 'active:opacity-70'
        }`}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Crosshair size={16} color={colors.primary} />
        )}
        <Text className="text-primary text-sm font-semibold">
          {busy ? 'Getting location…' : 'Use my current location'}
        </Text>
      </Pressable>

      <Text className="text-ink-mute text-xs mt-2 text-center">
        Used to show your machine to nearby renters
      </Text>
    </View>
  );
}
