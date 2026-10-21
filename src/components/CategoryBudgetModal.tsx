import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/formatters';
import { CurrencyInput } from './CurrencyInput';

interface CategoryBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    budgetLimit?: number;
  } | null;
  currentSpend: number;
  workspaceColor?: string;
}

export const CategoryBudgetModal: React.FC<CategoryBudgetModalProps> = ({
  visible,
  onClose,
  category,
  currentSpend,
  workspaceColor = '#0A84FF',
}) => {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const currency = useFinanceStore((state) => state.currency);
  const setCategoryBudget = useFinanceStore((state) => state.setCategoryBudget);

  const [limit, setLimit] = useState<number>(0);

  useEffect(() => {
    if (category) {
      setLimit(category.budgetLimit || 0);
    } else {
      setLimit(0);
    }
  }, [category, visible]);

  if (!category) {
    return null;
  }

  const localeTag = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language.startsWith('es') ? 'es-ES' : 'en-US';
  const isDark = theme === 'dark';

  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const separator = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
  const inputBg = isDark ? '#2C2C2E' : '#F3F4F6';
  const chipBg = isDark ? '#2C2C2E' : '#E5E7EB';

  const ratio = limit > 0 ? (currentSpend / limit) : 0;
  const progressPercent = Math.min(Math.round(ratio * 100), 100);
  const isOverBudget = limit > 0 && currentSpend > limit;
  const isNearLimit = limit > 0 && ratio >= 0.8 && !isOverBudget;

  const statusColor = isOverBudget
    ? '#FF453A'
    : isNearLimit
      ? '#FFD60A'
      : '#22C55E';

  const handleSave = () => {
    if (limit > 0) {
      setCategoryBudget(category.id, limit);
    } else {
      setCategoryBudget(category.id, null);
    }
    onClose();
  };

  const handleRemoveLimit = () => {
    setCategoryBudget(category.id, null);
    onClose();
  };

  const quickPresets = [100, 250, 500, 1000, 2000];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: `${category.color || workspaceColor}20` }]}>
              <MaterialCommunityIcons
                name={(category.icon as any) || 'tag'}
                size={24}
                color={category.color || workspaceColor}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: textPrimary }]}>
                {category.name}
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {t('budget.modalSubtitle', { defaultValue: 'Meta de Orçamento Mensal' })}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={textSecondary} />
            </Pressable>
          </View>

          {/* Current Month Spend Info */}
          <View style={[styles.spendBox, { backgroundColor: inputBg }]}>
            <View style={styles.spendRow}>
              <Text style={[styles.spendLabel, { color: textSecondary }]}>
                {t('budget.spentThisMonth', { defaultValue: 'Gasto no mês selecionado:' })}
              </Text>
              <Text style={[styles.spendValue, { color: textPrimary }]}>
                {formatCurrency(currentSpend, currency, localeTag, true)}
              </Text>
            </View>

            {limit > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {isOverBudget
                      ? t('budget.overBudget', {
                          defaultValue: `🚨 Limite excedido em ${formatCurrency(currentSpend - limit, currency, localeTag, true)}`,
                        })
                      : isNearLimit
                        ? t('budget.nearLimit', {
                            defaultValue: `⚠️ Atenção: ${Math.round(ratio * 100)}% atingido`,
                          })
                        : t('budget.withinBudget', {
                            defaultValue: `✅ ${Math.round(ratio * 100)}% da meta utilizada`,
                          })}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: textSecondary }]}>
              {t('budget.setLimitLabel', { defaultValue: 'Limite máximo mensal (R$):' })}
            </Text>
            <CurrencyInput
              value={limit}
              onChangeValue={setLimit}
              placeholder="0,00"
              placeholderTextColor={textSecondary}
              style={[
                styles.currencyInput,
                {
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: limit > 0 ? workspaceColor : separator,
                },
              ]}
            />
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsContainer}>
            {quickPresets.map((preset) => (
              <Pressable
                key={preset}
                style={[
                  styles.presetChip,
                  { backgroundColor: chipBg },
                  limit === preset && { backgroundColor: `${workspaceColor}30`, borderColor: workspaceColor },
                ]}
                onPress={() => setLimit(preset)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: limit === preset ? workspaceColor : textPrimary },
                  ]}
                >
                  +{preset}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Helper Explanation */}
          <Text style={[styles.helpText, { color: textSecondary }]}>
            {t('budget.helperExplanation', {
              defaultValue: 'Você receberá alertas automáticos quando atingir 80% e 100% desta meta.',
            })}
          </Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {Boolean(category.budgetLimit) && (
              <Pressable
                style={[styles.removeButton, { borderColor: '#FF453A40' }]}
                onPress={handleRemoveLimit}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF453A" />
                <Text style={styles.removeButtonText}>
                  {t('budget.remove', { defaultValue: 'Remover' })}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.saveButton, { backgroundColor: workspaceColor }]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: workspaceColor === '#d2ff61' ? '#101010' : '#FFFFFF' },
                ]}
              >
                {limit > 0
                  ? t('budget.save', { defaultValue: 'Salvar Meta' })
                  : t('budget.clear', { defaultValue: 'Limpar Meta' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  card: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  spendBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  spendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendLabel: {
    fontSize: 13,
  },
  spendValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 10,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusRow: {
    marginTop: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  currencyInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1.5,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  removeButtonText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
