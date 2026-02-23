import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'index',    label: 'DASHCAM',  icon: '◎', activeIcon: '◎' },
  { name: 'history',  label: 'HISTORY',  icon: '≡',  activeIcon: '≡'  },
  { name: 'settings', label: 'SETTINGS', icon: '⊙', activeIcon: '⊙' },
];

function TabIcon({ focused, icon, label }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      {focused && <View style={styles.iconGlow} />}
      <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const bottomSafe = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          { bottom: bottomSafe + 8, height: 68 },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarActiveTintColor: '#00d4ff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={tab.icon} label={tab.label} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#0d1529',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    elevation: 20,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingHorizontal: 8,
  },
  tabBarItem: {
    height: 68,
    paddingVertical: 0,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 4,
    position: 'relative',
    minWidth: 70,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  iconGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00d4ff',
    opacity: 0.08,
  },
  icon: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.3)',
    lineHeight: 28,
  },
  iconActive: {
    color: '#00d4ff',
    textShadowColor: '#00d4ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  labelActive: {
    color: '#00d4ff',
    fontWeight: '700',
  },
});
