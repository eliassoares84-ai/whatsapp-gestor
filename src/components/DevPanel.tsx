import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  runCorruptedImportGuardTest,
  runGeminiFailureSimulation,
  runWorkspaceSwitchRace,
  injectMassiveTransactions,
  getPermissionFallbackSnapshot,
} from '../utils/stressTestUtils';
import { useFinanceStore } from '../store/useFinanceStore';

const DEV_BG = '#1A1A1A';
const DEV_CARD = '#2A2A2A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#AAAAAA';
const ACCENT_GREEN = '#d2ff61';
const ACCENT_BLUE = '#0A84FF';

interface DevLog {
  timestamp: string;
  test: string;
  result: string;
}

interface DevPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const DevPanel: React.FC<DevPanelProps> = ({ visible, onClose }) => {
  const [logs, setLogs] = useState<DevLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentWorkspaceId, transactions, setWorkspace, workspaces } =
    useFinanceStore();

  const addLog = (test: string, result: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('pt-BR');
    setLogs((prev) => [{ timestamp, test, result }, ...prev].slice(0, 20));
  };

  const handleInjectTransactions = async () => {
    setIsLoading(true);
    try {
      const result = injectMassiveTransactions(1000, 6);
      addLog(
        'Injetar 1.000 Transações',
        `Inseridas: ${result.inserted}, Workspaces: ${result.workspaceCount}`
      );
      Alert.alert(
        'Injeção concluída',
        `${result.inserted} transações criadas em ${result.windowMonths} meses.`
      );
    } catch (error) {
      addLog('Injetar 1.000 Transações', `Erro: ${String(error)}`);
      Alert.alert('Erro', 'Falha na injeção de transações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeminiFailure = () => {
    const options = ['Offline', 'Timeout', 'Cancelar'];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: 2 },
      async (buttonIndex) => {
        if (buttonIndex === 2 || buttonIndex === -1) return;
        const modes: ('offline' | 'timeout')[] = ['offline', 'timeout'];
        const mode = modes[buttonIndex];

        if (!mode) return;

        setIsLoading(true);
        try {
          const result = await runGeminiFailureSimulation(
            'Teste de falha: gastei 50 reais',
            mode
          );
          addLog(
            `Simular Falha Gemini (${mode})`,
            result.confirmationMsg.substring(0, 50)
          );
          Alert.alert('Resultado', result.confirmationMsg);
        } catch (error) {
          addLog(`Simular Falha Gemini (${mode})`, `Erro: ${String(error)}`);
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const handleWorkspaceRace = async () => {
    if (workspaces.length < 3) {
      Alert.alert(
        'Aviso',
        'Precisam de pelo menos 3 workspaces para testar concorrência.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await runWorkspaceSwitchRace();
      addLog(
        'Teste de Corrida (Workspaces)',
        `Criadas: ${result.created}, Vazadas: ${result.leaked}`
      );
      Alert.alert(
        'Resultado do Teste de Corrida',
        `Transações criadas: ${result.created}\nVazamentos detectados: ${result.leaked}\n\nVazamentos seguros se leaked = 0`
      );
    } catch (error) {
      addLog('Teste de Corrida', `Erro: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCorruptedImport = async () => {
    setIsLoading(true);
    try {
      const result = await runCorruptedImportGuardTest();
      const allSafe = result.results.every((r) => r.unchanged);
      addLog(
        'Teste de Importação Corrompida',
        `Seguro: ${allSafe}, Testes: ${result.results.length}`
      );
      Alert.alert(
        'Resultado do Teste de Importação',
        `Todos os dados foram preservados: ${result.safe ? 'SIM ✓' : 'NÃO ✗'}`
      );
    } catch (error) {
      addLog('Teste de Importação Corrompida', `Erro: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionSnapshot = async () => {
    try {
      const snapshot = await getPermissionFallbackSnapshot();
      const msg = `Biometria: Hardware=${snapshot.biometrics.hasHardware}, Inscrito=${snapshot.biometrics.isEnrolled}\nNotificações: ${snapshot.notifications.granted ? 'Concedidas' : 'Negadas'}`;
      addLog('Snapshot de Permissões', msg.substring(0, 40));
      Alert.alert('Permissões Atuais', msg);
    } catch (error) {
      addLog('Snapshot de Permissões', `Erro: ${String(error)}`);
    }
  };

  const handleClearWorkspace = () => {
    Alert.alert(
      'Limpar Tudo?',
      `Remover todas as transações do workspace "${
        workspaces.find((w) => w.id === currentWorkspaceId)?.name ||
        'Desconhecido'
      }"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            useFinanceStore.setState({
              transactions: useFinanceStore
                .getState()
                .transactions.filter((tx) => tx.workspaceId !== currentWorkspaceId),
            });
            addLog('Limpar Tudo', 'Transações do workspace removidas');
            Alert.alert('Limpeza concluída', 'Dados removidos com sucesso.');
          },
        },
      ]
    );
  };

  const logsText = logs.length === 0
    ? 'Nenhum log ainda...'
    : logs.map((log) => `${log.timestamp} | ${log.test}\n${log.result}`).join('\n\n');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
        <View style={[styles.panel, { backgroundColor: DEV_BG }]}>
          {/* Header */}
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: TEXT_PRIMARY }]}>
              🛠️ Dev Panel (Testes de Estresse)
            </Text>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={28}
                color={TEXT_SECONDARY}
              />
            </Pressable>
          </View>

          <ScrollView style={styles.panelContent}>
            {/* Buttons */}
            <View style={styles.buttonGrid}>
              <Pressable
                style={[styles.devButton, { backgroundColor: DEV_CARD }]}
                onPress={handleInjectTransactions}
                disabled={isLoading}
              >
                <MaterialCommunityIcons
                  name="database-plus"
                  size={24}
                  color={ACCENT_GREEN}
                />
                <Text style={[styles.buttonLabel, { color: TEXT_PRIMARY }]}>
                  Injetar 1.000
                </Text>
              </Pressable>

              <Pressable
                style={[styles.devButton, { backgroundColor: DEV_CARD }]}
                onPress={handleGeminiFailure}
                disabled={isLoading}
              >
                <MaterialCommunityIcons
                  name="wifi-off"
                  size={24}
                  color={'#FFB020'}
                />
                <Text style={[styles.buttonLabel, { color: TEXT_PRIMARY }]}>
                  Falha Gemini
                </Text>
              </Pressable>

              <Pressable
                style={[styles.devButton, { backgroundColor: DEV_CARD }]}
                onPress={handleWorkspaceRace}
                disabled={isLoading}
              >
                <MaterialCommunityIcons
                  name="run-fast"
                  size={24}
                  color={ACCENT_BLUE}
                />
                <Text style={[styles.buttonLabel, { color: TEXT_PRIMARY }]}>
                  Teste Corrida
                </Text>
              </Pressable>

              <Pressable
                style={[styles.devButton, { backgroundColor: DEV_CARD }]}
                onPress={handleCorruptedImport}
                disabled={isLoading}
              >
                <MaterialCommunityIcons
                  name="shield-alert"
                  size={24}
                  color={'#FF453A'}
                />
                <Text style={[styles.buttonLabel, { color: TEXT_PRIMARY }]}>
                  JSON Corrompido
                </Text>
              </Pressable>

              <Pressable
                style={[styles.devButton, { backgroundColor: DEV_CARD }]}
                onPress={handlePermissionSnapshot}
                disabled={isLoading}
              >
                <MaterialCommunityIcons
                  name="lock-check"
                  size={24}
                  color={'#30D158'}
                />
                <Text style={[styles.buttonLabel, { color: TEXT_PRIMARY }]}>
                  Permissões
                </Text>
              </Pressable>

              <Pressable
                style={[styles.devButton, { backgroundColor: DEV_CARD }]}
                onPress={handleClearWorkspace}
                disabled={isLoading}
              >
                <MaterialCommunityIcons
                  name="trash-can"
                  size={24}
                  color={'#FF453A'}
                />
                <Text style={[styles.buttonLabel, { color: TEXT_PRIMARY }]}>
                  Limpar Tudo
                </Text>
              </Pressable>
            </View>

            {isLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={ACCENT_GREEN} />
                <Text style={[styles.loadingText, { color: TEXT_SECONDARY }]}>
                  Executando...
                </Text>
              </View>
            )}

            {/* Logs */}
            <View style={[styles.logsContainer, { backgroundColor: DEV_CARD }]}>
              <Text style={[styles.logsTitle, { color: TEXT_PRIMARY }]}>
                Logs (últimas 20)
              </Text>
              <Text style={[styles.logsText, { color: TEXT_SECONDARY }]}>
                {logsText}
              </Text>
            </View>

            {/* Stats */}
            <View style={[styles.statsContainer, { backgroundColor: DEV_CARD }]}>
              <Text style={[styles.statsTitle, { color: TEXT_PRIMARY }]}>
                Estado Atual
              </Text>
              <Text style={[styles.statLine, { color: TEXT_SECONDARY }]}>
                • Transações totais: {transactions.length}
              </Text>
              <Text style={[styles.statLine, { color: TEXT_SECONDARY }]}>
                • Workspace ativo: {currentWorkspaceId}
              </Text>
              <Text style={[styles.statLine, { color: TEXT_SECONDARY }]}>
                • Workspaces: {workspaces.length}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  panel: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  panelContent: {
    padding: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  devButton: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  logsContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    maxHeight: 200,
  },
  logsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  logsText: {
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  statsContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  statLine: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
});
