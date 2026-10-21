import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Category, Transaction } from '../../types/finance.types';
import { getLocalizedCategoryName } from '../../utils/categoryLocalization';
import { uppercaseFirstLetter } from '../../utils/textInputFormat';
import ConfirmActionModal from '../ConfirmActionModal';
import { CurrencyInput } from '../CurrencyInput';

const APP_BG = '#0A0A0A';

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  categories: Category[];
  theme: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  dividerColor: string;
  dashboardAccent: string;
  onClose: () => void;
  onSave: (transactionId: string, updates: {
    amount: number;
    note?: string;
    categoryId: string;
    paymentMethod?: 'cash' | 'debit' | 'credit' | 'pix';
  }) => void;
  onDeleteSingle: (transactionId: string) => void;
  onDeleteAllInstallments: (transactionId: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  categories,
  theme,
  cardBg,
  textPrimary,
  textSecondary,
  dividerColor,
  dashboardAccent,
  onClose,
  onSave,
  onDeleteSingle,
  onDeleteAllInstallments,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [editNoteInput, setEditNoteInput] = useState('');
  const [editAmountInput, setEditAmountInput] = useState(0);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPaymentMethodInput, setEditPaymentMethodInput] = useState<
    'cash' | 'debit' | 'credit' | 'pix' | null
  >(null);
  const [editKeyboardHeight, setEditKeyboardHeight] = useState(0);

  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isDeleteInstallmentsModalVisible, setIsDeleteInstallmentsModalVisible] = useState(false);

  useEffect(() => {
    if (transaction) {
      setEditNoteInput(transaction.note || '');
      setEditAmountInput(transaction.amount || 0);
      setEditCategoryId(transaction.categoryId || categories[0]?.id || '');
      setEditPaymentMethodInput(
        transaction.paymentMethod === 'credit'
          ? 'credit'
          : transaction.paymentMethod === 'debit'
            ? 'debit'
            : transaction.paymentMethod === 'cash'
              ? 'cash'
              : transaction.paymentMethod === 'pix'
                ? 'pix'
                : null
      );
    }
  }, [transaction, categories]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      if (Platform.OS !== 'android') return;
      const nextHeight = Math.max(0, event.endCoordinates.height - insets.bottom);
      setEditKeyboardHeight(nextHeight);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setEditKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  useEffect(() => {
    if (!visible) {
      setEditKeyboardHeight(0);
      setIsDeleteConfirmVisible(false);
      setIsDeleteInstallmentsModalVisible(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (!transaction) return;
    if (!Number.isFinite(editAmountInput) || editAmountInput <= 0) return;

    const payload: {
      amount: number;
      note?: string;
      categoryId: string;
      paymentMethod?: 'cash' | 'debit' | 'credit' | 'pix';
    } = {
      amount: editAmountInput,
      note: editNoteInput.trim() || undefined,
      categoryId: editCategoryId,
    };

    if (editPaymentMethodInput) {
      payload.paymentMethod = editPaymentMethodInput;
    }

    onSave(transaction.id, payload);
  };

  const handleRequestDelete = () => {
    if (!transaction) return;
    if (transaction.installmentGroupId) {
      setIsDeleteInstallmentsModalVisible(true);
    } else {
      setIsDeleteConfirmVisible(true);
    }
  };

  const handleConfirmSingle = () => {
    if (!transaction) return;
    setIsDeleteConfirmVisible(false);
    setIsDeleteInstallmentsModalVisible(false);
    onDeleteSingle(transaction.id);
  };

  const handleConfirmAll = () => {
    if (!transaction) return;
    setIsDeleteInstallmentsModalVisible(false);
    onDeleteAllInstallments(transaction.id);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.editModalOverlay}>
          <KeyboardAvoidingView
            style={[
              styles.editKeyboardAvoiding,
              {
                marginBottom: Platform.OS === 'android' ? editKeyboardHeight : 0,
              },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.bottom + 8}
          >
            <View style={[styles.editModalCard, { backgroundColor: cardBg }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: textPrimary }]}>
                  {t('dashboard.edit.title', { defaultValue: 'Editar' })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    onPress={handleRequestDelete}
                    style={[
                      styles.editCloseButton,
                      { backgroundColor: 'rgba(255, 69, 58, 0.15)' },
                    ]}
                    accessibilityLabel={t('dashboard.edit.delete', { defaultValue: 'Excluir' })}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF453A" />
                  </Pressable>
                  <Pressable onPress={onClose} style={styles.editCloseButton}>
                    <MaterialCommunityIcons name="close" size={20} color={textPrimary} />
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.editFieldLabel, { color: textSecondary }]}>
                {t('dashboard.edit.description', { defaultValue: 'Descrição' })}
              </Text>
              <TextInput
                value={editNoteInput}
                onChangeText={(value) => setEditNoteInput(uppercaseFirstLetter(value))}
                placeholder={t('dashboard.edit.descriptionPlaceholder', {
                  defaultValue: 'Ex: Conta de Luz',
                })}
                placeholderTextColor={textSecondary}
                autoCapitalize="sentences"
                style={[
                  styles.editInput,
                  {
                    color: textPrimary,
                    backgroundColor: theme === 'light' ? '#F9FAFB' : APP_BG,
                    borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E',
                  },
                ]}
              />

              <Text style={[styles.editFieldLabel, { color: textSecondary }]}>
                {t('dashboard.edit.amount', { defaultValue: 'Valor' })}
              </Text>
              <CurrencyInput
                value={editAmountInput}
                onChangeValue={setEditAmountInput}
                placeholder={t('dashboard.edit.amountPlaceholder', { defaultValue: '0,00' })}
                placeholderTextColor={textSecondary}
                style={[
                  styles.editInput,
                  {
                    color: textPrimary,
                    backgroundColor: theme === 'light' ? '#F9FAFB' : APP_BG,
                    borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E',
                  },
                ]}
              />

              <Text style={[styles.editFieldLabel, { color: textSecondary }]}>
                {t('fastEntry.paymentMethod.label', { defaultValue: 'Método de Pagamento' })}
              </Text>
              <View style={styles.editPaymentMethodRow}>
                <Pressable
                  onPress={() => setEditPaymentMethodInput('cash')}
                  style={[
                    styles.editPaymentMethodChip,
                    {
                      borderColor:
                        editPaymentMethodInput === 'cash'
                          ? dashboardAccent
                          : theme === 'light'
                            ? '#D1D5DB'
                            : '#2C2C2E',
                      backgroundColor:
                        editPaymentMethodInput === 'cash'
                          ? `${dashboardAccent}15`
                          : theme === 'light'
                            ? '#FFFFFF'
                            : APP_BG,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.editPaymentMethodChipText,
                      {
                        color:
                          editPaymentMethodInput === 'cash' ? dashboardAccent : textPrimary,
                      },
                    ]}
                  >
                    {t('fastEntry.paymentMethod.cash', { defaultValue: 'Dinheiro' })}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setEditPaymentMethodInput('debit')}
                  style={[
                    styles.editPaymentMethodChip,
                    {
                      borderColor:
                        editPaymentMethodInput === 'debit'
                          ? dashboardAccent
                          : theme === 'light'
                            ? '#D1D5DB'
                            : '#2C2C2E',
                      backgroundColor:
                        editPaymentMethodInput === 'debit'
                          ? `${dashboardAccent}15`
                          : theme === 'light'
                            ? '#FFFFFF'
                            : APP_BG,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.editPaymentMethodChipText,
                      {
                        color:
                          editPaymentMethodInput === 'debit' ? dashboardAccent : textPrimary,
                      },
                    ]}
                  >
                    {t('fastEntry.paymentMethod.debit', { defaultValue: 'Débito' })}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setEditPaymentMethodInput('credit')}
                  style={[
                    styles.editPaymentMethodChip,
                    {
                      borderColor:
                        editPaymentMethodInput === 'credit'
                          ? dashboardAccent
                          : theme === 'light'
                            ? '#D1D5DB'
                            : '#2C2C2E',
                      backgroundColor:
                        editPaymentMethodInput === 'credit'
                          ? `${dashboardAccent}15`
                          : theme === 'light'
                            ? '#FFFFFF'
                            : APP_BG,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.editPaymentMethodChipText,
                      {
                        color:
                          editPaymentMethodInput === 'credit' ? dashboardAccent : textPrimary,
                      },
                    ]}
                  >
                    {t('fastEntry.paymentMethod.credit', { defaultValue: 'Crédito' })}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setEditPaymentMethodInput('pix')}
                  style={[
                    styles.editPaymentMethodChip,
                    {
                      borderColor:
                        editPaymentMethodInput === 'pix'
                          ? dashboardAccent
                          : theme === 'light'
                            ? '#D1D5DB'
                            : '#2C2C2E',
                      backgroundColor:
                        editPaymentMethodInput === 'pix'
                          ? `${dashboardAccent}15`
                          : theme === 'light'
                            ? '#FFFFFF'
                            : APP_BG,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.editPaymentMethodChipText,
                      {
                        color:
                          editPaymentMethodInput === 'pix' ? dashboardAccent : textPrimary,
                      },
                    ]}
                  >
                    {t('fastEntry.paymentMethod.pix', { defaultValue: 'PIX' })}
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.editFieldLabel, { color: textSecondary }]}>
                {t('dashboard.edit.category', { defaultValue: 'Categoria' })}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.editCategoryRow}
              >
                {categories.map((category) => {
                  const isActive = category.id === editCategoryId;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setEditCategoryId(category.id)}
                      style={[
                        styles.editCategoryChip,
                        {
                          borderColor: isActive
                            ? dashboardAccent
                            : theme === 'light'
                              ? '#D1D5DB'
                              : '#2C2C2E',
                          backgroundColor: isActive
                            ? `${dashboardAccent}15`
                            : theme === 'light'
                              ? '#FFFFFF'
                              : APP_BG,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.editCategoryChipText,
                          { color: isActive ? dashboardAccent : textPrimary },
                        ]}
                      >
                        {getLocalizedCategoryName(category.id, category.name, t)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.editActionsRow}>
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.editSecondaryButton,
                    {
                      backgroundColor: theme === 'light' ? '#FFFFFF' : APP_BG,
                      borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E',
                    },
                  ]}
                >
                  <Text style={[styles.editSecondaryButtonText, { color: textSecondary }]}>
                    {t('dashboard.edit.cancel', { defaultValue: 'Cancelar' })}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSave}
                  style={[styles.editPrimaryButton, { backgroundColor: dashboardAccent }]}
                >
                  <Text style={[styles.editPrimaryButtonText, { color: '#FFF' }]}>
                    {t('dashboard.edit.save', { defaultValue: 'Salvar' })}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmActionModal
        visible={isDeleteConfirmVisible}
        title={t('dashboard.edit.deleteConfirmTitle', { defaultValue: 'Excluir movimentação' })}
        message={t('dashboard.edit.deleteConfirmMessage', {
          defaultValue:
            'Tem certeza que deseja excluir esta movimentação? O saldo da conta e limites serão recalculados.',
        })}
        confirmLabel={t('dashboard.edit.delete', { defaultValue: 'Excluir' })}
        cancelLabel={t('dashboard.edit.cancel', { defaultValue: 'Cancelar' })}
        onConfirm={handleConfirmSingle}
        onCancel={() => setIsDeleteConfirmVisible(false)}
        cardBg={cardBg}
        borderColor={dividerColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentColor="#FF453A"
      />

      <Modal
        visible={isDeleteInstallmentsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteInstallmentsModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View
            style={[styles.confirmCard, { backgroundColor: cardBg, borderColor: dividerColor }]}
          >
            <Text style={[styles.confirmTitle, { color: textPrimary }]}>
              {t('dashboard.edit.deleteInstallmentsTitle', { defaultValue: 'Compra Parcelada' })}
            </Text>
            <Text style={[styles.confirmMessage, { color: textSecondary }]}>
              {t('dashboard.edit.deleteInstallmentsMessage', {
                total: transaction?.installmentTotal || 1,
                defaultValue: `Esta movimentação faz parte de uma compra parcelada em ${transaction?.installmentTotal || 1}x. O que você deseja fazer?`,
              })}
            </Text>

            <View style={styles.installmentsDeleteActions}>
              <Pressable
                onPress={handleConfirmSingle}
                style={[styles.installmentActionBtn, { borderColor: dividerColor }]}
              >
                <Text style={[styles.installmentActionText, { color: textPrimary }]}>
                  {t('dashboard.edit.deleteOnlyThis', { defaultValue: 'Apenas esta parcela' })}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmAll}
                style={[
                  styles.installmentActionBtn,
                  {
                    backgroundColor: 'rgba(255, 69, 58, 0.15)',
                    borderColor: 'rgba(255, 69, 58, 0.4)',
                  },
                ]}
              >
                <Text style={[styles.installmentActionText, { color: '#FF453A' }]}>
                  {t('dashboard.edit.deleteAllInstallments', {
                    defaultValue: 'Todas as parcelas',
                  })}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsDeleteInstallmentsModalVisible(false)}
                style={styles.installmentCancelBtn}
              >
                <Text style={[styles.installmentCancelText, { color: textSecondary }]}>
                  {t('dashboard.edit.cancel', { defaultValue: 'Cancelar' })}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  editKeyboardAvoiding: {
    width: '100%',
  },
  editModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  editCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  editFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  editPaymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  editPaymentMethodChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPaymentMethodChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editCategoryRow: {
    gap: 8,
    marginBottom: 24,
  },
  editCategoryChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editCategoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editSecondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  editPrimaryButton: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    maxWidth: 440,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 18,
  },
  installmentsDeleteActions: {
    gap: 10,
  },
  installmentActionBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installmentActionText: {
    fontSize: 15,
    fontWeight: '800',
  },
  installmentCancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  installmentCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
