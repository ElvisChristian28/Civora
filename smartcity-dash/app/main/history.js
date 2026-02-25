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
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useStore } from '../../hooks/useStore';

const { width } = Dimensions.get('window');

const HAZARD_META = {
  pothole: { label: 'Pothole', icon: '🕳️', color: '#6366f1' },
  broken_streetlight: { label: 'Streetlight', icon: '💡', color: '#f59e0b' },
  waterlogging: { label: 'Wet Road', icon: '💧', color: '#06b6d4' },
  traffic_congestion: { label: 'Traffic', icon: '🚗', color: '#ef4444' },
  accident: { label: 'Accident', icon: '⚠️', color: '#dc2626' },
  road_debris: { label: 'Debris', icon: '🧱', color: '#a855f7' },
};

const SEVERITY_COLORS = {
  low: { bg: '#d1fae5', text: '#047857', border: '#a7f3d0' },
  medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  high: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  critical: { bg: '#fce7f3', text: '#831843', border: '#fbcfe8' },
};

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.round(diff / 86400)}d ago`;

    const monthMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${monthMap[d.getMonth()]}`;
  } catch {
    return '—';
  }
}

function groupIncidentsByDate(incidents) {
  const groups = {};

  incidents.forEach((item) => {
    const d = new Date(item.created_at);
    const today = new Date();
    let dateKey = '';

    if (d.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else if (today.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) {
        dateKey = 'This Week';
      } else {
        dateKey = `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
      }
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });

  return Object.keys(groups)
    .sort((a, b) => {
      const order = { Today: 0, Yesterday: 1, 'This Week': 2 };
      return (order[a] ?? 3) - (order[b] ?? 3);
    })
    .map((date) => ({ title: date, data: groups[date] }));
}

function IncidentListItem({ item }) {
  const meta = HAZARD_META[item.hazard_type] ?? { label: item.hazard_type, icon: '⚠️', color: '#6b7280' };
  const sevColor = SEVERITY_COLORS[item.severity_level] ?? SEVERITY_COLORS.low;
  const conf = Math.round((item.confidence_score ?? 0) * 100);

  return (
    <View style={styles.listItemContainer}>
      <View style={[styles.listItemIconBg, { backgroundColor: meta.color + '15' }]}>
        <Text style={styles.listItemIcon}>{meta.icon}</Text>
      </View>

      <View style={styles.listItemContent}>
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemTitle}>{meta.label}</Text>
          <View style={[styles.severityBadge, { backgroundColor: sevColor.bg, borderColor: sevColor.border }]}>
            <Text style={[styles.severityBadgeText, { color: sevColor.text }]}>
              {item.severity_level?.charAt(0).toUpperCase() + item.severity_level?.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.listItemLocation}>
          {item.location || `${item.latitude?.toFixed(3)}°, ${item.longitude?.toFixed(3)}°`}
        </Text>
        <View style={styles.listItemFooter}>
          <Text style={styles.listItemTime}>{formatDate(item.created_at)}</Text>
          <Text style={styles.listItemConfidence}>Confidence: {conf}%</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.listItemAction}>
        <Text style={styles.listItemActionText}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen() {
  const { driverId, driverHistory, fetchDriverHistory } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState('All');

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

  // Filter incidents by severity
  let filteredHistory = driverHistory;
  if (selectedSeverity !== 'All') {
    const severityMap = {
      High: ['high', 'critical'],
      Medium: ['medium'],
      Low: ['low'],
    };
    filteredHistory = driverHistory.filter((h) => severityMap[selectedSeverity]?.includes(h.severity_level));
  }

  const groupedData = groupIncidentsByDate(filteredHistory);

  // Calculate stats
  const totalReports = driverHistory.length;
  const highSeverityCount = driverHistory.filter((h) => h.severity_level === 'high' || h.severity_level === 'critical').length;
  const avgSeverity = driverHistory.length > 0
    ? ((driverHistory.reduce((sum, h) => {
      const severityScore = { critical: 4, high: 3, medium: 2, low: 1 };
      return sum + (severityScore[h.severity_level] || 0);
    }, 0) / driverHistory.length) * 25).toFixed(1)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with stats */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Incident History</Text>
          <Text style={styles.headerSubtitle}>{filteredHistory.length} incidents</Text>
        </View>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalReports}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{highSeverityCount}</Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
        </View>
      </View>

      {/* Filter buttons */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          data={['All', 'High', 'Medium', 'Low']}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterBtn, selectedSeverity === item && styles.filterBtnActive]}
              onPress={() => setSelectedSeverity(item)}
            >
              <Text style={[styles.filterBtnText, selectedSeverity === item && styles.filterBtnTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading incident history...</Text>
        </View>
      ) : filteredHistory.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No incidents found</Text>
          <Text style={styles.emptyText}>
            {selectedSeverity !== 'All' ? `No ${selectedSeverity.toLowerCase()} severity incidents yet` : 'Start driving to record incidents'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedData}
          keyExtractor={(item, index) => item.id || `${index}`}
          renderItem={({ item }) => <IncidentListItem item={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  // Header
  header: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 10,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00d4ff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(148,163,184,0.1)',
  },

  // Filter section
  filterSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  filterList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterBtnActive: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  filterBtnTextActive: {
    color: '#0f172a',
  },

  // List
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingBottom: 40,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
  },

  // List item
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    marginHorizontal: 8,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  listItemIconBg: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  listItemIcon: {
    fontSize: 24,
  },
  listItemContent: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listItemLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  listItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listItemTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  listItemConfidence: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  listItemAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  listItemActionText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
  },

  // Center container (empty/loading)
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
