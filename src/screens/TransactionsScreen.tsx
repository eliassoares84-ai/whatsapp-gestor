import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditTransactionModal } from '../components/dashboard/EditTransactionModal';
import { FastEntryModal } from '../components/FastEntryModal';
import { MonthSelector } from '../components/MonthSelector';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';
import type { Transaction } from '../types/finance.types';
import { getLocalizedCategoryName } from '../utils/categoryLocalization';
import { formatCurrency, getMaskedCurrency } from '../utils/formatters';
import { uppercaseFirstLetter } from '../utils/textInputFormat';

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

export const TransactionsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const {
    currentWorkspaceId,
    transactions,
    selectedMonth,
    selectedYear,
    getFilteredTransactions,
    categories,
    currency,
    hideBalances,
    updateTransaction,
    deleteTransaction,
  } = useFinanceStore();

  const localeTag =
    i18n.language === 'pt-BR'
      ? 'pt-BR'
      : i18n.language.startsWith('es')
        ? 'es-ES'
        : 'en-US';

  const workspaceCategories = useMemo(() => {
    return categories
      .filter((category) => category.workspaceId === currentWorkspaceId)
      .sort((a, b) =>
        getLocalizedCategoryName(a.id, a.name, t).localeCompare(
          getLocalizedCategoryName(b.id, b.name, t),
          localeTag,
          { sensitivity: 'base' }
        )
      );
  }, [categories, currentWorkspaceId, t, localeTag]);

  const categoryNameById = useMemo(() => {
    return new Map(
      workspaceCategories.map((category) => [
        category.id,
        getLocalizedCategoryName(category.id, category.name, t),
      ])
    );
  }, [workspaceCategories, t]);

  const monthTransactions = useMemo(() => {
    return getFilteredTransactions()
      .filter((t) => t.workspaceId === currentWorkspaceId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [getFilteredTransactions, transactions, currentWorkspaceId, selectedMonth, selectedYear]);

  const { totalIncome, totalExpenses, monthBalance } = useMemo(() => {
    const inc = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const exp = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome: inc,
      totalExpenses: exp,
      monthBalance: inc - exp,
    };
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const note = (tx.note || '').toLowerCase();
        const categoryName = (categoryNameById.get(tx.categoryId) || '').toLowerCase();
        return note.includes(query) || categoryName.includes(query);
      }
      return true;
    });
  }, [monthTransactions, filterType, searchQuery, categoryNameById]);

  const maskedCurrency = getMaskedCurrency(currency, localeTag);

  const handleOpenEdit = (item: Transaction) => {
    setEditingTransaction(item);
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = (
    transactionId: string,
    updates: {
      amount: number;
      note?: string;
      categoryId: string;
      paymentMethod?: 'cash' | 'debit' | 'credit' | 'pix';
    }
  ) => {
    updateTransaction(transactionId, updates);
    setIsEditModalVisible(false);
    setEditingTransaction(null);
  };

  const handleDeleteSingle = (transactionId: string) => {
    deleteTransaction(transactionId);
    setIsEditModalVisible(false);
    setEditingTransaction(null);
  };

  const handleDeleteAllInstallments = (transactionId: string) => {
    deleteTransaction(transactionId, { deleteAllInstallments: true });
    setIsEditModalVisible(false);
    setEditingTransaction(null);
  };

  const bottomSpacing = Math.max(76, tabBarHeight + 16) + insets.bottom;

  const renderTransactionItem = ({
    item,
    index,
  }: {
    item: Transaction;
    index: number;
  }) => {
    const prevItem = index > 0 ? filteredTransactions[index - 1] : null;

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

    const isLast = index === filteredTransactions.length - 1;
    const isTransfer = item.type === 'transfer';
    const isIncome = item.type === 'income';

    const iconBg = isTransfer
      ? tokens.primaryTonal
      : isIncome
        ? tokens.positiveTonal
        : tokens.negativeTonal;

    const iconColor = isTransfer
      ? tokens.primary
      : isIncome
        ? tokens.positive
        : tokens.negative;

    const amountColor = isTransfer ? tokens.textPrimary : isIncome ? tokens.positive : tokens.negative;
    const sign = isTransfer ? '' : isIncome ? '+' : '-';

    const categoryIcon = isTransfer ? 'swap-horizontal' : getCategoryIcon(item.categoryId);
    const sanitizedNote = sanitizeTransactionLabel(item.note);
    const rawLabel =
      sanitizedNote ||
      categoryNameById.get(item.categoryId) ||
      t('dashboard.transactionFallback', { defaultValue: 'Transação' });
    const primaryLabel = uppercaseFirstLetter(rawLabel);
    const categoryLabel = categoryNameById.get(item.categoryId) || '';

    const paymentMethodLabel =
      item.paymentMethod === 'credit'
        ? item.installmentTotal && item.installmentTotal > 1
          ? `Crédito ${item.installmentNumber || 1}/${item.installmentTotal}`
          : 'Crédito'
        : item.paymentMethod === 'pix'
          ? 'Pix'
          : item.paymentMethod === 'debit'
            ? 'Débito'
            : item.paymentMethod === 'cash'
              ? 'Dinheiro'
              : undefined;

    return (
      <View>
        {showDateHeader && (
          <Text
            style={[
              styles.timelineHeader,
              { color: tokens.textSecondary, marginTop: index === 0 ? 8 : 24 },
            ]}
          >
            {getRelativeDayLabel(item.date, localeTag, t)}
          </Text>
        )}

        <Pressable
          onPress={() => handleOpenEdit(item)}
          style={[
            styles.transactionItem,
            {
              backgroundColor: tokens.card,
              borderColor: tokens.border,
            },
          ]}
        >
          <View style={[styles.categoryIconBg, { backgroundColor: iconBg, borderColor: tokens.border }]}>
            <MaterialCommunityIcons name={categoryIcon} size={20} color={iconColor} />
          </View>

          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionLabel, { color: tokens.textPrimary }]} numberOfLines={1}>
              {primaryLabel}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.transactionCategory, { color: tokens.textSecondary }]} numberOfLines={1}>
                {categoryLabel}
              </Text>
              {paymentMethodLabel ? (
                <>
                  <Text style={{ color: tokens.textTertiary, fontSize: 11 }}>•</Text>
                  <View style={[styles.paymentBadge, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}>
                    <Text style={[styles.paymentBadgeText, { color: tokens.textSecondary }]}>
                      {paymentMethodLabel}
                    </Text>
                  </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]} edges={['top']}>
      {/* Screen Title */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: tokens.textPrimary }]}>
          {t('nav.transactions', { defaultValue: 'Extrato' })}
        </Text>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelectorWrap}>
        <MonthSelector accentColor={tokens.primary} />
      </View>

      {/* Single Unified Summary Card (Receitas, Despesas, Resultado) */}
      <View style={styles.summaryWrap}>
        <View style={[styles.unifiedSummaryCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <View style={styles.summaryColumn}>
            <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>
              {t('dashboard.monthIncome', { defaultValue: 'Receitas' })}
            </Text>
            <Text style={[styles.summaryValue, { color: tokens.positive }]}>
              {hideBalances ? maskedCurrency : `+${formatCurrency(totalIncome, currency, localeTag, true)}`}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: tokens.border }]} />

          <View style={styles.summaryColumn}>
            <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>
              {t('dashboard.monthExpenses', { defaultValue: 'Despesas' })}
            </Text>
            <Text style={[styles.summaryValue, { color: tokens.negative }]}>
              {hideBalances ? maskedCurrency : `-${formatCurrency(totalExpenses, currency, localeTag, true)}`}
            </Text>
          </View>

          <View style={[styles.summaryDivider, { backgroundColor: tokens.border }]} />

          <View style={styles.summaryColumn}>
            <Text style={[styles.summaryLabel, { color: tokens.textSecondary }]}>
              {t('dashboard.net', { defaultValue: 'Resultado' })}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: monthBalance >= 0 ? tokens.positive : tokens.negative },
              ]}
            >
              {hideBalances ? maskedCurrency : `${monthBalance >= 0 ? '+' : ''}${formatCurrency(monthBalance, currency, localeTag, true)}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar & Filter Chips */}
      <View style={styles.filterSection}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: tokens.card, borderColor: tokens.border },
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={18} color={tokens.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: tokens.textPrimary }]}
            placeholder={t('common.search', { defaultValue: 'Buscar movimentação...' })}
            placeholderTextColor={tokens.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={16} color={tokens.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Chips com fundo tonalizado quando selecionado */}
        <View style={styles.filterChipsRow}>
          {[
            { id: 'all', label: t('common.all', { defaultValue: 'Todas' }) },
            { id: 'expense', label: t('dashboard.monthExpenses', { defaultValue: 'Despesas' }) },
            { id: 'income', label: t('dashboard.monthIncome', { defaultValue: 'Receitas' }) },
          ].map((chip) => {
            const active = filterType === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setFilterType(chip.id as any)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? tokens.primaryTonal : tokens.card,
                    borderColor: active ? tokens.primary : tokens.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: active ? tokens.primary : tokens.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: bottomSpacing + 76 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={40}
              color={tokens.textTertiary}
              style={{ opacity: 0.5, marginBottom: 12 }}
            />
            <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
              {searchQuery
                ? t('transactions.noResults', { defaultValue: 'Nenhuma movimentação encontrada na busca.' })
                : t('transactions.noTransactions', { defaultValue: 'Nenhuma movimentação neste mês.' })}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: tokens.primary,
            bottom: bottomSpacing + 12,
          },
        ]}
        onPress={() => setIsAddModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </Pressable>

      <FastEntryModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
      />

      <EditTransactionModal
        visible={isEditModalVisible}
        transaction={editingTransaction}
        categories={workspaceCategories}
        theme={theme}
        cardBg={tokens.card}
        textPrimary={tokens.textPrimary}
        textSecondary={tokens.textSecondary}
        dividerColor={tokens.border}
        dashboardAccent={tokens.primary}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveEdit}
        onDeleteSingle={handleDeleteSingle}
        onDeleteAllInstallments={handleDeleteAllInstallments}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  monthSelectorWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  summaryWrap: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  unifiedSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  paymentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 240,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 99,
  },
});
