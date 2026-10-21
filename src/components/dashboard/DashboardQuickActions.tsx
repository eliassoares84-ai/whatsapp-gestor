import { Feather } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DashboardQuickActionsProps {
  onLaunchPress: () => void;
  onTransactionsPress: () => void;
  onReportsPress: () => void;
  onSettingsPress: () => void;
  surfaceColor: string;
  textColor: string;
  dashboardAccent: string;
  isDark: boolean;
  borderColor?: string;
  tonalBg?: string;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  onLaunchPress,
  onTransactionsPress,
  onReportsPress,
  onSettingsPress,
  surfaceColor,
  textColor,
  dashboardAccent,
  borderColor = 'rgba(255, 255, 255, 0.08)',
  tonalBg = 'rgba(41, 151, 255, 0.12)',
}) => {
  const { t } = useTranslation();

  const actions = [
    {
      key: 'launch',
      icon: 'plus' as const,
      label: t('dashboard.quickActions.launch', { defaultValue: 'Lançar' }),
      onPress: onLaunchPress,
    },
    {
      key: 'transactions',
      icon: 'file-text' as const,
      label: t('dashboard.quickActions.transactions', { defaultValue: 'Extrato' }),
      onPress: onTransactionsPress,
    },
    {
      key: 'reports',
      icon: 'bar-chart-2' as const,
      label: t('dashboard.quickActions.reports', { defaultValue: 'Relatórios' }),
      onPress: onReportsPress,
    },
    {
      key: 'settings',
      icon: 'settings' as const,
      label: t('dashboard.quickActions.settings', { defaultValue: 'Ajustes' }),
      onPress: onSettingsPress,
    },
  ];

  return (
    <View style={styles.quickActionsGrid}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={[styles.quickActionButton, { backgroundColor: surfaceColor, borderColor }]}
          onPress={action.onPress}
          activeOpacity={0.75}
        >
          <View style={[styles.iconContainer, { backgroundColor: tonalBg }]}>
            <Feather name={action.icon} size={18} color={dashboardAccent} />
          </View>
          <Text style={[styles.quickActionText, { color: textColor }]} numberOfLines={1}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
