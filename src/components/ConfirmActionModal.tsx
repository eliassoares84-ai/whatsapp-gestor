import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor?: string;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor = '#FF453A',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}> 
          <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: textSecondary }]}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={[styles.cancelButton, { borderColor, backgroundColor: 'transparent' }]}
            >
              <Text style={[styles.cancelText, { color: textSecondary }]}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={[styles.confirmButton, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}
            >
              <Text style={[styles.confirmText, { color: accentColor }]}>{confirmLabel}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    maxWidth: 460,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  message: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  confirmButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '900',
  },
});

export default ConfirmActionModal;
