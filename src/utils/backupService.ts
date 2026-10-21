import { Share } from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  getFinanceBackupState,
  type FinanceBackupState,
  useFinanceStore,
} from '../store/useFinanceStore';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export type BackupExportErrorCode =
  | 'serialize_failed'
  | 'no_writable_dir'
  | 'write_failed';

export interface ExportDataResult {
  ok: boolean;
  fileUri?: string;
  shared?: boolean;
  errorCode?: BackupExportErrorCode;
}

export type BackupImportErrorCode =
  | 'invalid_json'
  | 'invalid_structure'
  | 'apply_failed';

export interface ImportDataResult {
  ok: boolean;
  errorCode?: BackupImportErrorCode;
}

const isValidBackupPayload = (value: unknown): value is FinanceBackupState => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.hasCompletedOnboarding === 'boolean' &&
    typeof value.lastSyncDate === 'string' &&
    typeof value.currentWorkspaceId === 'string' &&
    Array.isArray(value.workspaces) &&
    Array.isArray(value.transactions) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.recurringTemplates)
  );
};

export const exportData = async (): Promise<ExportDataResult> => {
  const backupPayload = getFinanceBackupState();
  let jsonString = '';

  try {
    jsonString = JSON.stringify(backupPayload, null, 2);
  } catch {
    return { ok: false, errorCode: 'serialize_failed' };
  }

  try {
    const baseDir =
      FileSystem.documentDirectory ||
      FileSystem.cacheDirectory;

    if (!baseDir) {
      return { ok: false, errorCode: 'no_writable_dir' };
    }

    const backupDir = `${baseDir}backups/`;
    await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });

    const fileUri = `${backupDir}seugestor-backup-${Date.now()}.json`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      return { ok: false, errorCode: 'write_failed' };
    }

    let shared = false;

    if (await Sharing.isAvailableAsync()) {
      try {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Gerar Backup Completo',
          UTI: 'public.json',
        });
        shared = true;
      } catch {
        shared = false;
      }
    }

    if (!shared) {
      try {
        await Share.share({
          title: 'Backup do SeuGestor',
          message: fileUri,
          url: fileUri,
        });
        shared = true;
      } catch {
        shared = false;
      }
    }

    return { ok: true, fileUri, shared };
  } catch {
    return { ok: false, errorCode: 'write_failed' };
  }
};

export const importData = async (jsonString: string): Promise<ImportDataResult> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString) as unknown;
  } catch {
    return { ok: false, errorCode: 'invalid_json' };
  }

  if (!isValidBackupPayload(parsed)) {
    return { ok: false, errorCode: 'invalid_structure' };
  }

  try {
    const previousWorkspaceId = useFinanceStore.getState().currentWorkspaceId;
    const restoredWorkspaces = parsed.workspaces.map((workspace) => ({
      ...workspace,
      creditCards: (workspace as any).creditCards || [],
    }));

    const resolvedWorkspaceId = restoredWorkspaces.some(
      (workspace) => workspace.id === previousWorkspaceId
    )
      ? previousWorkspaceId
      : parsed.currentWorkspaceId;

    useFinanceStore.setState({
      hasCompletedOnboarding: parsed.hasCompletedOnboarding,
      hasCompletedGoogleLinkPrompt:
        parsed.hasCompletedGoogleLinkPrompt ?? false,
      hasCompletedQuiz: parsed.hasCompletedQuiz ?? false,
      hideBalances: parsed.hideBalances ?? true,
      hasSeenDashboardTour:
        parsed.hasSeenDashboardTour ?? parsed.hasSeenTour ?? false,
      hasSeenCardsTour: parsed.hasSeenCardsTour ?? false,
      hasSeenReportsTour: parsed.hasSeenReportsTour ?? false,
      userProfile: parsed.userProfile || {},
      googleLinkedName: parsed.googleLinkedName || '',
      googleLinkedEmail: parsed.googleLinkedEmail || '',
      googleLinkedPhotoUrl: parsed.googleLinkedPhotoUrl || '',
      lastSyncDate: parsed.lastSyncDate,
      nightlyAutoBackupEnabled: parsed.nightlyAutoBackupEnabled ?? false,
      nightlyAutoBackupHour: parsed.nightlyAutoBackupHour ?? 22,
      nightlyAutoBackupActivatedAt: parsed.nightlyAutoBackupActivatedAt ?? '',
      lastAutoBackupAt: parsed.lastAutoBackupAt ?? '',
      currentWorkspaceId: resolvedWorkspaceId,
      workspaces: restoredWorkspaces,
      transactions: parsed.transactions.map((transaction) => ({
        paymentMethod: 'cash',
        excludeFromCharts: false,
        ...transaction,
      })),
      categories: parsed.categories,
      recurringTemplates: parsed.recurringTemplates,
    });

    return { ok: true };
  } catch {
    return { ok: false, errorCode: 'apply_failed' };
  }
};