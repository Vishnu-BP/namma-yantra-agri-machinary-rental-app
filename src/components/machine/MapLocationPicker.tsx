/**
 * @file MapLocationPicker.tsx — native map pin picker for Add Machine step 3.
 * @module src/components/machine
 *
 * Native-only implementation using react-native-maps. Metro resolves this
 * file on iOS/Android and MapLocationPicker.web.tsx on web, so the native
 * module is never bundled for web builds.
 */
import MapView, { Marker } from 'react-native-maps';

interface MapLocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export function MapLocationPicker({ lat, lng, onLocationChange }: MapLocationPickerProps) {
  return (
    <MapView
      style={{ height: 220, borderRadius: 16, marginBottom: 16 }}
      initialRegion={{
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker
        coordinate={{ latitude: lat, longitude: lng }}
        draggable
        onDragEnd={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onLocationChange(latitude, longitude);
        }}
      />
    </MapView>
  );
}
