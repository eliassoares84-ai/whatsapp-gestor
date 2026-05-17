import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { authenticateUser } from '../utils/securityService';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';
const ACCENT = '#0A84FF';

interface LockScreenProps {
  onUnlockSuccess: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlockSuccess }) => {
  const [errorMessage, setErrorMessage] = useState('');

  const handleUnlockAttempt = async () => {
    setErrorMessage('');

    try {
      const authenticated = await authenticateUser();

      if (!authenticated) {
        setErrorMessage('Não foi possível autenticar. Tente novamente.');
        return;
      }

      onUnlockSuccess();
    } catch {
      setErrorMessage('Não foi possível autenticar. Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={[styles.lockContainer, { backgroundColor: APP_BG }]}> 
      <View style={[styles.lockCard, { backgroundColor: CARD_BG }]}> 
        <MaterialCommunityIcons name="shield-lock-outline" size={64} color={ACCENT} />
        <Text style={[styles.lockTitle, { color: TEXT_PRIMARY }]}>Acesso protegido</Text>
        <Text style={[styles.lockSubtitle, { color: TEXT_SECONDARY }]}>
          Desbloqueie com biometria ou PIN/senha do dispositivo.
        </Text>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <Pressable
          style={[styles.unlockButton, { backgroundColor: ACCENT }]}
          onPress={() => void handleUnlockAttempt()}
        >
          <Text style={styles.unlockButtonText}>Desbloquear com Biometria ou PIN</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockCard: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF453A',
    marginBottom: 12,
    textAlign: 'center',
  },
  unlockButton: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});