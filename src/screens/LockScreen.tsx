import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens, sharedTokens } from '../styles/themes';
import {
  authenticateBiometrics,
  hasAppPin,
  isBiometricsAvailable,
  setAppPin,
  verifyAppPin,
} from '../utils/securityService';

interface LockScreenProps {
  onUnlockSuccess: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlockSuccess }) => {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const [isLoading, setIsLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [biometricsStatus, setBiometricsStatus] = useState({
    hasHardware: false,
    isEnrolled: false,
  });

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [setupFirstPin, setSetupFirstPin] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const isBiometricAttemptInProgress = useRef(false);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleBiometricAttempt = useCallback(async () => {
    if (isBiometricAttemptInProgress.current) {
      return;
    }

    isBiometricAttemptInProgress.current = true;
    setErrorMessage('');

    try {
      const authenticated = await authenticateBiometrics({
        promptMessage: t('lock.promptMessage', { defaultValue: 'Confirme sua identidade' }),
        cancelLabel: t('lock.cancelLabel', { defaultValue: 'Cancelar' }),
        fallbackLabel: t('lock.fallbackLabel', { defaultValue: 'Usar PIN' }),
      });

      if (authenticated) {
        onUnlockSuccess();
        return;
      }

      setErrorMessage(t('lock.errors.authFailed', { defaultValue: 'Biometria não reconhecida. Use o PIN.' }));
    } catch {
      setErrorMessage(t('lock.errors.authFailed', { defaultValue: 'Biometria indisponível. Use o PIN.' }));
    } finally {
      isBiometricAttemptInProgress.current = false;
    }
  }, [onUnlockSuccess, t]);

  const checkInitialSecurity = useCallback(async () => {
    setIsLoading(true);
    try {
      const pinExists = await hasAppPin();
      const bioStatus = await isBiometricsAvailable();

      setHasPin(pinExists);
      setBiometricsStatus(bioStatus);

      if (bioStatus.hasHardware && bioStatus.isEnrolled) {
        void handleBiometricAttempt();
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleBiometricAttempt]);

  useEffect(() => {
    void checkInitialSecurity();
  }, [checkInitialSecurity]);

  const handleKeyPress = async (digit: string) => {
    if (enteredPin.length >= 4) {
      return;
    }

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setErrorMessage('');

    if (nextPin.length === 4) {
      if (isSetupMode) {
        if (setupStep === 'enter') {
          setSetupFirstPin(nextPin);
          setSetupStep('confirm');
          setEnteredPin('');
        } else {
          if (nextPin === setupFirstPin) {
            await setAppPin(nextPin);
            setHasPin(true);
            setIsSetupMode(false);
            onUnlockSuccess();
          } else {
            triggerShake();
            setErrorMessage(t('lock.pinMismatch', { defaultValue: 'Os PINs digitados não conferem.' }));
            setSetupStep('enter');
            setSetupFirstPin('');
            setEnteredPin('');
          }
        }
      } else {
        const isValid = await verifyAppPin(nextPin);
        if (isValid) {
          onUnlockSuccess();
        } else {
          triggerShake();
          setErrorMessage(t('lock.errors.invalidPin', { defaultValue: 'PIN incorreto. Tente novamente.' }));
          setEnteredPin('');
        }
      }
    }
  };

  const handleDeleteDigit = () => {
    if (enteredPin.length > 0) {
      setEnteredPin((prev) => prev.slice(0, -1));
      setErrorMessage('');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Esqueci meu PIN',
      'Para proteger seus dados financeiros, o PIN de acesso pode ser redefinido desinstalando o app e restaurando o backup da sua conta Google ou excluindo os dados do app nas configurações do Android.',
      [{ text: 'Entendi' }]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.lockContainer, { backgroundColor: tokens.background }]}>
        <ActivityIndicator size="large" color={tokens.primary} />
      </SafeAreaView>
    );
  }

  const isNoBiometricsNoPin = !hasPin && !biometricsStatus.isEnrolled && !isSetupMode;

  return (
    <SafeAreaView style={[styles.lockContainer, { backgroundColor: tokens.background }]}>
      <View
        style={[
          styles.lockCard,
          {
            backgroundColor: tokens.card,
            borderColor: tokens.border,
          },
        ]}
      >
        {/* Ícone discreto de escudo em container tonal */}
        <View style={[styles.shieldIconWrap, { backgroundColor: tokens.primaryTonal, borderColor: tokens.primaryTonalBorder }]}>
          <MaterialCommunityIcons
            name={isSetupMode ? 'shield-plus-outline' : 'shield-check-outline'}
            size={28}
            color={tokens.primary}
          />
        </View>

        <Text style={[styles.lockTitle, { color: tokens.textPrimary }]}>
          {isSetupMode
            ? setupStep === 'enter'
              ? t('lock.setupPinTitle', { defaultValue: 'Criar PIN de Acesso' })
              : t('lock.confirmPin', { defaultValue: 'Confirmar PIN' })
            : t('lock.title', { defaultValue: 'SeuGestor' })}
        </Text>

        <Text style={[styles.lockSubtitle, { color: tokens.textSecondary }]}>
          {isSetupMode
            ? setupStep === 'enter'
              ? t('lock.setupPinSubtitle', { defaultValue: 'Digite 4 dígitos para proteger seu app' })
              : t('lock.confirmPin', { defaultValue: 'Digite o PIN novamente para confirmar' })
            : hasPin
              ? t('lock.enterPin', { defaultValue: 'Digite seu PIN numérico' })
              : t('lock.subtitle', { defaultValue: 'Proteção de acesso ativada' })}
        </Text>

        {/* Banner de erro auxiliar discreto */}
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: tokens.negativeTonal, borderColor: tokens.negativeTonalBorder }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={tokens.negative} />
            <Text style={[styles.errorText, { color: tokens.negative }]}>{errorMessage}</Text>
          </View>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        {isNoBiometricsNoPin ? (
          <View style={styles.noBioContainer}>
            <Text style={[styles.noBioNotice, { color: tokens.textSecondary }]}>
              {t('lock.biometricsNotAvailable', { defaultValue: 'Nenhum método biométrico cadastrado no dispositivo.' })}
            </Text>

            <Pressable
              style={[styles.primaryActionBtn, { backgroundColor: tokens.primary }]}
              onPress={() => {
                setIsSetupMode(true);
                setSetupStep('enter');
                setEnteredPin('');
                setErrorMessage('');
              }}
            >
              <Text style={styles.primaryActionBtnText}>{t('lock.setupPinTitle', { defaultValue: 'Configurar PIN de Acesso' })}</Text>
            </Pressable>

            <Pressable
              style={styles.skipBtn}
              onPress={() => onUnlockSuccess()}
            >
              <Text style={[styles.skipBtnText, { color: tokens.textSecondary }]}>
                {t('lock.skipPin', { defaultValue: 'Acessar sem PIN' })}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Indicador de 4 dígitos (dots menores de 12px) */}
            <Animated.View
              style={[
                styles.dotsRow,
                {
                  transform: [{ translateX: shakeAnim }],
                },
              ]}
            >
              {[0, 1, 2, 3].map((index) => {
                const isFilled = enteredPin.length > index;
                return (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isFilled ? tokens.primary : tokens.surfaceInteractive,
                        borderColor: isFilled ? tokens.primary : tokens.border,
                        transform: [{ scale: isFilled ? 1.15 : 1 }],
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>

            {/* Teclado Numérico com botões 64x64 táteis */}
            <View style={styles.numpad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
              ].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.numpadRow}>
                  {row.map((digit) => (
                    <Pressable
                      key={digit}
                      style={({ pressed }) => [
                        styles.numButton,
                        {
                          backgroundColor: pressed ? tokens.primaryTonal : tokens.surfaceInteractive,
                          borderColor: tokens.border,
                        },
                      ]}
                      onPress={() => void handleKeyPress(digit)}
                    >
                      <Text style={[styles.numText, { color: tokens.textPrimary }]}>{digit}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}

              {/* Linha final: Biometria / 0 / Apagar */}
              <View style={styles.numpadRow}>
                {biometricsStatus.hasHardware && biometricsStatus.isEnrolled && !isSetupMode ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.numButton,
                      {
                        backgroundColor: pressed ? tokens.primaryTonal : tokens.surfaceInteractive,
                        borderColor: tokens.border,
                      },
                    ]}
                    onPress={() => void handleBiometricAttempt()}
                    accessibilityLabel={t('lock.useBiometrics', { defaultValue: 'Biometria' })}
                  >
                    <MaterialCommunityIcons name="fingerprint" size={26} color={tokens.primary} />
                  </Pressable>
                ) : (
                  <View style={styles.numButtonEmpty} />
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.numButton,
                    {
                      backgroundColor: pressed ? tokens.primaryTonal : tokens.surfaceInteractive,
                      borderColor: tokens.border,
                    },
                  ]}
                  onPress={() => void handleKeyPress('0')}
                >
                  <Text style={[styles.numText, { color: tokens.textPrimary }]}>0</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.numButton,
                    {
                      backgroundColor: pressed ? tokens.negativeTonal : tokens.surfaceInteractive,
                      borderColor: tokens.border,
                    },
                  ]}
                  onPress={handleDeleteDigit}
                  accessibilityLabel="Apagar dígito"
                >
                  <MaterialCommunityIcons name="backspace-outline" size={22} color={tokens.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Ações auxiliares: Esqueci meu PIN / Cancelar */}
            <View style={styles.footerActions}>
              {hasPin && !isSetupMode && (
                <Pressable onPress={handleForgotPassword} style={styles.textLink} hitSlop={8}>
                  <Text style={[styles.forgotPasswordText, { color: tokens.textTertiary }]}>
                    Esqueci meu PIN
                  </Text>
                </Pressable>
              )}

              {isSetupMode && (
                <Pressable
                  onPress={() => {
                    setIsSetupMode(false);
                    setSetupStep('enter');
                    setEnteredPin('');
                    setErrorMessage('');
                  }}
                  style={styles.textLink}
                  hitSlop={8}
                >
                  <Text style={[styles.forgotPasswordText, { color: tokens.textSecondary }]}>
                    {t('lock.cancelLabel', { defaultValue: 'Cancelar' })}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  lockCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  shieldIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorPlaceholder: {
    height: 26,
    marginBottom: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  numpad: {
    width: '100%',
    maxWidth: 270,
    gap: 10,
    marginTop: 4,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numButtonEmpty: {
    width: 64,
    height: 64,
  },
  numText: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  footerActions: {
    marginTop: 14,
    alignItems: 'center',
  },
  textLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  noBioContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  noBioNotice: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  primaryActionBtn: {
    width: '100%',
    height: 48,
    borderRadius: sharedTokens.radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});