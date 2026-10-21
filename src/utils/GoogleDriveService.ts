import { Platform } from 'react-native';

import { financeStorageAdapter } from '../storage/asyncStorageAdapter';
import { getFinanceBackupState, useFinanceStore } from '../store/useFinanceStore';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILE_NAME = 'finance_backup.json';
let cachedAccessToken: string | null = null;

const normalizeClientId = (value?: string): string | undefined => {
  const trimmed = value?.trim();

  if (!trimmed || /^SEU_/i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
};

export const GOOGLE_DRIVE_SCOPE = DRIVE_SCOPE;

const isGoogleConfiguredForCurrentPlatform = (): boolean => {
  const iosClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const androidClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  const webClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

  if (Platform.OS === 'android') {
    return Boolean(androidClientId || webClientId);
  }

  if (Platform.OS === 'ios') {
    return Boolean(iosClientId || webClientId);
  }

  return Boolean(webClientId);
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    void financeStorageAdapter.setItem('@google_access_token', token);
  } else {
    void financeStorageAdapter.removeItem('@google_access_token');
  }
};

export const getGoogleAccessToken = (): string | null => cachedAccessToken;

interface DriveFile {
  id: string;
  name: string;
}

export type RestoreBackupFromCloudResult =
  | { ok: true; backupJson: string }
  | { ok: false; reason: 'missing_session' | 'missing_file' | 'request_failed' };

const requireAccessToken = (accessToken: string | null): string | null => {
  if (!accessToken) {
    console.warn('Tentativa de chamada ao Google Drive sem token ativo.');
    return null;
  }

  return accessToken;
};

const tryNativeSilentSignIn = async (): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    const nativeModule = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    const webClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

    nativeModule.GoogleSignin.configure({
      scopes: [DRIVE_SCOPE, 'email', 'profile', 'openid'],
      ...(webClientId ? { webClientId } : {}),
    });

    await nativeModule.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    const result = await nativeModule.GoogleSignin.signInSilently();

    if (!nativeModule.isSuccessResponse(result as any)) {
      return null;
    }

    const tokens = await nativeModule.GoogleSignin.getTokens();
    const token = tokens.accessToken;

    if (token) {
      cachedAccessToken = token;
    }

    return token || null;
  } catch {
    return null;
  }
};

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
  if (!accessToken) {
    console.warn('Tentativa de chamada ao Google Drive sem token ativo.');
    return null;
  }

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

const ensureAuthenticated = async (): Promise<string | null> => {
  if (!isGoogleConfiguredForCurrentPlatform()) {
    return null;
  }

  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const storedToken = await financeStorageAdapter.getItem('@google_access_token');
  if (storedToken) {
    cachedAccessToken = storedToken;
    return storedToken;
  }

  // Token perdido após reinício — tenta silent sign-in nativo
  const silentToken = await tryNativeSilentSignIn();
  if (silentToken) {
    setGoogleAccessToken(silentToken);
    return silentToken;
  }

  return null;
};

export const syncBackupToCloudOnce = async (): Promise<boolean | null> => {
  try {
    const token = requireAccessToken(await ensureAuthenticated());

    if (!token) {
      return null;
    }

    const backupState = getFinanceBackupState();
    const backupJson = JSON.stringify(backupState);

    const existingFile = await findBackupFile(token);
    const boundary = `backup-boundary-${Date.now()}`;
    
    // Na API v3 do Google Drive, PATCH não aceita 'parents' no corpo da requisição
    const metadata = existingFile
      ? { name: BACKUP_FILE_NAME }
      : { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };

    const body = buildMultipartBody(metadata, backupJson, boundary);

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

    if (uploadResponse.status === 401) {
      console.warn('[GoogleDrive] Sessão expirada (401). Limpando token.');
      setGoogleAccessToken(null);
      return null;
    }

    if (!uploadResponse.ok) {
      console.warn('[GoogleDrive] Falha no upload:', uploadResponse.status);
      return false;
    }

    useFinanceStore.getState().setLastSyncDate(new Date().toISOString());
    return true;
  } catch (err) {
    console.error('[GoogleDrive] Erro na sincronização:', err);
    return false;
  }
};

export const useGoogleDriveService = () => {
  const iosClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const androidClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  const webClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

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

  const syncBackupToCloud = syncBackupToCloudOnce;

  const restoreBackupFromCloud = async (): Promise<RestoreBackupFromCloudResult> => {
    try {
      const token = requireAccessToken(await ensureAuthenticated());

      if (!token) {
        return { ok: false, reason: 'missing_session' };
      }

      const existingFile = await findBackupFile(token);

      if (!existingFile) {
        return { ok: false, reason: 'missing_file' };
      }

      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (fileResponse.status === 401) {
        setGoogleAccessToken(null);
        return { ok: false, reason: 'missing_session' };
      }

      if (!fileResponse.ok) {
        return { ok: false, reason: 'request_failed' };
      }

      const jsonString = await fileResponse.text();
      return { ok: true, backupJson: jsonString };
    } catch {
      return { ok: false, reason: 'request_failed' };
    }
  };

  return {
    isAuthenticated,
    syncBackupToCloud,
    restoreBackupFromCloud,
  };
};