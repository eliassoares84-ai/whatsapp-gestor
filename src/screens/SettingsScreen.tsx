import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevPanel } from '../components/DevPanel';
import { RecurringTemplateModal } from '../components/RecurringTemplateModal';
import { CURRENCY_OPTIONS, SettingsCurrencyModal } from '../components/settings/SettingsCurrencyModal';
import { SettingsGoogleCard } from '../components/settings/SettingsGoogleCard';
import { SettingsPinModal } from '../components/settings/SettingsPinModal';
import { SettingsPreferencesSection } from '../components/settings/SettingsPreferencesSection';
import { SettingsRecurringSection } from '../components/settings/SettingsRecurringSection';
import { SettingsSecuritySection } from '../components/settings/SettingsSecuritySection';
import { SettingsWorkspacesSection } from '../components/settings/SettingsWorkspacesSection';
import { SyncStatusModal } from '../components/SyncStatusModal';
import { WorkspaceEditModal } from '../components/WorkspaceEditModal';
import { BackupScreen } from './BackupScreen';
import { PaywallScreen } from './PaywallScreen';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens, sharedTokens } from '../styles/themes';
import type { RecurringTemplate, Workspace } from '../types/finance.types';
import { FEEDBACK_EMAIL, PRIVACY_POLICY_URL } from '../constants/links';
import { parseBankStatementCsv } from '../utils/bankStatementImportService';
import { setGoogleAccessToken, useGoogleDriveService } from '../utils/GoogleDriveService';
import { hasAppPin, removeAppPin } from '../utils/securityService';

const getAvatarInitials = (name?: string, email?: string): string => {
  const source = (name || email || '').trim();
  if (!source) return 'G';
  const words = source.split(/\s+/).filter(Boolean);
  const first = words[0];
  const second = words[1];
  if (first && second) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

const getGooglePhotoUrl = (photoUrl?: string, size = 120): string | undefined => {
  if (!photoUrl) return undefined;
  if (!photoUrl.includes('googleusercontent.com')) return photoUrl;
  if (/=s\d+-c$/.test(photoUrl)) {
    return photoUrl.replace(/=s\d+-c$/, `=s${size}-c`);
  }
  return `${photoUrl}=s${size}-c`;
};

type ModalMode = 'create' | 'edit' | 'closed';

interface ModalState {
  mode: ModalMode;
  workspace?: Workspace;
}

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const {
    workspaces,
    updateWorkspace,
    addWorkspace,
    recurringTemplates,
    categories,
    currentWorkspaceId,
    currency,
    lastSyncDate,
    setCurrency,
    toggleRecurringTemplate,
    addRecurringTemplate,
    updateRecurringTemplate,
    deleteRecurringTemplate,
    deleteAccountData,
    addTransaction,
    googleLinkedName,
    googleLinkedEmail,
    googleLinkedPhotoUrl,
    reopenGoogleLinkPrompt,
    resetGoogleLinkPrompt,
    isPremium,
    togglePremiumStatus,
    resetTour,
  } = useFinanceStore();
  const navigation = useNavigation<any>();

  const { syncBackupToCloud } = useGoogleDriveService();

  const [modalState, setModalState] = useState<ModalState>({ mode: 'closed' });
  const [isRecurringModalVisible, setIsRecurringModalVisible] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<RecurringTemplate | null>(null);
  const [isBackupScreenVisible, setIsBackupScreenVisible] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncStatusModalVisible, setSyncStatusModalVisible] = useState(false);
  const [versionClickCount, setVersionClickCount] = useState(0);
  const [devPanelVisible, setDevPanelVisible] = useState(false);
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void hasAppPin().then(setPinConfigured);
    }, [])
  );

  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );
  const hasBusinessWorkspace = useMemo(
    () => workspaces.some((workspace) => workspace.type === 'business'),
    [workspaces]
  );

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

  const localeTag =
    i18n.language === 'pt-BR'
      ? 'pt-BR'
      : i18n.language.startsWith('es')
        ? 'es-ES'
        : 'en-US';

  const currentWorkspaceTemplates = useMemo(
    () =>
      recurringTemplates.filter(
        (template) => template.workspaceId === currentWorkspaceId
      ),
    [recurringTemplates, currentWorkspaceId]
  );

  const currentWorkspaceCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.workspaceId === currentWorkspaceId &&
          !category.id.includes('internal-transfer')
      ),
    [categories, currentWorkspaceId]
  );

  const selectedCurrencyOption = useMemo(
    () => CURRENCY_OPTIONS.find((option) => option.code === currency),
    [currency]
  );

  const handleEditWorkspace = (workspace: Workspace) => {
    setModalState({ mode: 'edit', workspace });
  };

  const handleAddWorkspace = () => {
    setModalState({ mode: 'create' });
  };

  const handleCloseModal = () => {
    setModalState({ mode: 'closed' });
  };

  const handleSaveWorkspace = (
    name: string,
    themeColor: string,
    type: 'personal' | 'business'
  ) => {
    if (modalState.mode === 'edit' && modalState.workspace) {
      updateWorkspace(modalState.workspace.id, {
        name,
        themeColor,
      });
    } else if (modalState.mode === 'create') {
      addWorkspace({
        name,
        type,
        themeColor,
      });
    }
    handleCloseModal();
  };

  const handleSaveRecurringTemplate = (
    payload: Omit<
      RecurringTemplate,
      'id' | 'workspaceId' | 'lastProcessedDate' | 'isActive'
    >,
    templateId?: string
  ) => {
    if (templateId) {
      updateRecurringTemplate(templateId, payload);
    } else {
      addRecurringTemplate(payload);
    }
    setTemplateToEdit(null);
    setIsRecurringModalVisible(false);
  };

  const handleDeleteRecurringTemplate = (id: string) => {
    Alert.alert(
      t('settings.alerts.deleteRecurringTitle', { defaultValue: 'Excluir recorrência' }),
      t('settings.alerts.deleteRecurringMessage', { defaultValue: 'Tem certeza que deseja excluir esta transação recorrente?' }),
      [
        { text: t('settings.cancel', { defaultValue: 'Cancelar' }), style: 'cancel' },
        {
          text: t('settings.alerts.delete', { defaultValue: 'Excluir' }),
          style: 'destructive',
          onPress: () => deleteRecurringTemplate(id),
        },
      ]
    );
  };

  const formatSyncDate = (isoDate: string): string => {
    if (!isoDate) return t('settings.pending', { defaultValue: 'Pendente' });
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return t('settings.pending', { defaultValue: 'Pendente' });
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString(localeTag, {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (isToday) return t('settings.todayAt', { time, defaultValue: `Hoje às ${time}` });
    const day = date.toLocaleDateString(localeTag, {
      day: '2-digit',
      month: '2-digit',
    });
    return t('settings.atTime', { day, time, defaultValue: `${day} às ${time}` });
  };

  const handleLinkGoogleAccount = () => {
    setGoogleAccessToken(null);
    resetGoogleLinkPrompt();
    reopenGoogleLinkPrompt();
  };

  const handleSwitchGoogleAccount = () => {
    Alert.alert(
      t('settings.alerts.switchGoogleTitle', { defaultValue: 'Trocar Conta Google' }),
      t('settings.alerts.switchGoogleMessage', { defaultValue: 'Deseja conectar uma conta Google diferente para salvar seus backups?' }),
      [
        { text: t('settings.cancel', { defaultValue: 'Cancelar' }), style: 'cancel' },
        {
          text: t('settings.alerts.continue', { defaultValue: 'Continuar' }),
          onPress: () => {
            setGoogleAccessToken(null);
            resetGoogleLinkPrompt();
            reopenGoogleLinkPrompt();
          },
        },
      ]
    );
  };

  const handleUnlinkGoogle = () => {
    Alert.alert(
      t('settings.google.disconnect', { defaultValue: 'Desconectar' }),
      t('settings.google.disconnectConfirm', {
        defaultValue: 'Deseja desconectar sua conta Google? O backup automático será pausado, mas seus dados locais continuarão intactos.',
      }),
      [
        { text: t('settings.cancel', { defaultValue: 'Cancelar' }), style: 'cancel' },
        {
          text: t('settings.google.disconnect', { defaultValue: 'Desconectar' }),
          style: 'destructive',
          onPress: () => {
            setGoogleAccessToken(null);
            resetGoogleLinkPrompt();
          },
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    const synced = await syncBackupToCloud();
    setIsSyncingNow(false);

    if (synced === null) {
      Alert.alert(
        t('settings.alerts.syncPendingTitle', { defaultValue: 'Sessão Expirada' }),
        t('settings.alerts.googleSessionExpired', {
          defaultValue: 'Sua sessão Google expirou. Reconecte sua conta para continuar sincronizando.',
        }),
        [
          { text: t('settings.cancel', { defaultValue: 'Cancelar' }), style: 'cancel' },
          {
            text: t('settings.alerts.reconnect', { defaultValue: 'Reconectar' }),
            onPress: handleLinkGoogleAccount,
          },
        ]
      );
    } else if (!synced) {
      // Abre o modal customizado de sincronização pendente
      setSyncStatusModalVisible(true);
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        t('settings.alerts.privacyPolicyTitle', { defaultValue: 'Política de Privacidade' }),
        t('settings.alerts.privacyPolicyMessage', { defaultValue: 'Não foi possível abrir o link da política de privacidade.' })
      );
    }
  };

  const handleSendSuggestion = async () => {
    const subject = encodeURIComponent(
      t('settings.feedbackEmailSubject', { defaultValue: 'Sugestão de melhoria - SeuGestor' })
    );
    const body = encodeURIComponent(
      t('settings.feedbackEmailBody', {
        defaultValue: 'Olá, equipe.\n\nTenho a seguinte sugestão de melhoria:\n\n-\n\nContexto:\n\n\nObrigado!',
      })
    );
    const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (!canOpen) {
        Alert.alert(
          t('settings.alerts.suggestionTitle', { defaultValue: 'Não foi possível abrir o e-mail' }),
          t('settings.alerts.suggestionMessage', {
            defaultValue: 'Configure um app de e-mail no dispositivo e tente novamente.',
          })
        );
        return;
      }
      await Linking.openURL(mailtoUrl);
    } catch {
      Alert.alert(
        t('settings.alerts.suggestionTitle', { defaultValue: 'Não foi possível abrir o e-mail' }),
        t('settings.alerts.suggestionMessage', {
          defaultValue: 'Configure um app de e-mail no dispositivo e tente novamente.',
        })
      );
    }
  };

  const handleDeleteAccountData = () => {
    Alert.alert(
      t('settings.alerts.deleteAccountDataTitle', { defaultValue: 'Apagar todos os dados' }),
      t('settings.alerts.deleteAccountDataMessage', {
        defaultValue: 'Esta ação removerá todas as transações, contas e categorias salvas localmente. Tem certeza?',
      }),
      [
        { text: t('settings.cancel', { defaultValue: 'Cancelar' }), style: 'cancel' },
        {
          text: t('settings.alerts.deleteAll', { defaultValue: 'Apagar tudo' }),
          style: 'destructive',
          onPress: () => deleteAccountData(),
        },
      ]
    );
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remover PIN',
      'Deseja remover o PIN numérico do aplicativo? O acesso ficará livre sem senha.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await removeAppPin();
            setPinConfigured(false);
            Alert.alert('Sucesso', 'PIN de acesso removido.');
          },
        },
      ]
    );
  };

  const handleImportStatement = async () => {
    const defaultCategory = currentWorkspaceCategories[0];
    if (!defaultCategory) {
      Alert.alert(
        t('settings.alerts.noCategoryTitle', { defaultValue: 'Categoria não encontrada' }),
        t('settings.alerts.noCategoryMessage', { defaultValue: 'Cadastre ao menos uma categoria antes de importar um extrato.' })
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;
      const file = result.assets[0];
      if (!file) return;

      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: ((FileSystem as any).EncodingType?.UTF8) || 'utf8',
      });

      const entries = parseBankStatementCsv(content);
      if (entries.length === 0) {
        Alert.alert(
          t('settings.alerts.invalidCsvTitle', { defaultValue: 'Arquivo não reconhecido' }),
          t('settings.alerts.invalidCsvMessage', { defaultValue: 'Não foi possível encontrar transações válidas neste arquivo CSV.' })
        );
        return;
      }

      entries.forEach((entry) => {
        addTransaction({
          amount: entry.amount,
          type: entry.type,
          categoryId: defaultCategory.id,
          date: entry.date,
          note: entry.description,
          isRecurring: false,
        });
      });

      Alert.alert(
        t('settings.alerts.importSuccessTitle', { defaultValue: 'Importação concluída' }),
        t('settings.alerts.importSuccessMessage', { count: entries.length, defaultValue: `${entries.length} lançamentos importados com sucesso.` })
      );
    } catch {
      Alert.alert(
        t('settings.alerts.importFailureTitle', { defaultValue: 'Erro na importação' }),
        t('settings.alerts.importFailureMessage', { defaultValue: 'Ocorreu um erro ao processar o arquivo CSV.' })
      );
    }
  };

  const handleRestartTour = () => {
    Alert.alert(
      t('settings.restartTourTitle', { defaultValue: 'Reiniciar Tour Guiado?' }),
      t('settings.restartTourMessage', {
        defaultValue:
          'O tour interativo do aplicativo será reiniciado para que você possa rever os principais recursos e novidades.',
      }),
      [
        {
          text: t('settings.cancel', { defaultValue: 'Cancelar' }),
          style: 'cancel',
        },
        {
          text: t('settings.restartTourConfirm', { defaultValue: 'Iniciar Tour' }),
          style: 'default',
          onPress: () => {
            resetTour();
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  if (isBackupScreenVisible) {
    return <BackupScreen onBack={() => setIsBackupScreenVisible(false)} />;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.background,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: sharedTokens.layout.screenMargin,
            paddingBottom: insets.bottom + 118,
          },
        ]}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              isCompactHeader && styles.titleCompact,
              { color: tokens.textPrimary },
            ]}
          >
            {hasBusinessWorkspace ? t('settings.title', { defaultValue: 'Ajustes' }) : t('settings.personalTitle', { defaultValue: 'Ajustes' })}
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            {hasBusinessWorkspace ? t('settings.subtitle', { defaultValue: 'Gerenciamento de contas e preferências' }) : t('settings.personalSubtitle', { defaultValue: 'Gerenciamento de contas e preferências' })}
          </Text>
        </View>

        {/* SEÇÃO 1: CONTA */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
            {t('settings.account', { defaultValue: 'Conta' })}
          </Text>
        </View>

        <SettingsGoogleCard
          googleLinkedName={googleLinkedName}
          googleLinkedEmail={googleLinkedEmail}
          resolvedGooglePhotoUrl={resolvedGooglePhotoUrl}
          googleInitials={googleInitials}
          isGoogleLinked={isGoogleLinked}
          theme={theme}
          onOpenPrompt={isGoogleLinked ? handleSwitchGoogleAccount : handleLinkGoogleAccount}
          onUnlink={handleUnlinkGoogle}
        />

        {/* CARD PLANO E ASSINATURA */}
        <Pressable
          style={[
            styles.subscriptionCard,
            {
              backgroundColor: isPremium ? tokens.primaryTonal : tokens.card,
              borderColor: isPremium ? tokens.primaryTonalBorder : tokens.border,
            },
          ]}
          onPress={() => setIsPaywallVisible(true)}
        >
          <View style={styles.subCardHeader}>
            <View
              style={[
                styles.subIconWrap,
                {
                  backgroundColor: isPremium ? tokens.primary : tokens.primaryTonal,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isPremium ? 'crown' : 'crown-outline'}
                size={22}
                color={isPremium ? tokens.textInverse : tokens.primary}
              />
            </View>
            <View style={styles.subTextWrap}>
              <View style={styles.subTitleRow}>
                <Text style={[styles.subCardTitle, { color: tokens.textPrimary }]}>
                  {isPremium ? 'SeuGestor PRO Ativo' : 'SeuGestor Gratuito'}
                </Text>
                <View
                  style={[
                    styles.subBadge,
                    {
                      backgroundColor: isPremium ? tokens.positiveTonal : tokens.surfaceInteractive,
                      borderColor: isPremium ? tokens.positiveTonalBorder : tokens.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.subBadgeText,
                      { color: isPremium ? tokens.positive : tokens.textSecondary },
                    ]}
                  >
                    {isPremium ? 'PRO ILIMITADO' : 'SEM ANÚNCIOS'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subCardDesc, { color: tokens.textSecondary }]}>
                {isPremium
                  ? 'Consultor Financeiro por IA e Comandos de Voz liberados.'
                  : 'Desbloqueie o Consultor Financeiro por IA e Comandos de Voz por Inteligência Artificial.'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={tokens.textTertiary}
            />
          </View>
        </Pressable>

        {hasBusinessWorkspace ? (
          <SettingsWorkspacesSection
            workspaces={workspaces}
            theme={theme}
            onEditWorkspace={handleEditWorkspace}
            onAddWorkspace={handleAddWorkspace}
          />
        ) : null}

        {/* SEÇÃO 2: DADOS E BACKUP */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
            {t('settings.dataAndBackup', { defaultValue: 'Dados e backup' })}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: tokens.textSecondary }]}>
            {t('settings.dataAndBackupSubtitle', { defaultValue: 'Backup local, importação e lançamentos programados' })}
          </Text>
        </View>

        <View style={styles.listContainer}>
          <Pressable
            style={[styles.compactRow, { backgroundColor: tokens.card, borderColor: tokens.border }]}
            onPress={() => setIsBackupScreenVisible(true)}
          >
            <View style={[styles.iconWrap, { backgroundColor: tokens.primaryTonal }]}>
              <MaterialCommunityIcons name="cloud-lock-outline" size={20} color={tokens.primary} />
            </View>
            <View style={styles.infoBlock}>
              <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
                {t('settings.openBackupCenter', { defaultValue: 'Central de Backup e Restauração' })}
              </Text>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
                Gerar arquivos criptografados e restaurar dados
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textTertiary} />
          </Pressable>

          <Pressable
            style={[styles.compactRow, { backgroundColor: tokens.card, borderColor: tokens.border }]}
            onPress={() => void handleImportStatement()}
          >
            <View style={[styles.iconWrap, { backgroundColor: tokens.primaryTonal }]}>
              <MaterialCommunityIcons name="file-import-outline" size={20} color={tokens.primary} />
            </View>
            <View style={styles.infoBlock}>
              <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
                {t('settings.importStatement', { defaultValue: 'Importar Extrato Bancário' })}
              </Text>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
                Importação rápida em formato CSV
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textTertiary} />
          </Pressable>
        </View>

        <SettingsRecurringSection
          templates={currentWorkspaceTemplates}
          currency={currency}
          localeTag={localeTag}
          theme={theme}
          onToggleTemplate={toggleRecurringTemplate}
          onEditTemplate={(template) => {
            setTemplateToEdit(template);
            setIsRecurringModalVisible(true);
          }}
          onDeleteTemplate={handleDeleteRecurringTemplate}
          onAddTemplate={() => {
            setTemplateToEdit(null);
            setIsRecurringModalVisible(true);
          }}
        />

        {/* SEÇÃO 3: PREFERÊNCIAS */}
        <SettingsPreferencesSection
          currency={currency}
          currencyLabel={selectedCurrencyOption?.label || currency}
          theme={theme}
          isSyncingNow={isSyncingNow}
          lastSyncDate={lastSyncDate}
          onOpenCurrencyModal={() => setIsCurrencyModalVisible(true)}
          onSyncNow={() => void handleSyncNow()}
          onOpenSyncStatusModal={() => setSyncStatusModalVisible(true)}
          formatSyncDate={formatSyncDate}
        />

        {/* SEÇÃO 4: SEGURANÇA */}
        <SettingsSecuritySection
          pinConfigured={pinConfigured}
          theme={theme}
          onOpenPinModal={() => setIsPinModalVisible(true)}
          onRemovePin={handleRemovePin}
        />

        {/* SEÇÃO 5: AJUDA E FEEDBACK */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
            {t('settings.feedbackTitle', { defaultValue: 'Ajuda e feedback' })}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: tokens.textSecondary }]}>
            {t('settings.feedbackSubtitle', { defaultValue: 'Suporte, privacidade e gerenciamento' })}
          </Text>
        </View>

        <View style={styles.listContainer}>
          <Pressable
            style={[styles.compactRow, { backgroundColor: tokens.card, borderColor: tokens.border }]}
            onPress={handleRestartTour}
          >
            <View style={[styles.iconWrap, { backgroundColor: tokens.primaryTonal }]}>
              <MaterialCommunityIcons name="compass-outline" size={20} color={tokens.primary} />
            </View>
            <View style={styles.infoBlock}>
              <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
                {t('settings.restartTourButton', { defaultValue: 'Reiniciar Tour Guiado' })}
              </Text>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
                {t('settings.restartTourSubtitle', { defaultValue: 'Rever o passo a passo interativo e novidades do app' })}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textTertiary} />
          </Pressable>

          <Pressable
            style={[styles.compactRow, { backgroundColor: tokens.card, borderColor: tokens.border }]}
            onPress={() => void handleSendSuggestion()}
          >
            <View style={[styles.iconWrap, { backgroundColor: tokens.primaryTonal }]}>
              <MaterialCommunityIcons name="message-draw" size={20} color={tokens.primary} />
            </View>
            <View style={styles.infoBlock}>
              <Text style={[styles.itemName, { color: tokens.textPrimary }]}>
                {t('settings.sendSuggestion', { defaultValue: 'Enviar sugestão ou dúvida' })}
              </Text>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>{FEEDBACK_EMAIL}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textTertiary} />
          </Pressable>

          <Pressable
            style={[styles.compactRow, { backgroundColor: tokens.card, borderColor: tokens.border }]}
            onPress={() => void handleOpenPrivacyPolicy()}
          >
            <View style={[styles.iconWrap, { backgroundColor: tokens.primaryTonal }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={20} color={tokens.primary} />
            </View>
            <Text style={[styles.itemName, { flex: 1, color: tokens.textPrimary }]}>
              {t('settings.privacyPolicy', { defaultValue: 'Política de Privacidade' })}
            </Text>
            <MaterialCommunityIcons name="open-in-new" size={18} color={tokens.textTertiary} />
          </Pressable>

          {/* Ação Destrutiva Discreta */}
          <Pressable
            style={[
              styles.compactRow,
              { backgroundColor: tokens.card, borderColor: tokens.negativeTonalBorder },
            ]}
            onPress={handleDeleteAccountData}
          >
            <View style={[styles.iconWrap, { backgroundColor: tokens.negativeTonal }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={tokens.negative} />
            </View>
            <View style={styles.infoBlock}>
              <Text style={[styles.itemName, { color: tokens.negative }]}>
                {t('settings.deleteAccountData', { defaultValue: 'Apagar todos os dados' })}
              </Text>
              <Text style={[styles.itemSub, { color: tokens.textSecondary }]}>
                {t('settings.deleteAccountDataSubtitle', { defaultValue: 'Limpar todos os registros deste aparelho' })}
              </Text>
            </View>
          </Pressable>
        </View>

        {__DEV__ && (
          <Pressable
            style={[styles.versionFooter, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}
            onPress={() => {
              const nextCount = versionClickCount + 1;
              setVersionClickCount(nextCount);
              if (nextCount === 5) {
                setDevPanelVisible(true);
                setVersionClickCount(0);
              }
            }}
          >
            <Text style={[styles.versionText, { color: tokens.textTertiary }]}>
              v1.0.0 {versionClickCount > 0 && `(${5 - versionClickCount})`}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modal Customizado de Sincronização Pendente */}
      <SyncStatusModal
        visible={syncStatusModalVisible}
        onClose={() => setSyncStatusModalVisible(false)}
        onRetrySync={() => {
          setSyncStatusModalVisible(false);
          void handleSyncNow();
        }}
        isSyncing={isSyncingNow}
        lastSyncDate={lastSyncDate}
        isGoogleLinked={isGoogleLinked}
        theme={theme}
      />

      <WorkspaceEditModal
        visible={modalState.mode !== 'closed'}
        mode={modalState.mode as 'create' | 'edit'}
        workspace={modalState.workspace}
        onSave={handleSaveWorkspace}
        onClose={handleCloseModal}
      />

      <RecurringTemplateModal
        visible={isRecurringModalVisible}
        accentColor={tokens.primary}
        templateToEdit={templateToEdit}
        onClose={() => {
          setTemplateToEdit(null);
          setIsRecurringModalVisible(false);
        }}
        onSave={handleSaveRecurringTemplate}
      />

      <SettingsCurrencyModal
        visible={isCurrencyModalVisible}
        selectedCurrency={currency}
        accentColor={tokens.primary}
        cardBg={tokens.card}
        textPrimary={tokens.textPrimary}
        textSecondary={tokens.textSecondary}
        borderColor={tokens.border}
        fieldBg={tokens.surfaceInteractive}
        onClose={() => setIsCurrencyModalVisible(false)}
        onSelectCurrency={(code) => {
          setCurrency(code);
          setIsCurrencyModalVisible(false);
        }}
      />

      <SettingsPinModal
        visible={isPinModalVisible}
        accentColor={tokens.primary}
        cardBg={tokens.card}
        textPrimary={tokens.textPrimary}
        textSecondary={tokens.textSecondary}
        borderColor={tokens.border}
        fieldBg={tokens.surfaceInteractive}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={() => setPinConfigured(true)}
      />

      <DevPanel visible={devPanelVisible} onClose={() => setDevPanelVisible(false)} />

      <PaywallScreen
        visible={isPaywallVisible}
        onClose={() => setIsPaywallVisible(false)}
        onSubscribe={() => {
          setIsPaywallVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: sharedTokens.typography.screenTitle.fontSize,
    fontWeight: sharedTokens.typography.screenTitle.fontWeight,
    letterSpacing: sharedTokens.typography.screenTitle.letterSpacing,
    marginBottom: 4,
  },
  titleCompact: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  listContainer: {
    gap: 10,
    marginBottom: 8,
  },
  compactRow: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  versionFooter: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subscriptionCard: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    marginBottom: 6,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  subTextWrap: {
    flex: 1,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  subCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  subBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});