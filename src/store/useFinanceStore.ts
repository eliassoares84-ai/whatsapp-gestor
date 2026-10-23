import * as Localization from 'expo-localization';
import { Alert, Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { financeStorageAdapter } from '../storage/asyncStorageAdapter';

import {
  notifyBudgetThreshold,
  notifyRecurringDueNow,
  scheduleCreditCardReminders,
  scheduleRecurringReminders,
} from '../services/notificationService';
import {
  generateDefaultCategories,
  generateWildcardCategories,
} from '../utils/defaultCategoryGenerator';
import { formatCurrency } from '../utils/formatters';

import type {
  Account,
  Category,
  CreditCard,
  RecurringTemplate,
  Transaction,
  Workspace,
  WorkspaceId,
} from '../types/finance.types';

const INTERNAL_TRANSFER_CATEGORY_NAME = 'Transferência Interna';
const INTERNAL_TRANSFER_ICON = 'swap-horizontal';
const INTERNAL_TRANSFER_COLOR = '#4ECDC4';
const resolveDefaultCurrency = (): string => {
  const primaryLocale = Localization.getLocales()[0];
  const languageTag = primaryLocale?.languageTag?.toLowerCase() || '';

  if (languageTag.startsWith('pt')) {
    return 'BRL';
  }

  return primaryLocale?.currencyCode ?? 'BRL';
};

const defaultCurrency = resolveDefaultCurrency();

const buildInternalTransferCategoryId = (workspaceId: WorkspaceId): string =>
  `internal-transfer-${workspaceId}`;

const generateId = (): string =>
  `${Date.now().toString()}-${Math.random().toString(36).slice(2, 10)}`;

const toUtcIsoString = (value?: string | Date): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const parseIsoDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isMonthlyDue = (now: Date, dayOfMonth: number, lastProcessed: Date | null): boolean => {
  if (now.getDate() < dayOfMonth) {
    return false;
  }

  if (!lastProcessed) {
    return true;
  }

  return (
    lastProcessed.getFullYear() !== now.getFullYear() ||
    lastProcessed.getMonth() !== now.getMonth()
  );
};

const isWeeklyDue = (now: Date, dayOfMonth: number, lastProcessed: Date | null): boolean => {
  if (now.getDate() < dayOfMonth) {
    return false;
  }

  if (!lastProcessed) {
    return true;
  }

  const diffMs = now.getTime() - lastProcessed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 7;
};

const isYearlyDue = (now: Date, dayOfMonth: number, lastProcessed: Date | null): boolean => {
  if (now.getDate() < dayOfMonth) {
    return false;
  }

  if (!lastProcessed) {
    return true;
  }

  return lastProcessed.getFullYear() !== now.getFullYear();
};

const isSameMonth = (dateA: Date, dateB: Date): boolean =>
  dateA.getMonth() === dateB.getMonth() &&
  dateA.getFullYear() === dateB.getFullYear();

export const TOUR_GUIDE_VERSION = 6;

export type QuizFocus = 'Sair das Dívidas' | 'Poupar/Investir' | 'Gerir Negócio';
export type QuizScope = 'Vida Pessoal' | 'Empresa/Serviços' | 'Ambos';
export type QuizControl = 'Iniciante' | 'Esforçado' | 'Ninja';

export interface UserProfile {
  focus?: QuizFocus;
  scope?: QuizScope;
  control?: QuizControl;
}

export interface FinanceState {
  hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedGoogleLinkPrompt: boolean;
  isGoogleLinkPromptManuallyRequested: boolean;
  hasCompletedQuiz: boolean;
  hideBalances: boolean;
  hasSeenDashboardTour: boolean;
  hasSeenCardsTour: boolean;
  hasSeenReportsTour: boolean;
  hasSeenTourVersion?: number;
  userProfile: UserProfile;
  googleLinkedName: string;
  googleLinkedEmail: string;
  googleLinkedPhotoUrl: string;
  hasSeenTutorial: boolean;
  lastSyncDate: string;
  nightlyAutoBackupEnabled: boolean;
  nightlyAutoBackupHour: number;
  nightlyAutoBackupActivatedAt: string;
  lastAutoBackupAt: string;
  currentWorkspaceId: WorkspaceId;
  currency: string;
  selectedMonth: number;
  selectedYear: number;
  workspaces: Workspace[];
  transactions: Transaction[];
  categories: Category[];
  recurringTemplates: RecurringTemplate[];
  deletedDefaultCategoryIds: string[];
  accounts: Account[];
  isPremium: boolean;
}

export interface FinanceActions {
  togglePrivacyMode: () => void;
  markDashboardTourSeen: () => void;
  markCardsTourSeen: () => void;
  markReportsTourSeen: () => void;
  resetTour: () => void;
  saveUserProfile: (results: UserProfile) => void;
  completeGoogleLinkPrompt: (email?: string, photoUrl?: string, name?: string) => void;
  reopenGoogleLinkPrompt: () => void;
  resetGoogleLinkPrompt: () => void;
  markTutorialAsSeen: () => void;
  setWorkspace: (id: WorkspaceId) => void;
  setCurrency: (newCurrency: string) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  setSpecificMonthYear: (month: number, year: number) => void;
  getFilteredTransactions: () => Transaction[];
  setCategoryBudget: (categoryId: string, limit: number | null) => void;
  // PARCELAS ADICIONADAS AQUI
  addTransaction: (transaction: Omit<Transaction, 'id' | 'workspaceId'> & { installments?: number }) => void;
  updateTransaction: (
    transactionId: string,
    updates: Partial<Omit<Transaction, 'id' | 'workspaceId'>>
  ) => void;
  deleteTransaction: (
    transactionId: string,
    options?: { deleteAllInstallments?: boolean }
  ) => void;
  transferBetweenWorkspaces: (
    amount: number,
    fromWorkspaceId: WorkspaceId,
    toWorkspaceId: WorkspaceId,
    note?: string
  ) => void;
  setupUserAccount: (
    profileType: 'personal' | 'business' | 'hybrid'
  ) => void;
  updateWorkspace: (id: WorkspaceId, data: Partial<Workspace>) => void;
  addWorkspace: (workspace: Omit<Workspace, 'id' | 'creditCards'>) => void;
  addCategory: (category: { name: string; icon?: string; color?: string }) => string;
  addAccount: (account: Omit<Account, 'id'>) => void;
  removeAccount: (accountId: string) => void;
  addCreditCard: (card: Omit<CreditCard, 'id' | 'availableLimit'>) => void;
  removeCreditCard: (creditCardId: string) => void;
  payInvoice: (
    creditCardId: string,
    invoiceMonth: string,
    fromAccountId: string,
    paidAmount: number
  ) => Promise<void>;
  addRecurringTemplate: (
    template: Omit<
      RecurringTemplate,
      'id' | 'workspaceId' | 'lastProcessedDate' | 'isActive'
    >
  ) => void;
  updateRecurringTemplate: (
    id: string,
    data: Partial<RecurringTemplate>
  ) => void;
  deleteRecurringTemplate: (id: string) => void;
  toggleRecurringTemplate: (id: string) => void;
  checkAndProcessRecurrences: () => void;
  enableNightlyAutoBackup: (hour?: number) => void;
  disableNightlyAutoBackup: () => void;
  setLastAutoBackupAt: (isoDate: string) => void;
  setLastSyncDate: (isoDate: string) => void;
  deleteAccountData: () => void;
  deleteCategory: (categoryId: string) => void;
  setPremiumStatus: (status: boolean) => void;
  togglePremiumStatus: () => void;
}

export interface FinanceBackupState {
  hasCompletedOnboarding: boolean;
  hasCompletedGoogleLinkPrompt?: boolean;
  hasCompletedQuiz?: boolean;
  hideBalances?: boolean;
  hasSeenDashboardTour?: boolean;
  hasSeenCardsTour?: boolean;
  hasSeenReportsTour?: boolean;
  hasSeenTour?: boolean;
  hasSeenTourVersion?: number;
  userProfile?: UserProfile;
  googleLinkedName?: string;
  googleLinkedEmail?: string;
  googleLinkedPhotoUrl?: string;
  hasSeenTutorial?: boolean;
  lastSyncDate: string;
  nightlyAutoBackupEnabled?: boolean;
  nightlyAutoBackupHour?: number;
  nightlyAutoBackupActivatedAt?: string;
  lastAutoBackupAt?: string;
  currentWorkspaceId: WorkspaceId;
  currency?: string;
  selectedMonth?: number;
  selectedYear?: number;
  workspaces: Workspace[];
  transactions: Transaction[];
  categories: Category[];
  recurringTemplates: RecurringTemplate[];
  deletedDefaultCategoryIds?: string[];
  isPremium?: boolean;
}

type FinanceStore = FinanceState & FinanceActions;

const createInitialFinanceState = (): FinanceState => ({
  hasHydrated: false,
  currency: defaultCurrency,
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  hasCompletedOnboarding: false,
  hasCompletedGoogleLinkPrompt: false,
  isGoogleLinkPromptManuallyRequested: false,
  hasCompletedQuiz: false,
  hideBalances: true,
  hasSeenDashboardTour: false,
  hasSeenCardsTour: false,
  hasSeenReportsTour: false,
  hasSeenTourVersion: TOUR_GUIDE_VERSION,
  userProfile: {},
  googleLinkedName: '',
  googleLinkedEmail: '',
  googleLinkedPhotoUrl: '',
  hasSeenTutorial: false,
  lastSyncDate: '',
  nightlyAutoBackupEnabled: false,
  nightlyAutoBackupHour: 22,
  nightlyAutoBackupActivatedAt: '',
  lastAutoBackupAt: '',
  currentWorkspaceId: '',
  workspaces: [],
  transactions: [],
  categories: [],
  recurringTemplates: [],
  deletedDefaultCategoryIds: [],
  accounts: [],
  isPremium: false,
});

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asArray = <T>(value: unknown, fallback: T[]): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

const sanitizeCreditCard = (value: unknown): CreditCard | null => {
  const raw = asRecord(value);
  const id = asString(raw.id);
  const name = asString(raw.name);
  const limit = typeof raw.limit === 'number' && Number.isFinite(raw.limit) ? raw.limit : 0;
  const availableLimit =
    typeof raw.availableLimit === 'number' && Number.isFinite(raw.availableLimit)
      ? raw.availableLimit
      : limit;
  const closingDay =
    typeof raw.closingDay === 'number' && Number.isFinite(raw.closingDay)
      ? raw.closingDay
      : 1;
  const dueDay = typeof raw.dueDay === 'number' && Number.isFinite(raw.dueDay) ? raw.dueDay : 1;

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    limit,
    availableLimit,
    closingDay,
    dueDay,
    themeColor: asString(raw.themeColor, '#0A84FF'),
  };
};

const sanitizeWorkspace = (value: unknown): Workspace | null => {
  const raw = asRecord(value);
  const id = asString(raw.id);
  const name = asString(raw.name);
  const type = raw.type === 'business' ? 'business' : raw.type === 'personal' ? 'personal' : null;

  if (!id || !name || !type) {
    return null;
  }

  return {
    id,
    name,
    type,
    themeColor: asString(raw.themeColor, type === 'business' ? '#d2ff61' : '#0A84FF'),
    creditCards: asArray(raw.creditCards, [])
      .map(sanitizeCreditCard)
      .filter((card): card is CreditCard => card !== null),
  };
};

const sanitizeUserProfile = (value: unknown): UserProfile => {
  const raw = asRecord(value);

  return {
    focus:
      raw.focus === 'Sair das Dívidas' || raw.focus === 'Poupar/Investir' || raw.focus === 'Gerir Negócio'
        ? raw.focus
        : undefined,
    scope:
      raw.scope === 'Vida Pessoal' || raw.scope === 'Empresa/Serviços' || raw.scope === 'Ambos'
        ? raw.scope
        : undefined,
    control:
      raw.control === 'Iniciante' || raw.control === 'Esforçado' || raw.control === 'Ninja'
        ? raw.control
        : undefined,
  };
};

const sanitizeFinancePersistedState = (
  persistedState: unknown,
  currentState: FinanceStore
): Partial<FinanceState> => {
  const rawState = asRecord(persistedState);
  const maybeState = asRecord(rawState.state);
  const source = Object.keys(maybeState).length > 0 ? maybeState : rawState;

  const workspaces = asArray(source.workspaces, [])
    .map(sanitizeWorkspace)
    .filter((workspace): workspace is Workspace => workspace !== null);
  const fallbackWorkspaceId =
    workspaces[0]?.id || currentState.currentWorkspaceId || currentState.workspaces[0]?.id || '';
  const requestedWorkspaceId = asString(source.currentWorkspaceId, fallbackWorkspaceId);
  const currentWorkspaceId =
    workspaces.some((workspace) => workspace.id === requestedWorkspaceId)
      ? requestedWorkspaceId
      : fallbackWorkspaceId;
  const currency = typeof source.currency === 'string' && source.currency.trim().length > 0
    ? source.currency.trim().toUpperCase()
    : currentState.currency;
  // Sempre volta ao mês vigente ao abrir o app
  const selectedMonth = new Date().getMonth();
  const selectedYear = new Date().getFullYear();

  return {
    hasCompletedOnboarding: asBoolean(
      source.hasCompletedOnboarding,
      currentState.hasCompletedOnboarding
    ),
    hasCompletedGoogleLinkPrompt: asBoolean(
      source.hasCompletedGoogleLinkPrompt,
      currentState.hasCompletedGoogleLinkPrompt
    ),
    isGoogleLinkPromptManuallyRequested: asBoolean(
      source.isGoogleLinkPromptManuallyRequested,
      currentState.isGoogleLinkPromptManuallyRequested
    ),
    hasCompletedQuiz: asBoolean(source.hasCompletedQuiz, currentState.hasCompletedQuiz),
    hideBalances: true, // sempre inicia com privacidade ativada ao abrir o app
    hasSeenDashboardTour:
      typeof source.hasSeenTourVersion === 'number' && source.hasSeenTourVersion >= TOUR_GUIDE_VERSION
        ? asBoolean(source.hasSeenDashboardTour, currentState.hasSeenDashboardTour)
        : false,
    hasSeenCardsTour:
      typeof source.hasSeenTourVersion === 'number' && source.hasSeenTourVersion >= TOUR_GUIDE_VERSION
        ? asBoolean(source.hasSeenCardsTour, currentState.hasSeenCardsTour)
        : false,
    hasSeenReportsTour:
      typeof source.hasSeenTourVersion === 'number' && source.hasSeenTourVersion >= TOUR_GUIDE_VERSION
        ? asBoolean(source.hasSeenReportsTour, currentState.hasSeenReportsTour)
        : false,
    hasSeenTourVersion:
      typeof source.hasSeenTourVersion === 'number' && source.hasSeenTourVersion >= TOUR_GUIDE_VERSION
        ? source.hasSeenTourVersion
        : 0,
    userProfile: sanitizeUserProfile(source.userProfile),
    googleLinkedName: asString(source.googleLinkedName, currentState.googleLinkedName),
    googleLinkedEmail: asString(source.googleLinkedEmail, currentState.googleLinkedEmail),
    googleLinkedPhotoUrl: asString(source.googleLinkedPhotoUrl, currentState.googleLinkedPhotoUrl),
    hasSeenTutorial: asBoolean(source.hasSeenTutorial, currentState.hasSeenTutorial),
    lastSyncDate: asString(source.lastSyncDate, currentState.lastSyncDate),
    nightlyAutoBackupEnabled: asBoolean(
      source.nightlyAutoBackupEnabled,
      currentState.nightlyAutoBackupEnabled
    ),
    nightlyAutoBackupHour:
      typeof source.nightlyAutoBackupHour === 'number' &&
      Number.isFinite(source.nightlyAutoBackupHour) &&
      source.nightlyAutoBackupHour >= 0 &&
      source.nightlyAutoBackupHour <= 23
        ? Math.trunc(source.nightlyAutoBackupHour)
        : currentState.nightlyAutoBackupHour,
    nightlyAutoBackupActivatedAt: asString(
      source.nightlyAutoBackupActivatedAt,
      currentState.nightlyAutoBackupActivatedAt
    ),
    lastAutoBackupAt: asString(source.lastAutoBackupAt, currentState.lastAutoBackupAt),
    currentWorkspaceId,
    currency,
    selectedMonth,
    selectedYear,
    workspaces,
    transactions: asArray(source.transactions, currentState.transactions),
    categories: asArray(source.categories, currentState.categories),
    recurringTemplates: asArray(source.recurringTemplates, currentState.recurringTemplates),
    deletedDefaultCategoryIds: asArray(source.deletedDefaultCategoryIds, currentState.deletedDefaultCategoryIds),
    accounts: asArray(source.accounts, currentState.accounts),
    isPremium: asBoolean(source.isPremium, currentState.isPremium),
  };
};

const ensureInternalTransferCategory = (
  categories: Category[],
  workspaceId: WorkspaceId
): Category[] => {
  const categoryId = buildInternalTransferCategoryId(workspaceId);

  const exists = categories.some(
    (category) =>
      category.id === categoryId && category.workspaceId === workspaceId
  );

  if (exists) {
    return categories;
  }

  return [
    ...categories,
    {
      id: categoryId,
      name: INTERNAL_TRANSFER_CATEGORY_NAME,
      icon: INTERNAL_TRANSFER_ICON,
      color: INTERNAL_TRANSFER_COLOR,
      workspaceId,
    },
  ];
};

const sortCategoriesAlphabetically = (categories: Category[]): Category[] => {
  return [...categories].sort((a, b) => {
    const workspaceCompare = a.workspaceId.localeCompare(b.workspaceId, 'pt-BR', {
      sensitivity: 'base',
    });

    if (workspaceCompare !== 0) {
      return workspaceCompare;
    }

    return a.name.localeCompare(b.name, 'pt-BR', {
      sensitivity: 'base',
    });
  });
};

const normalizeDate = (value: string): Date => new Date(value);

const toMonthKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const addMonths = (date: Date, count: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
};

const resolveInvoiceMonth = (txDateIso: string, closingDay: number): string => {
  const txDate = normalizeDate(txDateIso);
  if (Number.isNaN(txDate.getTime())) {
    return toMonthKey(new Date());
  }

  const invoiceDate = txDate.getDate() > closingDay ? addMonths(txDate, 1) : txDate;
  return toMonthKey(invoiceDate);
};

const toExpenseSignedAmount = (tx: Transaction): number => {
  if (tx.type === 'expense') {
    return tx.amount;
  }

  if (tx.type === 'income') {
    return -tx.amount;
  }

  return 0;
};

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...createInitialFinanceState(),

      togglePrivacyMode: () => {
        const { hideBalances } = get();
        set({ hideBalances: !hideBalances });
      },

      markDashboardTourSeen: () => {
        set({
          hasSeenDashboardTour: true,
          hasSeenTourVersion: TOUR_GUIDE_VERSION,
        });
      },

      markCardsTourSeen: () => {
        set({
          hasSeenCardsTour: true,
          hasSeenTourVersion: TOUR_GUIDE_VERSION,
        });
      },

      markReportsTourSeen: () => {
        set({
          hasSeenReportsTour: true,
          hasSeenTourVersion: TOUR_GUIDE_VERSION,
        });
      },

      resetTour: () => {
        set({
          hasSeenDashboardTour: false,
          hasSeenCardsTour: false,
          hasSeenReportsTour: false,
          hasSeenTourVersion: 0,
        });
      },

      saveUserProfile: (results) => {
        set({
          userProfile: {
            ...results,
          },
          hasCompletedQuiz: true,
        });
      },

      completeGoogleLinkPrompt: (email, photoUrl, name) => {
        set({
          hasCompletedGoogleLinkPrompt: true,
          isGoogleLinkPromptManuallyRequested: false,
          googleLinkedName: name || '',
          googleLinkedEmail: email || '',
          googleLinkedPhotoUrl: photoUrl || '',
        });
      },

      reopenGoogleLinkPrompt: () => {
        set({
          hasCompletedGoogleLinkPrompt: false,
          isGoogleLinkPromptManuallyRequested: true,
        });
      },

      resetGoogleLinkPrompt: () => {
        set({
          hasCompletedGoogleLinkPrompt: false,
          isGoogleLinkPromptManuallyRequested: false,
          googleLinkedName: '',
          googleLinkedEmail: '',
          googleLinkedPhotoUrl: '',
        });
      },

      markTutorialAsSeen: () => {
        set({ hasSeenTutorial: true });
      },

      setWorkspace: (id) => {
        set({ currentWorkspaceId: id });
      },

      setCurrency: (newCurrency) => {
        const normalizedCurrency = newCurrency.trim().toUpperCase();

        if (!normalizedCurrency) {
          return;
        }

        set({ currency: normalizedCurrency });
      },

      nextMonth: () => {
        const { selectedMonth, selectedYear } = get();

        if (selectedMonth === 11) {
          set({ selectedMonth: 0, selectedYear: selectedYear + 1 });
          return;
        }

        set({ selectedMonth: selectedMonth + 1 });
      },

      prevMonth: () => {
        const { selectedMonth, selectedYear } = get();

        if (selectedMonth === 0) {
          set({ selectedMonth: 11, selectedYear: selectedYear - 1 });
          return;
        }

        set({ selectedMonth: selectedMonth - 1 });
      },

      setSpecificMonthYear: (month, year) => {
        if (!Number.isFinite(month) || !Number.isFinite(year)) {
          return;
        }

        const normalizedMonth = Math.trunc(month);
        const normalizedYear = Math.trunc(year);

        if (normalizedMonth < 0 || normalizedMonth > 11) {
          return;
        }

        set({
          selectedMonth: normalizedMonth,
          selectedYear: normalizedYear,
        });
      },

      getFilteredTransactions: () => {
        const { transactions, selectedMonth, selectedYear } = get();

        return transactions.filter((transaction) => {
          const date = new Date(transaction.date);

          if (Number.isNaN(date.getTime())) {
            return false;
          }

          return (
            date.getMonth() === selectedMonth &&
            date.getFullYear() === selectedYear
          );
        });
      },

      setCategoryBudget: (categoryId, limit) => {
        const { categories, currentWorkspaceId } = get();

        set({
          categories: categories.map((category) => {
            if (
              category.id !== categoryId ||
              category.workspaceId !== currentWorkspaceId
            ) {
              return category;
            }

            if (limit === null) {
              return {
                ...category,
                budgetLimit: undefined,
              };
            }

            return {
              ...category,
              budgetLimit: limit,
            };
          }),
        });
      },

      addTransaction: (transaction) => {
        const { currentWorkspaceId, transactions, categories, accounts, workspaces } = get();
        const now = new Date();
        const transactionDateIso = toUtcIsoString(transaction.date || now);
        const { installments: rawInstallments, ...transactionBase } = transaction;

        const fallbackAccount = accounts.find(
          (account) => !account.workspaceId || account.workspaceId === currentWorkspaceId
        );
        const targetAccountId = transaction.accountId || fallbackAccount?.id;
        const workspace = workspaces.find((item) => item.id === currentWorkspaceId);
        const targetCard = workspace?.creditCards.find((card) => card.id === transactionBase.creditCardId);
        const paymentMethod = transactionBase.paymentMethod || 'cash';

        const baseInstallments =
          typeof rawInstallments === 'number' && Number.isFinite(rawInstallments)
            ? Math.max(1, Math.trunc(rawInstallments))
            : 1;
        const installmentsCount =
          paymentMethod === 'credit' && transactionBase.type === 'expense'
            ? Math.min(baseInstallments, 48)
            : 1;

        const baseAmount = transactionBase.amount;
        const installmentAmount = installmentsCount > 1 ? Number((baseAmount / installmentsCount).toFixed(2)) : baseAmount;
        const installmentGroupId = installmentsCount > 1 ? generateId() : undefined;

        const generatedTransactions: Transaction[] = [];

        for (let i = 0; i < installmentsCount; i++) {
          const txDate = i === 0 ? new Date(transactionDateIso) : addMonths(new Date(transactionDateIso), i);
          const txDateStr = toUtcIsoString(txDate);

          const txNote = installmentsCount > 1
            ? `${transactionBase.note || 'Compra'} (${i + 1}/${installmentsCount})`
            : transactionBase.note;

          const isLast = i === installmentsCount - 1;
          const finalAmount = isLast && installmentsCount > 1
              ? Number((baseAmount - (installmentAmount * (installmentsCount - 1))).toFixed(2))
              : installmentAmount;

          const newTransaction: Transaction = {
            ...transactionBase,
            amount: finalAmount,
            date: txDateStr,
            note: txNote,
            paymentMethod,
            invoiceMonth: paymentMethod === 'credit' && targetCard
                ? resolveInvoiceMonth(txDateStr, targetCard.closingDay)
                : transactionBase.invoiceMonth,
            invoiceStatus: paymentMethod === 'credit'
                ? transactionBase.invoiceStatus || 'open'
                : transactionBase.invoiceStatus,
            excludeFromCharts: transactionBase.excludeFromCharts ?? false,
            accountId: targetAccountId,
            installmentNumber: installmentsCount > 1 ? i + 1 : undefined,
            installmentTotal: installmentsCount > 1 ? installmentsCount : undefined,
            installmentGroupId,
            purchaseDate: transactionDateIso,
            id: generateId(),
            workspaceId: currentWorkspaceId,
          };

          generatedTransactions.push(newTransaction);
        }

        const shouldTouchBankBalance = paymentMethod !== 'credit';

        const nextAccounts = accounts.map((account) => {
          if (!shouldTouchBankBalance || account.id !== targetAccountId) {
            return account;
          }
          if (transaction.type === 'income') {
            return { ...account, balance: account.balance + baseAmount };
          }
          if (transaction.type === 'expense') {
            return { ...account, balance: account.balance - baseAmount };
          }
          return account;
        });

        const nextWorkspaces = workspaces.map((item) => {
          if (item.id !== currentWorkspaceId || paymentMethod !== 'credit' || !transactionBase.creditCardId) {
            return item;
          }
          return {
            ...item,
            creditCards: (item.creditCards || []).map((card) => {
              if (card.id !== transactionBase.creditCardId) return card;
              
              const delta = transactionBase.type === 'expense' ? baseAmount : (transactionBase.type === 'income' ? -baseAmount : 0);
              return {
                ...card,
                availableLimit: Math.max(0, Math.min(card.limit, card.availableLimit - delta)),
              };
            }),
          };
        });

        set({
          transactions: [...generatedTransactions, ...transactions],
          accounts: nextAccounts,
          workspaces: nextWorkspaces,
        });

        if (transactionBase.type !== 'expense') return;

        const matchedCategory = categories.find(
          (category) =>
            category.id === transaction.categoryId &&
            category.workspaceId === currentWorkspaceId &&
            typeof category.budgetLimit === 'number' &&
            category.budgetLimit > 0
        );

        if (!matchedCategory || !matchedCategory.budgetLimit) return;

        const currentMonthExpenses = transactions
          .filter((tx) =>
            tx.workspaceId === currentWorkspaceId &&
            tx.type === 'expense' &&
            tx.categoryId === transactionBase.categoryId &&
            isSameMonth(new Date(tx.date), now)
          )
          .reduce((sum, tx) => sum + tx.amount, 0);

        const nextMonthExpenses = currentMonthExpenses + (installmentsCount > 1 ? installmentAmount : baseAmount);
        const prevRatio = currentMonthExpenses / matchedCategory.budgetLimit;
        const nextRatio = nextMonthExpenses / matchedCategory.budgetLimit;

        if (prevRatio < 1 && nextRatio >= 1) {
          void notifyBudgetThreshold(matchedCategory.name, 100);
          return;
        }

        if (prevRatio < 0.8 && nextRatio >= 0.8) {
          void notifyBudgetThreshold(matchedCategory.name, 80);
        }
      },

      updateTransaction: (transactionId, updates) => {
        const { transactions, accounts, workspaces } = get();

        const currentTransaction = transactions.find((tx) => tx.id === transactionId);
        if (!currentTransaction) {
          return;
        }

        const nextTransaction: Transaction = {
          ...currentTransaction,
          ...updates,
          date: updates.date ? toUtcIsoString(updates.date) : currentTransaction.date,
          id: currentTransaction.id,
          workspaceId: currentTransaction.workspaceId,
        };

        const getAccountDelta = (
          type: Transaction['type'],
          amount: number,
          paymentMethod?: Transaction['paymentMethod']
        ): number => {
          if (paymentMethod === 'credit') {
            return 0;
          }

          if (type === 'income') {
            return amount;
          }

          if (type === 'expense') {
            return -amount;
          }

          return 0;
        };

        const previousDelta = getAccountDelta(
          currentTransaction.type,
          currentTransaction.amount,
          currentTransaction.paymentMethod
        );
        const nextDelta = getAccountDelta(
          nextTransaction.type,
          nextTransaction.amount,
          nextTransaction.paymentMethod
        );

        const previousAccountId = currentTransaction.accountId;
        const nextAccountId = nextTransaction.accountId;

        const nextAccounts = accounts.map((account) => {
          if (previousAccountId && account.id === previousAccountId && previousAccountId === nextAccountId) {
            return {
              ...account,
              balance: account.balance + (nextDelta - previousDelta),
            };
          }

          if (previousAccountId && account.id === previousAccountId) {
            return {
              ...account,
              balance: account.balance - previousDelta,
            };
          }

          if (nextAccountId && account.id === nextAccountId) {
            return {
              ...account,
              balance: account.balance + nextDelta,
            };
          }

          return account;
        });

        const previousWorkspace = workspaces.find((ws) => ws.id === currentTransaction.workspaceId);
        const previousCard = previousWorkspace?.creditCards.find(
          (card) => card.id === currentTransaction.creditCardId
        );
        const nextCard = previousWorkspace?.creditCards.find(
          (card) => card.id === nextTransaction.creditCardId
        );

        const previousCreditUsage =
          currentTransaction.paymentMethod === 'credit'
            ? toExpenseSignedAmount(currentTransaction)
            : 0;
        const nextCreditUsage =
          nextTransaction.paymentMethod === 'credit' ? toExpenseSignedAmount(nextTransaction) : 0;

        const nextWorkspaces = workspaces.map((workspace) => {
          if (workspace.id !== currentTransaction.workspaceId) {
            return workspace;
          }

          return {
            ...workspace,
            creditCards: (workspace.creditCards || []).map((card) => {
              let availableLimit = card.availableLimit;

              if (previousCard && card.id === previousCard.id) {
                availableLimit += previousCreditUsage;
              }

              if (nextCard && card.id === nextCard.id) {
                availableLimit -= nextCreditUsage;
              }

              return {
                ...card,
                availableLimit: Math.max(0, Math.min(card.limit, availableLimit)),
              };
            }),
          };
        });

        set({
          transactions: transactions.map((tx) => (tx.id === transactionId ? nextTransaction : tx)),
          accounts: nextAccounts,
          workspaces: nextWorkspaces,
        });
      },

      deleteTransaction: (transactionId, options) => {
        const { transactions, accounts, workspaces } = get();

        const targetTx = transactions.find((tx) => tx.id === transactionId);
        if (!targetTx) {
          return;
        }

        let txsToDelete: Transaction[] = [];

        if (options?.deleteAllInstallments && targetTx.installmentGroupId) {
          txsToDelete = transactions.filter(
            (tx) =>
              tx.installmentGroupId === targetTx.installmentGroupId &&
              tx.workspaceId === targetTx.workspaceId
          );
        } else {
          txsToDelete = [targetTx];

          if (targetTx.type === 'transfer') {
            const counterpart = transactions.find(
              (tx) =>
                tx.id !== targetTx.id &&
                tx.type === 'transfer' &&
                tx.amount === targetTx.amount &&
                tx.date === targetTx.date
            );
            if (counterpart) {
              txsToDelete.push(counterpart);
            }
          }
        }

        const idsToDelete = new Set(txsToDelete.map((tx) => tx.id));

        const accountDeltas: Record<string, number> = {};
        for (const tx of txsToDelete) {
          if (tx.paymentMethod !== 'credit' && tx.accountId) {
            const delta =
              tx.type === 'income'
                ? -tx.amount
                : tx.type === 'expense'
                  ? tx.amount
                  : 0;
            accountDeltas[tx.accountId] = (accountDeltas[tx.accountId] || 0) + delta;
          }
        }

        const nextAccounts = accounts.map((account) => {
          const delta = accountDeltas[account.id];
          if (!delta) {
            return account;
          }
          return {
            ...account,
            balance: account.balance + delta,
          };
        });

        const cardDeltas: Record<string, number> = {};
        for (const tx of txsToDelete) {
          if (
            tx.paymentMethod === 'credit' &&
            tx.creditCardId &&
            tx.invoiceStatus !== 'paid'
          ) {
            const delta =
              tx.type === 'expense'
                ? tx.amount
                : tx.type === 'income'
                  ? -tx.amount
                  : 0;
            cardDeltas[tx.creditCardId] = (cardDeltas[tx.creditCardId] || 0) + delta;
          }
        }

        const nextWorkspaces = workspaces.map((workspace) => {
          return {
            ...workspace,
            creditCards: (workspace.creditCards || []).map((card) => {
              const delta = cardDeltas[card.id];
              if (!delta) {
                return card;
              }
              return {
                ...card,
                availableLimit: Math.max(0, Math.min(card.limit, card.availableLimit + delta)),
              };
            }),
          };
        });

        set({
          transactions: transactions.filter((tx) => !idsToDelete.has(tx.id)),
          accounts: nextAccounts,
          workspaces: nextWorkspaces,
        });
      },

      transferBetweenWorkspaces: (
        amount,
        fromWorkspaceId,
        toWorkspaceId,
        note
      ) => {
        if (amount <= 0 || fromWorkspaceId === toWorkspaceId) {
          return;
        }

        const { transactions, categories } = get();

        const categoriesWithTransferFrom = ensureInternalTransferCategory(
          categories,
          fromWorkspaceId
        );
        const categoriesWithTransferBoth = ensureInternalTransferCategory(
          categoriesWithTransferFrom,
          toWorkspaceId
        );

        const nowIso = new Date().toISOString();
        const fromWorkspace = get().workspaces.find(
          (workspace) => workspace.id === fromWorkspaceId
        );
        const toWorkspace = get().workspaces.find(
          (workspace) => workspace.id === toWorkspaceId
        );

        const expenseTransaction: Transaction = {
          id: generateId(),
          amount,
          type: 'transfer',
          paymentMethod: 'cash',
          categoryId: buildInternalTransferCategoryId(fromWorkspaceId),
          date: nowIso,
          workspaceId: fromWorkspaceId,
          note:
            note || `Transferência: ${toWorkspace?.name || 'Destino desconhecido'}`,
          isRecurring: false,
          excludeFromCharts: false,
        };

        const incomeTransaction: Transaction = {
          id: generateId(),
          amount,
          type: 'transfer',
          paymentMethod: 'cash',
          categoryId: buildInternalTransferCategoryId(toWorkspaceId),
          date: nowIso,
          workspaceId: toWorkspaceId,
          note:
            note || `Origem: ${fromWorkspace?.name || 'Origem desconhecida'}`,
          isRecurring: false,
          excludeFromCharts: false,
        };

        set({
          categories: categoriesWithTransferBoth,
          transactions: [expenseTransaction, incomeTransaction, ...transactions],
        });
      },

      setupUserAccount: (profileType) => {
        const newWorkspaces: Workspace[] = [];
        const newCategories: Category[] = [];

        if (profileType === 'personal' || profileType === 'hybrid') {
          newWorkspaces.push({
            id: 'personal',
            name: 'Minhas Finanças',
            type: 'personal',
            themeColor: '#0A84FF',
            creditCards: [],
          });
          newCategories.push(...generateDefaultCategories('personal', 'personal'));
        }

        if (profileType === 'business' || profileType === 'hybrid') {
          newWorkspaces.push({
            id: 'business',
            name: 'Meu Negócio',
            type: 'business',
            themeColor: '#d2ff61',
            creditCards: [],
          });
          newCategories.push(...generateDefaultCategories('business', 'business'));
        }

        const firstWorkspaceId = newWorkspaces[0]?.id || '';

        set({
          hasCompletedOnboarding: true,
          hasCompletedGoogleLinkPrompt: false,
          hasCompletedQuiz: false,
          userProfile: {},
          googleLinkedName: '',
          googleLinkedEmail: '',
          googleLinkedPhotoUrl: '',
          currentWorkspaceId: firstWorkspaceId,
          workspaces: newWorkspaces,
          categories: sortCategoriesAlphabetically(newCategories),
        });
      },

      updateWorkspace: (id, data) => {
        const { workspaces } = get();

        const updatedWorkspaces = workspaces.map((ws) =>
          ws.id === id ? { ...ws, ...data } : ws
        );

        set({
          workspaces: updatedWorkspaces,
        });
      },

      addWorkspace: (workspace) => {
        const { workspaces, categories, deletedDefaultCategoryIds } = get();

        const newWorkspace: Workspace = {
          ...workspace,
          id: generateId(),
          creditCards: [],
        };

        const newCategories = generateDefaultCategories(
          newWorkspace.id,
          workspace.type
        ).filter((cat) => !deletedDefaultCategoryIds.includes(cat.id));

        set({
          workspaces: [...workspaces, newWorkspace],
          categories: sortCategoriesAlphabetically([...categories, ...newCategories]),
        });
      },

      addCategory: (category) => {
        const { categories, currentWorkspaceId } = get();

        const newCategory: Category = {
          id: generateId(),
          name: category.name.trim(),
          icon: category.icon || 'tag',
          color: category.color || '#0A84FF',
          workspaceId: currentWorkspaceId,
        };

        set({
          categories: sortCategoriesAlphabetically([...categories, newCategory]),
        });

        return newCategory.id;
      },

      addAccount: (account) => {
        const { accounts, currentWorkspaceId } = get();

        const newAccount: Account = {
          ...account,
          id: generateId(),
          workspaceId: account.workspaceId || currentWorkspaceId,
        };

        set({
          accounts: [newAccount, ...accounts],
        });
      },

      removeAccount: (accountId) => {
        const { accounts, transactions } = get();

        set({
          accounts: accounts.filter((account) => account.id !== accountId),
          transactions: transactions.filter((tx) => tx.accountId !== accountId),
        });
      },

      addCreditCard: (card) => {
        const { workspaces, currentWorkspaceId } = get();

        const newCard: CreditCard = {
          ...card,
          id: generateId(),
          availableLimit: card.limit,
        };

        const nextWorkspaces = workspaces.map((workspace) =>
          workspace.id === currentWorkspaceId
            ? {
                ...workspace,
                creditCards: [...(workspace.creditCards || []), newCard],
              }
            : workspace
        );

        set({ workspaces: nextWorkspaces });
        void scheduleCreditCardReminders(nextWorkspaces);
      },

      removeCreditCard: (creditCardId) => {
        const { workspaces, currentWorkspaceId, transactions } = get();

        const nextWorkspaces = workspaces.map((workspace) =>
          workspace.id === currentWorkspaceId
            ? {
                ...workspace,
                creditCards: (workspace.creditCards || []).filter(
                  (card) => card.id !== creditCardId
                ),
              }
            : workspace
        );

        set({
          workspaces: nextWorkspaces,
          transactions: transactions.filter((tx) => tx.creditCardId !== creditCardId),
        });
        void scheduleCreditCardReminders(nextWorkspaces);
      },

      payInvoice: async (creditCardId, invoiceMonth, fromAccountId, paidAmount) => {
        const { workspaces, currentWorkspaceId, transactions, accounts, currency } = get();
        const workspace = workspaces.find((item) => item.id === currentWorkspaceId);
        if (!workspace) {
          return;
        }

        const card = (workspace.creditCards || []).find((item) => item.id === creditCardId);
        const sourceAccount = accounts.find((item) => item.id === fromAccountId);

        if (!card || !sourceAccount || paidAmount <= 0) {
          return;
        }

        const invoiceTransactions = transactions.filter((tx) => {
          if (tx.workspaceId !== currentWorkspaceId) {
            return false;
          }

          if (tx.paymentMethod !== 'credit' || tx.creditCardId !== creditCardId) {
            return false;
          }

          const txMonth = tx.invoiceMonth || resolveInvoiceMonth(tx.date, card.closingDay);
          return txMonth === invoiceMonth && (tx.invoiceStatus || 'open') !== 'paid';
        });

        const calculatedAmount = invoiceTransactions.reduce(
          (sum, tx) => sum + toExpenseSignedAmount(tx),
          0
        );

        const difference = Number((paidAmount - calculatedAmount).toFixed(2));

        if (Math.abs(difference) > 0.009) {
          const proceed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Divergência na fatura',
              `Valor calculado: ${formatCurrency(calculatedAmount, currency, 'pt-BR', true)}\nValor pago: ${formatCurrency(paidAmount, currency, 'pt-BR', true)}\nDiferença: ${formatCurrency(Math.abs(difference), currency, 'pt-BR', true)}`,
              [
                { text: 'Conferir lançamentos', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Prosseguir', onPress: () => resolve(true) },
              ]
            );
          });

          if (!proceed) {
            return;
          }
        }

        const adjustmentTx: Transaction | null =
          Math.abs(difference) > 0.009
            ? {
                id: generateId(),
                amount: Math.abs(difference),
                type: difference >= 0 ? 'expense' : 'income',
                paymentMethod: 'credit',
                creditCardId,
                categoryId: 'ajuste-fatura',
                date: new Date().toISOString(),
                workspaceId: currentWorkspaceId,
                note:
                  difference >= 0
                    ? 'Ajuste de Fatura / Encargos'
                    : 'Ajuste de Fatura / Desconto',
                isRecurring: false,
                excludeFromCharts: false,
                invoiceMonth,
                invoiceStatus: 'paid',
              }
            : null;

        const paymentTransaction: Transaction = {
          id: generateId(),
          amount: paidAmount,
          type: 'expense',
          paymentMethod: sourceAccount.type === 'cash' ? 'cash' : 'debit',
          categoryId: 'pagamento-fatura',
          date: new Date().toISOString(),
          workspaceId: currentWorkspaceId,
          note: `Pagamento Fatura - ${card.name}`,
          isRecurring: false,
          accountId: fromAccountId,
          excludeFromCharts: true,
        };

        const nextTransactions = transactions.map((tx) => {
          if (!invoiceTransactions.some((invoiceTx) => invoiceTx.id === tx.id)) {
            return tx;
          }

          return {
            ...tx,
            invoiceStatus: 'paid' as const,
          };
        });

        if (adjustmentTx) {
          nextTransactions.unshift(adjustmentTx);
        }

        nextTransactions.unshift(paymentTransaction);

        const nextAccounts = accounts.map((account) => {
          if (account.id !== fromAccountId) {
            return account;
          }

          return {
            ...account,
            balance: account.balance - paidAmount,
          };
        });

        const nextWorkspaces = workspaces.map((item) => {
          if (item.id !== currentWorkspaceId) {
            return item;
          }

          return {
            ...item,
            creditCards: (item.creditCards || []).map((itemCard) =>
              itemCard.id === creditCardId
                ? {
                    ...itemCard,
                    availableLimit: Math.max(
                      0,
                      Math.min(itemCard.limit, itemCard.availableLimit + paidAmount)
                    ),
                  }
                : itemCard
            ),
          };
        });

        set({
          transactions: nextTransactions,
          accounts: nextAccounts,
          workspaces: nextWorkspaces,
        });
      },

      addRecurringTemplate: (template) => {
        const { currentWorkspaceId, recurringTemplates } = get();

        const newTemplate: RecurringTemplate = {
          ...template,
          id: generateId(),
          workspaceId: currentWorkspaceId,
          lastProcessedDate: '',
          isActive: true,
        };

        const nextTemplates = [newTemplate, ...recurringTemplates];

        set({
          recurringTemplates: nextTemplates,
        });

        void scheduleRecurringReminders(nextTemplates);
      },

      updateRecurringTemplate: (id, data) => {
        const { recurringTemplates } = get();

        const nextTemplates = recurringTemplates.map((template) =>
          template.id === id ? { ...template, ...data } : template
        );

        set({
          recurringTemplates: nextTemplates,
        });

        void scheduleRecurringReminders(nextTemplates);
      },

      deleteRecurringTemplate: (id) => {
        const { recurringTemplates } = get();

        const nextTemplates = recurringTemplates.filter(
          (template) => template.id !== id
        );

        set({
          recurringTemplates: nextTemplates,
        });

        void scheduleRecurringReminders(nextTemplates);
      },

      toggleRecurringTemplate: (id) => {
        const { recurringTemplates } = get();

        const nextTemplates = recurringTemplates.map((template) =>
          template.id === id
            ? { ...template, isActive: !template.isActive }
            : template
        );

        set({
          recurringTemplates: nextTemplates,
        });

        void scheduleRecurringReminders(nextTemplates);
      },

      checkAndProcessRecurrences: () => {
        const now = new Date();
        const todayIso = toIsoDate(now);

        const { recurringTemplates, transactions } = get();

        const templatesToProcess = recurringTemplates.filter(
          (template) => template.isActive
        );

        const generatedTransactions: Transaction[] = [];
        const updatedTemplates = recurringTemplates.map((template) => {
          if (!template.isActive) {
            return template;
          }

          const lastProcessed = parseIsoDate(template.lastProcessedDate);

          // Prevent same-day duplicates when app opens multiple times.
          if (template.lastProcessedDate === todayIso) {
            return template;
          }

          // Frequency-specific checks ensure one generation per due period.
          let shouldGenerate = false;

          if (template.frequency === 'weekly') {
            shouldGenerate = isWeeklyDue(now, template.dayOfMonth, lastProcessed);
          }

          if (template.frequency === 'monthly') {
            shouldGenerate = isMonthlyDue(now, template.dayOfMonth, lastProcessed);
          }

          if (template.frequency === 'yearly') {
            shouldGenerate = isYearlyDue(now, template.dayOfMonth, lastProcessed);
          }

          if (!shouldGenerate) {
            return template;
          }

          void notifyRecurringDueNow(template.note, template.amount);

          generatedTransactions.push({
            id: generateId(),
            amount: template.amount,
            type: template.type,
            paymentMethod: 'cash',
            categoryId: template.categoryId,
            date: now.toISOString(),
            workspaceId: template.workspaceId,
            note: template.note,
            isRecurring: true,
            excludeFromCharts: false,
          });

          return {
            ...template,
            lastProcessedDate: todayIso,
          };
        });

        if (templatesToProcess.length === 0 || generatedTransactions.length === 0) {
          return;
        }

        set({
          recurringTemplates: updatedTemplates,
          transactions: [...generatedTransactions, ...transactions],
        });
      },

      enableNightlyAutoBackup: (hour) => {
        const normalizedHour =
          typeof hour === 'number' && Number.isFinite(hour) && hour >= 0 && hour <= 23
            ? Math.trunc(hour)
            : get().nightlyAutoBackupHour;

        set((state) => ({
          nightlyAutoBackupEnabled: true,
          nightlyAutoBackupHour: normalizedHour,
          nightlyAutoBackupActivatedAt:
            state.nightlyAutoBackupActivatedAt || new Date().toISOString(),
        }));
      },

      disableNightlyAutoBackup: () => {
        set({
          nightlyAutoBackupEnabled: false,
        });
      },

      setLastAutoBackupAt: (isoDate) => {
        set({
          lastAutoBackupAt: isoDate ? toUtcIsoString(isoDate) : '',
        });
      },

      setLastSyncDate: (isoDate) => {
        set({ lastSyncDate: isoDate ? toUtcIsoString(isoDate) : '' });
      },

      deleteAccountData: () => {
        set(createInitialFinanceState());
      },

      deleteCategory: (categoryId) => {
        const { categories, deletedDefaultCategoryIds } = get();

        const updatedCategories = categories.filter((cat) => cat.id !== categoryId);

        const isProbablyDefault = [
          'alimentacao',
          'transporte',
          'lazer',
          'saude',
          'moradia',
          'outros',
          'impostos',
          'marketing',
          'software-saas',
          'pro-labore',
          'escritorio',
          'consultoria-externa',
          'insumos-estoque',
          'manutencao-de-maquinas',
          'logistica',
          'aluguel-de-ponto',
          'energia',
          'perdas-avarias',
          'investimentos',
          'reserva-de-emergencia',
        ].some((id) => categoryId.includes(id) || categoryId === id);

        const newDeletedList: string[] = isProbablyDefault
          ? [...new Set([...deletedDefaultCategoryIds, categoryId])]
          : deletedDefaultCategoryIds;

        set({
          categories: updatedCategories,
          deletedDefaultCategoryIds: newDeletedList,
        });
      },

      setPremiumStatus: (status: boolean) => {
        set({ isPremium: status });
      },

      togglePremiumStatus: () => {
        const { isPremium } = get();
        set({ isPremium: !isPremium });
      },
    }),
    {
      name: 'finance-store',
      storage: createJSONStorage(() => financeStorageAdapter),
      merge: (persistedState, currentState) => {
        const sanitized = sanitizeFinancePersistedState(persistedState, currentState);
        return {
          ...currentState,
          ...sanitized,
          hasHydrated: true,
        };
      },
    }
  )
);

export const getFinanceBackupState = (): FinanceBackupState => {
  const state = useFinanceStore.getState();

  return {
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    hasCompletedGoogleLinkPrompt: state.hasCompletedGoogleLinkPrompt,
    hasCompletedQuiz: state.hasCompletedQuiz,
    hideBalances: state.hideBalances,
    hasSeenDashboardTour: state.hasSeenDashboardTour,
    hasSeenCardsTour: state.hasSeenCardsTour,
    hasSeenReportsTour: state.hasSeenReportsTour,
    hasSeenTour: state.hasSeenDashboardTour,
    hasSeenTourVersion: TOUR_GUIDE_VERSION,
    userProfile: state.userProfile,
    googleLinkedName: state.googleLinkedName,
    googleLinkedEmail: state.googleLinkedEmail,
    googleLinkedPhotoUrl: state.googleLinkedPhotoUrl,
    hasSeenTutorial: state.hasSeenTutorial,
    lastSyncDate: state.lastSyncDate,
    nightlyAutoBackupEnabled: state.nightlyAutoBackupEnabled,
    nightlyAutoBackupHour: state.nightlyAutoBackupHour,
    nightlyAutoBackupActivatedAt: state.nightlyAutoBackupActivatedAt,
    lastAutoBackupAt: state.lastAutoBackupAt,
    currentWorkspaceId: state.currentWorkspaceId,
    currency: state.currency,
    selectedMonth: state.selectedMonth,
    selectedYear: state.selectedYear,
    workspaces: state.workspaces,
    transactions: state.transactions,
    categories: state.categories,
    recurringTemplates: state.recurringTemplates,
    isPremium: state.isPremium,
  };
};

interface ThemeState {
  themeMode: 'system' | 'light' | 'dark';
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  syncThemeWithSystem: () => void;
  useSystemTheme: () => void;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      theme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        set({
          theme: nextTheme,
          themeMode: nextTheme,
        });
      },
      setThemeMode: (mode: 'system' | 'light' | 'dark') => {
        if (mode === 'system') {
          set({
            themeMode: 'system',
            theme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
          });
        } else {
          set({
            themeMode: mode,
            theme: mode,
          });
        }
      },
      syncThemeWithSystem: () => {
        if (get().themeMode !== 'system') {
          return;
        }

        set({ theme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light' });
      },
      useSystemTheme: () => {
        set({
          themeMode: 'system',
          theme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
        });
      },
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => financeStorageAdapter),
    }
  )
);