import { Geolocation } from '@capacitor/geolocation';
import { isNativePluginAvailable, isPluginUnimplementedError } from '@/lib/capacitor/isPluginAvailable';
import { isCapacitorNative } from '@/utils/capacitator/isNative';

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export class LocationAccessError extends Error {
  readonly code: 'unavailable' | 'denied' | 'timeout' | 'services_disabled' | 'unknown';

  constructor(
    message: string,
    code: 'unavailable' | 'denied' | 'timeout' | 'services_disabled' | 'unknown'
  ) {
    super(message);
    this.name = 'LocationAccessError';
    this.code = code;
  }
}

function locationGranted(status: { location?: string; coarseLocation?: string }): boolean {
  return status.location === 'granted' || status.coarseLocation === 'granted';
}

function shouldUseCapacitorGeolocation(): boolean {
  return isCapacitorNative() && isNativePluginAvailable('Geolocation');
}

function mapBrowserGeolocationError(err: GeolocationPositionError): LocationAccessError {
  if (err.code === err.PERMISSION_DENIED) {
    return new LocationAccessError(
      'Allow location access in your browser or device settings to share with the group.',
      'denied'
    );
  }
  if (err.code === err.TIMEOUT) {
    return new LocationAccessError(
      'Could not get a GPS fix in time. Try again outdoors or with a clearer sky view.',
      'timeout'
    );
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return new LocationAccessError('GPS is unavailable on this device right now.', 'unavailable');
  }
  return new LocationAccessError(err.message || 'Could not read your location.', 'unknown');
}

function mapCapacitorError(err: unknown): LocationAccessError {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();
  if (lower.includes('denied') || lower.includes('permission')) {
    return new LocationAccessError(
      'Allow location access in Settings for SoCal Offroaders, then tap Share my location again.',
      'denied'
    );
  }
  if (lower.includes('disabled') || lower.includes('location services')) {
    return new LocationAccessError('Turn on Location Services on your device, then try again.', 'services_disabled');
  }
  if (lower.includes('timeout')) {
    return new LocationAccessError(
      'Could not get a GPS fix in time. Try again outdoors or with a clearer sky view.',
      'timeout'
    );
  }
  return new LocationAccessError(msg || 'Could not read your location.', 'unknown');
}

async function requestBrowserLocationAccess(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new LocationAccessError('Location is not available in this browser', 'unavailable');
  }

  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (perm?.state === 'denied') {
      throw new LocationAccessError(
        'Location is blocked for this site. Allow it in your browser site settings, then try again.',
        'denied'
      );
    }
  } catch (e) {
    if (e instanceof LocationAccessError) throw e;
  }
}

/**
 * Show the native permission dialog (Capacitor) or detect a prior browser block.
 * On web, the system prompt is shown on the next {@link getDeviceLocation} call.
 */
export async function requestLocationAccess(): Promise<void> {
  if (shouldUseCapacitorGeolocation()) {
    try {
      const check = await Geolocation.checkPermissions();
      if (locationGranted(check)) return;

      const requested = await Geolocation.requestPermissions();
      if (!locationGranted(requested)) {
        throw new LocationAccessError(
          'Location permission is required. Open Settings and allow location for SoCal Offroaders.',
          'denied'
        );
      }
      return;
    } catch (e) {
      if (e instanceof LocationAccessError) throw e;
      if (!isPluginUnimplementedError(e)) throw mapCapacitorError(e);
    }
  }

  await requestBrowserLocationAccess();
}

async function getBrowserDeviceLocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
}): Promise<DeviceLocation> {
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const timeout = options?.timeout ?? 12_000;

  if (!navigator.geolocation) {
    throw new LocationAccessError('Location is not available in this browser', 'unavailable');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        }),
      (err) => reject(mapBrowserGeolocationError(err)),
      { enableHighAccuracy, timeout }
    );
  });
}

export async function getDeviceLocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
}): Promise<DeviceLocation> {
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const timeout = options?.timeout ?? 12_000;

  if (shouldUseCapacitorGeolocation()) {
    await requestLocationAccess();
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
      };
    } catch (e) {
      if (!isPluginUnimplementedError(e)) throw mapCapacitorError(e);
    }
  }

  if (isCapacitorNative()) {
    await requestBrowserLocationAccess();
  }

  return getBrowserDeviceLocation(options);
}

export type LocationWatchHandle = {
  stop: () => void;
};

export async function watchDeviceLocation(
  onUpdate: (loc: DeviceLocation) => void,
  onError?: (err: LocationAccessError) => void,
  options?: { enableHighAccuracy?: boolean; maximumAge?: number; timeout?: number }
): Promise<LocationWatchHandle> {
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const maximumAge = options?.maximumAge ?? 15_000;
  const timeout = options?.timeout ?? 30_000;

  if (shouldUseCapacitorGeolocation()) {
    try {
      await requestLocationAccess();
      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy,
          maximumAge,
          timeout,
          minimumUpdateInterval: 12_000,
        },
        (pos, err) => {
          if (err) {
            onError?.(mapCapacitorError(err));
            return;
          }
          if (pos) {
            onUpdate({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
            });
          }
        }
      );
      return {
        stop: () => {
          void Geolocation.clearWatch({ id });
        },
      };
    } catch (e) {
      if (!isPluginUnimplementedError(e)) throw mapCapacitorError(e);
    }
  }

  if (isCapacitorNative()) {
    await requestBrowserLocationAccess();
  }

  if (!navigator.geolocation) {
    throw new LocationAccessError('Location is not available in this browser', 'unavailable');
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) =>
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
      }),
    (err) => onError?.(mapBrowserGeolocationError(err)),
    { enableHighAccuracy, maximumAge, timeout }
  );

  return {
    stop: () => navigator.geolocation.clearWatch(watchId),
  };
}
