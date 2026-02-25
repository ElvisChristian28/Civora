import { create } from 'zustand';
import { api } from './api';

// Use a valid UUID for the demo driver so the backend accepts it
// In production, this would come from your auth system (Supabase Auth)
const DEMO_DRIVER_ID = '550e8400-e29b-41d4-a716-446655440000';

export const useStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────
  driverId: DEMO_DRIVER_ID,
  driverSettings: null,
  nearbyHazards: [],
  nearbyHazardsCount: 0,
  driverHistory: [],
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────────────

  setDriverId: (id) => set({ driverId: id }),
  clearError: () => set({ error: null }),

  reset: () => set({
    driverId: null,
    driverSettings: null,
    nearbyHazards: [],
    nearbyHazardsCount: 0,
    driverHistory: [],
    loading: false,
    error: null,
  }),

  fetchDriverSettings: async (id) => {
    const driverId = id || get().driverId;
    if (!driverId) return null;
    set({ loading: true, error: null });
    try {
      const data = await api.getDriverSettings(driverId);
      set({ driverSettings: data, loading: false });
      return data;
    } catch (err) {
      const mock = _mockSettings(driverId);
      set({ driverSettings: mock, loading: false });
      return mock;
    }
  },

  updateDriverSettings: async (id, settings) => {
    const driverId = id || get().driverId;
    if (!driverId) return null;
    set({ loading: true, error: null });
    try {
      const data = await api.updateDriverSettings(driverId, settings);
      set({ driverSettings: data, loading: false });
      return data;
    } catch (err) {
      const updated = { ...get().driverSettings, ...settings, updated_at: new Date().toISOString() };
      set({ driverSettings: updated, loading: false });
      return updated;
    }
  },

  fetchDriverHistory: async (id, limit = 100, offset = 0) => {
    const driverId = id || get().driverId;
    if (!driverId) return { total_count: 0, hazards: [] };
    set({ loading: true, error: null });
    try {
      const data = await api.getDriverHistory(driverId, limit, offset);
      set({ driverHistory: data.hazards || [], loading: false });
      return data;
    } catch (err) {
      const mock = _mockHistory();
      set({ driverHistory: mock, loading: false });
      return { total_count: mock.length, hazards: mock };
    }
  },

  fetchNearbyHazards: async (id, lat, lon, radius = 2.0) => {
    const driverId = id || get().driverId;
    if (!driverId || !lat || !lon) return { total_count: 0, hazards: [] };
    try {
      const data = await api.getNearbyHazards(driverId, lat, lon, radius);
      set({ nearbyHazards: data.hazards || [], nearbyHazardsCount: data.total_count || 0 });
      return data;
    } catch (err) {
      const mock = _mockNearby();
      set({ nearbyHazards: mock, nearbyHazardsCount: mock.length });
      return { total_count: mock.length, hazards: mock };
    }
  },

  reportHazard: async (id, lat, lon, type) => {
    const driverId = id || get().driverId;
    if (!driverId) return null;
    try {
      const data = await api.reportHazard(driverId, lat, lon, type);
      set((state) => ({
        driverHistory: [data, ...state.driverHistory],
        nearbyHazardsCount: state.nearbyHazardsCount + 1,
      }));
      return data;
    } catch (err) {
      const mock = {
        id: `mock-${Date.now()}`,
        driver_id: driverId,
        hazard_type: type,
        severity_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        confidence_score: parseFloat((0.75 + Math.random() * 0.23).toFixed(2)),
        latitude: lat,
        longitude: lon,
        created_at: new Date().toISOString(),
      };
      set((state) => ({
        driverHistory: [mock, ...state.driverHistory],
        nearbyHazardsCount: state.nearbyHazardsCount + 1,
      }));
      return mock;
    }
  },
}));

// ── Mock Data ────────────────────────────────────────────────────────────────

function _mockSettings(driverId) {
  return {
    driver_id: driverId,
    full_name: 'Demo Driver',
    vehicle_type: 'SUV',
    auto_reporting: true,
    high_resolution: true,
    sound_alerts: true,
    cloud_backup: false,
    anonymous_mode: false,
    updated_at: new Date().toISOString(),
  };
}

function _mockHistory() {
  const types = ['pothole', 'broken_streetlight', 'waterlogging', 'traffic_congestion', 'accident', 'road_debris'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const now = Date.now();
  return Array.from({ length: 12 }, (_, i) => ({
    id: `mock-hist-${i}`,
    driver_id: DEMO_DRIVER_ID,
    hazard_type: types[i % types.length],
    severity_level: severities[i % severities.length],
    confidence_score: parseFloat((0.75 + Math.random() * 0.23).toFixed(2)),
    latitude: 28.6139 + (Math.random() - 0.5) * 0.05,
    longitude: 77.209 + (Math.random() - 0.5) * 0.05,
    created_at: new Date(now - i * 3600000 * 6).toISOString(),
  }));
}

function _mockNearby() {
  const types = ['pothole', 'broken_streetlight', 'waterlogging', 'road_debris'];
  return Array.from({ length: 3 }, (_, i) => ({
    id: `mock-near-${i}`,
    driver_id: DEMO_DRIVER_ID,
    hazard_type: types[i % types.length],
    severity_level: ['medium', 'high', 'low'][i % 3],
    confidence_score: parseFloat((0.8 + Math.random() * 0.18).toFixed(2)),
    latitude: 28.6139 + (Math.random() - 0.5) * 0.02,
    longitude: 77.209 + (Math.random() - 0.5) * 0.02,
    created_at: new Date().toISOString(),
  }));
}
