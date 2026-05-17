import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinanceStore } from '../store/useFinanceStore';
import { exportToCSV, exportToPDF } from '../utils/exportService';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';
const INCOME_COLOR = '#d2ff61';
const EXPENSE_COLOR = '#FF453A';

interface ExpenseGroup {
  categoryId: string;
  label: string;
  amount: number;
  percentage: number;
  budgetLimit?: number;
}

const formatCurrency = (value: number): string => {
  return `R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;
};

export const ReportsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentWorkspaceId, workspaces, transactions, categories } = useFinanceStore();

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const workspaceTransactions = useMemo(
    () => transactions.filter((tx) => tx.workspaceId === currentWorkspaceId),
    [transactions, currentWorkspaceId]
  );

  const transferNet = useMemo(() => {
    return workspaceTransactions
      .filter((tx) => tx.type === 'transfer')
      .reduce((sum, tx) => {
        const isIncomingTransfer = tx.note?.startsWith('Origem:');
        return sum + (isIncomingTransfer ? tx.amount : -tx.amount);
      }, 0);
  }, [workspaceTransactions]);

  const { incomeTotal, expenseTotal, netProfit } = useMemo(() => {
    const income = workspaceTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = workspaceTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      incomeTotal: income,
      expenseTotal: expense,
      netProfit: income - expense,
    };
  }, [workspaceTransactions]);

  const expenseDistribution = useMemo<ExpenseGroup[]>(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const expenseTransactions = workspaceTransactions.filter((tx) => {
      if (tx.type !== 'expense' || tx.categoryId.includes('internal-transfer')) {
        return false;
      }

      const txDate = new Date(tx.date);
      return (
        txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
      );
    });

    const grouped = expenseTransactions.reduce<Record<string, number>>(
      (acc, tx) => {
        const key = tx.categoryId || tx.note || 'Outros';
        acc[key] = (acc[key] || 0) + tx.amount;
        return acc;
      },
      {}
    );

    const totalExpense = Object.values(grouped).reduce(
      (sum, amount) => sum + amount,
      0
    );

    return Object.entries(grouped)
      .map(([categoryId, amount]) => {
        const category = categories.find((item) => item.id === categoryId);

        return {
          categoryId,
          label: category?.name || categoryId,
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
          budgetLimit: category?.budgetLimit,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [workspaceTransactions, categories]);

  const distributionSignature = useMemo(
    () =>
      expenseDistribution
        .map((group) => `${group.categoryId}:${group.amount}:${group.budgetLimit ?? 'na'}`)
        .join('|'),
    [expenseDistribution]
  );

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [distributionSignature]);

  const cardTitle =
    currentWorkspace?.type === 'personal' ? 'Balanço Mensal' : 'Resultado do Mês';

  const hasEnoughData = workspaceTransactions.length > 0;

  const handleExportMenu = () => {
    Alert.alert('Exportar Relatório', 'Escolha o formato de exportação:', [
      {
        text: 'Exportar como PDF',
        onPress: () => {
          void exportToPDF(currentWorkspaceId);
        },
      },
      {
        text: 'Exportar como CSV',
        onPress: () => {
          void exportToCSV(currentWorkspaceId);
        },
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]);
  };

  if (!hasEnoughData) {
    return (
      <View style={[styles.container, { backgroundColor: APP_BG, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.headerTitle, { color: TEXT_PRIMARY }]}>
              Relatórios: {currentWorkspace?.name || 'Workspace'}
            </Text>
            <Pressable style={styles.exportButton} onPress={handleExportMenu}>
              <MaterialCommunityIcons name="export-variant" size={18} color={TEXT_PRIMARY} />
              <Text style={[styles.exportButtonText, { color: TEXT_PRIMARY }]}>Exportar Relatório</Text>
            </Pressable>
          </View>
          <Text style={[styles.headerSubtitle, { color: TEXT_SECONDARY }]}>
            Sem dados suficientes para análise.
          </Text>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons
              name="chart-bar-stacked"
              size={58}
              color={currentWorkspace?.themeColor || '#0A84FF'}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: TEXT_PRIMARY }]}>
            Precisamos de mais dados
          </Text>
          <Text style={[styles.emptySubtitle, { color: TEXT_SECONDARY }]}>
            Continue registrando suas movimentações para desbloquear a
            inteligência financeira.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: APP_BG, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.headerTitle, { color: TEXT_PRIMARY }]}>
              Relatórios: {currentWorkspace?.name || 'Workspace'}
            </Text>
            <Pressable style={styles.exportButton} onPress={handleExportMenu}>
              <MaterialCommunityIcons name="export-variant" size={18} color={TEXT_PRIMARY} />
              <Text style={[styles.exportButtonText, { color: TEXT_PRIMARY }]}>Exportar Relatório</Text>
            </Pressable>
          </View>
          <Text style={[styles.headerSubtitle, { color: TEXT_SECONDARY }]}>
            Visão consolidada do ambiente selecionado.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: CARD_BG }]}> 
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="file-chart-outline"
              size={22}
              color={currentWorkspace?.themeColor || '#0A84FF'}
            />
            <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>{cardTitle}</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: TEXT_SECONDARY }]}>Receita Bruta</Text>
            <Text style={[styles.metricValue, { color: INCOME_COLOR }]}>
              {formatCurrency(incomeTotal)}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: TEXT_SECONDARY }]}>Custos/Despesas</Text>
            <Text style={[styles.metricValue, { color: EXPENSE_COLOR }]}>
              - {formatCurrency(expenseTotal)}
            </Text>
          </View>

          <View style={[styles.metricRow, styles.netRow]}>
            <Text style={[styles.netLabel, { color: TEXT_PRIMARY }]}>Lucro Líquido</Text>
            <Text
              style={[
                styles.netValue,
                { color: netProfit >= 0 ? INCOME_COLOR : EXPENSE_COLOR },
              ]}
            >
              {netProfit >= 0 ? '+' : '-'} {formatCurrency(netProfit)}
            </Text>
          </View>

          <View style={[styles.metricRow, styles.internalMovementRow]}>
            <Text style={[styles.metricLabel, { color: TEXT_SECONDARY }]}>
              Saque de Lucros/Aportes
            </Text>
            <Text style={[styles.metricValue, { color: TEXT_SECONDARY }]}>
              {transferNet >= 0 ? '+' : '-'} {formatCurrency(transferNet)}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: CARD_BG }]}> 
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={22}
              color={currentWorkspace?.themeColor || '#0A84FF'}
            />
            <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>
              Onde seu dinheiro está indo
            </Text>
          </View>

          {expenseDistribution.length === 0 ? (
            <Text style={[styles.noExpensesText, { color: TEXT_SECONDARY }]}>
              Ainda não há despesas para montar a distribuição por categoria.
            </Text>
          ) : (
            expenseDistribution.map((group) => {
              const widthPercentage = Math.max(group.percentage, 3);
              const budgetLimit = group.budgetLimit;
              const budgetRatio =
                typeof budgetLimit === 'number' && budgetLimit > 0
                  ? group.amount / budgetLimit
                  : 0;

              const budgetColor =
                budgetRatio >= 1
                  ? '#FF453A'
                  : budgetRatio >= 0.8
                    ? '#FFD60A'
                    : currentWorkspace?.themeColor || '#0A84FF';
              const budgetWidthPercentage = Math.min(budgetRatio * 100, 100);

              return (
                <View key={group.label} style={styles.barBlock}>
                  <View style={styles.barHeader}>
                    <Text style={[styles.barLabel, { color: TEXT_PRIMARY }]} numberOfLines={1}>
                      {group.label}
                    </Text>
                    <Text style={[styles.barMeta, { color: TEXT_SECONDARY }]}>
                      {group.percentage.toFixed(1)}% · {formatCurrency(group.amount)}
                    </Text>
                  </View>

                  <View style={styles.track}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${widthPercentage}%`,
                          backgroundColor: currentWorkspace?.themeColor || '#0A84FF',
                        },
                      ]}
                    />
                  </View>

                  {typeof budgetLimit === 'number' ? (
                    <View style={styles.budgetProgressBlock}>
                      <View style={styles.budgetTrack}>
                        <View
                          style={[
                            styles.budgetBar,
                            {
                              width: `${budgetWidthPercentage}%`,
                              backgroundColor: budgetColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.budgetHelperText, { color: TEXT_SECONDARY }]}>
                        {`${formatCurrency(group.amount)} de ${formatCurrency(budgetLimit)}`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  header: {
    marginBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  exportButton: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121212',
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
    paddingTop: 14,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  netValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  internalMovementRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 4,
    paddingTop: 12,
  },
  noExpensesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  barBlock: {
    marginBottom: 14,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  barMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 999,
  },
  budgetProgressBlock: {
    marginTop: 8,
  },
  budgetTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 4,
  },
  budgetBar: {
    height: '100%',
    borderRadius: 999,
  },
  budgetHelperText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIconContainer: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
});
