import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(-height * 0.4)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: height * 0.4,
          duration: 2800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: -height * 0.4,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLaunch = () => {
    router.replace('/(main)');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Grid background */}
      <View style={styles.gridContainer}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: (i / 11) * width }]} />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: (i / 19) * height }]} />
        ))}
      </View>

      {/* Scan line */}
      <Animated.View
        style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]}
      />

      {/* Corner brackets */}
      <View style={[styles.bracket, styles.bracketTL]} />
      <View style={[styles.bracket, styles.bracketTR]} />
      <View style={[styles.bracket, styles.bracketBL]} />
      <View style={[styles.bracket, styles.bracketBR]} />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoIcon}>◈</Text>
            </View>
          </View>
        </Animated.View>

        {/* Status row */}
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>SYSTEM ONLINE</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>SMARTCITY</Text>
        <Text style={styles.titleSub}>DASH</Text>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>v1.0</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Real-time road hazard detection{'\n'}powered by AI & community reporting
        </Text>

        {/* Feature chips */}
        <View style={styles.chips}>
          {['GPS Tracking', 'AI Detection', 'Live Alerts'].map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>

        {/* Launch button */}
        <TouchableOpacity style={styles.launchBtn} onPress={handleLaunch} activeOpacity={0.8}>
          <View style={styles.launchBtnInner}>
            <Text style={styles.launchBtnText}>INITIALIZE SYSTEM</Text>
            <Text style={styles.launchArrow}>▶</Text>
          </View>
          <View style={styles.launchBtnGlow} />
        </TouchableOpacity>

        {/* Bottom note */}
        <Text style={styles.bottomNote}>
          Demo mode active · Connect backend for live data
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060b1a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: '#00d4ff',
  },
  gridLineV: {
    width: 1,
    height: '100%',
  },
  gridLineH: {
    height: 1,
    width: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00d4ff',
    opacity: 0.35,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  bracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#00d4ff',
    opacity: 0.5,
  },
  bracketTL: { top: 20, left: 20, borderTopWidth: 2, borderLeftWidth: 2 },
  bracketTR: { top: 20, right: 20, borderTopWidth: 2, borderRightWidth: 2 },
  bracketBL: { bottom: 20, left: 20, borderBottomWidth: 2, borderLeftWidth: 2 },
  bracketBR: { bottom: 20, right: 20, borderBottomWidth: 2, borderRightWidth: 2 },

  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#00d4ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  logoIcon: {
    fontSize: 34,
    color: '#00d4ff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  statusText: {
    color: '#00ff88',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 8,
    lineHeight: 44,
  },
  titleSub: {
    fontSize: 42,
    fontWeight: '900',
    color: '#00d4ff',
    letterSpacing: 16,
    lineHeight: 48,
    textShadowColor: '#00d4ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.3)',
  },
  dividerText: {
    color: 'rgba(0, 212, 255, 0.6)',
    fontSize: 11,
    letterSpacing: 2,
  },
  description: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 36,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.35)',
    backgroundColor: 'rgba(0, 212, 255, 0.07)',
  },
  chipText: {
    color: '#00d4ff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  launchBtn: {
    width: '90%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  launchBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#00d4ff',
    gap: 10,
  },
  launchBtnText: {
    color: '#060b1a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
  launchArrow: {
    color: '#060b1a',
    fontSize: 12,
    fontWeight: '900',
  },
  launchBtnGlow: {
    position: 'absolute',
    bottom: -10,
    left: '10%',
    right: '10%',
    height: 20,
    backgroundColor: '#00d4ff',
    opacity: 0.25,
    borderRadius: 10,
    filter: 'blur(10px)',
  },
  bottomNote: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
