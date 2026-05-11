/**
 * @file MapLocationPicker.web.tsx — web fallback for the map pin picker.
 * @module src/components/machine
 *
 * react-native-maps cannot be bundled on web (native-only codegenNativeCommands).
 * Metro automatically resolves this .web.tsx file instead of MapLocationPicker.tsx
 * for web builds, keeping the native module out of the web bundle entirely.
 */
import { Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

interface MapLocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function MapLocationPicker({ lat, lng, onLocationChange }: MapLocationPickerProps) {
  return (
    <View className="bg-surface border border-border rounded-xl p-4 mb-4">
      <Text className="text-ink-mute text-xs mb-3">
        Map is only available on the mobile app. Coordinates default to Mandya — adjust if needed.
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-ink-soft text-xs mb-1">Latitude</Text>
          <TextInput
            className="bg-bg border border-border rounded-lg px-3 py-2 text-ink text-sm"
            keyboardType="numeric"
            value={String(lat)}
            onChangeText={(t) => {
              const n = parseFloat(t);
              if (!isNaN(n)) onLocationChange(n, lng);
            }}
            placeholderTextColor={colors.inkMute}
          />
        </View>
        <View className="flex-1">
          <Text className="text-ink-soft text-xs mb-1">Longitude</Text>
          <TextInput
            className="bg-bg border border-border rounded-lg px-3 py-2 text-ink text-sm"
            keyboardType="numeric"
            value={String(lng)}
            onChangeText={(t) => {
              const n = parseFloat(t);
              if (!isNaN(n)) onLocationChange(lat, n);
            }}
            placeholderTextColor={colors.inkMute}
          />
        </View>
      </View>
    </View>
  );
}
