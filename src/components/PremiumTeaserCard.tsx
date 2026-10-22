import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import type { Transaction } from '../types/finance.types';
import { getThemeTokens } from '../styles/themes';
import { formatCurrency, getMaskedCurrency } from '../utils/formatters';

interface PremiumTeaserCardProps {
  isPremium: boolean;
  transactions: Transaction[];
  accentColor: string;
  hideBalances?: boolean;
  onPress: () => void;
}

export const PremiumTeaserCard: React.FC<PremiumTeaserCardProps> = ({
  isPremium,
  transactions,
  accentColor,
  hideBalances = false,
  onPress,
}) => {
  const { t, i18n } = useTranslation();
  const currency = useFinanceStore((state) => state.currency);
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);
  const isDark = theme === 'dark';
  const localeTag = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language.startsWith('es') ? 'es-ES' : 'en-US';
  const maskedCurrency = getMaskedCurrency(currency, localeTag);

  const { income, expense } = useMemo(() => {
    const incomes = transactions
      .filter((item) => item.type === 'income' && !item.excludeFromCharts)
      .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
      .filter((item) => item.type === 'expense' && !item.excludeFromCharts)
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income: incomes,
      expense: expenses,
    };
  }, [transactions]);

  const cardBg = tokens.aiCardBg;
  const cardBorder = tokens.aiCardBorder;
  const titleColor = tokens.textPrimary;
  const subtitleColor = tokens.textSecondary;
  const metricBoxBg = tokens.aiCardMetricBg;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: cardBorder,
          backgroundColor: cardBg,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.copyWrap}>
          <View style={styles.badgeRow}>
            <View style={[styles.proBadge, { backgroundColor: tokens.primaryTonal, borderColor: tokens.primaryTonalBorder }]}>
              <MaterialCommunityIcons name="auto-fix" size={13} color={tokens.primary} />
              <Text style={[styles.proBadgeText, { color: tokens.primary }]}>
                {isPremium ? t('premiumTeaser.badgeActive', { defaultValue: 'CONSULTORIA IA' }) : t('premiumTeaser.badgeLocked', { defaultValue: 'RECURSO PRO' })}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: titleColor }]}>
            {isPremium ? t('premiumTeaser.titleActive', { defaultValue: 'Análise de Gastos com Consultor IA' }) : t('premiumTeaser.titleLocked', { defaultValue: 'Desbloqueie Insights por IA' })}
          </Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            {isPremium
              ? t('premiumTeaser.subtitleActive', { defaultValue: 'Receba um diagnóstico completo dos seus gastos e converse diretamente com o Consultor IA.' })
              : t('premiumTeaser.subtitleLocked', { defaultValue: 'Receba recomendações automáticas para otimizar seus gastos.' })}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricBox, { backgroundColor: metricBoxBg, borderColor: tokens.border }]}>
          <Text style={[styles.metricLabel, { color: tokens.textTertiary }]}>{t('premiumTeaser.income', { defaultValue: 'Receitas' })}</Text>
          <Text style={[styles.metricValue, { color: tokens.positive }]}>
            {hideBalances ? maskedCurrency : formatCurrency(income, currency, localeTag, true)}
          </Text>
        </View>

        <View style={[styles.metricBox, { backgroundColor: metricBoxBg, borderColor: tokens.border }]}>
          <Text style={[styles.metricLabel, { color: tokens.textTertiary }]}>{t('premiumTeaser.expense', { defaultValue: 'Despesas' })}</Text>
          <Text style={[styles.metricValue, { color: tokens.negative }]}>
            {hideBalances ? maskedCurrency : formatCurrency(expense, currency, localeTag, true)}
          </Text>
        </View>
      </View>

      <Pressable
        style={[
          styles.cta,
          {
            backgroundColor: isPremium ? tokens.primaryTonal : tokens.primary,
            borderColor: isPremium ? tokens.primaryTonalBorder : tokens.primary,
          },
        ]}
        onPress={onPress}
      >
        <MaterialCommunityIcons
          name={isPremium ? 'headset' : 'lock-outline'}
          size={16}
          color={isPremium ? tokens.primary : tokens.textInverse}
        />
        <Text style={[styles.ctaText, { color: isPremium ? tokens.primary : tokens.textInverse }]}>
          {isPremium ? t('premiumTeaser.ctaActive', { defaultValue: 'Analisar Gastos no Chat' }) : t('premiumTeaser.ctaLocked', { defaultValue: 'Conhecer Recursos PRO' })}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  copyWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  cta: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
