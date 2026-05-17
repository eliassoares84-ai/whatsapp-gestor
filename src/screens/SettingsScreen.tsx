import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackupScreen } from './BackupScreen';
import { DevPanel } from '../components/DevPanel';
import { RecurringTemplateModal } from '../components/RecurringTemplateModal';
import { useFinanceStore } from '../store/useFinanceStore';
import { WorkspaceEditModal } from '../components/WorkspaceEditModal';
import { useGoogleDriveService } from '../utils/GoogleDriveService';
import type { Category, RecurringTemplate, Workspace } from '../types/finance.types';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

type ModalMode = 'create' | 'edit' | 'closed';

interface ModalState {
  mode: ModalMode;
  workspace?: Workspace;
}

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    workspaces,
    updateWorkspace,
    addWorkspace,
    recurringTemplates,
    categories,
    currentWorkspaceId,
    lastSyncDate,
    setCategoryBudget,
    toggleRecurringTemplate,
    addRecurringTemplate,
    updateRecurringTemplate,
    deleteRecurringTemplate,
  } = useFinanceStore();
  const { syncBackupToCloud } = useGoogleDriveService();
  const [modalState, setModalState] = useState<ModalState>({ mode: 'closed' });
  const [isRecurringModalVisible, setIsRecurringModalVisible] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<RecurringTemplate | null>(null);
  const [isBackupScreenVisible, setIsBackupScreenVisible] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [versionClickCount, setVersionClickCount] = useState(0);
  const [devPanelVisible, setDevPanelVisible] = useState(false);

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const accentColor = currentWorkspace?.themeColor || '#0A84FF';

  const currentWorkspaceTemplates = useMemo(
    () =>
      recurringTemplates.filter(
        (template) => template.workspaceId === currentWorkspaceId
      ),
    [recurringTemplates, currentWorkspaceId]
  );

  const currentWorkspaceCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.workspaceId === currentWorkspaceId &&
          !category.id.includes('internal-transfer')
      ),
    [categories, currentWorkspaceId]
  );

  const handleEditWorkspace = (workspace: Workspace) => {
    setModalState({ mode: 'edit', workspace });
  };

  const handleAddWorkspace = () => {
    setModalState({ mode: 'create' });
  };

  const handleCloseModal = () => {
    setModalState({ mode: 'closed' });
  };

  const handleSaveWorkspace = (
    name: string,
    themeColor: string,
    type: 'personal' | 'business'
  ) => {
    if (modalState.mode === 'edit' && modalState.workspace) {
      updateWorkspace(modalState.workspace.id, {
        name,
        themeColor,
      });
    } else if (modalState.mode === 'create') {
      addWorkspace({
        name,
        type,
        themeColor,
      });
    }

    handleCloseModal();
  };

  const renderWorkspaceItem = ({ item }: { item: Workspace }) => (
    <View style={[styles.workspaceItem, { backgroundColor: CARD_BG }]}>
      {/* Color Circle */}
      <View
        style={[
          styles.colorCircle,
          { backgroundColor: item.themeColor },
        ]}
      />

      {/* Info */}
      <View style={styles.workspaceInfo}>
        <Text style={[styles.workspaceName, { color: TEXT_PRIMARY }]}>
          {item.name}
        </Text>
        <Text style={[styles.workspaceType, { color: TEXT_SECONDARY }]}>
          {item.type === 'personal' ? 'Pessoa Física' : 'Pessoa Jurídica'}
        </Text>
      </View>

      {/* Edit Button */}
      <Pressable
        onPress={() => handleEditWorkspace(item)}
        style={styles.editButton}
      >
        <MaterialCommunityIcons
          name="pencil"
          size={20}
          color={TEXT_SECONDARY}
        />
      </Pressable>
    </View>
  );

  const renderAddButton = () => (
    <Pressable
      onPress={handleAddWorkspace}
      style={[styles.addButton, { borderColor: TEXT_SECONDARY }]}
    >
      <MaterialCommunityIcons
        name="plus"
        size={24}
        color={TEXT_SECONDARY}
      />
      <Text style={[styles.addButtonText, { color: TEXT_SECONDARY }]}>
        Adicionar Novo Negócio
      </Text>
    </Pressable>
  );

  const formatCurrency = (value: number): string =>
    `R$ ${value.toFixed(2).replace('.', ',')}`;

  const getFrequencyLabel = (template: RecurringTemplate): string => {
    if (template.frequency === 'weekly') {
      return `Semanal, dia ${template.dayOfMonth}`;
    }

    if (template.frequency === 'yearly') {
      return `Anual, dia ${template.dayOfMonth}`;
    }

    return `Mensal, dia ${template.dayOfMonth}`;
  };

  const handleSaveRecurringTemplate = (
    payload: Omit<
      RecurringTemplate,
      'id' | 'workspaceId' | 'lastProcessedDate' | 'isActive'
    >,
    templateId?: string
  ) => {
    if (templateId) {
      updateRecurringTemplate(templateId, payload);
      setTemplateToEdit(null);
      setIsRecurringModalVisible(false);
      return;
    }

    addRecurringTemplate(payload);
    setTemplateToEdit(null);
    setIsRecurringModalVisible(false);
  };

  const handleCloseRecurringModal = () => {
    setTemplateToEdit(null);
    setIsRecurringModalVisible(false);
  };

  const handleEditRecurringTemplate = (template: RecurringTemplate) => {
    setTemplateToEdit(template);
    setIsRecurringModalVisible(true);
  };

  const handleDeleteRecurringTemplate = (id: string) => {
    Alert.alert(
      'Excluir Conta Fixa?',
      'Essa ação não afetará os lançamentos passados, apenas os futuros.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteRecurringTemplate(id),
        },
      ]
    );
  };

  const handleOpenBudgetModal = (category: Category) => {
    setSelectedCategory(category);
    setBudgetInput(
      typeof category.budgetLimit === 'number'
        ? category.budgetLimit.toFixed(2).replace('.', ',')
        : ''
    );
    setIsBudgetModalVisible(true);
  };

  const handleCloseBudgetModal = () => {
    setIsBudgetModalVisible(false);
    setSelectedCategory(null);
    setBudgetInput('');
  };

  const handleSaveBudget = () => {
    if (!selectedCategory) {
      return;
    }

    const normalized = budgetInput.replace(/\./g, '').replace(',', '.').trim();

    if (!normalized) {
      setCategoryBudget(selectedCategory.id, null);
      handleCloseBudgetModal();
      return;
    }

    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert('Valor inválido', 'Informe um limite mensal válido.');
      return;
    }

    setCategoryBudget(selectedCategory.id, parsed);
    handleCloseBudgetModal();
  };

  const formatSyncDate = (isoDate: string): string => {
    if (!isoDate) {
      return 'Pendente';
    }

    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return 'Pendente';
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Hoje às ${time}`;
    }

    const day = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });

    return `${day} às ${time}`;
  };

  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    const synced = await syncBackupToCloud();
    setIsSyncingNow(false);

    if (!synced) {
      Alert.alert('Sincronização pendente', 'Não foi possível sincronizar agora.');
    }
  };

  if (isBackupScreenVisible) {
    return <BackupScreen onBack={() => setIsBackupScreenVisible(false)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: APP_BG, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: TEXT_PRIMARY }]}>Meus Ambientes</Text>
          <Text style={[styles.subtitle, { color: TEXT_SECONDARY }]}>
            Gerencie seus workspaces e negócios
          </Text>
        </View>

        <View style={styles.listContainer}>
          {workspaces.map((workspace) => (
            <View key={workspace.id}>{renderWorkspaceItem({ item: workspace })}</View>
          ))}
        </View>

        {renderAddButton()}

        <View style={styles.categorySectionHeader}>
          <Text style={[styles.sectionTitle, { color: TEXT_PRIMARY }]}>Categorias e Limites</Text>
          <Text style={[styles.sectionSubtitle, { color: TEXT_SECONDARY }]}>
            Toque em uma categoria para definir limite mensal de gasto.
          </Text>
        </View>

        {currentWorkspaceCategories.length === 0 ? (
          <View style={[styles.emptyRecurring, { backgroundColor: CARD_BG }]}> 
            <Text style={[styles.emptyRecurringText, { color: TEXT_SECONDARY }]}>
              Nenhuma categoria cadastrada neste ambiente.
            </Text>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {currentWorkspaceCategories.map((category) => (
              <Pressable
                key={category.id}
                style={[styles.categoryItem, { backgroundColor: CARD_BG }]}
                onPress={() => handleOpenBudgetModal(category)}
              >
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: TEXT_PRIMARY }]}>
                    {category.name}
                  </Text>
                  <Text style={[styles.categoryBudgetText, { color: TEXT_SECONDARY }]}>
                    {typeof category.budgetLimit === 'number'
                      ? `Limite mensal: ${formatCurrency(category.budgetLimit)}`
                      : 'Sem limite definido'}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="target"
                  size={20}
                  color={accentColor}
                />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.recurringSectionHeader}>
          <Text style={[styles.sectionTitle, { color: TEXT_PRIMARY }]}>Contas Fixas e Assinaturas</Text>
          <Text style={[styles.sectionSubtitle, { color: TEXT_SECONDARY }]}>
            Agende despesas ou receitas que se repetem automaticamente.
          </Text>
        </View>

        {currentWorkspaceTemplates.length === 0 ? (
          <View style={[styles.emptyRecurring, { backgroundColor: CARD_BG }]}> 
            <Text style={[styles.emptyRecurringText, { color: TEXT_SECONDARY }]}>
              Nenhuma conta fixa cadastrada neste ambiente.
            </Text>
          </View>
        ) : (
          <View style={styles.recurringList}>
            {currentWorkspaceTemplates.map((template) => {
              const isIncome = template.type === 'income';

              return (
                <View key={template.id} style={[styles.recurringItem, { backgroundColor: CARD_BG }]}> 
                  <View
                    style={[
                      styles.recurringIconWrap,
                      { backgroundColor: `${isIncome ? '#d2ff61' : '#FF453A'}22` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isIncome ? 'arrow-down-bold-circle-outline' : 'arrow-up-bold-circle-outline'}
                      size={20}
                      color={isIncome ? '#d2ff61' : '#FF453A'}
                    />
                  </View>

                  <View style={styles.recurringInfo}>
                    <Text style={[styles.recurringNote, { color: TEXT_PRIMARY }]} numberOfLines={1}>
                      {template.note}
                    </Text>
                    <Text style={[styles.recurringMeta, { color: TEXT_SECONDARY }]} numberOfLines={1}>
                      {getFrequencyLabel(template)}
                    </Text>
                  </View>

                  <View style={styles.recurringRight}> 
                    <Text
                      style={[
                        styles.recurringAmount,
                        { color: isIncome ? '#d2ff61' : '#FF453A' },
                      ]}
                    >
                      {isIncome ? '+' : '-'} {formatCurrency(template.amount)}
                    </Text>

                    <Switch
                      value={template.isActive}
                      onValueChange={() => toggleRecurringTemplate(template.id)}
                      trackColor={{ false: '#3A3A3A', true: `${accentColor}55` }}
                      thumbColor={template.isActive ? accentColor : '#A1A1A1'}
                      ios_backgroundColor="#3A3A3A"
                    />

                    <View style={styles.recurringActions}>
                      <Pressable
                        onPress={() => handleEditRecurringTemplate(template)}
                        style={styles.recurringActionButton}
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={17}
                          color={TEXT_SECONDARY}
                        />
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteRecurringTemplate(template.id)}
                        style={styles.recurringActionButton}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={17}
                          color="#FF453A"
                        />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          style={[styles.addRecurringButton, { borderColor: accentColor }]}
          onPress={() => {
            setTemplateToEdit(null);
            setIsRecurringModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="calendar-plus" size={20} color={accentColor} />
          <Text style={[styles.addRecurringText, { color: accentColor }]}>Adicionar Nova Conta Fixa</Text>
        </Pressable>

        <View style={styles.backupSectionHeader}>
          <Text style={[styles.sectionTitle, { color: TEXT_PRIMARY }]}>Backup Manual</Text>
          <Text style={[styles.sectionSubtitle, { color: TEXT_SECONDARY }]}>
            Gere um arquivo completo dos seus dados ou restaure um backup salvo.
          </Text>
        </View>

        <Pressable
          style={[styles.backupButton, { backgroundColor: CARD_BG, borderColor: accentColor }]}
          onPress={() => setIsBackupScreenVisible(true)}
        >
          <MaterialCommunityIcons name="cloud-lock-outline" size={20} color={accentColor} />
          <Text style={[styles.backupButtonText, { color: TEXT_PRIMARY }]}>Abrir Central de Backup</Text>
        </Pressable>

        <View style={[styles.syncStatusCard, { backgroundColor: CARD_BG }]}> 
          <View style={styles.syncStatusHeader}>
            <Text style={[styles.syncStatusText, { color: TEXT_PRIMARY }]}>
              Última sincronização: {formatSyncDate(lastSyncDate)}
            </Text>

            {isSyncingNow ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : lastSyncDate ? (
              <MaterialCommunityIcons name="check-circle" size={18} color="#30D158" />
            ) : (
              <MaterialCommunityIcons name="sync-alert" size={18} color="#FFB020" />
            )}
          </View>

          <Pressable
            style={[styles.syncNowButton, { borderColor: accentColor }]}
            onPress={() => void handleSyncNow()}
            disabled={isSyncingNow}
          >
            <Text style={[styles.syncNowText, { color: accentColor }]}>Sincronizar Agora</Text>
          </Pressable>
        </View>

        {__DEV__ && (
          <Pressable
            style={[styles.versionFooter, { backgroundColor: CARD_BG }]}
            onPress={() => {
              const nextCount = versionClickCount + 1;
              setVersionClickCount(nextCount);
              
              if (nextCount === 5) {
                setDevPanelVisible(true);
                setVersionClickCount(0);
              }
            }}
          >
            <Text style={[styles.versionText, { color: TEXT_SECONDARY }]}>
              v1.0.0 {versionClickCount > 0 && `(${5 - versionClickCount})`}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <WorkspaceEditModal
        visible={modalState.mode !== 'closed'}
        mode={modalState.mode as 'create' | 'edit'}
        workspace={modalState.workspace}
        onSave={handleSaveWorkspace}
        onClose={handleCloseModal}
      />

      <RecurringTemplateModal
        visible={isRecurringModalVisible}
        accentColor={accentColor}
        templateToEdit={templateToEdit}
        onClose={handleCloseRecurringModal}
        onSave={handleSaveRecurringTemplate}
      />

      <Modal
        transparent
        visible={isBudgetModalVisible}
        animationType="fade"
        onRequestClose={handleCloseBudgetModal}
      >
        <View style={styles.budgetModalOverlay}>
          <View style={[styles.budgetModalCard, { backgroundColor: CARD_BG }]}> 
            <Text style={[styles.budgetModalTitle, { color: TEXT_PRIMARY }]}>Definir Limite Mensal</Text>
            <Text style={[styles.budgetModalSubtitle, { color: TEXT_SECONDARY }]}>
              {selectedCategory?.name || 'Categoria'}
            </Text>

            <TextInput
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={TEXT_SECONDARY}
              style={[
                styles.budgetInput,
                {
                  color: TEXT_PRIMARY,
                  borderColor: accentColor,
                  backgroundColor: APP_BG,
                },
              ]}
            />

            <View style={styles.budgetModalActions}>
              <Pressable style={styles.budgetCancelButton} onPress={handleCloseBudgetModal}>
                <Text style={[styles.budgetCancelText, { color: TEXT_SECONDARY }]}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.budgetSaveButton, { backgroundColor: accentColor }]}
                onPress={handleSaveBudget}
              >
                <Text style={styles.budgetSaveText}>Salvar Limite</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <DevPanel visible={devPanelVisible} onClose={() => setDevPanelVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  listContainer: {
    gap: 12,
    marginBottom: 24,
  },
  workspaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  workspaceInfo: {
    flex: 1,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  workspaceType: {
    fontSize: 12,
    fontWeight: '400',
  },
  editButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  categorySectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  categoryList: {
    gap: 10,
  },
  categoryItem: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  categoryBudgetText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recurringSectionHeader: {
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
  },
  emptyRecurring: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  emptyRecurringText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recurringList: {
    gap: 10,
  },
  recurringItem: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recurringIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringInfo: {
    flex: 1,
    gap: 2,
  },
  recurringNote: {
    fontSize: 14,
    fontWeight: '700',
  },
  recurringMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  recurringRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recurringActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  recurringActionButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  recurringAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  addRecurringButton: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addRecurringText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backupSectionHeader: {
    marginTop: 26,
    marginBottom: 12,
  },
  backupButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backupButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  syncStatusCard: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  syncStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  syncStatusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  syncNowButton: {
    borderRadius: 10,
    borderWidth: 1.2,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncNowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  budgetModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  budgetModalCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  budgetModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  budgetModalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  budgetInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  budgetModalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetCancelButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  budgetCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetSaveButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  budgetSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  versionFooter: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
