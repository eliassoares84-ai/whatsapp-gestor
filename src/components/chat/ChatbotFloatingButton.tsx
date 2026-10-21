import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getThemeTokens } from '../../styles/themes';
import { useThemeStore } from '../../store/useFinanceStore';

interface ChatbotFloatingButtonProps {
  onPress: () => void;
  bottomOffset?: number;
}

export const ChatbotFloatingButton: React.FC<ChatbotFloatingButtonProps> = ({
  onPress,
  bottomOffset = 80,
}) => {
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.floatingButton,
        {
          bottom: bottomOffset,
          backgroundColor: theme === 'dark' ? '#0D1929' : '#EFF6FF',
          borderColor: tokens.primary,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir bate-papo com Consultor Financeiro Inteligente"
    >
      <View style={[styles.iconContainer, { backgroundColor: tokens.primaryTonal }]}>
        <MaterialCommunityIcons name="headset" size={22} color={tokens.primary} />
        {/* Ponto indicador de status Online */}
        <View style={[styles.onlineDot, { backgroundColor: tokens.positive }]} />
      </View>

      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={[styles.buttonLabel, { color: tokens.textPrimary }]}>
            Consultor IA
          </Text>
          <View style={[styles.aiBadge, { backgroundColor: tokens.primary }]}>
            <Text style={styles.aiBadgeText}>IA</Text>
          </View>
        </View>
        <Text style={[styles.buttonSub, { color: tokens.textSecondary }]}>
          Especialista Online
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 28,
    borderWidth: 1.5,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 99,
    gap: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  textWrap: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  aiBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  buttonSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});
