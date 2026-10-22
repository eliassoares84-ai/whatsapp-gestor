import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardBalanceCard } from '../components/dashboard/DashboardBalanceCard';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardQuickActions } from '../components/dashboard/DashboardQuickActions';
import { DashboardRecentTransactions } from '../components/dashboard/DashboardRecentTransactions';
import { EditTransactionModal } from '../components/dashboard/EditTransactionModal';
import { FastEntryModal } from '../components/FastEntryModal';
import { MonthSelector } from '../components/MonthSelector';
import { PremiumTeaserCard } from '../components/PremiumTeaserCard';
import { TransferModal } from '../components/TransferModal';
import { ChatbotFloatingButton } from '../components/chat/ChatbotFloatingButton';
import { FinancialChatModal } from '../components/chat/FinancialChatModal';
import type { UserFinancialContext } from '../services/financialChatService';
import { PaywallScreen } from '../screens/PaywallScreen';
import { useChatStore } from '../store/useChatStore';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import type { Transaction } from '../types/finance.types';
import { getLocalizedCategoryName } from '../utils/categoryLocalization';
import { CopilotStep, useCopilot, walkthroughable } from '../utils/copilotSafe';
import { uppercaseFirstLetter } from '../utils/textInputFormat';
import { deepLinkService } from '../services/deepLinkService';

const WalkthroughableView = walkthroughable(View);
const WalkthroughableTouchableOpacity = walkthroughable(TouchableOpacity);
const WalkthroughableChatbotButton = walkthroughable(ChatbotFloatingButton);

const stripInstallmentSuffix = (value: string): string => {
  return value.replace(/\s*\(\d+\/\d+\)\s*$/u, '').trim();
};

const getGooglePhotoUrl = (photoUrl?: string, size = 120): string | undefined => {
  if (!photoUrl) {
    return undefined;
  }

  if (!photoUrl.includes('googleusercontent.com')) {
    return photoUrl;
  }

  if (/=s\d+-c$/.test(photoUrl)) {
    return photoUrl.replace(/=s\d+-c$/, `=s${size}-c`);
  }

  return `${photoUrl}=s${size}-c`;
};

import { getThemeTokens } from '../styles/themes';

const DashboardScreenBase: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fastEntryOptions, setFastEntryOptions] = useState<{
    autoStartVoice?: boolean;
    initialAmount?: number;
    initialType?: 'expense' | 'income';
    initialNote?: string;
    initialText?: string;
  }>({});
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const unsubscribe = deepLinkService.subscribe((action) => {
      if (action.type === 'voice') {
        setFastEntryOptions({ autoStartVoice: true });
        setIsModalVisible(true);
      } else if (action.type === 'quick-add') {
        setFastEntryOptions({
          autoStartVoice: false,
          initialAmount: action.amount,
          initialType: action.entryType,
          initialNote: action.note,
          initialText: action.text,
        });
        setIsModalVisible(true);
      } else if (action.type === 'navigate') {
        if (action.screen === 'Reports') {
          navigation.navigate('Reports');
        } else if (action.screen === 'Transactions') {
          navigation.navigate('Transactions');
        } else if (action.screen === 'Settings') {
          const navState = navigation.getState?.();
          const hasSettingsRoute = navState?.routes?.some((r: any) => r.name === 'Settings');
          navigation.navigate(hasSettingsRoute ? 'Settings' : 'Workspaces');
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  const tourStartInFlightRef = useRef(false);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  const { start, copilotEvents, currentStepNumber } = useCopilot();

  const bottomSpacing = Math.max(76, tabBarHeight + 16) + insets.bottom;
  const fabBottomOffset = bottomSpacing;
  const scrollBottomPadding = bottomSpacing + 36;

  const {
    currentWorkspaceId,
    workspaces,
    userProfile,
    googleLinkedName,
    googleLinkedEmail,
    googleLinkedPhotoUrl,
    transactions,
    selectedMonth,
    selectedYear,
    getFilteredTransactions,
    categories,
    accounts,
    currency,
    isPremium,
    togglePremiumStatus,
    hideBalances,
    togglePrivacyMode,
    setWorkspace,
    updateTransaction,
    deleteTransaction,
    hasCompletedOnboarding,
    hasSeenDashboardTour,
    markDashboardTourSeen,
  } = useFinanceStore();

  const isDark = theme === 'dark';
  const bgColor = tokens.background;
  const surfaceColor = tokens.card;
  const textColor = tokens.textPrimary;
  const mutedTextColor = tokens.textSecondary;
  const dividerColor = tokens.border;
  const dashboardAccent = tokens.primary;

  const safeUserProfile = userProfile || {};
  const isPersonalOnlyMode =
    safeUserProfile.scope === 'Vida Pessoal' ||
    (workspaces.length === 1 && workspaces[0]?.type === 'personal');
  const visibleWorkspaces = isPersonalOnlyMode
    ? workspaces.filter((workspace) => workspace.type === 'personal')
    : workspaces;

  const safeGoogleName = typeof googleLinkedName === 'string' ? googleLinkedName.trim() : '';
  const safeGoogleEmail =
    typeof googleLinkedEmail === 'string' ? googleLinkedEmail.trim() : '';
  const safeGooglePhoto =
    typeof googleLinkedPhotoUrl === 'string' ? googleLinkedPhotoUrl.trim() : '';

  const firstNameFromGoogle = safeGoogleName.split(/\s+/)[0] || '';
  const firstNameFromEmail = safeGoogleEmail.split('@')[0] || '';
  const firstName = uppercaseFirstLetter(
    firstNameFromGoogle ||
      firstNameFromEmail ||
      t('dashboard.userFallback', { defaultValue: 'Usuário' })
  );
  const avatarPhotoUrl = useMemo(() => getGooglePhotoUrl(safeGooglePhoto), [safeGooglePhoto]);

  const avatarInitials = useMemo(() => {
    const parts = safeGoogleName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const firstInitial = parts[0]?.charAt(0) || 'E';
      const secondInitial = parts[1]?.charAt(0) || 'L';
      return `${firstInitial}${secondInitial}`.toUpperCase();
    }
    return firstName.slice(0, 2).toUpperCase();
  }, [firstName, safeGoogleName]);

  useEffect(() => {
    if (!visibleWorkspaces.length) {
      return;
    }
    const hasCurrentVisibleWorkspace = visibleWorkspaces.some(
      (workspace) => workspace.id === currentWorkspaceId
    );
    if (!hasCurrentVisibleWorkspace) {
      const fallbackWorkspaceId = visibleWorkspaces[0]?.id;
      if (fallbackWorkspaceId) {
        setWorkspace(fallbackWorkspaceId);
      }
    }
  }, [visibleWorkspaces, currentWorkspaceId, setWorkspace]);

  const shouldAutoStartTour = hasCompletedOnboarding && !hasSeenDashboardTour;

  useFocusEffect(
    useCallback(() => {
      if (!isFocused || !start || !shouldAutoStartTour) {
        return;
      }
      const timeoutId = setTimeout(() => {
        if (tourStartInFlightRef.current) {
          return;
        }
        tourStartInFlightRef.current = true;
        void start('dashboard_balance').finally(() => {
          tourStartInFlightRef.current = false;
        });
      }, 900);
      return () => {
        clearTimeout(timeoutId);
      };
    }, [isFocused, shouldAutoStartTour, start])
  );

  useEffect(() => {
    if (!isFocused || !start || !shouldAutoStartTour) {
      return;
    }
    const timeoutId = setTimeout(() => {
      if (tourStartInFlightRef.current) {
        return;
      }
      tourStartInFlightRef.current = true;
      void start('dashboard_balance').finally(() => {
        tourStartInFlightRef.current = false;
      });
    }, 1200);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isFocused, shouldAutoStartTour, start]);

  useEffect(() => {
    const onStop = () => {
      if (!isFocused) {
        return;
      }
      if (currentStepNumber > 0 && !useFinanceStore.getState().hasSeenDashboardTour) {
        markDashboardTourSeen();
      }
    };
    copilotEvents.on('stop', onStop);
    return () => {
      copilotEvents.off('stop', onStop);
    };
  }, [copilotEvents, currentStepNumber, isFocused, markDashboardTourSeen]);

  const workspaceAllTransactions = useMemo(() => {
    return transactions.filter((t) => t.workspaceId === currentWorkspaceId);
  }, [transactions, currentWorkspaceId]);

  const workspaceTransactions = useMemo(() => {
    return getFilteredTransactions().filter((t) => t.workspaceId === currentWorkspaceId);
  }, [getFilteredTransactions, transactions, currentWorkspaceId, selectedMonth, selectedYear]);

  const workspaceAccountsBalance = useMemo(() => {
    return (accounts || [])
      .filter((account) => !account.workspaceId || account.workspaceId === currentWorkspaceId)
      .reduce((sum, account) => sum + (account.balance || 0), 0);
  }, [accounts, currentWorkspaceId]);

  const workspaceAccounts = useMemo(() => {
    return (accounts || []).filter(
      (account) => !account.workspaceId || account.workspaceId === currentWorkspaceId
    );
  }, [accounts, currentWorkspaceId]);

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
    return workspaceTransactions.filter((tx) => !tx.excludeFromCharts);
  }, [workspaceTransactions]);

  const { balance, income, expenses } = useMemo(() => {
    const hasWorkspaceAccounts = workspaceAccounts.length > 0;
    const incomeTotal = workspaceAllTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = workspaceAllTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const transferNet = workspaceAllTransactions
      .filter((t) => t.type === 'transfer')
      .reduce((sum, t) => {
        const isIncomingTransfer = t.note?.startsWith('Origem:');
        return sum + (isIncomingTransfer ? t.amount : -t.amount);
      }, 0);

    const netCashFlow = incomeTotal - expenseTotal + transferNet;

    return {
      balance: hasWorkspaceAccounts && workspaceAccountsBalance !== 0
        ? workspaceAccountsBalance
        : netCashFlow,
      income: workspaceTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expenses: workspaceTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  }, [
    workspaceAllTransactions,
    workspaceTransactions,
    workspaceAccounts,
    workspaceAccountsBalance,
  ]);

  const dashboardTransactions = useMemo(() => {
    const regularTransactions = workspaceTransactions.filter(
      (tx) => !tx.installmentGroupId
    );

    const installmentGroups = workspaceAllTransactions.reduce<
      Map<
        string,
        {
          representative: (typeof workspaceAllTransactions)[number];
          purchaseDate: Date;
          totalAmount: number;
        }
      >
    >((acc, tx) => {
      const groupId = tx.installmentGroupId;

      if (!groupId || tx.paymentMethod !== 'credit') {
        return acc;
      }

      const purchaseDateValue = tx.purchaseDate || tx.date;
      const purchaseDate = new Date(purchaseDateValue);

      if (Number.isNaN(purchaseDate.getTime())) {
        return acc;
      }

      const existing = acc.get(groupId);

      if (!existing) {
        acc.set(groupId, {
          representative: tx,
          purchaseDate,
          totalAmount: tx.amount,
        });
        return acc;
      }

      const representativeInstallment =
        existing.representative.installmentNumber || Number.MAX_SAFE_INTEGER;
      const txInstallment = tx.installmentNumber || Number.MAX_SAFE_INTEGER;

      acc.set(groupId, {
        representative:
          txInstallment < representativeInstallment ? tx : existing.representative,
        purchaseDate:
          purchaseDate.getTime() < existing.purchaseDate.getTime()
            ? purchaseDate
            : existing.purchaseDate,
        totalAmount: existing.totalAmount + tx.amount,
      });

      return acc;
    }, new Map());

    const summarizedInstallments = Array.from(installmentGroups.entries())
      .filter(([, group]) => {
        return (
          group.purchaseDate.getMonth() === selectedMonth &&
          group.purchaseDate.getFullYear() === selectedYear
        );
      })
      .map(([groupId, group]) => {
        const normalizedNote = stripInstallmentSuffix(group.representative.note || '');
        const summaryNote = normalizedNote
          ? `${normalizedNote} (${group.representative.installmentTotal || 1}x)`
          : group.representative.note;

        return {
          ...group.representative,
          id: `installment-summary-${groupId}`,
          date: group.purchaseDate.toISOString(),
          note: summaryNote,
          amount: Number(group.totalAmount.toFixed(2)),
          installmentNumber: undefined,
        };
      });

    return [...regularTransactions, ...summarizedInstallments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [workspaceTransactions, workspaceAllTransactions, selectedMonth, selectedYear]);

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const selectedMonthName = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const raw = date.toLocaleDateString(localeTag, { month: 'long' });
    return uppercaseFirstLetter(raw);
  }, [selectedYear, selectedMonth, localeTag]);

  const { topCategories, largestExpenses } = useMemo(() => {
    const expenseTransactions = monthTransactions.filter((tx) => tx.type === 'expense');
    const totalExp = expenses > 0 ? expenses : 1;

    const categoryTotals = new Map<string, number>();
    for (const tx of expenseTransactions) {
      const catName =
        categoryNameById.get(tx.categoryId) ||
        tx.categoryId ||
        t('dashboard.transactionFallback', { defaultValue: 'Geral' });
      categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + tx.amount);
    }

    const sortedCats = Array.from(categoryTotals.entries())
      .map(([name, amount]) => ({
        name,
        amount: Number(amount.toFixed(2)),
        percentage: Math.round((amount / totalExp) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedExpenses = [...expenseTransactions]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((tx) => ({
        note: tx.note || categoryNameById.get(tx.categoryId) || 'Despesa',
        category: categoryNameById.get(tx.categoryId) || 'Geral',
        amount: tx.amount,
      }));

    return {
      topCategories: sortedCats.slice(0, 5),
      largestExpenses: sortedExpenses,
    };
  }, [monthTransactions, expenses, categoryNameById, t]);

  const netSavings = useMemo(() => income - expenses, [income, expenses]);
  const savingsRate = useMemo(
    () => (income > 0 ? Math.max(0, Math.round(((income - expenses) / income) * 100)) : 0),
    [income, expenses]
  );

  const userFinancialContext = useMemo<UserFinancialContext>(() => {
    return {
      currentBalance: balance,
      monthlyIncome: income,
      monthlyExpense: expenses,
      netSavings,
      savingsRate,
      currency,
      localeTag,
      workspaceType: currentWorkspace?.type || 'personal',
      selectedMonthName,
      selectedYear,
      topCategories,
      largestExpenses,
      transactionCount: monthTransactions.length,
    };
  }, [
    balance,
    income,
    expenses,
    netSavings,
    savingsRate,
    currency,
    localeTag,
    currentWorkspace,
    selectedMonthName,
    selectedYear,
    topCategories,
    largestExpenses,
    monthTransactions.length,
  ]);

  const openInsightsModal = () => {
    if (!isPremium) {
      setIsPaywallVisible(true);
    } else {
      setIsChatModalVisible(true);
      void useChatStore.getState().requestMonthlyAnalysis(userFinancialContext);
    }
  };

  const openSettingsShortcut = () => {
    const navState = navigation.getState();
    const hasSettingsRoute = navState.routes.some(
      (route: { name: string }) => route.name === 'Settings'
    );
    navigation.navigate(hasSettingsRoute ? 'Settings' : 'Workspaces');
  };

  const handleOpenTransactionEdit = (item: Transaction) => {
    if (item.id.startsWith('installment-summary-')) {
      return;
    }
    setEditingTransaction(item);
    setIsEditModalVisible(true);
  };

  const handleSaveTransactionEdit = (
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <DashboardHeader
        firstName={firstName}
        avatarPhotoUrl={avatarPhotoUrl}
        avatarInitials={avatarInitials}
        hideBalances={hideBalances}
        onTogglePrivacy={togglePrivacyMode}
        textColor={textColor}
        surfaceColor={surfaceColor}
        mutedTextColor={mutedTextColor}
        dashboardAccent={dashboardAccent}
        borderColor={tokens.border}
      />

      <View style={styles.monthSelectorWrap}>
        <MonthSelector accentColor={dashboardAccent} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomPadding },
        ]}
      >
        <DashboardBalanceCard
          balance={balance}
          income={income}
          expenses={expenses}
          currency={currency}
          localeTag={localeTag}
          hideBalances={hideBalances}
          cardBg={surfaceColor}
          textPrimary={textColor}
          textSecondary={mutedTextColor}
          dividerColor={dividerColor}
          borderColor={tokens.border}
          positiveColor={tokens.positive}
          negativeColor={tokens.negative}
          isFocused={isFocused}
        />

        <DashboardQuickActions
          onLaunchPress={() => setIsModalVisible(true)}
          onTransactionsPress={() => navigation.navigate('Transactions')}
          onReportsPress={() => navigation.navigate('Reports')}
          onSettingsPress={openSettingsShortcut}
          surfaceColor={surfaceColor}
          textColor={textColor}
          dashboardAccent={dashboardAccent}
          isDark={isDark}
          borderColor={tokens.border}
          tonalBg={tokens.primaryTonal}
        />

        <CopilotStep
          active={isFocused}
          text={t('tour.dashboard.ai', {
            defaultValue:
              'Toque neste card para receber um diagnóstico 360° das suas finanças e conversar diretamente com o Consultor IA sobre oportunidades de economia e investimentos.',
          })}
          order={2}
          name="dashboard_ai"
        >
          <WalkthroughableView>
            <PremiumTeaserCard
              isPremium={isPremium}
              transactions={monthTransactions}
              accentColor={dashboardAccent}
              hideBalances={hideBalances}
              onPress={() => void openInsightsModal()}
            />
          </WalkthroughableView>
        </CopilotStep>

        <DashboardRecentTransactions
          transactions={dashboardTransactions}
          categoryNameById={categoryNameById}
          currency={currency}
          localeTag={localeTag}
          hideBalances={hideBalances}
          surfaceColor={surfaceColor}
          textPrimary={textColor}
          textSecondary={mutedTextColor}
          dividerColor={dividerColor}
          dashboardAccent={dashboardAccent}
          isDark={isDark}
          borderColor={tokens.border}
          positiveColor={tokens.positive}
          negativeColor={tokens.negative}
          isFocused={isFocused}
          onEditTransaction={handleOpenTransactionEdit}
          onSeeAll={() => navigation.navigate('Transactions')}
        />
      </ScrollView>

      {/* Botão Flutuante do Consultor Financeiro IA */}
      <CopilotStep
        active={isFocused}
        text={t('tour.dashboard.advisor', {
          defaultValue:
            'Seu consultor financeiro 24h. Tire dúvidas sobre ações, Tesouro Selic/IPCA+, SAC vs Price no financiamento imobiliário e estratégias patrimoniais.',
        })}
        order={3}
        name="dashboard_advisor"
      >
        <WalkthroughableChatbotButton
          bottomOffset={fabBottomOffset + 12}
          onPress={() => {
            if (!isPremium) {
              setIsPaywallVisible(true);
            } else {
              setIsChatModalVisible(true);
            }
          }}
        />
      </CopilotStep>

      <CopilotStep
        active={isFocused}
        text={t('tour.dashboard.add', {
          defaultValue:
            'Adicione novas receitas e despesas em segundos digitando ou por comando de voz natural (ex: "Gastei 50 no almoço"), com preenchimento inteligente.',
        })}
        order={4}
        name="dashboard_add"
      >
        <WalkthroughableTouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: dashboardAccent,
              bottom: fabBottomOffset + 12,
            },
          ]}
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel={t('dashboard.addTransaction', {
            defaultValue: 'Adicionar Transação',
          })}
          activeOpacity={0.88}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </WalkthroughableTouchableOpacity>
      </CopilotStep>

      <FastEntryModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setFastEntryOptions({});
        }}
        autoStartVoice={fastEntryOptions.autoStartVoice}
        initialAmount={fastEntryOptions.initialAmount}
        initialType={fastEntryOptions.initialType}
        initialNote={fastEntryOptions.initialNote}
        initialText={fastEntryOptions.initialText}
      />

      <TransferModal
        visible={isTransferModalVisible}
        onClose={() => setIsTransferModalVisible(false)}
      />

      <PaywallScreen
        visible={isPaywallVisible}
        onClose={() => setIsPaywallVisible(false)}
        onSubscribe={() => {
          setIsPaywallVisible(false);
        }}
      />

      <EditTransactionModal
        visible={isEditModalVisible}
        transaction={editingTransaction}
        categories={workspaceCategories}
        theme={theme}
        cardBg={surfaceColor}
        textPrimary={textColor}
        textSecondary={mutedTextColor}
        dividerColor={dividerColor}
        dashboardAccent={dashboardAccent}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransactionEdit}
        onDeleteSingle={handleDeleteSingle}
        onDeleteAllInstallments={handleDeleteAllInstallments}
      />

      <FinancialChatModal
        visible={isChatModalVisible}
        onClose={() => setIsChatModalVisible(false)}
        userContext={userFinancialContext}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  monthSelectorWrap: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 6,
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

export { DashboardScreenBase as DashboardScreen };
export default DashboardScreenBase;