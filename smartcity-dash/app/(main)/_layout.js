import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'index',    label: 'Dashcam',  icon: '🎥' },
  { name: 'history',  label: 'History',  icon: '📋' },
  { name: 'settings', label: 'Settings', icon: '⚙️' },
];

function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomSafe }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;
          const tabConfig = TABS[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              preventDefault: false,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
            >
              <View style={[styles.iconBox, isFocused && styles.iconBoxActive]}>
                <Text style={styles.icon}>{tabConfig.icon}</Text>
              </View>
              <Text
                style={[styles.label, isFocused && styles.labelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneContainerStyle: { backgroundColor: '#0f172a' },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#060b1a',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 21, 41, 0.95)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    elevation: 25,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    minHeight: 80,
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.25)',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: 'rgba(0, 212, 255, 0.4)',
    elevation: 8,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.3,
  },
  labelActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00d4ff',
    letterSpacing: 0.4,
  },
});
