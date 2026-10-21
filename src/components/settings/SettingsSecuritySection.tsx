import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getThemeTokens, sharedTokens } from '../../styles/themes';

interface SettingsSecuritySectionProps {
  pinConfigured: boolean;
  theme: 'light' | 'dark';
  onOpenPinModal: () => void;
  onRemovePin: () => void;
}

export const SettingsSecuritySection: React.FC<SettingsSecuritySectionProps> = ({
  pinConfigured,
  theme,
  onOpenPinModal,
  onRemovePin,
}) => {
  const { t } = useTranslation();
  const tokens = getThemeTokens(theme);

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
          {t('settings.security.title', { defaultValue: 'Segurança' })}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconSquare, { backgroundColor: tokens.primaryTonal }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={tokens.primary} />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={[styles.profileName, { color: tokens.textPrimary }]}>
                {t('settings.security.pinTitle', { defaultValue: 'PIN de Acesso' })}
              </Text>
              <Text style={[styles.profileEmail, { color: tokens.textSecondary }]}>
                {pinConfigured
                  ? t('settings.security.pinActive', {
                      defaultValue: 'PIN de 4 dígitos ativo para desbloqueio seguro',
                    })
                  : t('settings.security.pinInactive', {
                      defaultValue: 'Nenhum PIN numérico cadastrado',
                    })}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: pinConfigured ? tokens.positiveTonal : tokens.warningTonal,
                borderColor: pinConfigured ? tokens.positiveTonalBorder : tokens.warningTonalBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                { color: pinConfigured ? tokens.positive : tokens.warning },
              ]}
            >
              {pinConfigured ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.outlineBtn,
              {
                backgroundColor: tokens.surfaceInteractive,
                borderColor: tokens.border,
                flex: 1,
              },
            ]}
            onPress={onOpenPinModal}
          >
            <Text style={[styles.outlineBtnText, { color: tokens.textPrimary }]}>
              {pinConfigured
                ? t('settings.security.changePin', { defaultValue: 'Alterar PIN' })
                : t('settings.security.setupPin', { defaultValue: 'Cadastrar PIN' })}
            </Text>
          </Pressable>

          {pinConfigured ? (
            <Pressable
              style={[
                styles.outlineBtn,
                {
                  backgroundColor: tokens.surfaceInteractive,
                  borderColor: tokens.border,
                },
              ]}
              onPress={onRemovePin}
            >
              <Text style={[styles.outlineBtnText, { color: tokens.negative }]}>
                {t('settings.security.removePin', { defaultValue: 'Remover PIN' })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 10,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: sharedTokens.spacing.lg,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  iconSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
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
  outlineBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
