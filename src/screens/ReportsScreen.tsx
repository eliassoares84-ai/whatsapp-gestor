import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens, sharedTokens } from '../styles/themes';
import { getLocalizedCategoryName } from '../utils/categoryLocalization';
import { formatCurrency, getMaskedCurrency } from '../utils/formatters';
import { getLocalizedWorkspaceName } from '../utils/workspaceLocalization';
import { exportToCSV, exportToPDF } from '../utils/exportService';
import { CopilotStep, useCopilot, walkthroughable } from '../utils/copilotSafe';

import { CategoryBudgetModal } from '../components/CategoryBudgetModal';
import { ExportReportModal } from '../components/ExportReportModal';
import { MonthSelector } from '../components/MonthSelector';

const WalkthroughableView = walkthroughable(View);

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const getCategoryIcon = (categoryId?: string): IconName => {
  if (!categoryId) return 'tag-outline';
  const id = categoryId.toLowerCase();
  if (id.includes('alimentacao') || id.includes('mercado') || id.includes('restaurante')) return 'silverware-fork-knife';
  if (id.includes('transporte') || id.includes('combustivel') || id.includes('uber')) return 'car-outline';
  if (id.includes('moradia') || id.includes('aluguel') || id.includes('casa')) return 'home-outline';
  if (id.includes('saude') || id.includes('farmacia')) return 'medical-bag';
  if (id.includes('lazer') || id.includes('viagem')) return 'gamepad-variant-outline';
  if (id.includes('educacao')) return 'school-outline';
  if (id.includes('salario') || id.includes('renda')) return 'wallet-outline';
  if (id.includes('transfer')) return 'swap-horizontal';
  return 'tag-outline';
};

const CATEGORY_PALETTE = [
  '#2997FF', // Blue
  '#5E5CE6', // Indigo
  '#00C7BE', // Teal
  '#FF9F0A', // Orange
  '#32D583', // Positive Green
  '#BF5AF2', // Purple
  '#64D2FF', // Sky Blue
  '#F97066', // Coral Red
  '#FFD60A', // Yellow
];

interface ExpenseGroup {
  categoryId: string;
  label: string;
  amount: number;
  percentage: number;
  budgetLimit?: number;
}

const addMonths = (date: Date, count: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
};

const toMonthLabel = (value: Date, localeTag: string): string => {
  const monthLabel = new Intl.DateTimeFormat(localeTag, { month: 'long' }).format(value);
  const yearLabel = new Intl.DateTimeFormat(localeTag, { year: 'numeric' }).format(value);
  return `${monthLabel} ${yearLabel}`;
};

export const ReportsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [exportModalVisible, setExportModalVisible] = React.useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedExpenseGroup, setSelectedExpenseGroup] = useState<ExpenseGroup | null>(null);
  const [budgetModalCategory, setBudgetModalCategory] = useState<{
    id: string;
    name: string;
    icon?: string;
    color?: string;
    budgetLimit?: number;
    amount: number;
  } | null>(null);
  const [expenseDetailMonthCursor, setExpenseDetailMonthCursor] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);
  const isFocused = useIsFocused();
  const { start, copilotEvents, currentStepNumber } = useCopilot();
  const tourStartInFlightRef = useRef(false);

  const {
    currentWorkspaceId,
    workspaces,
    currency,
    selectedMonth,
    selectedYear,
    getFilteredTransactions,
    transactions,
    categories,
    hasSeenReportsTour,
    markReportsTourSeen,
    hideBalances,
    togglePrivacyMode,
  } = useFinanceStore();

  const localeTag = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language.startsWith('es') ? 'es-ES' : 'en-US';
  const maskedCurrency = getMaskedCurrency(currency, localeTag);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isFocused || !start || hasSeenReportsTour) {
        return;
      }

      const timeoutId = setTimeout(() => {
        if (tourStartInFlightRef.current) {
          return;
        }

        tourStartInFlightRef.current = true;
        void start('reports_dre').finally(() => {
          tourStartInFlightRef.current = false;
        });
      }, 700);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [hasSeenReportsTour, isFocused, start])
  );

  useEffect(() => {
    const onStop = () => {
      if (!isFocused) {
        return;
      }

      if (currentStepNumber > 0 && !useFinanceStore.getState().hasSeenReportsTour) {
        markReportsTourSeen();
      }
    };

    copilotEvents.on('stop', onStop);
    return () => {
      copilotEvents.off('stop', onStop);
    };
  }, [copilotEvents, currentStepNumber, isFocused, markReportsTourSeen]);

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const workspaceTransactions = useMemo(
    () =>
      getFilteredTransactions().filter(
        (tx) => tx.workspaceId === currentWorkspaceId && !tx.excludeFromCharts
      ),
    [getFilteredTransactions, currentWorkspaceId, selectedMonth, selectedYear]
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
    const expenseTransactions = workspaceTransactions.filter((tx) => {
      if (tx.type !== 'expense' || tx.categoryId.includes('internal-transfer')) {
        return false;
      }
      return true;
    });

    const grouped = expenseTransactions.reduce<Record<string, number>>(
      (acc, tx) => {
        const key = tx.categoryId || tx.note || 'outros';
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
          label: category
            ? getLocalizedCategoryName(category.id, category.name, t)
            : categoryId === 'outros'
              ? t('categoryLabels.outros')
              : categoryId,
          amount,
          percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
          budgetLimit: category?.budgetLimit,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [workspaceTransactions, categories, t]);

  const distributionSignature = useMemo(
    () =>
      expenseDistribution
        .map((group) => `${group.categoryId}:${group.amount}:${group.budgetLimit ?? 'na'}`)
        .join('|'),
    [expenseDistribution]
  );

  const selectedReportMonthDate = useMemo(
    () => new Date(selectedYear, selectedMonth, 1),
    [selectedMonth, selectedYear]
  );

  const expenseDetailMonthLabel = useMemo(
    () => toMonthLabel(expenseDetailMonthCursor, localeTag),
    [expenseDetailMonthCursor, localeTag]
  );

  const expenseDetailTransactions = useMemo(() => {
    if (!selectedExpenseGroup) {
      return [];
    }

    return transactions
      .filter((tx) => {
        if (
          tx.workspaceId !== currentWorkspaceId ||
          tx.type !== 'expense' ||
          tx.excludeFromCharts ||
          tx.categoryId !== selectedExpenseGroup.categoryId
        ) {
          return false;
        }

        const txDate = new Date(tx.date);
        if (Number.isNaN(txDate.getTime())) {
          return false;
        }

        return (
          txDate.getMonth() === expenseDetailMonthCursor.getMonth() &&
          txDate.getFullYear() === expenseDetailMonthCursor.getFullYear()
        );
      })
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentWorkspaceId, selectedExpenseGroup, expenseDetailMonthCursor]);

  const expenseDetailTotal = useMemo(
    () => expenseDetailTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [expenseDetailTransactions]
  );

  const canAdvanceExpenseDetailMonth = useMemo(
    () => expenseDetailMonthCursor < selectedReportMonthDate,
    [expenseDetailMonthCursor, selectedReportMonthDate]
  );

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [distributionSignature]);

  const cardTitle =
    currentWorkspace?.type === 'personal'
      ? t('reports.cardTitlePersonal', { defaultValue: 'Balanço Mensal' })
      : t('reports.cardTitleBusiness', { defaultValue: 'DRE Mensal' });
  const workspaceDisplayName = currentWorkspace
    ? getLocalizedWorkspaceName(currentWorkspace, t)
    : t('reports.workspaceFallback');

  const hasEnoughData = workspaceTransactions.length > 0;
  const isCompactHeader = width <= 390;
  const exportLabel = isCompactHeader ? t('reports.export', { defaultValue: 'Exportar' }) : t('reports.exportReport', { defaultValue: 'Exportar Relatório' });

  const handleExportMenu = () => {
    setExportModalVisible(true);
  };

  const handleExportPDF = () => {
    setExportModalVisible(false);
    setIsExporting(true);
    setTimeout(async () => {
      try {
        const success = await exportToPDF(currentWorkspaceId, selectedMonth, selectedYear);
        if (!success) {
          Alert.alert(
            t('common.error', 'Atenção'),
            t('reports.exportError', 'Não foi possível gerar o PDF. Verifique se há transações cadastradas no período.')
          );
        }
      } catch {
        Alert.alert(t('common.error', 'Atenção'), 'Erro inesperado ao gerar PDF.');
      } finally {
        setIsExporting(false);
      }
    }, 350);
  };

  const handleExportCSV = () => {
    setExportModalVisible(false);
    setIsExporting(true);
    setTimeout(async () => {
      try {
        const success = await exportToCSV(currentWorkspaceId, selectedMonth, selectedYear);
        if (!success) {
          Alert.alert(
            t('common.error', 'Atenção'),
            t('reports.exportError', 'Não foi possível gerar o arquivo CSV.')
          );
        }
      } catch {
        Alert.alert(t('common.error', 'Atenção'), 'Erro inesperado ao gerar CSV.');
      } finally {
        setIsExporting(false);
      }
    }, 350);
  };

  const handleOpenBudgetModal = (group: ExpenseGroup) => {
    const category = categories.find((item) => item.id === group.categoryId);
    setBudgetModalCategory({
      id: group.categoryId,
      name: group.label,
      icon: category?.icon,
      color: category?.color || currentWorkspace?.themeColor,
      budgetLimit: group.budgetLimit,
      amount: group.amount,
    });
  };

  const handleOpenExpenseDetail = (group: ExpenseGroup) => {
    setSelectedExpenseGroup(group);
    setExpenseDetailMonthCursor(new Date(selectedYear, selectedMonth, 1));
  };

  const handleCloseExpenseDetail = () => {
    setSelectedExpenseGroup(null);
  };

  if (!hasEnoughData) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: tokens.background,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom,
            paddingHorizontal: sharedTokens.layout.screenMargin,
          },
        ]}
      >
        <View style={styles.header}>
          <MonthSelector accentColor={tokens.primary} />
          <View style={[styles.headerTopRow, isCompactHeader && styles.headerTopRowCompact]}>
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              {t('reports.headerTitle', { workspace: workspaceDisplayName })}
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={togglePrivacyMode}
                style={[styles.privacyButton, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={hideBalances ? 'eye-off' : 'eye'}
                  size={20}
                  color={hideBalances ? tokens.textTertiary : tokens.primary}
                />
              </Pressable>
              <Pressable
                style={[
                  styles.exportButton,
                  isCompactHeader && styles.exportButtonCompact,
                  { borderColor: tokens.border, backgroundColor: tokens.surfaceInteractive },
                ]}
                onPress={handleExportMenu}
              >
                <MaterialCommunityIcons name="export-variant" size={16} color={tokens.textSecondary} />
                <Text style={[styles.exportButtonText, { color: tokens.textSecondary }]}>{exportLabel}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: tokens.textSecondary }]}>{t('reports.noDataSubtitle')}</Text>
        </View>

        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}>
            <MaterialCommunityIcons
              name="chart-bar-stacked"
              size={48}
              color={tokens.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>{t('reports.emptyTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: tokens.textSecondary }]}>{t('reports.emptySubtitle')}</Text>
        </View>

        <ExportReportModal
          visible={exportModalVisible}
          onClose={() => setExportModalVisible(false)}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          workspaceColor={tokens.primary}
        />
        <Modal visible={isExporting} transparent animationType="fade">
          <View style={[styles.exportLoadingOverlay, { backgroundColor: tokens.overlay }]}>
            <View style={[styles.exportLoadingCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
              <ActivityIndicator size="large" color={tokens.primary} />
              <Text style={[styles.exportLoadingText, { color: tokens.textPrimary }]}>Gerando relatório...</Text>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.background,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: sharedTokens.layout.screenMargin,
            paddingBottom: insets.bottom + 118,
          },
        ]}
      >
        <View style={styles.header}>
          <MonthSelector accentColor={tokens.primary} />
          <View style={[styles.headerTopRow, isCompactHeader && styles.headerTopRowCompact]}>
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              {t('reports.headerTitle', { workspace: workspaceDisplayName })}
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={togglePrivacyMode}
                style={[styles.privacyButton, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name={hideBalances ? 'eye-off' : 'eye'}
                  size={20}
                  color={hideBalances ? tokens.textTertiary : tokens.primary}
                />
              </Pressable>
              <Pressable
                style={[
                  styles.exportButton,
                  isCompactHeader && styles.exportButtonCompact,
                  { borderColor: tokens.border, backgroundColor: tokens.surfaceInteractive },
                ]}
                onPress={handleExportMenu}
              >
                <MaterialCommunityIcons name="export-variant" size={16} color={tokens.textSecondary} />
                <Text style={[styles.exportButtonText, { color: tokens.textSecondary }]}>{exportLabel}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: tokens.textSecondary }]}>{t('reports.subtitle')}</Text>
        </View>

        {/* Hero Card: Balanço Mensal / DRE */}
        <CopilotStep
          active={isFocused}
          text={t('tour.reports.dre')}
          order={1}
          name="reports_dre"
        >
          <WalkthroughableView>
            <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}> 
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: tokens.primaryTonal }]}>
                  <MaterialCommunityIcons
                    name="file-chart-outline"
                    size={20}
                    color={tokens.primary}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>{cardTitle}</Text>
              </View>

              {/* Destaque do Lucro Líquido / Balanço */}
              <View style={styles.heroNetContainer}>
                <Text style={[styles.heroNetLabel, { color: tokens.textTertiary }]}>
                  {t('reports.netProfit', { defaultValue: 'RESULTADO LÍQUIDO' })}
                </Text>
                <Text
                  style={[
                    styles.heroNetValue,
                    { color: netProfit >= 0 ? tokens.positive : tokens.negative },
                  ]}
                >
                  {netProfit >= 0 ? '+' : '-'} {hideBalances ? maskedCurrency : formatCurrency(Math.abs(netProfit), currency, localeTag, true)}
                </Text>

                <View
                  style={[
                    styles.heroBadge,
                    {
                      backgroundColor: netProfit >= 0 ? tokens.positiveTonal : tokens.negativeTonal,
                      borderColor: netProfit >= 0 ? tokens.positiveTonalBorder : tokens.negativeTonalBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={netProfit >= 0 ? 'arrow-top-right' : 'arrow-bottom-right'}
                    size={14}
                    color={netProfit >= 0 ? tokens.positive : tokens.negative}
                  />
                  <Text
                    style={[
                      styles.heroBadgeText,
                      { color: netProfit >= 0 ? tokens.positive : tokens.negative },
                    ]}
                  >
                    {netProfit >= 0 ? 'Superávit no período' : 'Déficit no período'}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardDivider, { backgroundColor: tokens.divider }]} />

              {/* Colunas Receita Bruta & Custos/Despesas */}
              <View style={styles.summaryColumnsRow}>
                <View style={styles.summaryCol}>
                  <View style={styles.metricLabelRow}>
                    <View style={[styles.metricDot, { backgroundColor: tokens.positive }]} />
                    <Text style={[styles.metricColLabel, { color: tokens.textSecondary }]}>
                      {t('reports.grossRevenue', { defaultValue: 'Receitas' })}
                    </Text>
                  </View>
                  <Text style={[styles.metricColValue, { color: tokens.textPrimary }]}>
                    {hideBalances ? maskedCurrency : formatCurrency(incomeTotal, currency, localeTag, true)}
                  </Text>
                </View>

                <View style={[styles.summaryVerticalDivider, { backgroundColor: tokens.divider }]} />

                <View style={styles.summaryCol}>
                  <View style={styles.metricLabelRow}>
                    <View style={[styles.metricDot, { backgroundColor: tokens.negative }]} />
                    <Text style={[styles.metricColLabel, { color: tokens.textSecondary }]}>
                      {t('reports.costsExpenses', { defaultValue: 'Despesas' })}
                    </Text>
                  </View>
                  <Text style={[styles.metricColValue, { color: tokens.textPrimary }]}>
                    - {hideBalances ? maskedCurrency : formatCurrency(expenseTotal, currency, localeTag, true)}
                  </Text>
                </View>
              </View>

              {/* Retiradas / Transferências Internas */}
              {transferNet !== 0 && (
                <View style={[styles.internalRow, { borderTopColor: tokens.divider }]}>
                  <Text style={[styles.internalLabel, { color: tokens.textTertiary }]}>
                    {t('reports.profitWithdrawal', { defaultValue: 'Retiradas de Pró-labore / Transf.' })}
                  </Text>
                  <Text style={[styles.internalValue, { color: tokens.textSecondary }]}>
                    {transferNet >= 0 ? '+' : '-'} {hideBalances ? maskedCurrency : formatCurrency(Math.abs(transferNet), currency, localeTag, true)}
                  </Text>
                </View>
              )}
            </View>
          </WalkthroughableView>
        </CopilotStep>

        {/* Card de Distribuição por Categorias */}
        <CopilotStep
          active={isFocused}
          text={t('tour.reports.charts')}
          order={2}
          name="reports_charts"
        >
          <WalkthroughableView>
            <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}> 
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: tokens.primaryTonal }]}>
                  <MaterialCommunityIcons
                    name="chart-donut"
                    size={20}
                    color={tokens.primary}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>{t('reports.whereMoneyGoes')}</Text>
              </View>

              {expenseDistribution.length === 0 ? (
                <View style={styles.emptyChartState}>
                  <Text style={[styles.noExpensesText, { color: tokens.textSecondary }]}>{t('reports.noExpensesDistribution')}</Text>
                </View>
              ) : (
                <View style={styles.chartContainer}>
                  {expenseDistribution.map((group, index) => {
                    const widthPercentage = Math.max(group.percentage, 2);
                    const budgetLimit = group.budgetLimit;
                    const budgetRatio =
                      typeof budgetLimit === 'number' && budgetLimit > 0
                        ? group.amount / budgetLimit
                        : 0;

                    const budgetColor =
                      budgetRatio >= 1
                        ? tokens.negative
                        : budgetRatio >= 0.8
                          ? tokens.warning
                          : tokens.primary;
                    const budgetWidthPercentage = Math.min(budgetRatio * 100, 100);

                    const category = categories.find((item) => item.id === group.categoryId);
                    const categoryColor = category?.color || CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
                    const categoryIcon = getCategoryIcon(group.categoryId);

                    return (
                      <Pressable
                        key={group.label}
                        style={styles.barBlock}
                        onPress={() => handleOpenExpenseDetail(group)}
                      >
                        <View style={styles.barHeader}>
                          <View style={styles.barLabelContainer}>
                            <View style={[styles.categoryIconCircle, { backgroundColor: `${categoryColor}18` }]}>
                              <MaterialCommunityIcons name={categoryIcon} size={15} color={categoryColor} />
                            </View>
                            <Text style={[styles.barLabel, { color: tokens.textPrimary }]} numberOfLines={1}>
                              {group.label}
                            </Text>

                            {typeof budgetLimit === 'number' && (
                              <Pressable
                                hitSlop={8}
                                style={[styles.budgetIndicatorPill, { backgroundColor: `${budgetColor}15` }]}
                                onPress={(e) => {
                                  (e as any).stopPropagation?.();
                                  handleOpenBudgetModal(group);
                                }}
                              >
                                <MaterialCommunityIcons
                                  name="bullseye-arrow"
                                  size={12}
                                  color={budgetColor}
                                />
                              </Pressable>
                            )}
                          </View>

                          <View style={styles.barMetaRight}>
                            <View style={[styles.percentageBadge, { backgroundColor: tokens.surfaceInteractive }]}>
                              <Text style={[styles.percentageText, { color: tokens.textSecondary }]}>
                                {group.percentage.toFixed(1)}%
                              </Text>
                            </View>
                            <Text style={[styles.barMeta, { color: tokens.textPrimary }]}>
                              {hideBalances ? maskedCurrency : formatCurrency(group.amount, currency, localeTag, true)}
                            </Text>
                          </View>
                        </View>

                        {/* Barra Fina e Elegante de Categoria */}
                        <View style={[styles.thinTrack, { backgroundColor: tokens.surfaceInteractive }]}>
                          <View
                            style={[
                              styles.thinBar,
                              {
                                width: `${widthPercentage}%`,
                                backgroundColor: categoryColor,
                              },
                            ]}
                          />
                        </View>

                        {/* Bloco de Orçamento se configurado */}
                        {typeof budgetLimit === 'number' ? (
                          <View style={[styles.budgetProgressBlock, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}>
                            <View style={[styles.budgetTrack, { backgroundColor: tokens.surfaceSubtle }]}>
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
                            <View style={styles.budgetHelperRow}>
                              <Text style={[styles.budgetHelperText, { color: budgetRatio >= 1 ? tokens.negative : tokens.textSecondary }]}>
                                {hideBalances
                                  ? `${maskedCurrency} de ${maskedCurrency}`
                                  : `${formatCurrency(group.amount, currency, localeTag, true)} de ${formatCurrency(budgetLimit, currency, localeTag, true)} (${(budgetRatio * 100).toFixed(0)}%)`}
                              </Text>
                              {budgetRatio >= 1 && (
                                <Text style={[styles.budgetOverText, { color: tokens.negative }]}>Excedido</Text>
                              )}
                            </View>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </WalkthroughableView>
        </CopilotStep>

        <ExportReportModal
          visible={exportModalVisible}
          onClose={() => setExportModalVisible(false)}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          workspaceColor={tokens.primary}
        />
      </ScrollView>

      {/* Modal de Detalhe por Categoria */}
      <Modal
        visible={Boolean(selectedExpenseGroup)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseExpenseDetail}
      >
        <View style={[styles.detailOverlay, { backgroundColor: tokens.overlay }]}>
          <View style={[styles.detailCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}> 
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderContent}>
                <Text style={[styles.detailTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
                  {selectedExpenseGroup?.label || t('reports.whereMoneyGoes')}
                </Text>
                <Text style={[styles.detailSubtitle, { color: tokens.textSecondary }]}>
                  {t('reports.categoryDrilldownHint', { defaultValue: 'Lançamentos da categoria no mês selecionado' })}
                </Text>
              </View>
              <Pressable onPress={handleCloseExpenseDetail} style={[styles.detailCloseButton, { backgroundColor: tokens.surfaceInteractive }]}>
                <MaterialCommunityIcons name="close" size={20} color={tokens.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.detailMonthNavigator, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}>
              <Pressable style={[styles.detailMonthButton, { backgroundColor: tokens.card }]} onPress={() => setExpenseDetailMonthCursor((prev) => addMonths(prev, -1))}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={tokens.textPrimary} />
              </Pressable>

              <Text style={[styles.detailMonthLabel, { color: tokens.textPrimary }]}>{expenseDetailMonthLabel}</Text>

              <Pressable
                style={[styles.detailMonthButton, { backgroundColor: tokens.card }, !canAdvanceExpenseDetailMonth && styles.disabledMonthButton]}
                onPress={() => {
                  if (canAdvanceExpenseDetailMonth) {
                    setExpenseDetailMonthCursor((prev) => addMonths(prev, 1));
                  }
                }}
                disabled={!canAdvanceExpenseDetailMonth}
              >
                <MaterialCommunityIcons name="chevron-right" size={20} color={canAdvanceExpenseDetailMonth ? tokens.textPrimary : tokens.textTertiary} />
              </Pressable>
            </View>

            <View style={styles.detailTotalBlock}>
              <Text style={[styles.detailTotalLabel, { color: tokens.textTertiary }]}>
                {t('reports.costsExpenses', { defaultValue: 'TOTAL GASTO' })}
              </Text>
              <Text style={[styles.detailTotalValue, { color: tokens.negative }]}>
                {hideBalances ? maskedCurrency : formatCurrency(expenseDetailTotal, currency, localeTag, true)}
              </Text>
            </View>

            {/* Ajuste de Meta de Orçamento */}
            <Pressable
              style={[
                styles.detailBudgetRow,
                {
                  backgroundColor: tokens.surfaceInteractive,
                  borderColor: tokens.border,
                },
              ]}
              onPress={() => {
                if (selectedExpenseGroup) {
                  handleOpenBudgetModal(selectedExpenseGroup);
                }
              }}
            >
              <View style={styles.detailBudgetLeft}>
                <View style={[styles.budgetModalIconWrap, { backgroundColor: tokens.primaryTonal }]}>
                  <MaterialCommunityIcons
                    name="bullseye-arrow"
                    size={18}
                    color={tokens.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailBudgetTitle, { color: tokens.textPrimary }]}>
                    {typeof selectedExpenseGroup?.budgetLimit === 'number'
                      ? `Meta: ${formatCurrency(selectedExpenseGroup.budgetLimit, currency, localeTag, true)}`
                      : 'Sem meta de orçamento'}
                  </Text>
                  <Text style={[styles.detailBudgetSubtitle, { color: tokens.textSecondary }]}>
                    Toque para ajustar ou definir limite mensal
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={tokens.textTertiary} />
            </Pressable>

            <ScrollView style={styles.detailList} showsVerticalScrollIndicator={false}>
              {expenseDetailTransactions.length === 0 ? (
                <View style={styles.detailEmptyState}>
                  <Text style={[styles.noExpensesText, { color: tokens.textSecondary }]}>
                    {t('reports.categoryDrilldownEmpty', { defaultValue: 'Nenhum lançamento nesta categoria para este mês.' })}
                  </Text>
                </View>
              ) : (
                expenseDetailTransactions.map((tx) => (
                  <View
                    key={tx.id}
                    style={[
                      styles.detailTransactionCard,
                      {
                        backgroundColor: tokens.surfaceInteractive,
                        borderColor: tokens.border,
                      },
                    ]}
                  >
                    <View style={styles.detailTransactionInfo}>
                      <Text style={[styles.detailTransactionTitle, { color: tokens.textPrimary }]} numberOfLines={2}>
                        {tx.note || selectedExpenseGroup?.label || t('dashboard.transactionFallback', { defaultValue: 'Movimentação' })}
                      </Text>
                      <Text style={[styles.detailTransactionDate, { color: tokens.textSecondary }]}>
                        {new Date(tx.date).toLocaleDateString(localeTag, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.detailTransactionAmount, { color: tokens.negative }]}>
                      - {hideBalances ? maskedCurrency : formatCurrency(tx.amount, currency, localeTag, true)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CategoryBudgetModal
        visible={Boolean(budgetModalCategory)}
        onClose={() => setBudgetModalCategory(null)}
        category={budgetModalCategory}
        currentSpend={budgetModalCategory?.amount || 0}
        workspaceColor={tokens.primary}
      />

      <Modal visible={isExporting} transparent animationType="fade">
        <View style={[styles.exportLoadingOverlay, { backgroundColor: tokens.overlay }]}>
          <View style={[styles.exportLoadingCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
            <ActivityIndicator size="large" color={tokens.primary} />
            <Text style={[styles.exportLoadingText, { color: tokens.textPrimary }]}>Gerando relatório...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  headerTopRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: sharedTokens.typography.screenTitle.fontSize,
    fontWeight: sharedTokens.typography.screenTitle.fontWeight,
    letterSpacing: sharedTokens.typography.screenTitle.letterSpacing,
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginTop: 4,
  },
  exportButton: {
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportButtonCompact: {
    alignSelf: 'flex-start',
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: sharedTokens.radius.card,
    borderWidth: 1,
    padding: sharedTokens.spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroNetContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroNetLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  heroNetValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  summaryColumnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metricColLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricColValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryVerticalDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 16,
  },
  internalRow: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  internalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  internalValue: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  emptyChartState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noExpensesText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'center',
  },
  chartContainer: {
    marginTop: 4,
  },
  barBlock: {
    marginBottom: 18,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  barLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  budgetIndicatorPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  barMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  barMeta: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  thinTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thinBar: {
    height: '100%',
    borderRadius: 4,
  },
  budgetProgressBlock: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  budgetTrack: {
    height: 5,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  budgetBar: {
    height: '100%',
    borderRadius: 4,
  },
  budgetHelperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetHelperText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  budgetOverText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 22,
    maxHeight: '86%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  detailHeaderContent: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  detailSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  detailCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMonthNavigator: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailMonthButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledMonthButton: {
    opacity: 0.35,
  },
  detailMonthLabel: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailTotalBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailTotalValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  detailBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  detailBudgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  budgetModalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBudgetTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailBudgetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  detailList: {
    maxHeight: 340,
  },
  detailEmptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  detailTransactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 12,
  },
  detailTransactionInfo: {
    flex: 1,
  },
  detailTransactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  detailTransactionDate: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },
  detailTransactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
  exportLoadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportLoadingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    minWidth: 200,
  },
  exportLoadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});