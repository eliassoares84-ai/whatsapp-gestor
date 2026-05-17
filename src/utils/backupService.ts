import { Alert, Share } from 'react-native';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  getFinanceBackupState,
  type FinanceBackupState,
  useFinanceStore,
} from '../store/useFinanceStore';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

export const exportData = async (): Promise<void> => {
  const backupPayload = getFinanceBackupState();
  const jsonString = JSON.stringify(backupPayload, null, 2);

  try {
    const cacheDir = (FileSystem as any).cacheDirectory;
    const fileUri = `${cacheDir}micro-erp-backup-${Date.now()}.json`;

    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: ((FileSystem as any).EncodingType?.UTF8) || 'utf8',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Gerar Backup Completo',
        UTI: 'public.json',
      });
      return;
    }

    await Share.share({
      title: 'Backup do Micro-ERP',
      message: jsonString,
    });
  } catch {
    Alert.alert(
      'Falha ao exportar',
      'Nao foi possivel gerar o backup neste momento.'
    );
  }
};

export const importData = async (jsonString: string): Promise<boolean> => {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    if (!isValidBackupPayload(parsed)) {
      Alert.alert(
        'Arquivo invalido',
        'O JSON informado nao possui a estrutura esperada do backup.'
      );
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Restaurar dados?',
        'Isso apagará os dados atuais e substituirá tudo pelo backup selecionado.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: () => {
              useFinanceStore.setState({
                hasCompletedOnboarding: parsed.hasCompletedOnboarding,
                lastSyncDate: parsed.lastSyncDate,
                currentWorkspaceId: parsed.currentWorkspaceId,
                workspaces: parsed.workspaces,
                transactions: parsed.transactions,
                categories: parsed.categories,
                recurringTemplates: parsed.recurringTemplates,
              });

              resolve(true);
            },
          },
        ]
      );
    });
  } catch {
    Alert.alert(
      'Falha ao restaurar',
      'O arquivo selecionado nao e um JSON valido.'
    );
    return false;
  }
};