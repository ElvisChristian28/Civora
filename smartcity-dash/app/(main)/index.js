import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useStore } from '../hooks/useStore';

const { width } = Dimensions.get('window');

const HAZARD_TYPES = [
  { id: 'pothole',            label: 'Pothole',     icon: '⚠',  color: '#ff4444' },
  { id: 'broken_streetlight', label: 'Streetlight', icon: '💡', color: '#ffaa00' },
  { id: 'waterlogging',       label: 'Flooding',    icon: '〜', color: '#0099ff' },
  { id: 'traffic_congestion', label: 'Traffic',     icon: '⬡',  color: '#ff6600' },
  { id: 'accident',           label: 'Accident',    icon: '✕',  color: '#ff0044' },
  { id: 'road_debris',        label: 'Debris',      icon: '◼',  color: '#aa44ff' },
];

const SEV_COLORS = { low: '#00ff88', medium: '#ffaa00', high: '#ff4444', critical: '#ff0044' };

export default function DashcamScreen() {
  const { driverId, nearbyHazards, nearbyHazardsCount, fetchNearbyHazards, reportHazard } = useStore();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [lastReport, setLastReport] = useState(null);

  const cameraRef = useRef(null);
  const locationSub = useRef(null);
  const pollRef = useRef(null);
  const recDot = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // ── Animations ──────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(recDot, { toValue: 0.15, duration: 600, useNativeDriver: true }),
      Animated.timing(recDot, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  // ── Permissions & Location ──────────────────────────────────────────────
  useEffect(() => {
    startLocationTracking();
    return () => {
      locationSub.current?.remove?.();
      clearInterval(pollRef.current);
    };
  }, []);

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation(loc.coords);
    fetchNearbyHazards(driverId, loc.coords.latitude, loc.coords.longitude);

    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 30 },
      (l) => setLocation(l.coords)
    );

    pollRef.current = setInterval(() => {
      if (location) fetchNearbyHazards(driverId, location.latitude, location.longitude);
    }, 30000);
  };

  // ── Camera ─────────────────────────────────────────────────────────────
  const handleToggleCamera = async () => {
    if (!showCamera) {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) {
          Alert.alert('Camera Permission', 'Camera access is needed to record dashcam footage.');
          return;
        }
      }
      setShowCamera(true);
    } else {
      if (isRecording) {
        await cameraRef.current?.stopRecording();
        setIsRecording(false);
      }
      setShowCamera(false);
    }
  };

  const handleStartRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    try {
      setIsRecording(true);
      await cameraRef.current.recordAsync({ maxDuration: 300 });
    } catch (e) {
      console.log('Recording error:', e);
    } finally {
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
  };

  // ── Hazard Report ───────────────────────────────────────────────────────
  const handleReport = async (hazardType) => {
    setShowPicker(false);
    setReporting(true);
    try {
      const lat = location?.latitude ?? 28.6139;
      const lon = location?.longitude ?? 77.209;
      const result = await reportHazard(driverId, lat, lon, hazardType);
      setLastReport(HAZARD_TYPES.find(h => h.id === hazardType));
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      Alert.alert('Error', 'Failed to report hazard.');
    } finally {
      setReporting(false);
    }
  };

  const coordStr = location
    ? `${location.latitude.toFixed(4)}°N  ${location.longitude.toFixed(4)}°E`
    : 'Acquiring GPS...';
  const speedKmh = Math.round((location?.speed ?? 0) * 3.6);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.recDot, { opacity: isRecording ? recDot : 0.25 }]} />
          <Text style={[styles.recLabel, isRecording && styles.recLabelActive]}>
            {isRecording ? 'REC' : 'STANDBY'}
          </Text>
        </View>
        <Text style={styles.headerTitle}>DASHCAM</Text>
        <TouchableOpacity
          style={[styles.camToggleBtn, showCamera && styles.camToggleBtnActive]}
          onPress={handleToggleCamera}
        >
          <Text style={[styles.camToggleText, showCamera && styles.camToggleTextActive]}>
            {showCamera ? '■ CLOSE' : '⬛ CAMERA'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Camera / HUD View ── */}
      <View style={styles.viewfinderWrap}>
        {showCamera && cameraPermission?.granted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mode="video"
            />
            {/* Camera HUD overlay */}
            <View style={styles.camHUD} pointerEvents="none">
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
              {isRecording && (
                <Animated.View style={[styles.recIndicator, { opacity: recDot }]}>
                  <View style={styles.recIndicatorDot} />
                  <Text style={styles.recIndicatorText}>REC</Text>
                </Animated.View>
              )}
              <View style={styles.hudTL}>
                <Text style={styles.hudLabel}>GPS</Text>
                <Text style={styles.hudVal}>{coordStr}</Text>
              </View>
              <View style={styles.hudTR}>
                <Text style={styles.hudLabel}>SPEED</Text>
                <Text style={styles.hudSpeed}>{speedKmh} km/h</Text>
              </View>
            </View>
            {/* Record button */}
            <View style={styles.recordBtnWrap}>
              <TouchableOpacity
                style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                onPress={isRecording ? handleStopRecording : handleStartRecording}
              >
                <View style={[styles.recordBtnInner, isRecording && styles.recordBtnInnerStop]} />
              </TouchableOpacity>
              <Text style={styles.recordBtnLabel}>{isRecording ? 'STOP' : 'RECORD'}</Text>
            </View>
          </>
        ) : (
          // HUD Placeholder when camera is off
          <>
            <View style={styles.hudGrid} pointerEvents="none">
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={`v${i}`} style={[styles.gridLine, styles.gridV, { left: `${(i + 1) * (100 / 6)}%` }]} />
              ))}
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={`h${i}`} style={[styles.gridLine, styles.gridH, { top: `${(i + 1) * 25}%` }]} />
              ))}
            </View>
            <Animated.View style={[styles.scanLine, {
              transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 190] }) }]
            }]} />
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
            <View style={styles.crossH} /><View style={styles.crossV} />
            <View style={styles.placeholderCenter}>
              <Text style={styles.placeholderIcon}>◎</Text>
              <Text style={styles.placeholderText}>TAP CAMERA TO ACTIVATE</Text>
            </View>
            <View style={styles.hudTL}>
              <Text style={styles.hudLabel}>GPS</Text>
              <Text style={styles.hudVal}>{coordStr}</Text>
            </View>
            <View style={styles.hudTR}>
              <Text style={styles.hudLabel}>SPEED</Text>
              <Text style={styles.hudSpeed}>{speedKmh} km/h</Text>
            </View>
            <View style={styles.hudBL}>
              <View style={styles.hazardBadge}>
                <Text style={styles.hazardBadgeNum}>{nearbyHazardsCount}</Text>
                <Text style={styles.hazardBadgeLabel}>NEARBY{'\n'}HAZARDS</Text>
              </View>
            </View>
          </>
        )}

        {/* Report flash */}
        <Animated.View style={[styles.reportFlash, { opacity: flashAnim }]} pointerEvents="none">
          <Text style={styles.flashIcon}>{lastReport?.icon}</Text>
          <Text style={styles.flashTitle}>HAZARD REPORTED</Text>
          <Text style={styles.flashSub}>{lastReport?.label?.toUpperCase()}</Text>
        </Animated.View>
      </View>

      {/* ── Report Button ── */}
      <TouchableOpacity
        style={[styles.reportBtn, reporting && styles.reportBtnDisabled]}
        onPress={() => setShowPicker(v => !v)}
        disabled={reporting}
        activeOpacity={0.85}
      >
        <Text style={styles.reportBtnIcon}>⚡</Text>
        <Text style={styles.reportBtnText}>{reporting ? 'REPORTING...' : 'REPORT HAZARD'}</Text>
      </TouchableOpacity>

      {/* ── Hazard Type Picker ── */}
      {showPicker && (
        <View style={styles.picker}>
          <Text style={styles.pickerTitle}>SELECT HAZARD TYPE</Text>
          <View style={styles.pickerGrid}>
            {HAZARD_TYPES.map(h => (
              <TouchableOpacity
                key={h.id}
                style={[styles.pickerItem, { borderColor: h.color + '60' }]}
                onPress={() => handleReport(h.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pickerItemIcon, { color: h.color }]}>{h.icon}</Text>
                <Text style={styles.pickerItemLabel}>{h.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Nearby Hazards ── */}
      {!showPicker && (
        <View style={styles.nearbySection}>
          <View style={styles.nearbyHeader}>
            <Text style={styles.nearbyTitle}>NEARBY HAZARDS</Text>
            <View style={styles.nearbyCountBadge}>
              <Text style={styles.nearbyCountText}>{nearbyHazardsCount}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyScroll}>
            {nearbyHazards.length === 0 ? (
              <View style={styles.noHazards}>
                <Text style={styles.noHazardsIcon}>✓</Text>
                <Text style={styles.noHazardsText}>No hazards detected nearby</Text>
              </View>
            ) : nearbyHazards.map((h, i) => {
              const meta = HAZARD_TYPES.find(t => t.id === h.hazard_type);
              const sc = SEV_COLORS[h.severity_level] ?? '#fff';
              return (
                <View key={h.id ?? i} style={[styles.hazardCard, { borderLeftColor: sc }]}>
                  <Text style={[styles.hazardCardIcon, { color: meta?.color ?? '#fff' }]}>{meta?.icon ?? '⚠'}</Text>
                  <Text style={styles.hazardCardType}>{(meta?.label ?? h.hazard_type).toUpperCase()}</Text>
                  <View style={[styles.sevBadge, { backgroundColor: sc + '25' }]}>
                    <Text style={[styles.sevBadgeText, { color: sc }]}>{h.severity_level?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.hazardCardConf}>{Math.round((h.confidence_score ?? 0) * 100)}% conf</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Bottom spacer for floating tab bar */}
      <View style={{ height: 100 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b1a' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, width: 90 },
  recDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: '#ff3333',
    shadowColor: '#ff3333', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  recLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  recLabelActive: { color: '#ff3333' },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 5 },
  camToggleBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.35)',
    backgroundColor: 'rgba(0,212,255,0.07)', width: 90, alignItems: 'center',
  },
  camToggleBtnActive: { borderColor: '#ff3333', backgroundColor: 'rgba(255,51,51,0.1)' },
  camToggleText: { color: '#00d4ff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  camToggleTextActive: { color: '#ff3333' },

  // Viewfinder
  viewfinderWrap: {
    height: 220, backgroundColor: '#050a14',
    position: 'relative', overflow: 'hidden',
  },
  hudGrid: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(0,212,255,0.06)' },
  gridV: { width: 1, height: '100%' },
  gridH: { height: 1, width: '100%' },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 1.5,
    backgroundColor: '#00d4ff', opacity: 0.45,
    shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
  },

  // Corners
  corner: { position: 'absolute', width: 18, height: 18, borderColor: '#00d4ff' },
  cTL: { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 },

  // Crosshair
  crossH: { position: 'absolute', top: '50%', left: '25%', right: '25%', height: 1, backgroundColor: 'rgba(0,212,255,0.3)' },
  crossV: { position: 'absolute', left: '50%', top: '25%', bottom: '25%', width: 1, backgroundColor: 'rgba(0,212,255,0.3)' },

  // Placeholder
  placeholderCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  placeholderIcon: { fontSize: 28, color: 'rgba(0,212,255,0.18)' },
  placeholderText: { color: 'rgba(0,212,255,0.22)', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  // Camera HUD overlay
  camHUD: { ...StyleSheet.absoluteFillObject },
  recIndicator: {
    position: 'absolute', top: 14, left: '50%', marginLeft: -24,
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  recIndicatorDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3333',
    shadowColor: '#ff3333', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  recIndicatorText: { color: '#ff3333', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  recordBtnWrap: {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    left: 0, right: 0, alignItems: 'center', gap: 4,
  },
  recordBtn: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3, borderColor: '#fff',
    backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center',
  },
  recordBtnActive: { borderColor: '#ff3333' },
  recordBtnInner: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff3333',
  },
  recordBtnInnerStop: { borderRadius: 4, width: 22, height: 22 },
  recordBtnLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', letterSpacing: 2 },

  // HUD positions
  hudTL: { position: 'absolute', top: 12, left: 12 },
  hudTR: { position: 'absolute', top: 12, right: 12, alignItems: 'flex-end' },
  hudBL: { position: 'absolute', bottom: 12, left: 12 },
  hudLabel: { color: 'rgba(0,212,255,0.55)', fontSize: 8, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
  hudVal: { color: '#00d4ff', fontSize: 9, fontWeight: '600' },
  hudSpeed: { color: '#00ff88', fontSize: 20, fontWeight: '900' },
  hazardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,68,68,0.15)', borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.4)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  hazardBadgeNum: { color: '#ff4444', fontSize: 20, fontWeight: '900' },
  hazardBadgeLabel: { color: 'rgba(255,68,68,0.8)', fontSize: 8, fontWeight: '700', letterSpacing: 1, lineHeight: 11 },

  // Flash overlay
  reportFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,255,136,0.1)', borderWidth: 2, borderColor: '#00ff88',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  flashIcon: { fontSize: 30 },
  flashTitle: { color: '#00ff88', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  flashSub: { color: 'rgba(0,255,136,0.65)', fontSize: 10, letterSpacing: 2 },

  // Report button
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 12, paddingVertical: 14,
    backgroundColor: 'rgba(255,68,68,0.08)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,68,68,0.45)',
  },
  reportBtnDisabled: { opacity: 0.45 },
  reportBtnIcon: { fontSize: 16, color: '#ff4444' },
  reportBtnText: { color: '#ff4444', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  // Hazard picker
  picker: { paddingHorizontal: 16, paddingTop: 10, flex: 1 },
  pickerTitle: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: {
    width: (width - 56) / 3, alignItems: 'center', paddingVertical: 14,
    borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', gap: 6,
  },
  pickerItemIcon: { fontSize: 22 },
  pickerItemLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },

  // Nearby hazards
  nearbySection: { paddingTop: 10, flex: 1 },
  nearbyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  nearbyTitle: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  nearbyCountBadge: {
    backgroundColor: 'rgba(0,212,255,0.12)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
  },
  nearbyCountText: { color: '#00d4ff', fontSize: 10, fontWeight: '700' },
  nearbyScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  noHazards: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 20, gap: 6 },
  noHazardsIcon: { fontSize: 22, color: '#00ff88' },
  noHazardsText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  hazardCard: {
    width: 130, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3, padding: 12, gap: 4,
  },
  hazardCardIcon: { fontSize: 20, marginBottom: 2 },
  hazardCardType: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sevBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sevBadgeText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  hazardCardConf: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
});
