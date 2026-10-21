import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface AppMessageModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
}

export const AppMessageModal: React.FC<AppMessageModalProps> = ({
  visible,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onPrimary}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}> 
          <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: textSecondary }]}>{message}</Text>

          <View style={styles.actions}>
            {secondaryLabel && onSecondary ? (
              <Pressable
                onPress={onSecondary}
                style={[styles.secondaryButton, { borderColor, backgroundColor: 'transparent' }]}
              >
                <Text style={[styles.secondaryText, { color: textSecondary }]}>{secondaryLabel}</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onPrimary}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: `${accentColor}22`,
                  borderColor: `${accentColor}55`,
                },
              ]}
            >
              <Text style={[styles.primaryText, { color: accentColor }]}>{primaryLabel}</Text>
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
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '900',
  },
});

export default AppMessageModal;
