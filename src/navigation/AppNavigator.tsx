import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, AppState, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardScreen } from '../screens/DashboardScreen';
import { GoogleLinkScreen } from '../screens/GoogleLinkScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { OnboardingQuizScreen } from '../screens/OnboardingQuizScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { useGoogleDriveService } from '../utils/GoogleDriveService';
import { CopilotStep, walkthroughable } from '../utils/copilotSafe';

import { getThemeTokens } from '../styles/themes';

const Tab = createBottomTabNavigator();
const WalkthroughableView = walkthroughable(View);

const isSameLocalDay = (firstIso: string, second: Date): boolean => {
  if (!firstIso) {
    return false;
  }

  const first = new Date(firstIso);
  if (Number.isNaN(first.getTime())) {
    return false;
  }

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

export const AppNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const {
    hasHydrated,
    hasCompletedOnboarding,
    hasCompletedGoogleLinkPrompt,
    isGoogleLinkPromptManuallyRequested,
    hasCompletedQuiz,
    userProfile,
    googleLinkedEmail,
    currentWorkspaceId,
    workspaces,
    nightlyAutoBackupEnabled,
    nightlyAutoBackupHour,
    lastAutoBackupAt,
    setLastAutoBackupAt,
    checkAndProcessRecurrences,
    completeGoogleLinkPrompt,
  } = useFinanceStore();
  const { syncBackupToCloud } = useGoogleDriveService();
  const isRunningAutoBackupRef = useRef(false);
  const workspaceList = Array.isArray(workspaces) ? workspaces : [];
  const safeUserProfile = userProfile || {};
  const safeGoogleEmail = googleLinkedEmail || '';

  const currentWorkspace = workspaceList.find((ws) => ws.id === currentWorkspaceId);
  const activeTintColor = tokens.primary;
  const tabBg = tokens.backgroundElevated;
  const tabInactive = tokens.textTertiary;
  const navigationBarColor = tokens.backgroundElevated;

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void NavigationBar.setPositionAsync('absolute');
    void NavigationBar.setVisibilityAsync('hidden');
    void NavigationBar.setBehaviorAsync('overlay-swipe');
    void NavigationBar.setBackgroundColorAsync(navigationBarColor);
    void NavigationBar.setButtonStyleAsync(theme === 'light' ? 'dark' : 'light');
  }, [navigationBarColor, theme]);

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      return;
    }

    checkAndProcessRecurrences();
  }, [hasCompletedOnboarding, checkAndProcessRecurrences]);

  const maybeRunNightlyAutoBackup = useCallback(async () => {
    if (!hasCompletedOnboarding || !nightlyAutoBackupEnabled) {
      return;
    }

    if (!googleLinkedEmail.trim()) {
      return;
    }

    const now = new Date();
    if (now.getHours() < nightlyAutoBackupHour) {
      return;
    }

    if (isSameLocalDay(lastAutoBackupAt, now)) {
      return;
    }

    if (isRunningAutoBackupRef.current) {
      return;
    }

    isRunningAutoBackupRef.current = true;
    try {
      const synced = await syncBackupToCloud();
      if (synced) {
        setLastAutoBackupAt(now.toISOString());
      }
    } finally {
      isRunningAutoBackupRef.current = false;
    }
  }, [
    googleLinkedEmail,
    hasCompletedOnboarding,
    lastAutoBackupAt,
    nightlyAutoBackupEnabled,
    nightlyAutoBackupHour,
    setLastAutoBackupAt,
    syncBackupToCloud,
  ]);

  useEffect(() => {
    void maybeRunNightlyAutoBackup();
  }, [maybeRunNightlyAutoBackup]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void maybeRunNightlyAutoBackup();
      }
    });

    return () => subscription.remove();
  }, [maybeRunNightlyAutoBackup]);

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  const hasBusinessWorkspace = workspaceList.some((workspace) => workspace.type === 'business');
  const isPersonalOnlyMode =
    safeUserProfile.scope === 'Vida Pessoal' ||
    (workspaceList.length === 1 && workspaceList[0]?.type === 'personal');
  const shouldShowBusinessTab = hasBusinessWorkspace && !isPersonalOnlyMode;
  const settingsRouteName = shouldShowBusinessTab ? 'Workspaces' : 'Settings';
  const requiresGoogleLink =
    shouldShowBusinessTab ||
    safeUserProfile.scope === 'Ambos' ||
    safeUserProfile.scope === 'Empresa/Serviços';
  const hasGoogleEmail = Boolean(safeGoogleEmail.trim());
  // Token is in-memory only and is lost on every app restart.
  // Force the link prompt only when the user has never linked an email account.
  const shouldForceGoogleLink = requiresGoogleLink && !hasGoogleEmail;
  const shouldShowGoogleLinkPrompt =
    shouldForceGoogleLink ||
    isGoogleLinkPromptManuallyRequested ||
    (!hasCompletedGoogleLinkPrompt && requiresGoogleLink);

  if (!hasHydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tabBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={activeTintColor} />
      </View>
    );
  }

  if (shouldShowGoogleLinkPrompt) {
    return (
      <GoogleLinkScreen
        onLinked={(email, photoUrl, name) => completeGoogleLinkPrompt(email, photoUrl, name)}
        onSkip={() => completeGoogleLinkPrompt()}
        requireLink={false}
      />
    );
  }

  if (!hasCompletedQuiz) {
    return <OnboardingQuizScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopWidth: 1,
          borderTopColor: tokens.border,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabel: ({ focused, color }) => {
          const labels: Record<string, string> = {
            Home: t('nav.home', { defaultValue: 'Início' }),
            Transactions: t('nav.transactions', { defaultValue: 'Extrato' }),
            Reports: t('nav.reports', { defaultValue: 'Relatórios' }),
            Workspaces: t('nav.settings', { defaultValue: 'Ajustes' }),
            Settings: t('nav.settings', { defaultValue: 'Ajustes' }),
          };
          return (
            <Text
              style={{
                fontSize: 11,
                fontWeight: focused ? '700' : '500',
                color,
                marginTop: 2,
                letterSpacing: 0.1,
              }}
              numberOfLines={1}
            >
              {labels[route.name] ?? route.name}
            </Text>
          );
        },
        tabBarIcon: ({ color, size, focused }) => {
          const navState = navigation.getState();
          const activeRouteName = navState.routes[navState.index]?.name;
          const isDashboardContext = activeRouteName === 'Home';

          let iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] =
            focused ? 'view-dashboard' : 'view-dashboard-outline';

          if (route.name === 'Transactions') {
            iconName = focused ? 'file-document' : 'file-document-outline';
          }

          if (route.name === 'Reports') {
            iconName = focused ? 'chart-pie' : 'chart-pie';
          }

          if (route.name === 'Workspaces' || route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          const iconEl = (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 28,
                borderRadius: 14,
                backgroundColor: focused ? tokens.primaryTonal : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={iconName} size={22} color={color} />
            </View>
          );

          if (route.name === 'Reports') {
            return (
              <CopilotStep
                active={isDashboardContext}
                text={t('tour.dashboard.reportsNav')}
                order={6}
                name="dashboard_reports_nav"
              >
                <WalkthroughableView>{iconEl}</WalkthroughableView>
              </CopilotStep>
            );
          }

          return iconEl;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name={settingsRouteName} component={SettingsScreen} />
    </Tab.Navigator>
  );
};