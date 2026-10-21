import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DashboardHeaderProps {
  firstName: string;
  avatarPhotoUrl?: string;
  avatarInitials: string;
  hideBalances: boolean;
  onTogglePrivacy: () => void;
  textColor: string;
  surfaceColor: string;
  mutedTextColor: string;
  dashboardAccent: string;
  borderColor?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  firstName,
  avatarPhotoUrl,
  avatarInitials,
  hideBalances,
  onTogglePrivacy,
  textColor,
  surfaceColor,
  mutedTextColor,
  dashboardAccent,
  borderColor = 'rgba(255, 255, 255, 0.08)',
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={styles.profileGroup}>
        <View style={[styles.avatarCircle, { backgroundColor: surfaceColor, borderColor }]}>
          {avatarPhotoUrl ? (
            <Image source={{ uri: avatarPhotoUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarInitials, { color: textColor }]}>{avatarInitials}</Text>
          )}
        </View>

        <View style={styles.welcomeWrap}>
          <Text style={[styles.greetingLabel, { color: mutedTextColor }]}>
            {t('dashboard.welcomeBack', { defaultValue: 'Bem-vindo de volta' })}
          </Text>
          <Text style={[styles.greetingText, { color: textColor }]} numberOfLines={1}>
            {firstName}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onTogglePrivacy}
        style={[styles.privacyButton, { backgroundColor: surfaceColor, borderColor }]}
        activeOpacity={0.8}
        accessibilityLabel={t('dashboard.togglePrivacy', { defaultValue: 'Ocultar Valores' })}
      >
        <MaterialCommunityIcons
          name={hideBalances ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={hideBalances ? mutedTextColor : dashboardAccent}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  profileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  welcomeWrap: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 1,
    letterSpacing: 0.1,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  privacyButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
