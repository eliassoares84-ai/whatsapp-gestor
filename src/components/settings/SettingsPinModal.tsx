import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { setAppPin } from '../../utils/securityService';

interface SettingsPinModalProps {
  visible: boolean;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  fieldBg: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SettingsPinModal: React.FC<SettingsPinModalProps> = ({
  visible,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
  fieldBg,
  onClose,
  onSuccess,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinModalError, setPinModalError] = useState('');

  useEffect(() => {
    if (visible) {
      setPinInput('');
      setPinConfirmInput('');
      setPinStep('enter');
      setPinModalError('');
    }
  }, [visible]);

  const handleSavePin = async () => {
    if (pinStep === 'enter') {
      if (pinInput.length !== 4) {
        setPinModalError('O PIN deve ter exatamente 4 dígitos numéricos.');
        return;
      }
      setPinStep('confirm');
      setPinModalError('');
      return;
    }

    if (pinConfirmInput !== pinInput) {
      setPinModalError('Os PINs não conferem. Digite novamente.');
      setPinConfirmInput('');
      return;
    }

    await setAppPin(pinInput);
    onSuccess();
    onClose();
    Alert.alert('Sucesso', 'PIN do aplicativo configurado com sucesso!');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {pinStep === 'enter' ? 'Definir PIN de 4 Dígitos' : 'Confirme seu PIN'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                {pinStep === 'enter'
                  ? 'Digite um código de 4 números para desbloqueio.'
                  : 'Digite o mesmo código novamente para confirmar.'}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={textSecondary} />
            </Pressable>
          </View>

          {pinModalError ? (
            <Text style={styles.errorText}>
              {pinModalError}
            </Text>
          ) : null}

          <TextInput
            value={pinStep === 'enter' ? pinInput : pinConfirmInput}
            onChangeText={(text) => {
              const numeric = text.replace(/[^0-9]/g, '').slice(0, 4);
              if (pinStep === 'enter') {
                setPinInput(numeric);
              } else {
                setPinConfirmInput(numeric);
              }
              setPinModalError('');
            }}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            autoFocus
            style={[
              styles.input,
              {
                backgroundColor: fieldBg,
                borderColor: pinModalError ? '#FF453A' : borderColor,
                color: textPrimary,
              },
            ]}
            placeholder="••••"
            placeholderTextColor={textSecondary}
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.outlineBtn, { borderColor }]}
              onPress={onClose}
            >
              <Text style={[styles.outlineBtnText, { color: textPrimary }]}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: accentColor }]}
              onPress={() => void handleSavePin()}
            >
              <Text style={styles.primaryBtnText}>
                {pinStep === 'enter' ? 'Avançar' : 'Salvar PIN'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '700',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
