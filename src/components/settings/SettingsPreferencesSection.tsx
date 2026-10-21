import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import NightlyAutoBackupControls from '../NightlyAutoBackupControls';
import { useThemeStore } from '../../store/useFinanceStore';
import { getThemeTokens, sharedTokens } from '../../styles/themes';

interface SettingsPreferencesSectionProps {
  currency: string;
  currencyLabel: string;
  theme: 'dark' | 'light';
  isSyncingNow: boolean;
  lastSyncDate: string;
  onOpenCurrencyModal: () => void;
  onSyncNow: () => void;
  onOpenSyncStatusModal: () => void;
  formatSyncDate: (isoDate: string) => string;
}

export const SettingsPreferencesSection: React.FC<SettingsPreferencesSectionProps> = ({
  currency,
  currencyLabel,
  theme,
  isSyncingNow,
  lastSyncDate,
  onOpenCurrencyModal,
  onSyncNow,
  onOpenSyncStatusModal,
  formatSyncDate,
}) => {
  const { t } = useTranslation();
  const tokens = getThemeTokens(theme);

  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const isPendingSync = !lastSyncDate;

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
          {t('settings.preferences', { defaultValue: 'Preferências' })}
        </Text>
      </View>

      <View style={styles.listContainer}>
        {/* Seletor de Tema com 3 Opções: Sistema | Claro | Escuro */}
        <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconWrap, { backgroundColor: tokens.primaryTonal }]}>
              <MaterialCommunityIcons
                name="theme-light-dark"
                size={20}
                color={tokens.primary}
              />
            </View>
            <View style={styles.infoBlock}>
              <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
                {t('settings.appearance', { defaultValue: 'Aparência' })}
              </Text>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
                {themeMode === 'system'
                  ? 'Seguindo o sistema do aparelho'
                  : themeMode === 'dark'
                    ? 'Modo Escuro fintech'
                    : 'Modo Claro fintech'}
              </Text>
            </View>
          </View>

          {/* Segmented Control de 3 Opções */}
          <View style={[styles.segmentedTrack, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}>
            <Pressable
              style={[
                styles.segmentItem,
                themeMode === 'system' && [styles.segmentActive, { backgroundColor: tokens.card, borderColor: tokens.border }],
              ]}
              onPress={() => setThemeMode('system')}
            >
              <MaterialCommunityIcons
                name="cellphone"
                size={14}
                color={themeMode === 'system' ? tokens.primary : tokens.textSecondary}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: themeMode === 'system' ? tokens.textPrimary : tokens.textSecondary },
                  themeMode === 'system' && styles.segmentLabelActive,
                ]}
              >
                Sistema
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentItem,
                themeMode === 'light' && [styles.segmentActive, { backgroundColor: tokens.card, borderColor: tokens.border }],
              ]}
              onPress={() => setThemeMode('light')}
            >
              <MaterialCommunityIcons
                name="white-balance-sunny"
                size={14}
                color={themeMode === 'light' ? tokens.primary : tokens.textSecondary}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: themeMode === 'light' ? tokens.textPrimary : tokens.textSecondary },
                  themeMode === 'light' && styles.segmentLabelActive,
                ]}
              >
                Claro
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentItem,
                themeMode === 'dark' && [styles.segmentActive, { backgroundColor: tokens.card, borderColor: tokens.border }],
              ]}
              onPress={() => setThemeMode('dark')}
            >
              <MaterialCommunityIcons
                name="weather-night"
                size={14}
                color={themeMode === 'dark' ? tokens.primary : tokens.textSecondary}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  { color: themeMode === 'dark' ? tokens.textPrimary : tokens.textSecondary },
                  themeMode === 'dark' && styles.segmentLabelActive,
                ]}
              >
                Escuro
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Moeda Principal */}
        <Pressable
          style={[styles.cardRowPressable, { backgroundColor: tokens.card, borderColor: tokens.border }]}
          onPress={onOpenCurrencyModal}
        >
          <View style={[styles.iconWrap, { backgroundColor: tokens.primaryTonal }]}>
            <MaterialCommunityIcons name="currency-usd" size={20} color={tokens.primary} />
          </View>
          <View style={styles.infoBlock}>
            <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
              {t('settings.currencyTitle', { defaultValue: 'Moeda Principal' })}
            </Text>
            <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
              {currencyLabel || currency}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textTertiary} />
        </Pressable>

        {/* Sincronização Cloud */}
        <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <Pressable style={styles.syncStatusHeader} onPress={onOpenSyncStatusModal}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isSyncingNow
                    ? tokens.primaryTonal
                    : isPendingSync
                      ? tokens.warningTonal
                      : tokens.positiveTonal,
                },
              ]}
            >
              {isSyncingNow ? (
                <ActivityIndicator size="small" color={tokens.primary} />
              ) : isPendingSync ? (
                <MaterialCommunityIcons name="cloud-sync-outline" size={20} color={tokens.warning} />
              ) : (
                <MaterialCommunityIcons name="cloud-check-outline" size={20} color={tokens.positive} />
              )}
            </View>
            <View style={styles.infoBlock}>
              <View style={styles.syncTitleRow}>
                <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
                  Sincronização Cloud
                </Text>
                <View
                  style={[
                    styles.syncPill,
                    {
                      backgroundColor: isPendingSync ? tokens.warningTonal : tokens.positiveTonal,
                      borderColor: isPendingSync ? tokens.warningTonalBorder : tokens.positiveTonalBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.syncPillText,
                      { color: isPendingSync ? tokens.warning : tokens.positive },
                    ]}
                  >
                    {isPendingSync ? 'Pendente' : 'Em dia'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
                {t('settings.lastSync', { value: formatSyncDate(lastSyncDate) })}
              </Text>
            </View>
            <MaterialCommunityIcons name="information-outline" size={18} color={tokens.textTertiary} />
          </Pressable>

          <Pressable
            style={[styles.syncButton, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}
            onPress={onSyncNow}
            disabled={isSyncingNow}
          >
            {isSyncingNow ? (
              <ActivityIndicator size="small" color={tokens.textPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="sync" size={16} color={tokens.textPrimary} />
                <Text style={[styles.syncButtonText, { color: tokens.textPrimary }]}>
                  {t('settings.syncNow', { defaultValue: 'Sincronizar agora' })}
                </Text>
              </>
            )}
          </Pressable>

          {/* Backup Automático Noturno */}
          <NightlyAutoBackupControls
            accentColor={tokens.primary}
            borderColor={tokens.border}
            textPrimary={tokens.textPrimary}
            textSecondary={tokens.textSecondary}
            titleText={t('settings.autoBackupTitle', {
              defaultValue: 'Backup automático noturno',
            })}
            subtitleText={t('settings.autoBackupSubtitle', {
              defaultValue:
                'Executa backup diário após o horário definido quando houver sessão Google ativa.',
            })}
            hourLabelText={t('settings.autoBackupHourLabel', {
              defaultValue: 'Horário do backup (0-23h)',
            })}
            saveButtonText={t('settings.saveLimit', { defaultValue: 'Salvar' })}
            hourPlaceholder="22"
            boxed
            boxBackgroundColor={tokens.surfaceInteractive}
            onInvalidHour={(title, message) => Alert.alert(title, message)}
          />
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
  listContainer: {
    gap: 12,
  },
  card: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: sharedTokens.spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardRowPressable: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: sharedTokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBlock: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  segmentLabelActive: {
    fontWeight: '700',
  },
  syncStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  syncPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  syncButton: {
    height: 40,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 6,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
