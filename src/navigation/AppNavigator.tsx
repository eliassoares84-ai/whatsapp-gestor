import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardScreen } from '../screens/DashboardScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useFinanceStore } from '../store/useFinanceStore';

const Tab = createBottomTabNavigator();

export const AppNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();

  const {
    hasCompletedOnboarding,
    currentWorkspaceId,
    workspaces,
    checkAndProcessRecurrences,
  } = useFinanceStore();

  const currentWorkspace = workspaces.find((ws) => ws.id === currentWorkspaceId);
  const activeTintColor = currentWorkspace?.themeColor || '#0A84FF';

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void NavigationBar.setBackgroundColorAsync('transparent');
    void NavigationBar.setButtonStyleAsync('light');
  }, []);

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      return;
    }

    checkAndProcessRecurrences();
  }, [hasCompletedOnboarding, checkAndProcessRecurrences]);

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 24 + insets.bottom,
          backgroundColor: '#121212',
          borderTopWidth: 0,
          borderRadius: 24,
          height: 64,
          elevation: 8,
          shadowColor: '#000000',
          shadowOpacity: 0.24,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] =
            'view-dashboard-outline';

          if (route.name === 'Reports') {
            iconName = 'chart-pie';
          }

          if (route.name === 'Workspaces') {
            iconName = 'briefcase-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Workspaces" component={SettingsScreen} />
    </Tab.Navigator>
  );
};
