import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFinanceStore } from '../store/useFinanceStore';
import { exportData, importData } from '../utils/backupService';
import { useGoogleDriveService } from '../utils/GoogleDriveService';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

interface BackupScreenProps {
  onBack: () => void;
}

export const BackupScreen: React.FC<BackupScreenProps> = ({ onBack }) => {
  const { currentWorkspaceId, workspaces } = useFinanceStore();
  const { restoreBackupFromCloud, syncBackupToCloud } = useGoogleDriveService();

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const accentColor = currentWorkspace?.themeColor || '#0A84FF';

  const handleRestoreData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

        const asset = result.assets?.[0];
        if (!asset) return;
        const jsonString = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: ((FileSystem as any).EncodingType?.UTF8) || 'utf8',
      });

      const restored = await importData(jsonString);

      if (restored) {
        Alert.alert('Backup restaurado', 'Os dados foram restaurados com sucesso.');
      }
    } catch {
      Alert.alert(
        'Falha ao restaurar',
        'Nao foi possivel ler o arquivo selecionado.'
      );
    }
  };

  const handleRestoreFromCloud = async () => {
    const restored = await restoreBackupFromCloud();

    if (!restored) {
      Alert.alert(
        'Sincronização pendente',
        'Nao foi possivel restaurar o backup da nuvem neste momento.'
      );
      return;
    }

    Alert.alert('Backup restaurado', 'Dados restaurados com sucesso da nuvem.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: APP_BG }]}> 
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={TEXT_PRIMARY} />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: TEXT_PRIMARY }]}>Backup e Restauracao</Text>
          <Text style={[styles.subtitle, { color: TEXT_SECONDARY }]}>Proteja seus dados e recupere o ambiente quando precisar.</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: CARD_BG }]}> 
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="cloud-upload-outline" size={22} color={accentColor} />
          <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>Gerar Backup Completo</Text>
        </View>

        <Text style={[styles.helperText, { color: TEXT_SECONDARY }]}>Salve este arquivo em um local seguro, como seu Google Drive ou E-mail.</Text>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: accentColor }]}
          onPress={() => void exportData()}
        >
          <Text style={styles.primaryButtonText}>Gerar Backup Completo</Text>
        </Pressable>

        <Pressable
          style={[styles.cloudButton, { borderColor: accentColor }]}
          onPress={() => void syncBackupToCloud()}
        >
          <Text style={[styles.cloudButtonText, { color: accentColor }]}>Sincronizar com Google Drive</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: CARD_BG }]}> 
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="cloud-download-outline" size={22} color="#FFB020" />
          <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>Restaurar Dados</Text>
        </View>

        <Text style={[styles.helperText, { color: TEXT_SECONDARY }]}>Isso substituirá todos os dados atuais pelos do arquivo selecionado.</Text>

        <Pressable style={styles.secondaryButton} onPress={() => void handleRestoreData()}>
          <Text style={[styles.secondaryButtonText, { color: TEXT_PRIMARY }]}>Restaurar Dados</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => void handleRestoreFromCloud()}>
          <Text style={[styles.secondaryButtonText, { color: TEXT_PRIMARY }]}>Restaurar da Nuvem</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: '#0A0A0A',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cloudButton: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
  },
  cloudButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});