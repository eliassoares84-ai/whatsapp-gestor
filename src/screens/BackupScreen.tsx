import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppMessageModal from '../components/AppMessageModal';
import ConfirmActionModal from '../components/ConfirmActionModal';
import NightlyAutoBackupControls from '../components/NightlyAutoBackupControls';
import { ensureNightlyAutoBackupTaskRegistration } from '../services/autoBackupBackgroundService';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';
import { exportData, importData } from '../utils/backupService';
import { setGoogleAccessToken, useGoogleDriveService } from '../utils/GoogleDriveService';

const getAvatarInitials = (name?: string, email?: string): string => {
  const source = (name || email || '').trim();

  if (!source) {
    return 'G';
  }

  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const first = words[0]?.[0] ?? source[0] ?? 'G';
    const second = words[1]?.[0] ?? source[1] ?? first;
    return `${first}${second}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

const getGooglePhotoUrl = (photoUrl?: string, size = 120): string | undefined => {
  if (!photoUrl) {
    return undefined;
  }

  if (!photoUrl.includes('googleusercontent.com')) {
    return photoUrl;
  }

  if (/=s\d+-c$/.test(photoUrl)) {
    return photoUrl.replace(/=s\d+-c$/, `=s${size}-c`);
  }

  return `${photoUrl}=s${size}-c`;
};

interface BackupScreenProps {
  onBack: () => void;
}

interface MessageModalState {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export const BackupScreen: React.FC<BackupScreenProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useThemeStore((state) => state.theme);

  const tokens = getThemeTokens(theme);

  const APP_BG = tokens.background;
  const CARD_BG = tokens.card;
  const TEXT_PRIMARY = tokens.textPrimary;
  const TEXT_SECONDARY = tokens.textSecondary;
  const BORDER_COLOR = tokens.border;
  const SECONDARY_BTN_BG = tokens.surfaceInteractive;
  const SECONDARY_BTN_BORDER = tokens.border;
  const BACK_BTN_BG = tokens.surfaceInteractive;
  const {
    currentWorkspaceId,
    workspaces,
    googleLinkedName,
    googleLinkedEmail,
    googleLinkedPhotoUrl,
    nightlyAutoBackupEnabled,
    enableNightlyAutoBackup,
    hasCompletedGoogleLinkPrompt,
    reopenGoogleLinkPrompt,
    resetGoogleLinkPrompt,
  } = useFinanceStore();
  const { restoreBackupFromCloud, syncBackupToCloud } = useGoogleDriveService();
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isSwitchGoogleConfirmVisible, setIsSwitchGoogleConfirmVisible] = useState(false);
  const [isRestoreConfirmVisible, setIsRestoreConfirmVisible] = useState(false);
  const [pendingRestoreJson, setPendingRestoreJson] = useState<string | null>(null);
  const [messageModal, setMessageModal] = useState<MessageModalState>({
    visible: false,
    title: '',
    message: '',
    primaryLabel: 'OK',
  });

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const accentColor = currentWorkspace?.themeColor || '#0A84FF';
  const isCompactHeader = width <= 390;
  const isGoogleLinked = googleLinkedEmail.trim().length > 0;
  const resolvedGooglePhotoUrl = useMemo(
    () => getGooglePhotoUrl(googleLinkedPhotoUrl, 120),
    [googleLinkedPhotoUrl]
  );
  const googleInitials = useMemo(
    () => getAvatarInitials(googleLinkedName, googleLinkedEmail),
    [googleLinkedName, googleLinkedEmail]
  );

  const closeMessageModal = () => {
    setMessageModal((prev) => ({ ...prev, visible: false }));
  };

  const showMessageModal = (payload: Omit<MessageModalState, 'visible'>) => {
    setMessageModal({
      ...payload,
      visible: true,
    });
  };

  const showDefaultError = () => {
    showMessageModal({
      title: t('backup.alerts.restoreFailedTitle'),
      message: t('backup.alerts.restoreFailedMessage'),
      primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
    });
  };

  const applyRestorePayload = async (jsonString: string) => {
    const restored = await importData(jsonString);

    if (restored.ok) {
      showMessageModal({
        title: t('backup.alerts.restoredTitle'),
        message: t('backup.alerts.restoredMessage'),
        primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
      });
      return;
    }

    if (restored.errorCode === 'invalid_json') {
      showMessageModal({
        title: t('backup.alerts.invalidJsonTitle', { defaultValue: 'Arquivo inválido' }),
        message: t('backup.alerts.invalidJsonMessage', {
          defaultValue: 'O arquivo selecionado não é um JSON válido.',
        }),
        primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
      });
      return;
    }

    if (restored.errorCode === 'invalid_structure') {
      showMessageModal({
        title: t('backup.alerts.invalidStructureTitle', { defaultValue: 'Estrutura inválida' }),
        message: t('backup.alerts.invalidStructureMessage', {
          defaultValue: 'O arquivo não possui a estrutura esperada de backup.',
        }),
        primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
      });
      return;
    }

    showDefaultError();
  };

  const handleRestoreData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

        const asset = result.assets?.[0];
        if (!asset) return;
        const jsonString = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: ((FileSystem as any).EncodingType?.UTF8) || 'utf8',
      });

      setPendingRestoreJson(jsonString);
      setIsRestoreConfirmVisible(true);
    } catch {
      showDefaultError();
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestoreJson) {
      setIsRestoreConfirmVisible(false);
      return;
    }

    const payload = pendingRestoreJson;
    setPendingRestoreJson(null);
    setIsRestoreConfirmVisible(false);
    await applyRestorePayload(payload);
  };

  const handleRestoreFromCloud = async () => {
    const restored = await restoreBackupFromCloud();

    if (!restored.ok) {
      if (restored.reason === 'missing_session') {
        showMessageModal({
          title: t('backup.alerts.syncPendingTitle'),
          message: t('backup.alerts.googleSessionExpired', {
            defaultValue: 'Sua sessão Google expirou. Reconecte sua conta para continuar sincronizando.',
          }),
          primaryLabel: t('backup.alerts.reconnect', { defaultValue: 'Reconectar' }),
          onPrimary: handleLinkGoogleAccount,
          secondaryLabel: t('settings.cancel'),
        });
        return;
      }

      showMessageModal({
        title: t('backup.alerts.syncPendingTitle'),
        message: t('backup.alerts.syncPendingMessage'),
        primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
      });
      return;
    }

    setPendingRestoreJson(restored.backupJson);
    setIsRestoreConfirmVisible(true);
  };

  const activateNightlyAutoBackupIfNeeded = async (): Promise<boolean> => {
    if (nightlyAutoBackupEnabled) {
      return false;
    }

    enableNightlyAutoBackup(22);
    await ensureNightlyAutoBackupTaskRegistration(true);
    return true;
  };

  const handleExportData = async () => {
    const exported = await exportData();

    if (!exported.ok) {
      showMessageModal({
        title: t('backup.alerts.exportFailedTitle', { defaultValue: 'Falha ao exportar' }),
        message: t('backup.alerts.exportFailedMessage', {
          defaultValue: 'Não foi possível gerar o backup neste momento.',
        }),
        primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
      });
      return;
    }

    const autoBackupActivated = await activateNightlyAutoBackupIfNeeded();

    if (exported.shared === false) {
      const baseMessage = t('backup.alerts.generatedLocalMessage', {
        defaultValue: 'O arquivo foi salvo no dispositivo, mas o compartilhamento não abriu automaticamente.',
      });

      showMessageModal({
        title: t('backup.alerts.generatedLocalTitle', { defaultValue: 'Backup gerado' }),
        message: autoBackupActivated
          ? `${baseMessage} ${t('backup.alerts.nightlyAutoEnabledSuffix', {
              defaultValue: 'Backup automático diário noturno ativado a partir de hoje.',
            })}`
          : baseMessage,
        primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
      });
      return;
    }

    const baseMessage = t('backup.alerts.generatedMessage', {
      defaultValue: 'Seu backup foi gerado e está pronto para compartilhamento.',
    });

    showMessageModal({
      title: t('backup.alerts.generatedTitle', { defaultValue: 'Backup gerado' }),
      message: autoBackupActivated
        ? `${baseMessage} ${t('backup.alerts.nightlyAutoEnabledSuffix', {
            defaultValue: 'Backup automático diário noturno ativado a partir de hoje.',
          })}`
        : baseMessage,
      primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
    });
  };

  const handleSyncToCloud = async () => {
    setIsSyncingCloud(true);
    const synced = await syncBackupToCloud();
    setIsSyncingCloud(false);

    if (synced === null) {
      showMessageModal({
        title: t('backup.alerts.syncPendingTitle'),
        message: t('backup.alerts.googleSessionExpired', {
          defaultValue: 'Sua sessão Google expirou. Reconecte sua conta para continuar sincronizando.',
        }),
        primaryLabel: t('backup.alerts.reconnect', { defaultValue: 'Reconectar' }),
        onPrimary: handleLinkGoogleAccount,
        secondaryLabel: t('settings.cancel'),
      });
      return;
    }

    if (!synced) {
      showMessageModal({
        title: t('backup.alerts.syncPendingTitle'),
        message: t('backup.alerts.syncPendingMessage'),
        primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
      });
      return;
    }

    const autoBackupActivated = await activateNightlyAutoBackupIfNeeded();
    const baseMessage = t('backup.alerts.syncedMessage', {
      defaultValue: 'Backup enviado com sucesso para o Google Drive.',
    });

    showMessageModal({
      title: t('backup.alerts.syncedTitle', { defaultValue: 'Sincronização concluída' }),
      message: autoBackupActivated
        ? `${baseMessage} ${t('backup.alerts.nightlyAutoEnabledSuffix', {
            defaultValue: 'Backup automático diário noturno ativado a partir de hoje.',
          })}`
        : baseMessage,
      primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
    });
  };

  const handleSwitchGoogleAccount = () => {
    setIsSwitchGoogleConfirmVisible(true);
  };

  const confirmSwitchGoogleAccount = () => {
    setIsSwitchGoogleConfirmVisible(false);
    setGoogleAccessToken(null);
    resetGoogleLinkPrompt();
    reopenGoogleLinkPrompt();
  };

  const handleLinkGoogleAccount = () => {
    setGoogleAccessToken(null);
    resetGoogleLinkPrompt();
    reopenGoogleLinkPrompt();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: APP_BG,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 118 },
        ]}
      >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={[styles.backButton, { backgroundColor: BACK_BTN_BG }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={TEXT_PRIMARY} />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={[styles.title, isCompactHeader && styles.titleCompact, { color: TEXT_PRIMARY }]}>{t('backup.title')}</Text>
          <Text style={[styles.subtitle, { color: TEXT_SECONDARY }]}>{t('backup.subtitle')}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: CARD_BG, borderColor: BORDER_COLOR }]}> 
        <View style={styles.cardHeader}>
          {resolvedGooglePhotoUrl ? (
            <Image source={{ uri: resolvedGooglePhotoUrl }} style={styles.googleAvatar} />
          ) : (
            <View style={[styles.googleAvatarFallback, { backgroundColor: `${accentColor}22` }]}>
              <Text style={[styles.googleInitials, { color: accentColor }]}>{googleInitials}</Text>
            </View>
          )}
            <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>{t('settings.googleTitle')}</Text>
        </View>

        <Text style={[styles.helperText, { color: TEXT_SECONDARY }]}> 
          {isGoogleLinked
            ? googleLinkedName
              ? t('backup.googleLinkedWithName', { name: googleLinkedName, email: googleLinkedEmail })
              : t('backup.googleLinked', { email: googleLinkedEmail })
            : hasCompletedGoogleLinkPrompt
              ? t('settings.googleNoneLinked')
              : t('settings.googlePending')}
        </Text>

        <View style={styles.googleButtonsRow}>
          {isGoogleLinked ? (
            <Pressable
              style={[styles.googleActionButton, { borderColor: accentColor }]}
              onPress={handleSwitchGoogleAccount}
            >
              <Text style={[styles.googleActionText, { color: accentColor }]}>{t('settings.switchAccount')}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.googleActionButton, { borderColor: accentColor }]}
              onPress={handleLinkGoogleAccount}
            >
              <Text style={[styles.googleActionText, { color: accentColor }]}>{t('googleLink.linkButton')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: CARD_BG, borderColor: BORDER_COLOR }]}> 
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={22} color={accentColor} />
          <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>{t('backup.generateTitle')}</Text>
        </View>

        <Text style={[styles.helperText, { color: TEXT_SECONDARY }]}>{t('backup.generateHelp')}</Text>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: accentColor }]}
          onPress={() => void handleExportData()}
        >
          <Text style={styles.primaryButtonText}>{t('backup.generateButton')}</Text>
        </Pressable>

        <Pressable
          style={[styles.cloudButton, { borderColor: accentColor }]}
          onPress={() => void handleSyncToCloud()}
          disabled={isSyncingCloud}
        >
          {isSyncingCloud ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Text style={[styles.cloudButtonText, { color: accentColor }]}>{t('backup.syncDriveButton')}</Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: CARD_BG, borderColor: BORDER_COLOR }]}> 
        <NightlyAutoBackupControls
          accentColor={accentColor}
          borderColor={BORDER_COLOR}
          textPrimary={TEXT_PRIMARY}
          textSecondary={TEXT_SECONDARY}
          titleText={t('settings.autoBackupTitle', { defaultValue: 'Backup automático noturno' })}
          subtitleText={t('settings.autoBackupSubtitle', {
            defaultValue:
              'Executa backup diário após o horário definido, quando houver sessão Google ativa.',
          })}
          hourLabelText={t('settings.autoBackupHourLabel', { defaultValue: 'Hora (0-23)' })}
          saveButtonText={t('settings.saveLimit', { defaultValue: 'Salvar' })}
          hourPlaceholder="22"
          onInvalidHour={(title, message) =>
            showMessageModal({
              title,
              message,
              primaryLabel: t('backup.alerts.ok', { defaultValue: 'OK' }),
            })
          }
        />
      </View>

      <View style={[styles.card, { backgroundColor: CARD_BG, borderColor: BORDER_COLOR }]}> 
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="cloud-download-outline" size={22} color="#FFB020" />
          <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>{t('backup.restoreTitle')}</Text>
        </View>

        <Text style={[styles.helperText, { color: TEXT_SECONDARY }]}>{t('backup.restoreHelp')}</Text>

        <Pressable style={[styles.secondaryButton, { borderColor: SECONDARY_BTN_BORDER, backgroundColor: SECONDARY_BTN_BG }]} onPress={() => void handleRestoreData()}>
          <Text style={[styles.secondaryButtonText, { color: TEXT_PRIMARY }]}>{t('backup.restoreFileButton')}</Text>
        </Pressable>

        <Pressable style={[styles.secondaryButton, { borderColor: SECONDARY_BTN_BORDER, backgroundColor: SECONDARY_BTN_BG }]} onPress={() => void handleRestoreFromCloud()}>
          <Text style={[styles.secondaryButtonText, { color: TEXT_PRIMARY }]}>{t('backup.restoreCloudButton')}</Text>
        </Pressable>
      </View>
      </ScrollView>

      <ConfirmActionModal
        visible={isSwitchGoogleConfirmVisible}
        title={t('settings.alerts.switchGoogleTitle')}
        message={t('settings.alerts.switchGoogleMessage')}
        cancelLabel={t('settings.cancel')}
        confirmLabel={t('settings.alerts.continue')}
        onCancel={() => setIsSwitchGoogleConfirmVisible(false)}
        onConfirm={confirmSwitchGoogleAccount}
        cardBg={CARD_BG}
        borderColor={BORDER_COLOR}
        textPrimary={TEXT_PRIMARY}
        textSecondary={TEXT_SECONDARY}
        accentColor={accentColor}
      />

      <ConfirmActionModal
        visible={isRestoreConfirmVisible}
        title={t('backup.alerts.confirmRestoreTitle', { defaultValue: 'Restaurar dados?' })}
        message={t('backup.alerts.confirmRestoreMessage', {
          defaultValue: 'Isso apagará os dados atuais e substituirá tudo pelo backup selecionado.',
        })}
        cancelLabel={t('settings.cancel')}
        confirmLabel={t('backup.alerts.confirmRestoreAction', { defaultValue: 'Restaurar' })}
        onCancel={() => {
          setIsRestoreConfirmVisible(false);
          setPendingRestoreJson(null);
        }}
        onConfirm={() => void confirmRestore()}
        cardBg={CARD_BG}
        borderColor={BORDER_COLOR}
        textPrimary={TEXT_PRIMARY}
        textSecondary={TEXT_SECONDARY}
        accentColor={'#FFB020'}
      />

      <AppMessageModal
        visible={messageModal.visible}
        title={messageModal.title}
        message={messageModal.message}
        primaryLabel={messageModal.primaryLabel}
        onPrimary={() => {
          const callback = messageModal.onPrimary;
          closeMessageModal();
          callback?.();
        }}
        secondaryLabel={messageModal.secondaryLabel}
        onSecondary={
          messageModal.onSecondary
            ? () => {
                const callback = messageModal.onSecondary;
                closeMessageModal();
                callback?.();
              }
            : undefined
        }
        cardBg={CARD_BG}
        borderColor={BORDER_COLOR}
        textPrimary={TEXT_PRIMARY}
        textSecondary={TEXT_SECONDARY}
        accentColor={accentColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 26,
  },
  header: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '900',
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 21,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  googleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  googleAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  googleInitials: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  googleButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  googleActionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.3,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  googleDangerButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
  },
  googleDangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF453A',
  },
  googleDangerTextDisabled: {
    color: 'rgba(255, 69, 58, 0.45)',
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cloudButton: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
  },
  cloudButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});