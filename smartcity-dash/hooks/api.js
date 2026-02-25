import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Resolve the API base URL automatically:
 *  - In Expo Go on a physical device, use the dev server's LAN IP (same machine as backend).
 *  - In a web browser or emulator, localhost works fine.
 *  - Override by setting EXPO_PUBLIC_API_URL in your .env file.
 *
 * HOW TO USE:
 *   If your backend runs on your PC at port 8000, just start it with `python main.py`.
 *   The app will auto-detect the LAN IP from Expo's dev server info.
 *   If auto-detection fails, hardcode your PC's IP below:
 *     const FALLBACK_IP = '192.168.1.X';  ← replace with your actual IP
 */

function resolveApiBaseUrl() {
  // 1. Explicit env override (highest priority)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Auto-detect from Expo dev server (works on physical devices via Expo Go)
  try {
    const debuggerHost =
      Constants.expoConfig?.hostUri ||          // Expo SDK 49+
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||  // SDK 48
      Constants.manifest?.debuggerHost;         // SDK 47 and below

    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];    // strip the port
      return `http://${ip}:8000`;
    }
  } catch (_) {}

  // 3. Hardcoded fallback — set this to your PC's local IP if auto-detect fails
  //    Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
  const FALLBACK_IP = '192.168.1.100';  // ← change this if needed
  console.warn(`[API] Could not auto-detect host IP, using fallback: ${FALLBACK_IP}`);
  return `http://${FALLBACK_IP}:8000`;
}

const API_BASE_URL = resolveApiBaseUrl();
console.log(`[API] Base URL: ${API_BASE_URL}`);

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
client.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
client.interceptors.response.use(
  (response) => {
    console.log(`[API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const api = {
  /**
   * Get driver settings by driver ID
   */
  async getDriverSettings(driverId) {
    const response = await client.get(`/api/driver/${driverId}/settings`);
    return response.data;
  },

  /**
   * Update driver settings
   */
  async updateDriverSettings(driverId, settings) {
    const response = await client.put(`/api/driver/${driverId}/settings`, settings);
    return response.data;
  },

  /**
   * Get driver hazard history
   */
  async getDriverHistory(driverId, limit = 100, offset = 0) {
    const response = await client.get(`/api/driver/${driverId}/history`, {
      params: { limit, offset },
    });
    return response.data;
  },

  /**
   * Report a new hazard
   */
  async reportHazard(driverId, latitude, longitude, hazardType) {
    const response = await client.post('/api/report-hazard', {
      driver_id: driverId,
      latitude,
      longitude,
      hazard_type: hazardType,
    });
    return response.data;
  },

  /**
   * Get nearby hazards within radius
   */
  async getNearbyHazards(driverId, latitude, longitude, radiusKm = 2.0) {
    const response = await client.post('/api/nearby-hazards', {
      driver_id: driverId,
      latitude,
      longitude,
      radius_km: radiusKm,
    });
    return response.data;
  },
};
