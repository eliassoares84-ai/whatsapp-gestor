import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getThemeTokens, sharedTokens } from '../styles/themes';

interface SyncStatusModalProps {
  visible: boolean;
  onClose: () => void;
  onRetrySync: () => void;
  isSyncing?: boolean;
  lastSyncDate?: string;
  isGoogleLinked?: boolean;
  theme: 'light' | 'dark';
}

export const SyncStatusModal: React.FC<SyncStatusModalProps> = ({
  visible,
  onClose,
  onRetrySync,
  isSyncing = false,
  isGoogleLinked = false,
  theme,
}) => {
  const tokens = getThemeTokens(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: tokens.overlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.border,
            },
          ]}
        >
          {/* Ícone de Nuvem / Sincronização */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isGoogleLinked ? tokens.warningTonal : tokens.primaryTonal,
                borderColor: isGoogleLinked ? tokens.warningTonalBorder : tokens.primaryTonalBorder,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="cloud-sync-outline"
              size={30}
              color={isGoogleLinked ? tokens.warning : tokens.primary}
            />
          </View>

          {/* Título & Mensagem */}
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            Sincronização pendente
          </Text>

          <Text style={[styles.message, { color: tokens.textSecondary }]}>
            Seus lançamentos continuam salvos com segurança localmente neste dispositivo.
            A cópia na nuvem será atualizada assim que a sincronização for concluída.
          </Text>

          {/* Status informativo de segurança */}
          <View
            style={[
              styles.securityPill,
              {
                backgroundColor: tokens.surfaceInteractive,
                borderColor: tokens.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={16}
              color={tokens.positive}
            />
            <Text style={[styles.securityText, { color: tokens.textSecondary }]}>
              Dados preservados na memória local
            </Text>
          </View>

          {/* Botões de Ação */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: tokens.primary,
                },
                isSyncing && styles.buttonDisabled,
              ]}
              onPress={onRetrySync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Tentar novamente</Text>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: tokens.surfaceInteractive,
                  borderColor: tokens.border,
                },
              ]}
              onPress={onClose}
              disabled={isSyncing}
            >
              <Text style={[styles.secondaryButtonText, { color: tokens.textSecondary }]}>
                Agora não
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: sharedTokens.radius.modal,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 22,
    width: '100%',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: sharedTokens.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    width: '100%',
    height: 44,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
