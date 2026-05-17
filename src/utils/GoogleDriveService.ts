import { Platform } from 'react-native';

import { getFinanceBackupState, useFinanceStore } from '../store/useFinanceStore';
import { importData } from './backupService';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILE_NAME = 'finance_backup.json';
let cachedAccessToken: string | null = null;

interface DriveFile {
  id: string;
  name: string;
}

const buildMultipartBody = (
  metadata: Record<string, unknown>,
  content: string,
  boundary: string
): string => {
  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
};

const findBackupFile = async (accessToken: string): Promise<DriveFile | null> => {
  const query = encodeURIComponent(
    `name='${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`
  );

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name)&pageSize=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { files?: DriveFile[] };
  return data.files?.[0] || null;
};

export const useGoogleDriveService = () => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  const isGoogleConfigured = (() => {
    if (Platform.OS === 'android') {
      return Boolean(androidClientId || webClientId);
    }

    if (Platform.OS === 'ios') {
      return Boolean(iosClientId || webClientId);
    }

    return Boolean(webClientId);
  })();

  const isAuthenticated = Boolean(cachedAccessToken);

  const ensureAuthenticated = async (): Promise<string | null> => {
    if (!isGoogleConfigured) {
      return null;
    }

    if (cachedAccessToken) {
      return cachedAccessToken;
    }

    // In Expo Go we keep cloud sync disabled unless an auth token is already cached.
    // This avoids runtime crashes caused by provider auth configuration during render.
    return null;
  };

  const syncBackupToCloud = async (): Promise<boolean> => {
    try {
      const token = await ensureAuthenticated();

      if (!token) {
        return false;
      }

      const backupState = getFinanceBackupState();
      const backupJson = JSON.stringify(backupState);

      const existingFile = await findBackupFile(token);
      const boundary = `backup-boundary-${Date.now()}`;
      const body = buildMultipartBody(
        {
          name: BACKUP_FILE_NAME,
          parents: ['appDataFolder'],
        },
        backupJson,
        boundary
      );

      const method = existingFile ? 'PATCH' : 'POST';
      const endpoint = existingFile
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const uploadResponse = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      if (!uploadResponse.ok) {
        return false;
      }

      useFinanceStore.getState().setLastSyncDate(new Date().toISOString());
      return true;
    } catch {
      return false;
    }
  };

  const restoreBackupFromCloud = async (): Promise<boolean> => {
    try {
      const token = await ensureAuthenticated();

      if (!token) {
        return false;
      }

      const existingFile = await findBackupFile(token);

      if (!existingFile) {
        return false;
      }

      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!fileResponse.ok) {
        return false;
      }

      const jsonString = await fileResponse.text();
      return await importData(jsonString);
    } catch {
      return false;
    }
  };

  return {
    isAuthenticated,
    syncBackupToCloud,
    restoreBackupFromCloud,
  };
};