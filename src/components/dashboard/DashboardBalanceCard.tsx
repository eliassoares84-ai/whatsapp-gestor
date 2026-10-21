import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { CopilotStep, walkthroughable } from '../../utils/copilotSafe';
import { formatCurrency, getMaskedCurrency } from '../../utils/formatters';

const WalkthroughableView = walkthroughable(View);

interface DashboardBalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
  currency: string;
  localeTag: string;
  hideBalances: boolean;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  dividerColor: string;
  borderColor?: string;
  positiveColor?: string;
  negativeColor?: string;
  isFocused?: boolean;
}

export const DashboardBalanceCard: React.FC<DashboardBalanceCardProps> = ({
  balance,
  income,
  expenses,
  currency,
  localeTag,
  hideBalances,
  cardBg,
  textPrimary,
  textSecondary,
  dividerColor,
  borderColor = 'rgba(255, 255, 255, 0.08)',
  positiveColor = '#32D583',
  negativeColor = '#F97066',
  isFocused = true,
}) => {
  const { t } = useTranslation();

  const safeBalanceAmount = Number.isFinite(balance) ? Math.abs(balance) : 0;
  const balanceColor = balance < 0 ? negativeColor : textPrimary;
  const balancePrefix = balance < 0 ? '- ' : '';
  const maskedCurrency = getMaskedCurrency(currency, localeTag);

  return (
    <CopilotStep
      active={isFocused}
      text={t('tour.dashboard.accounts', { defaultValue: 'Suas contas' })}
      order={2}
      name="dashboard_accounts"
    >
      <WalkthroughableView>
        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
          {/* Header com Saldo Atual (Foco Principal) */}
          <View style={styles.heroHeader}>
            <Text style={[styles.cardLabel, { color: textSecondary }]}>
              {t('dashboard.currentBalance', { defaultValue: 'Saldo Atual' })}
            </Text>
            <Text style={[styles.heroBalanceAmount, { color: balanceColor }]}>
              {hideBalances
                ? maskedCurrency
                : `${balancePrefix}${formatCurrency(safeBalanceAmount, currency, localeTag, true)}`}
            </Text>
          </View>

          {/* Métricas Secundárias (Receitas e Despesas) em cartões tonais limpos */}
          <View style={[styles.metricsRow, { borderTopColor: dividerColor }]}>
            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <View style={[styles.metricDot, { backgroundColor: positiveColor }]} />
                <Text style={[styles.metricLabel, { color: textSecondary }]}>
                  {t('dashboard.monthIncome', { defaultValue: 'Receitas' })}
                </Text>
              </View>
              <Text style={[styles.metricValue, { color: positiveColor }]}>
                {hideBalances ? maskedCurrency : `+ ${formatCurrency(income, currency, localeTag, true)}`}
              </Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: dividerColor }]} />

            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <View style={[styles.metricDot, { backgroundColor: negativeColor }]} />
                <Text style={[styles.metricLabel, { color: textSecondary }]}>
                  {t('dashboard.monthExpenses', { defaultValue: 'Despesas' })}
                </Text>
              </View>
              <Text style={[styles.metricValue, { color: negativeColor }]}>
                {hideBalances ? maskedCurrency : `- ${formatCurrency(expenses, currency, localeTag, true)}`}
              </Text>
            </View>
          </View>
        </View>
      </WalkthroughableView>
    </CopilotStep>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  heroHeader: {
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroBalanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metricItem: {
    flex: 1,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  metricDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 16,
  },
});
