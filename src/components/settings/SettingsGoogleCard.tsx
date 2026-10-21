import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getThemeTokens, sharedTokens } from '../../styles/themes';

interface SettingsGoogleCardProps {
  googleLinkedName: string;
  googleLinkedEmail: string;
  resolvedGooglePhotoUrl?: string;
  googleInitials: string;
  isGoogleLinked: boolean;
  theme: 'light' | 'dark';
  onOpenPrompt: () => void;
  onUnlink: () => void;
}

export const SettingsGoogleCard: React.FC<SettingsGoogleCardProps> = ({
  googleLinkedName,
  googleLinkedEmail,
  resolvedGooglePhotoUrl,
  googleInitials,
  isGoogleLinked,
  theme,
  onOpenPrompt,
  onUnlink,
}) => {
  const { t } = useTranslation();
  const tokens = getThemeTokens(theme);

  return (
    <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarCircle, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}>
            {resolvedGooglePhotoUrl ? (
              <Image source={{ uri: resolvedGooglePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: tokens.textPrimary }]}>{googleInitials}</Text>
            )}
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.profileName, { color: tokens.textPrimary }]} numberOfLines={1}>
              {googleLinkedName.trim() ||
                t('settings.google.notConnected', {
                  defaultValue: 'Conta Google não vinculada',
                })}
            </Text>
            <Text style={[styles.profileEmail, { color: tokens.textSecondary }]} numberOfLines={1}>
              {googleLinkedEmail.trim() ||
                t('settings.google.connectToSync', {
                  defaultValue: 'Conecte para sincronizar no Drive',
                })}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isGoogleLinked ? tokens.positiveTonal : tokens.warningTonal,
              borderColor: isGoogleLinked ? tokens.positiveTonalBorder : tokens.warningTonalBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: isGoogleLinked ? tokens.positive : tokens.warning },
            ]}
          >
            {isGoogleLinked
              ? t('settings.google.connected', { defaultValue: 'Conectado' })
              : t('settings.google.pending', { defaultValue: 'Pendente' })}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: isGoogleLinked ? tokens.surfaceInteractive : tokens.primary,
              borderColor: isGoogleLinked ? tokens.border : tokens.primary,
            },
          ]}
          onPress={onOpenPrompt}
        >
          <MaterialCommunityIcons
            name={isGoogleLinked ? 'account-switch-outline' : 'google'}
            size={16}
            color={isGoogleLinked ? tokens.textPrimary : '#FFFFFF'}
          />
          <Text
            style={[
              styles.actionButtonText,
              { color: isGoogleLinked ? tokens.textPrimary : '#FFFFFF' },
            ]}
          >
            {isGoogleLinked
              ? t('settings.google.switchAccount', { defaultValue: 'Trocar Conta' })
              : t('settings.google.connect', { defaultValue: 'Conectar Conta Google' })}
          </Text>
        </Pressable>

        {isGoogleLinked ? (
          <Pressable
            style={[
              styles.disconnectButton,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.surfaceInteractive,
              },
            ]}
            onPress={onUnlink}
          >
            <MaterialCommunityIcons name="logout" size={15} color={tokens.negative} />
            <Text style={[styles.disconnectButtonText, { color: tokens.negative }]}>
              {t('settings.google.disconnect', { defaultValue: 'Desconectar' })}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: sharedTokens.spacing.lg,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTextWrap: {
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  disconnectButton: {
    height: 44,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  disconnectButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
