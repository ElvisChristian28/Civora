import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useStore } from '../hooks/useStore';

const { width } = Dimensions.get('window');

const HAZARD_META = {
  pothole: { label: 'Pothole', icon: '⚠', color: '#ff4444' },
  broken_streetlight: { label: 'Streetlight', icon: '💡', color: '#ffaa00' },
  waterlogging: { label: 'Flooding', icon: '〜', color: '#0088ff' },
  traffic_congestion: { label: 'Traffic', icon: '⬡', color: '#ff6600' },
  accident: { label: 'Accident', icon: '✕', color: '#ff0044' },
  road_debris: { label: 'Debris', icon: '◼', color: '#aa44ff' },
};

const SEVERITY_COLORS = {
  low: '#00ff88',
  medium: '#ffaa00',
  high: '#ff4444',
  critical: '#ff0044',
};

const FILTERS = ['All', 'Pothole', 'Streetlight', 'Flooding', 'Traffic', 'Accident', 'Debris'];
const FILTER_MAP = {
  All: null,
  Pothole: 'pothole',
  Streetlight: 'broken_streetlight',
  Flooding: 'waterlogging',
  Traffic: 'traffic_congestion',
  Accident: 'accident',
  Debris: 'road_debris',
};

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

function HazardRow({ item }) {
  const meta = HAZARD_META[item.hazard_type] ?? { label: item.hazard_type, icon: '⚠', color: '#ffffff' };
  const sevColor = SEVERITY_COLORS[item.severity_level] ?? '#ffffff';
  const conf = Math.round((item.confidence_score ?? 0) * 100);

  return (
    <View style={styles.hazardRow}>
      {/* Left accent */}
      <View style={[styles.rowAccent, { backgroundColor: meta.color }]} />

      {/* Icon */}
      <View style={[styles.rowIconWrap, { backgroundColor: meta.color + '18' }]}>
        <Text style={[styles.rowIcon, { color: meta.color }]}>{meta.icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowType}>{meta.label.toUpperCase()}</Text>
        <Text style={styles.rowCoord}>
          {item.latitude?.toFixed(4)}°N · {item.longitude?.toFixed(4)}°E
        </Text>
      </View>

      {/* Right side */}
      <View style={styles.rowRight}>
        <View style={[styles.sevBadge, { backgroundColor: sevColor + '20', borderColor: sevColor + '50' }]}>
          <Text style={[styles.sevBadgeText, { color: sevColor }]}>
            {item.severity_level?.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.rowConf}>{conf}%</Text>
        <Text style={styles.rowTime}>{formatDate(item.created_at)}</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { driverId, driverHistory, fetchDriverHistory } = useStore();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [driverId])
  );

  const loadHistory = async () => {
    setLoading(true);
    try {
      await fetchDriverHistory(driverId);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDriverHistory(driverId);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredHistory = selectedFilter === 'All'
    ? driverHistory
    : driverHistory.filter((h) => h.hazard_type === FILTER_MAP[selectedFilter]);

  // Stats
  const totalReports = driverHistory.length;
  const criticalCount = driverHistory.filter((h) => h.severity_level === 'critical' || h.severity_level === 'high').length;
  const avgConf = driverHistory.length > 0
    ? Math.round((driverHistory.reduce((s, h) => s + (h.confidence_score ?? 0), 0) / driverHistory.length) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>INCIDENT HISTORY</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{totalReports}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReports}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
        <View style={[styles.statCard, styles.statCardDivider]}>
          <Text style={[styles.statValue, { color: '#ff4444' }]}>{criticalCount}</Text>
          <Text style={styles.statLabel}>HIGH RISK</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#00ff88' }]}>{avgConf}%</Text>
          <Text style={styles.statLabel}>AVG CONF</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = selectedFilter === item;
          const fType = FILTER_MAP[item];
          const meta = fType ? HAZARD_META[fType] : null;
          return (
            <TouchableOpacity
              style={[styles.filterTab, active && styles.filterTabActive, active && meta && { borderColor: meta.color, backgroundColor: meta.color + '15' }]}
              onPress={() => setSelectedFilter(item)}
              activeOpacity={0.8}
            >
              {meta && <Text style={[styles.filterTabIcon, active && { color: meta.color }]}>{meta.icon}</Text>}
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive, active && meta && { color: meta.color }]}>
                {item.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* List */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#00d4ff" size="large" />
          <Text style={styles.loadingText}>LOADING HISTORY...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item, idx) => item.id ?? `${idx}`}
          renderItem={({ item }) => <HazardRow item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00d4ff"
              colors={['#00d4ff']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>◈</Text>
              <Text style={styles.emptyTitle}>NO RECORDS FOUND</Text>
              <Text style={styles.emptyText}>
                {selectedFilter !== 'All'
                  ? `No ${selectedFilter.toLowerCase()} incidents recorded`
                  : 'Start driving to log hazard incidents'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b1a' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)',
  },
  headerTitle: {
    color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 5,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
  },
  headerBadgeText: { color: '#00d4ff', fontSize: 12, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2,
  },
  statCardDivider: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statValue: { color: '#00d4ff', fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

  // Filters
  filterList: { paddingHorizontal: 5, paddingBottom: 3, gap: 8 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 3, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  filterTabActive: {
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0,212,255,0.1)',
  },
  filterTabIcon: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  filterTabText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  filterTabTextActive: { color: '#00d4ff' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  separator: { height: 8 },

  // Row
  hazardRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    paddingRight: 12,
  },
  rowAccent: { width: 3, alignSelf: 'stretch' },
  rowIconWrap: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    margin: 10, borderRadius: 4,
  },
  rowIcon: { fontSize: 18 },
  rowInfo: { flex: 1, gap: 3 },
  rowType: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  rowCoord: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  sevBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 3, borderWidth: 1,
  },
  sevBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  rowConf: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  rowTime: { color: 'rgba(255,255,255,0.25)', fontSize: 10 },

  // States
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(0,212,255,0.5)', fontSize: 11, letterSpacing: 3 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 40, color: 'rgba(0,212,255,0.15)', marginBottom: 4 },
  emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
