import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  notifyBudgetThreshold,
  notifyRecurringDueNow,
  scheduleRecurringReminders,
} from '../services/notificationService';
import {
  generateDefaultCategories,
  generateWildcardCategories,
} from '../utils/defaultCategoryGenerator';

import type {
  Category,
  RecurringTemplate,
  Transaction,
  Workspace,
  WorkspaceId,
} from '../types/finance.types';

const INTERNAL_TRANSFER_CATEGORY_NAME = 'Transferência Interna';
const INTERNAL_TRANSFER_ICON = 'swap-horizontal';
const INTERNAL_TRANSFER_COLOR = '#4ECDC4';

const buildInternalTransferCategoryId = (workspaceId: WorkspaceId): string =>
  `internal-transfer-${workspaceId}`;

const generateId = (): string =>
  `${Date.now().toString()}-${Math.random().toString(36).slice(2, 10)}`;

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

export interface FinanceState {
  hasCompletedOnboarding: boolean;
  hasSeenTutorial: boolean;
  lastSyncDate: string;
  currentWorkspaceId: WorkspaceId;
  workspaces: Workspace[];
  transactions: Transaction[];
  categories: Category[];
  recurringTemplates: RecurringTemplate[];
  deletedDefaultCategoryIds: string[];
}

export interface FinanceActions {
  markTutorialAsSeen: () => void;
  setWorkspace: (id: WorkspaceId) => void;
  setCategoryBudget: (categoryId: string, limit: number | null) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'workspaceId'>) => void;
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
  addWorkspace: (workspace: Omit<Workspace, 'id'>) => void;
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
  setLastSyncDate: (isoDate: string) => void;
  deleteCategory: (categoryId: string) => void;
}

export interface FinanceBackupState {
  hasCompletedOnboarding: boolean;
  hasSeenTutorial?: boolean;
  lastSyncDate: string;
  currentWorkspaceId: WorkspaceId;
  workspaces: Workspace[];
  transactions: Transaction[];
  categories: Category[];
  recurringTemplates: RecurringTemplate[];
  deletedDefaultCategoryIds?: string[];
}

type FinanceStore = FinanceState & FinanceActions;

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

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      hasSeenTutorial: false,
      lastSyncDate: '',
      currentWorkspaceId: '',
      workspaces: [],
      transactions: [],
      categories: [],
      recurringTemplates: [],
      deletedDefaultCategoryIds: [],

      markTutorialAsSeen: () => {
        set({ hasSeenTutorial: true });
      },

      setWorkspace: (id) => {
        set({ currentWorkspaceId: id });
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
        const { currentWorkspaceId, transactions, categories } = get();
        const now = new Date();

        const newTransaction: Transaction = {
          ...transaction,
          id: generateId(),
          workspaceId: currentWorkspaceId,
        };

        set({
          transactions: [newTransaction, ...transactions],
        });

        if (newTransaction.type !== 'expense') {
          return;
        }

        const matchedCategory = categories.find(
          (category) =>
            category.id === newTransaction.categoryId &&
            category.workspaceId === currentWorkspaceId &&
            typeof category.budgetLimit === 'number' &&
            category.budgetLimit > 0
        );

        if (!matchedCategory || !matchedCategory.budgetLimit) {
          return;
        }

        const currentMonthExpenses = transactions
          .filter((tx) => {
            if (
              tx.workspaceId !== currentWorkspaceId ||
              tx.type !== 'expense' ||
              tx.categoryId !== newTransaction.categoryId
            ) {
              return false;
            }

            return isSameMonth(new Date(tx.date), now);
          })
          .reduce((sum, tx) => sum + tx.amount, 0);

        const nextMonthExpenses = currentMonthExpenses + newTransaction.amount;

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
          categoryId: buildInternalTransferCategoryId(fromWorkspaceId),
          date: nowIso,
          workspaceId: fromWorkspaceId,
          note:
            note || `Transferência: ${toWorkspace?.name || 'Destino desconhecido'}`,
          isRecurring: false,
        };

        const incomeTransaction: Transaction = {
          id: generateId(),
          amount,
          type: 'transfer',
          categoryId: buildInternalTransferCategoryId(toWorkspaceId),
          date: nowIso,
          workspaceId: toWorkspaceId,
          note:
            note || `Origem: ${fromWorkspace?.name || 'Origem desconhecida'}`,
          isRecurring: false,
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
          });
          newCategories.push(...generateDefaultCategories('personal', 'personal'));
        }

        if (profileType === 'business' || profileType === 'hybrid') {
          newWorkspaces.push({
            id: 'business',
            name: 'Meu Negócio',
            type: 'business',
            themeColor: '#d2ff61',
          });
          newCategories.push(...generateDefaultCategories('business', 'business'));
        }

        const firstWorkspaceId = newWorkspaces[0]?.id || '';

        set({
          hasCompletedOnboarding: true,
          currentWorkspaceId: firstWorkspaceId,
          workspaces: newWorkspaces,
          categories: newCategories,
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
        };

        const newCategories = generateDefaultCategories(
          newWorkspace.id,
          workspace.type
        ).filter((cat) => !deletedDefaultCategoryIds.includes(cat.id));

        set({
          workspaces: [...workspaces, newWorkspace],
          categories: [...categories, ...newCategories],
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
            categoryId: template.categoryId,
            date: now.toISOString(),
            workspaceId: template.workspaceId,
            note: template.note,
            isRecurring: true,
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

      setLastSyncDate: (isoDate) => {
        set({ lastSyncDate: isoDate });
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
    }),
    {
      name: 'finance-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const getFinanceBackupState = (): FinanceBackupState => {
  const state = useFinanceStore.getState();

  return {
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    lastSyncDate: state.lastSyncDate,
    currentWorkspaceId: state.currentWorkspaceId,
    workspaces: state.workspaces,
    transactions: state.transactions,
    categories: state.categories,
    recurringTemplates: state.recurringTemplates,
  };
};