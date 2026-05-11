/**
 * @file useLocation.ts — request location permission + populate locationStore.
 * @module src/hooks
 *
 * Mounts in the discover screen (and anywhere else that needs the renter's
 * coordinates). Idempotent: if `coords` is already set, returns immediately
 * without re-requesting. On permission denied or any error, falls back to
 * Mandya centre per the spec — distance sorting still works, just less
 * personalized.
 */
import * as Location from 'expo-location';
import { useCallback, useEffect } from 'react';

import { createLogger } from '@/lib/logger';
import {
  MANDYA_FALLBACK,
  useLocationStore,
} from '@/stores/locationStore';

const log = createLogger('LOC');

interface UseLocationReturn {
  coords: ReturnType<typeof useLocationStore.getState>['coords'];
  permissionStatus: ReturnType<
    typeof useLocationStore.getState
  >['permissionStatus'];
  refresh: () => Promise<void>;
}

export function useLocation(): UseLocationReturn {
  const coords = useLocationStore((s) => s.coords);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const setCoords = useLocationStore((s) => s.setCoords);
  const setPermission = useLocationStore((s) => s.setPermission);

  const fetchLocation = useCallback(async () => {
    log.info('Location: requesting permission');
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        log.warn('Location: permission denied, using fallback');
        setPermission('denied');
        setCoords(MANDYA_FALLBACK);
        return;
      }
      setPermission('granted');
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: result.coords.latitude,
        lng: result.coords.longitude,
      });
      log.info('Location: coords resolved');
    } catch (err) {
      // Why: web `expo-location` can throw for reasons other than denial
      // (no HTTPS, browser unsupported). Fall back to Mandya so the feed
      // still renders something useful.
      log.error('Location: getCurrentPositionAsync threw', err);
      setPermission('denied');
      setCoords(MANDYA_FALLBACK);
    }
  }, [setCoords, setPermission]);

  useEffect(() => {
    if (coords) return;
    void fetchLocation();
  }, [coords, fetchLocation]);

  return { coords, permissionStatus, refresh: fetchLocation };
}
