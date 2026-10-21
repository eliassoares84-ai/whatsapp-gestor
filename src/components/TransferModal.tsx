import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFinanceStore } from '../store/useFinanceStore';
import type { WorkspaceId } from '../types/finance.types';
import { getLocalizedWorkspaceName } from '../utils/workspaceLocalization';
import { uppercaseFirstLetter } from '../utils/textInputFormat';

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
  const { t } = useTranslation();
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

  const getWorkspaceDisplayName = (workspaceId: WorkspaceId): string => {
    const workspace = workspaces.find((item) => item.id === workspaceId);

    if (!workspace) {
      return '';
    }

    return getLocalizedWorkspaceName(workspace, t);
  };

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

    setDescription(
      t('transferModal.autoDescription', {
        from: getWorkspaceDisplayName(fromWorkspace.id),
        to: getWorkspaceDisplayName(toWorkspace.id),
      })
    );
  }, [fromWorkspace, toWorkspace, isDescriptionDirty, t, workspaces]);

  const handleClose = () => {
    setIsDescriptionDirty(false);
    onClose();
  };

  const handleConfirm = () => {
    const amount = parseCurrencyInput(amountText);

    if (!fromWorkspaceId || !toWorkspaceId || fromWorkspaceId === toWorkspaceId) {
      Alert.alert(
        t('transferModal.errors.invalidTransferTitle'),
        t('transferModal.errors.invalidTransferMessage')
      );
      return;
    }

    if (amount <= 0) {
      Alert.alert(t('transferModal.errors.invalidAmountTitle'), t('transferModal.errors.invalidAmountMessage'));
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
                {getLocalizedWorkspaceName(workspace, t)}
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
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.bottom + 8}
        >
          <View style={[styles.card, { backgroundColor: CARD_BG }]}> 
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.cardContent}
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: TEXT_PRIMARY }]}>{t('transferModal.title')}</Text>
                <Pressable onPress={handleClose}>
                  <MaterialCommunityIcons name="close" size={24} color={TEXT_SECONDARY} />
                </Pressable>
              </View>

              {renderWorkspaceSelector(
                t('transferModal.from'),
                fromWorkspaceId,
                setFromWorkspaceId,
                workspaces,
                false
              )}

              {renderWorkspaceSelector(
                t('transferModal.to'),
                toWorkspaceId,
                setToWorkspaceId,
                availableTargets,
                true
              )}

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{t('transferModal.amount')}</Text>
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
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{t('transferModal.description')}</Text>
                <TextInput
                  value={description}
                  onChangeText={(value) => {
                    setDescription(uppercaseFirstLetter(value));
                    setIsDescriptionDirty(true);
                  }}
                  placeholder={t('transferModal.descriptionPlaceholder')}
                  placeholderTextColor={TEXT_SECONDARY}
                  autoCapitalize="sentences"
                  style={[styles.descriptionInput, { color: TEXT_PRIMARY, backgroundColor: APP_BG }]}
                />
              </View>

              <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>{t('transferModal.confirm')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoiding: {
    width: '100%',
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    maxHeight: '90%',
  },
  cardContent: {
    paddingBottom: 6,
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