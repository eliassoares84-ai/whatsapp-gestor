import Constants from 'expo-constants';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { useFinanceStore } from '../store/useFinanceStore';
import { syncBackupToCloudOnce } from '../utils/GoogleDriveService';

const NIGHTLY_AUTO_BACKUP_TASK = 'nightly-auto-backup-task';

const isExpoGo = Constants.appOwnership === 'expo';

const isSameLocalDay = (firstIso: string, second: Date): boolean => {
  if (!firstIso) {
    return false;
  }

  const first = new Date(firstIso);
  if (Number.isNaN(first.getTime())) {
    return false;
  }

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
};

const shouldRunNightlyBackupNow = (): boolean => {
  const state = useFinanceStore.getState();

  if (!state.nightlyAutoBackupEnabled) {
    return false;
  }

  if (!state.googleLinkedEmail.trim()) {
    return false;
  }

  const now = new Date();

  if (now.getHours() < state.nightlyAutoBackupHour) {
    return false;
  }

  if (isSameLocalDay(state.lastAutoBackupAt, now)) {
    return false;
  }

  return true;
};

try {
  if (!TaskManager.isTaskDefined(NIGHTLY_AUTO_BACKUP_TASK)) {
    TaskManager.defineTask(NIGHTLY_AUTO_BACKUP_TASK, async () => {
      try {
        if (!shouldRunNightlyBackupNow()) {
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        const now = new Date();
        const synced = await syncBackupToCloudOnce();

        if (synced) {
          useFinanceStore.getState().setLastAutoBackupAt(now.toISOString());
          return BackgroundFetch.BackgroundFetchResult.NewData;
        }

        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch {
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }
} catch (e) {
  // Silent fail during module load if native module is not ready
}

const canUseBackgroundFetch = async (): Promise<boolean> => {
  if (isExpoGo) {
    return false;
  }

  try {
    const status = await BackgroundFetch.getStatusAsync();
    return status === BackgroundFetch.BackgroundFetchStatus.Available;
  } catch {
    return false;
  }
};

export const registerNightlyAutoBackupTask = async (): Promise<boolean> => {
  if (!(await canUseBackgroundFetch())) {
    return false;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(NIGHTLY_AUTO_BACKUP_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(NIGHTLY_AUTO_BACKUP_TASK, {
        minimumInterval: 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }

    return true;
  } catch {
    return false;
  }
};

export const unregisterNightlyAutoBackupTask = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(NIGHTLY_AUTO_BACKUP_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(NIGHTLY_AUTO_BACKUP_TASK);
    }
  } catch {
    // No-op
  }
};

export const ensureNightlyAutoBackupTaskRegistration = async (
  enabled: boolean
): Promise<void> => {
  if (enabled) {
    await registerNightlyAutoBackupTask();
    return;
  }

  await unregisterNightlyAutoBackupTask();
};
