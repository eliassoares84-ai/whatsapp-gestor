import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface AiInsightsModalProps {
  visible: boolean;
  loading: boolean;
  insights: string[];
  theme: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  dashboardAccent: string;
  onClose: () => void;
}

export const AiInsightsModal: React.FC<AiInsightsModalProps> = ({
  visible,
  loading,
  insights,
  theme,
  cardBg,
  textPrimary,
  textSecondary,
  dashboardAccent,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.insightsModalOverlay}>
        <View style={[styles.insightsModalCard, { backgroundColor: cardBg }]}>
          <View style={styles.insightsModalHeader}>
            <Text style={[styles.insightsModalTitle, { color: textPrimary }]}>
              {t('dashboard.insights.title', { defaultValue: 'Insights IA' })}
            </Text>
            <Pressable onPress={onClose} style={styles.insightsCloseButton}>
              <MaterialCommunityIcons name="close" size={20} color={textPrimary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.insightsLoadingWrap}>
              <ActivityIndicator size="large" color={dashboardAccent} />
              <Text style={[styles.insightsLoadingText, { color: textSecondary }]}>
                {t('dashboard.insights.loading', { defaultValue: 'Gerando...' })}
              </Text>
            </View>
          ) : (
            <View style={styles.insightsList}>
              {insights.map((tip, index) => (
                <View
                  key={`${tip}-${index}`}
                  style={[
                    styles.insightItemCard,
                    {
                      backgroundColor:
                        theme === 'light' ? '#EEF1F5' : 'rgba(255, 255, 255, 0.04)',
                    },
                  ]}
                >
                  <Text style={[styles.insightItemIndex, { color: dashboardAccent }]}>
                    {index + 1}.
                  </Text>
                  <Text style={[styles.insightItemText, { color: textPrimary }]}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  insightsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  insightsModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  insightsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  insightsModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  insightsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  insightsLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  insightsLoadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  insightsList: {
    gap: 12,
  },
  insightItemCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightItemIndex: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  insightItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
});
