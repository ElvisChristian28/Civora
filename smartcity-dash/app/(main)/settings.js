import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useStore } from '../hooks/useStore';

const VEHICLE_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Truck', 'Motorcycle', 'Electric'];

function ToggleRow({ label, subtitle, value, onToggle, color = '#00d4ff', disabled }) {
  return (
    <View style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: color + '55' }}
        thumbColor={value ? color : 'rgba(255,255,255,0.4)'}
        disabled={disabled}
      />
    </View>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function SettingsScreen() {
  const { driverId, driverSettings, fetchDriverSettings, updateDriverSettings, reset } = useStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [vehicleType, setVehicleType] = useState('SUV');
  const [autoReporting, setAutoReporting] = useState(true);
  const [highResolution, setHighResolution] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [driverId])
  );

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await fetchDriverSettings(driverId);
      if (settings) populateForm(settings);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (s) => {
    setFullName(s.full_name ?? '');
    setVehicleType(s.vehicle_type ?? 'SUV');
    setAutoReporting(s.auto_reporting ?? true);
    setHighResolution(s.high_resolution ?? true);
    setSoundAlerts(s.sound_alerts ?? true);
    setCloudBackup(s.cloud_backup ?? false);
    setAnonymousMode(s.anonymous_mode ?? false);
    setHasChanges(false);
  };

  const markChanged = () => setHasChanges(true);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateDriverSettings(driverId, {
        full_name: fullName,
        vehicle_type: vehicleType,
        auto_reporting: autoReporting,
        high_resolution: highResolution,
        sound_alerts: soundAlerts,
        cloud_backup: cloudBackup,
        anonymous_mode: anonymousMode,
      });
      setHasChanges(false);
      Alert.alert('✓ Saved', 'Your settings have been updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (driverSettings) populateForm(driverSettings);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            reset();
            router.replace('/');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color="#00d4ff" size="large" />
          <Text style={styles.loadingText}>LOADING SETTINGS...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          {hasChanges && (
            <View style={styles.headerChanged}>
              <View style={styles.changedDot} />
              <Text style={styles.changedText}>UNSAVED</Text>
            </View>
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Driver Profile */}
          <SectionHeader title="DRIVER PROFILE" icon="◈" />

          <View style={styles.card}>
            {/* Driver ID chip */}
            <View style={styles.driverIdRow}>
              <Text style={styles.driverIdLabel}>ID</Text>
              <Text style={styles.driverIdValue} numberOfLines={1} ellipsizeMode="middle">
                {driverId ?? '—'}
              </Text>
            </View>

            {/* Full name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={(t) => { setFullName(t); markChanged(); }}
                placeholder="Enter full name"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCorrect={false}
              />
            </View>

            {/* Vehicle type */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>VEHICLE TYPE</Text>
              <TouchableOpacity
                style={styles.vehicleSelect}
                onPress={() => setShowVehiclePicker((v) => !v)}
              >
                <Text style={styles.vehicleSelectText}>{vehicleType}</Text>
                <Text style={styles.vehicleSelectArrow}>{showVehiclePicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showVehiclePicker && (
                <View style={styles.vehicleOptions}>
                  {VEHICLE_TYPES.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.vehicleOption, vehicleType === v && styles.vehicleOptionActive]}
                      onPress={() => {
                        setVehicleType(v);
                        setShowVehiclePicker(false);
                        markChanged();
                      }}
                    >
                      <Text style={[styles.vehicleOptionText, vehicleType === v && styles.vehicleOptionTextActive]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Detection Settings */}
          <SectionHeader title="DETECTION" icon="◎" />
          <View style={styles.card}>
            <ToggleRow
              label="Auto Reporting"
              subtitle="Automatically submit detected hazards"
              value={autoReporting}
              onToggle={(v) => { setAutoReporting(v); markChanged(); }}
            />
            <View style={styles.divider} />
            <ToggleRow
              label="High Resolution"
              subtitle="Better detection at higher battery cost"
              value={highResolution}
              onToggle={(v) => { setHighResolution(v); markChanged(); }}
            />
          </View>

          {/* Alerts & Notifications */}
          <SectionHeader title="ALERTS" icon="⚡" />
          <View style={styles.card}>
            <ToggleRow
              label="Sound Alerts"
              subtitle="Audio cues for nearby hazards"
              value={soundAlerts}
              onToggle={(v) => { setSoundAlerts(v); markChanged(); }}
              color="#ffaa00"
            />
          </View>

          {/* Privacy & Data */}
          <SectionHeader title="PRIVACY & DATA" icon="⊙" />
          <View style={styles.card}>
            <ToggleRow
              label="Cloud Backup"
              subtitle="Sync history to cloud storage"
              value={cloudBackup}
              onToggle={(v) => { setCloudBackup(v); markChanged(); }}
              color="#aa44ff"
            />
            <View style={styles.divider} />
            <ToggleRow
              label="Anonymous Mode"
              subtitle="Submit hazards without your driver ID"
              value={anonymousMode}
              onToggle={(v) => { setAnonymousMode(v); markChanged(); }}
              color="#ff6600"
            />
          </View>

          {/* Save / Discard */}
          {hasChanges && (
            <View style={styles.saveRow}>
              <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
                <Text style={styles.discardBtnText}>DISCARD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#060b1a" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* App info */}
          <SectionHeader title="SYSTEM" icon="≡" />
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>APP VERSION</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>API STATUS</Text>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>DEMO MODE</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BUILD</Text>
              <Text style={styles.infoValue}>SmartCity Dash · 2026</Text>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutIcon}>→</Text>
            <Text style={styles.logoutText}>SIGN OUT</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b1a' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)',
  },
  headerTitle: {
    color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 5,
  },
  headerChanged: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  changedDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#ffaa00',
    shadowColor: '#ffaa00', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 4,
  },
  changedText: { color: '#ffaa00', fontSize: 9, fontWeight: '700', letterSpacing: 2 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginBottom: 8,
  },
  sectionIcon: { color: '#00d4ff', fontSize: 14 },
  sectionTitle: { color: '#00d4ff', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,212,255,0.15)' },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 14 },

  // Driver ID row
  driverIdRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,212,255,0.04)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  driverIdLabel: { color: 'rgba(0,212,255,0.7)', fontSize: 9, fontWeight: '700', letterSpacing: 2, width: 20 },
  driverIdValue: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  // Inputs
  inputGroup: { paddingHorizontal: 14, paddingVertical: 12 },
  inputLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  textInput: {
    color: '#ffffff', fontSize: 14, fontWeight: '500',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.25)',
    paddingBottom: 6, paddingTop: 2,
  },

  // Vehicle picker
  vehicleSelect: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
    borderRadius: 3, paddingHorizontal: 12, paddingVertical: 8,
  },
  vehicleSelectText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  vehicleSelectArrow: { color: '#00d4ff', fontSize: 10 },
  vehicleOptions: {
    marginTop: 6, borderRadius: 3,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    overflow: 'hidden',
  },
  vehicleOption: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  vehicleOptionActive: { backgroundColor: 'rgba(0,212,255,0.1)' },
  vehicleOptionText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  vehicleOptionTextActive: { color: '#00d4ff', fontWeight: '700' },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  toggleRowDisabled: { opacity: 0.4 },
  toggleInfo: { flex: 1, gap: 2 },
  toggleLabel: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  toggleSubtitle: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },

  // Save/Discard
  saveRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  discardBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  discardBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  saveBtn: {
    flex: 2, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, backgroundColor: '#00d4ff',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#060b1a', fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  infoLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600' },
  infoValue: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,255,136,0.1)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(0,255,136,0.25)',
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 4,
  },
  statusText: { color: '#00ff88', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 4, borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    backgroundColor: 'rgba(255,68,68,0.07)',
  },
  logoutIcon: { color: '#ff4444', fontSize: 14 },
  logoutText: { color: '#ff4444', fontSize: 12, fontWeight: '800', letterSpacing: 2 },

  // Loading
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(0,212,255,0.5)', fontSize: 11, letterSpacing: 3 },
});
