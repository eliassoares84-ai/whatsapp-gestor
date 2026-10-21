import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { RecurringTemplate } from '../../types/finance.types';
import { formatCurrency } from '../../utils/formatters';
import { getThemeTokens, sharedTokens } from '../../styles/themes';

interface SettingsRecurringSectionProps {
  templates: RecurringTemplate[];
  currency: string;
  localeTag: string;
  theme: 'light' | 'dark';
  onToggleTemplate: (id: string) => void;
  onEditTemplate: (template: RecurringTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onAddTemplate: () => void;
}

export const SettingsRecurringSection: React.FC<SettingsRecurringSectionProps> = ({
  templates,
  currency,
  localeTag,
  theme,
  onToggleTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onAddTemplate,
}) => {
  const { t } = useTranslation();
  const tokens = getThemeTokens(theme);

  const getFrequencyLabel = (template: RecurringTemplate): string => {
    if (template.frequency === 'weekly') {
      return t('settings.frequencyWeekly', { day: template.dayOfMonth });
    }

    if (template.frequency === 'yearly') {
      return t('settings.frequencyYearly', { day: template.dayOfMonth });
    }

    return t('settings.frequencyMonthly', { day: template.dayOfMonth });
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
          {t('settings.recurringTitle', { defaultValue: 'Transações Recorrentes' })}
        </Text>
        <Text style={[styles.sectionSubtitle, { color: tokens.textSecondary }]}>
          {t('settings.recurringSubtitle', { defaultValue: 'Lançamentos automáticos programados' })}
        </Text>
      </View>

      {templates.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
            {t('settings.noRecurring', { defaultValue: 'Nenhuma transação recorrente configurada' })}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {templates.map((template) => {
            const isIncome = template.type === 'income';
            const typeColor = isIncome ? tokens.positive : tokens.negative;

            return (
              <View
                key={template.id}
                style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: isIncome ? tokens.positiveTonal : tokens.negativeTonal }]}>
                  <MaterialCommunityIcons
                    name={
                      isIncome
                        ? 'arrow-bottom-left'
                        : 'arrow-top-right'
                    }
                    size={18}
                    color={typeColor}
                  />
                </View>

                <View style={styles.infoBlock}>
                  <Text style={[styles.itemName, { color: tokens.textPrimary }]} numberOfLines={1}>
                    {template.note}
                  </Text>
                  <Text style={[styles.itemSub, { color: tokens.textSecondary }]} numberOfLines={1}>
                    {getFrequencyLabel(template)}
                  </Text>
                </View>

                <View style={styles.recurringRight}>
                  <Text style={[styles.recurringAmount, { color: typeColor }]}>
                    {isIncome ? '+' : '-'} {formatCurrency(template.amount, currency, localeTag, true)}
                  </Text>

                  <View style={styles.controlRow}>
                    <Switch
                      value={template.isActive}
                      onValueChange={() => onToggleTemplate(template.id)}
                      trackColor={{ false: tokens.surfaceInteractive, true: tokens.primaryTonalBorder }}
                      thumbColor={template.isActive ? tokens.primary : tokens.textTertiary}
                      ios_backgroundColor={tokens.surfaceInteractive}
                    />

                    <Pressable
                      onPress={() => onEditTemplate(template)}
                      style={[styles.actionBtn, { backgroundColor: tokens.surfaceInteractive }]}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={15}
                        color={tokens.textSecondary}
                      />
                    </Pressable>

                    <Pressable
                      onPress={() => onDeleteTemplate(template.id)}
                      style={[styles.actionBtn, { backgroundColor: tokens.surfaceInteractive }]}
                      hitSlop={6}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={15}
                        color={tokens.negative}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.addActionBtn, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}
        onPress={onAddTemplate}
      >
        <MaterialCommunityIcons name="plus" size={18} color={tokens.primary} />
        <Text style={[styles.addActionText, { color: tokens.primary }]}>
          {t('settings.addRecurring', { defaultValue: 'Nova recorrência' })}
        </Text>
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 10,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContainer: {
    gap: 10,
    marginBottom: 12,
  },
  card: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBlock: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  recurringRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  recurringAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: sharedTokens.radius.control,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  addActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
