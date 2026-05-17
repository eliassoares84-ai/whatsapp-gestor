import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFinanceStore } from '../store/useFinanceStore';
import type { WorkspaceId } from '../types/finance.types';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
}

const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  const amount = Number.parseInt(digits, 10) / 100;
  return amount.toFixed(2).replace('.', ',');
};

const parseCurrencyInput = (value: string): number => {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { currentWorkspaceId, workspaces, transferBetweenWorkspaces } =
    useFinanceStore();

  const [fromWorkspaceId, setFromWorkspaceId] = useState<WorkspaceId>('');
  const [toWorkspaceId, setToWorkspaceId] = useState<WorkspaceId>('');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [isDescriptionDirty, setIsDescriptionDirty] = useState(false);

  const availableTargets = useMemo(
    () => workspaces.filter((workspace) => workspace.id !== fromWorkspaceId),
    [workspaces, fromWorkspaceId]
  );

  const fromWorkspace = workspaces.find(
    (workspace) => workspace.id === fromWorkspaceId
  );
  const toWorkspace = workspaces.find((workspace) => workspace.id === toWorkspaceId);

  useEffect(() => {
    if (!visible) {
      setFromWorkspaceId('');
      setToWorkspaceId('');
      setAmountText('');
      setDescription('');
      setIsDescriptionDirty(false);
      return;
    }

    const defaultSourceId = currentWorkspaceId || workspaces[0]?.id || '';
    const defaultTargetId =
      workspaces.find((workspace) => workspace.id !== defaultSourceId)?.id || '';

    setFromWorkspaceId(defaultSourceId);
    setToWorkspaceId(defaultTargetId);
    setAmountText('');
    setIsDescriptionDirty(false);
  }, [visible, currentWorkspaceId, workspaces]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!toWorkspaceId || toWorkspaceId === fromWorkspaceId) {
      const nextTargetId =
        workspaces.find((workspace) => workspace.id !== fromWorkspaceId)?.id || '';
      setToWorkspaceId(nextTargetId);
    }
  }, [visible, fromWorkspaceId, toWorkspaceId, workspaces]);

  useEffect(() => {
    if (isDescriptionDirty) {
      return;
    }

    if (!fromWorkspace || !toWorkspace) {
      setDescription('');
      return;
    }

    setDescription(`Transferência de ${fromWorkspace.name} para ${toWorkspace.name}`);
  }, [fromWorkspace, toWorkspace, isDescriptionDirty]);

  const handleClose = () => {
    setIsDescriptionDirty(false);
    onClose();
  };

  const handleConfirm = () => {
    const amount = parseCurrencyInput(amountText);

    if (!fromWorkspaceId || !toWorkspaceId || fromWorkspaceId === toWorkspaceId) {
      Alert.alert(
        'Transferência inválida',
        'Escolha ambientes de origem e destino diferentes.'
      );
      return;
    }

    if (amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }

    transferBetweenWorkspaces(
      amount,
      fromWorkspaceId,
      toWorkspaceId,
      description.trim() || undefined
    );

    handleClose();
  };

  const renderWorkspaceSelector = (
    label: string,
    selectedWorkspaceId: WorkspaceId,
    onSelect: (workspaceId: WorkspaceId) => void,
    selectorWorkspaces: typeof workspaces,
    showColorDot: boolean
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorRow}
      >
        {selectorWorkspaces.map((workspace) => {
          const isSelected = workspace.id === selectedWorkspaceId;

          return (
            <Pressable
              key={`${label}-${workspace.id}`}
              onPress={() => onSelect(workspace.id)}
              style={[
                styles.selectorChip,
                {
                  borderColor: isSelected ? workspace.themeColor : 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: isSelected ? `${workspace.themeColor}18` : APP_BG,
                },
              ]}
            >
              {showColorDot && (
                <View
                  style={[
                    styles.selectorDot,
                    { backgroundColor: workspace.themeColor },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.selectorText,
                  { color: isSelected ? TEXT_PRIMARY : TEXT_SECONDARY },
                ]}
              >
                {workspace.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.card, { backgroundColor: CARD_BG }]}> 
          <View style={styles.header}>
            <Text style={[styles.title, { color: TEXT_PRIMARY }]}>Transferir capital</Text>
            <Pressable onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          {renderWorkspaceSelector(
            'De (Origem)',
            fromWorkspaceId,
            setFromWorkspaceId,
            workspaces,
            false
          )}

          {renderWorkspaceSelector(
            'Para (Destino)',
            toWorkspaceId,
            setToWorkspaceId,
            availableTargets,
            true
          )}

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: TEXT_PRIMARY }]}>Valor</Text>
            <TextInput
              value={amountText}
              onChangeText={(value) => setAmountText(formatCurrencyInput(value))}
              placeholder="0,00"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="numeric"
              style={[styles.amountInput, { color: TEXT_PRIMARY, backgroundColor: APP_BG }]}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: TEXT_PRIMARY }]}>Descrição</Text>
            <TextInput
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                setIsDescriptionDirty(true);
              }}
              placeholder="Transferência entre ambientes"
              placeholderTextColor={TEXT_SECONDARY}
              style={[styles.descriptionInput, { color: TEXT_PRIMARY, backgroundColor: APP_BG }]}
            />
          </View>

          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirmar Transferência</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  fieldBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectorRow: {
    gap: 8,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  selectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountInput: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '700',
  },
  descriptionInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  confirmButton: {
    borderRadius: 16,
    backgroundColor: '#d2ff61',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
});