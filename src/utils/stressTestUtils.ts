import * as LocalAuthentication from 'expo-local-authentication';

import { processFinanceCommand, type GeminiFailureMode } from '../services/geminiService';
import { importData } from './backupService';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Transaction, WorkspaceId } from '../types/finance.types';

interface MassDataResult {
  inserted: number;
  workspaceCount: number;
  windowMonths: number;
}

interface RaceLeak {
  expectedWorkspaceId: string;
  actualWorkspaceId: string;
  transactionId: string;
}

interface WorkspaceRaceResult {
  created: number;
  leaked: number;
  leaks: RaceLeak[];
}

interface CorruptedImportCaseResult {
  name: string;
  unchanged: boolean;
}

interface CorruptedImportResult {
  safe: boolean;
  results: CorruptedImportCaseResult[];
}

interface PermissionSnapshot {
  biometrics: {
    hasHardware: boolean;
    isEnrolled: boolean;
  };
  notifications: {
    granted: boolean;
    canAskAgain: boolean;
    status?: string;
  };
}

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomBetween = (min: number, max: number): number => {
  return Number((Math.random() * (max - min) + min).toFixed(2));
};

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const pickWorkspaceIds = (): WorkspaceId[] => {
  const { workspaces } = useFinanceStore.getState();
  return workspaces.map((workspace) => workspace.id);
};

const pickCategoryId = (workspaceId: WorkspaceId): string => {
  const { categories } = useFinanceStore.getState();
  const validCategories = categories.filter(
    (category) =>
      category.workspaceId === workspaceId &&
      !category.id.startsWith('internal-transfer-')
  );

  if (validCategories.length === 0) {
    return 'uncategorized';
  }

  return validCategories[randomInt(0, validCategories.length - 1)]?.id || 'uncategorized';
};

const randomDateInPastMonths = (monthsBack: number): string => {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - monthsBack);

  const timestamp = randomInt(start.getTime(), now.getTime());
  return new Date(timestamp).toISOString();
};

export const injectMassiveTransactions = (
  count = 1000,
  monthsBack = 6
): MassDataResult => {
  const workspaceIds = pickWorkspaceIds();

  if (workspaceIds.length === 0) {
    return {
      inserted: 0,
      workspaceCount: 0,
      windowMonths: monthsBack,
    };
  }

  const currentState = useFinanceStore.getState();
  const generated: Transaction[] = [];

  for (let index = 0; index < count; index += 1) {
    const workspaceId =
      workspaceIds[randomInt(0, workspaceIds.length - 1)] || workspaceIds[0] || '';
    const type = Math.random() > 0.52 ? 'expense' : 'income';

    generated.push({
      id: `stress-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      amount: randomBetween(8, 4800),
      type,
      categoryId: pickCategoryId(workspaceId),
      date: randomDateInPastMonths(monthsBack),
      workspaceId,
      note: `[STRESS] item ${index + 1}`,
      isRecurring: false,
    });
  }

  useFinanceStore.setState({
    transactions: [...generated, ...currentState.transactions],
  });

  return {
    inserted: generated.length,
    workspaceCount: workspaceIds.length,
    windowMonths: monthsBack,
  };
};

export const runGeminiFailureSimulation = async (
  text: string,
  mode: Exclude<GeminiFailureMode, 'none'>
) => {
  return processFinanceCommand(text, { failureMode: mode, timeoutMs: 8000 });
};

export const runWorkspaceSwitchRace = async (): Promise<WorkspaceRaceResult> => {
  const { setWorkspace, addTransaction, currentWorkspaceId, transactions } =
    useFinanceStore.getState();

  const baseWorkspaceIds = pickWorkspaceIds();
  if (baseWorkspaceIds.length < 3) {
    return {
      created: 0,
      leaked: 0,
      leaks: [],
    };
  }

  const workspaceIds = baseWorkspaceIds.slice(0, 3);
  const initialIds = new Set(transactions.map((item) => item.id));
  const startedAt = Date.now();
  let cursor = 0;

  while (Date.now() - startedAt < 1800) {
    const workspaceId = workspaceIds[cursor % workspaceIds.length] || currentWorkspaceId;
    setWorkspace(workspaceId);

    addTransaction({
      amount: randomBetween(11, 99),
      type: 'expense',
      categoryId: pickCategoryId(workspaceId),
      date: new Date().toISOString(),
      note: `[RACE:${workspaceId}] validate-isolation`,
      isRecurring: false,
    });

    cursor += 1;
    await wait(120);
  }

  const after = useFinanceStore
    .getState()
    .transactions.filter((item) => !initialIds.has(item.id) && item.note?.startsWith('[RACE:'));

  const leaks: RaceLeak[] = after
    .map((tx) => {
      const match = tx.note?.match(/\[RACE:([^\]]+)\]/);
      const expectedWorkspaceId = match?.[1] || '';

      if (expectedWorkspaceId && expectedWorkspaceId !== tx.workspaceId) {
        return {
          expectedWorkspaceId,
          actualWorkspaceId: tx.workspaceId,
          transactionId: tx.id,
        };
      }

      return null;
    })
    .filter((item): item is RaceLeak => item !== null);

  return {
    created: after.length,
    leaked: leaks.length,
    leaks,
  };
};

export const runCorruptedImportGuardTest = async (): Promise<CorruptedImportResult> => {
  const stateBefore = JSON.stringify(useFinanceStore.getState());

  const cases = [
    { name: 'json-malformado', payload: '{"transactions": [' },
    { name: 'json-incompleto', payload: JSON.stringify({ workspaces: [] }) },
    {
      name: 'json-estrutura-invalida',
      payload: JSON.stringify({
        hasCompletedOnboarding: true,
        lastSyncDate: '',
        currentWorkspaceId: 'personal',
        workspaces: 'errado',
        transactions: [],
        categories: [],
        recurringTemplates: [],
      }),
    },
  ];

  const results: CorruptedImportCaseResult[] = [];

  for (const testCase of cases) {
    await importData(testCase.payload);
    const currentSnapshot = JSON.stringify(useFinanceStore.getState());
    results.push({
      name: testCase.name,
      unchanged: currentSnapshot === stateBefore,
    });
  }

  return {
    safe: results.every((item) => item.unchanged),
    results,
  };
};

export const getPermissionFallbackSnapshot = async (): Promise<PermissionSnapshot> => {
  const notificationPermissionsPromise = import('expo-notifications')
    .then((Notifications) => Notifications.getPermissionsAsync())
    .catch(() => ({
      granted: false,
      canAskAgain: false,
      status: undefined,
    }));

  const [hasHardware, isEnrolled, notificationPermissions] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    notificationPermissionsPromise,
  ]);

  return {
    biometrics: {
      hasHardware,
      isEnrolled,
    },
    notifications: {
      granted: Boolean(notificationPermissions.granted),
      canAskAgain: Boolean(notificationPermissions.canAskAgain),
      status:
        typeof notificationPermissions.status === 'string'
          ? notificationPermissions.status
          : undefined,
    },
  };
};
