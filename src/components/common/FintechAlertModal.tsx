import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAlertStore, type AlertButton, type AlertType } from '../../store/useAlertStore';
import { useThemeStore } from '../../store/useFinanceStore';
import { getThemeTokens } from '../../styles/themes';

/**
 * Remove emojis decorativos do início do título para evitar redundância com o badge gráfico
 */
const cleanTitle = (rawTitle: string): string => {
  return rawTitle.replace(/^[\p{Emoji}\s]+/u, '').trim();
};

export const FintechAlertModal: React.FC = () => {
  const { visible, config, hideAlert } = useAlertStore();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const title = config?.title || '';
  const message = config?.message || '';
  const buttons = config?.buttons || [{ text: 'OK', style: 'default' }];

  // Identificação semântica do tipo de popup e ícone
  const { alertType, iconName, badgeBg, badgeBorder, iconColor } = useMemo(() => {
    let t: AlertType = config?.type || 'default';
    const lowerTitle = title.toLowerCase();
    const lowerMsg = message.toLowerCase();

    const isPro =
      lowerTitle.includes('pro') ||
      lowerTitle.includes('bem-vindo') ||
      lowerMsg.includes('consultor financeiro por ia') ||
      lowerTitle.includes('restaurad');

    const isDestructive =
      t === 'destructive' ||
      buttons.some((b) => b.style === 'destructive') ||
      lowerTitle.includes('excluir') ||
      lowerTitle.includes('apagar') ||
      lowerTitle.includes('remover') ||
      lowerTitle.includes('limpar');

    const isWarning =
      t === 'warning' ||
      lowerTitle.includes('erro') ||
      lowerTitle.includes('atenção') ||
      lowerTitle.includes('aviso') ||
      lowerTitle.includes('inválid');

    const isSuccess =
      t === 'success' ||
      lowerTitle.includes('sucesso') ||
      lowerTitle.includes('concluíd') ||
      isPro;

    if (isDestructive) {
      t = 'destructive';
    } else if (isSuccess) {
      t = 'success';
    } else if (isWarning) {
      t = 'warning';
    }

    if (isPro) {
      return {
        alertType: 'success' as AlertType,
        iconName: 'crown-outline' as const,
        badgeBg: 'rgba(255, 184, 0, 0.14)',
        badgeBorder: 'rgba(255, 184, 0, 0.32)',
        iconColor: '#FFB800',
      };
    }

    if (t === 'destructive') {
      return {
        alertType: t,
        iconName: (config?.icon as any) || 'trash-can-outline',
        badgeBg: tokens.negativeTonal,
        badgeBorder: tokens.negativeTonalBorder,
        iconColor: tokens.negative,
      };
    }

    if (t === 'warning') {
      return {
        alertType: t,
        iconName: (config?.icon as any) || 'alert-outline',
        badgeBg: tokens.warningTonal,
        badgeBorder: tokens.warningTonalBorder,
        iconColor: tokens.warning,
      };
    }

    if (t === 'success') {
      return {
        alertType: t,
        iconName: (config?.icon as any) || 'check-circle-outline',
        badgeBg: tokens.positiveTonal,
        badgeBorder: tokens.positiveTonalBorder,
        iconColor: tokens.positive,
      };
    }

    return {
      alertType: t,
      iconName: (config?.icon as any) || 'shield-check-outline',
      badgeBg: tokens.primaryTonal,
      badgeBorder: tokens.primaryTonalBorder,
      iconColor: tokens.primary,
    };
  }, [config?.type, config?.icon, title, message, buttons, tokens]);

  if (!visible || !config) {
    return null;
  }

  const handleButtonPress = (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const isTwoButtons = buttons.length === 2;
  const hasLongButtonText = buttons.some((b) => (b.text || '').length > 14);
  const layoutSideBySide = isTwoButtons && !hasLongButtonText;

  const displayTitle = cleanTitle(title) || title;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={hideAlert}
    >
      <View style={[styles.backdrop, { backgroundColor: tokens.overlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.borderStrong,
            },
          ]}
        >
          {/* Badge de Ícone Estilo Fintech */}
          <View style={[styles.iconBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
            <MaterialCommunityIcons name={iconName} size={28} color={iconColor} />
          </View>

          {/* Título & Mensagem */}
          {displayTitle ? (
            <Text style={[styles.title, { color: tokens.textPrimary }]}>{displayTitle}</Text>
          ) : null}

          {message ? (
            <Text style={[styles.message, { color: tokens.textSecondary }]}>{message}</Text>
          ) : null}

          {/* Ações / Botões */}
          <View
            style={[
              styles.buttonContainer,
              layoutSideBySide ? styles.rowButtons : styles.columnButtons,
            ]}
          >
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimaryAction = !isCancel;

              let btnBg = tokens.primary;
              let btnBorder = tokens.primary;
              let textColor = tokens.textInverse;

              if (isCancel) {
                btnBg = tokens.surfaceInteractive;
                btnBorder = tokens.border;
                textColor = tokens.textSecondary;
              } else if (isDestructive) {
                btnBg = tokens.negative;
                btnBorder = tokens.negative;
                textColor = '#FFFFFF';
              } else if (alertType === 'success') {
                btnBg = tokens.primary;
                btnBorder = tokens.primary;
                textColor = '#FFFFFF';
              }

              return (
                <Pressable
                  key={`${btn.text || 'btn'}-${index}`}
                  style={({ pressed }) => [
                    styles.buttonBase,
                    layoutSideBySide && styles.flexButton,
                    {
                      backgroundColor: btnBg,
                      borderColor: btnBorder,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => handleButtonPress(btn)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: textColor,
                        fontWeight: isPrimaryAction ? '700' : '600',
                      },
                    ]}
                  >
                    {btn.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  columnButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  buttonBase: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 15,
    letterSpacing: -0.1,
  },
});
