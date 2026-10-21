import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Transaction } from '../../types/finance.types';
import { CopilotStep, walkthroughable } from '../../utils/copilotSafe';
import { formatCurrency, getMaskedCurrency } from '../../utils/formatters';
import { uppercaseFirstLetter } from '../../utils/textInputFormat';

const WalkthroughableView = walkthroughable(View);

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const getCategoryIcon = (categoryId?: string): IconName => {
  if (!categoryId) return 'tag-outline';
  if (categoryId.includes('alimentacao') || categoryId.includes('mercado') || categoryId.includes('restaurante')) return 'silverware-fork-knife';
  if (categoryId.includes('transporte') || categoryId.includes('combustivel') || categoryId.includes('uber')) return 'car-outline';
  if (categoryId.includes('moradia') || categoryId.includes('aluguel') || categoryId.includes('casa')) return 'home-outline';
  if (categoryId.includes('saude') || categoryId.includes('farmacia')) return 'medical-bag';
  if (categoryId.includes('lazer') || categoryId.includes('viagem')) return 'gamepad-variant-outline';
  if (categoryId.includes('educacao')) return 'school-outline';
  if (categoryId.includes('salario') || categoryId.includes('renda')) return 'wallet-outline';
  if (categoryId.includes('transfer')) return 'swap-horizontal';
  return 'tag-outline';
};

const sanitizeTransactionLabel = (rawValue?: string): string => {
  if (!rawValue) return '';
  return rawValue
    .replace(/^\s*(?:r\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*/i, '')
    .replace(/\s*(?:r\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const isSameDay = (date1: Date, date2: Date) => {
  if (!date1 || !date2 || isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const getRelativeDayLabel = (dateString: string, localeTag: string, t: any) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return t('dashboard.timeline.today', { defaultValue: 'Hoje' });
  if (isSameDay(date, yesterday)) return t('dashboard.timeline.yesterday', { defaultValue: 'Ontem' });

  try {
    return date.toLocaleDateString(localeTag, {
      day: '2-digit',
      month: 'long',
    });
  } catch {
    return '';
  }
};

interface DashboardRecentTransactionsProps {
  transactions: Transaction[];
  categoryNameById: Map<string, string>;
  currency: string;
  localeTag: string;
  hideBalances: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  dividerColor: string;
  dashboardAccent: string;
  isDark: boolean;
  borderColor?: string;
  positiveColor?: string;
  negativeColor?: string;
  isFocused?: boolean;
  onEditTransaction: (item: Transaction) => void;
  onSeeAll?: () => void;
}

export const DashboardRecentTransactions: React.FC<DashboardRecentTransactionsProps> = ({
  transactions,
  categoryNameById,
  currency,
  localeTag,
  hideBalances,
  surfaceColor,
  textPrimary,
  textSecondary,
  dividerColor,
  dashboardAccent,
  isDark,
  borderColor = 'rgba(255, 255, 255, 0.08)',
  positiveColor = '#32D583',
  negativeColor = '#F97066',
  isFocused = true,
  onEditTransaction,
  onSeeAll,
}) => {
  const { t } = useTranslation();
  const maskedCurrency = getMaskedCurrency(currency, localeTag);

  const displayList = transactions.slice(0, 6);

  const renderTransactionItem = ({
    item,
    index,
  }: {
    item: Transaction;
    index: number;
  }) => {
    const prevItem = index > 0 ? displayList[index - 1] : null;

    let showDateHeader = false;
    if (index === 0) {
      showDateHeader = true;
    } else if (prevItem && item.date && prevItem.date) {
      const currentDate = new Date(item.date);
      const prevDate = new Date(prevItem.date);
      if (!isSameDay(currentDate, prevDate)) {
        showDateHeader = true;
      }
    }

    const isLast = index === displayList.length - 1;
    const isTransfer = item.type === 'transfer';
    const isIncome = item.type === 'income';

    const iconBg = isTransfer
      ? 'rgba(41, 151, 255, 0.10)'
      : isIncome
        ? 'rgba(50, 213, 131, 0.10)'
        : 'rgba(249, 112, 102, 0.10)';

    const iconColor = isTransfer
      ? dashboardAccent
      : isIncome
        ? positiveColor
        : negativeColor;

    const amountColor = isTransfer ? textPrimary : isIncome ? positiveColor : negativeColor;
    const sign = isTransfer ? '' : isIncome ? '+' : '-';

    const categoryIcon = isTransfer ? 'swap-horizontal' : getCategoryIcon(item.categoryId);
    const sanitizedNote = sanitizeTransactionLabel(item.note);
    const rawLabel =
      sanitizedNote ||
      categoryNameById.get(item.categoryId) ||
      t('dashboard.transactionFallback', { defaultValue: 'Transação' });
    const primaryLabel = uppercaseFirstLetter(rawLabel);
    const categoryLabel = categoryNameById.get(item.categoryId) || '';

    return (
      <View>
        {showDateHeader && (
          <Text
            style={[
              styles.timelineHeader,
              { color: textSecondary, marginTop: index === 0 ? 0 : 20 },
            ]}
          >
            {getRelativeDayLabel(item.date, localeTag, t)}
          </Text>
        )}

        <Pressable
          onPress={() => onEditTransaction(item)}
          style={[
            styles.transactionItem,
            { borderBottomWidth: isLast ? 0 : 1, borderBottomColor: dividerColor },
          ]}
        >
          <View style={[styles.categoryIconBg, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={categoryIcon} size={20} color={iconColor} />
          </View>

          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionLabel, { color: textPrimary }]} numberOfLines={1}>
              {primaryLabel}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.transactionCategory, { color: textSecondary }]} numberOfLines={1}>
                {categoryLabel}
              </Text>
              {item.paymentMethod ? (
                <>
                  <Text style={{ color: textSecondary, fontSize: 11 }}>•</Text>
                  <Text style={[styles.transactionPaymentMethod, { color: textSecondary }]}>
                    {item.paymentMethod === 'pix' ? 'Pix' : item.paymentMethod === 'credit' ? 'Crédito' : item.paymentMethod === 'debit' ? 'Débito' : 'Dinheiro'}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <Text style={[styles.transactionAmount, { color: amountColor }]}>
            {hideBalances
              ? maskedCurrency
              : `${sign} ${formatCurrency(item.amount, currency, localeTag, true)}`}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <CopilotStep
      active={isFocused}
      text={t('tour.dashboard.transactions', { defaultValue: 'Histórico' })}
      order={3}
      name="dashboard_transactions"
    >
      <WalkthroughableView>
        <View style={[styles.transactionsSection, { backgroundColor: surfaceColor, borderColor }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              {t('dashboard.latestMovements', { defaultValue: 'Últimas Movimentações' })}
            </Text>
            {transactions.length > 0 && (
              <Pressable onPress={onSeeAll} hitSlop={8}>
                <Text style={[styles.seeAllText, { color: dashboardAccent }]}>
                  {t('dashboard.seeAll', { defaultValue: 'Ver tudo' })}
                </Text>
              </Pressable>
            )}
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={36}
                color={textSecondary}
                style={{ opacity: 0.4, marginBottom: 8 }}
              />
              <Text style={{ color: textSecondary, textAlign: 'center', fontSize: 14 }}>
                {t('dashboard.noTransactionsYet', {
                  defaultValue: 'Nenhuma movimentação neste mês.',
                })}
              </Text>
            </View>
          ) : (
            <FlatList
              data={displayList}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.transactionsList}
            />
          )}
        </View>
      </WalkthroughableView>
    </CopilotStep>
  );
};

const styles = StyleSheet.create({
  transactionsSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  transactionsList: {},
  timelineHeader: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionCategory: {
    fontSize: 13,
    fontWeight: '400',
  },
  transactionPaymentMethod: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
});
