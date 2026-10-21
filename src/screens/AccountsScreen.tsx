import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { CurrencyInput } from '../components/CurrencyInput';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';
import type { Transaction } from '../types/finance.types';
import BankDictionary, { getBankLogo } from '../utils/BankDictionary';
import { formatCurrency, getMaskedCurrency } from '../utils/formatters';
import { uppercaseFirstLetter } from '../utils/textInputFormat';
import { getLocalizedCategoryName } from '../utils/categoryLocalization';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const ACCENT_GREEN = '#d2ff61';
const ACCENT_BLUE = '#0A84FF';
const INCOME_COLOR = '#30D158';
const EXPENSE_COLOR = '#FF453A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9CA3AF';

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const toMaterialIconName = (icon?: string): MaterialIconName =>
  (icon as MaterialIconName) || 'tag';

const BANK_ABBR: Record<string, string> = {
  nubank: 'NU',
  'banco do brasil': 'BB',
  bradesco: 'BRA',
  santander: 'SAN',
  itau: 'ITÁ',
  itaú: 'ITÁ',
  inter: 'IN',
  caixa: 'CEF',
  dinheiro: 'R$',
  c6: 'C6',
  'xp': 'XP',
  sicredi: 'SIC',
  sicoob: 'SCB',
  picpay: 'PIC',
  original: 'ORI',
  neon: 'NEO',
  will: 'WIL',
};

const getBankAbbreviation = (name: string): string => {
  const key = normalizeText(name);
  for (const [k, abbr] of Object.entries(BANK_ABBR)) {
    if (key.includes(normalizeText(k))) return abbr;
  }
  const words = name.trim().split(' ');
  if (words.length >= 2) return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
  return name.slice(0, 3).toUpperCase();
};

type StatementListItem =
  | { type: 'header'; id: string; label: string }
  | { type: 'transaction'; id: string; transaction: Transaction };

const AccountsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useThemeStore((state) => state.theme);
  
  const {
    accounts,
    transactions,
    categories,
    currentWorkspaceId,
    addAccount,
    removeAccount,
    updateTransaction,
    deleteTransaction,
    currency,
    hideBalances,
    togglePrivacyMode,
  } = useFinanceStore();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteTxConfirmVisible, setIsDeleteTxConfirmVisible] = useState(false);
  const [isDeleteTxInstallmentsModalVisible, setIsDeleteTxInstallmentsModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [balanceInput, setBalanceInput] = useState(0);
  const [typeInput, setTypeInput] = useState<'checking' | 'savings' | 'cash'>('checking');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editNoteInput, setEditNoteInput] = useState('');
  const [editAmountInput, setEditAmountInput] = useState(0);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPaymentMethodInput, setEditPaymentMethodInput] = useState<
    'cash' | 'debit' | 'credit' | 'pix' | null
  >(null);
  const [editKeyboardHeight, setEditKeyboardHeight] = useState(0);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string } | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      if (Platform.OS !== 'android') {
        return;
      }
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
    if (!isEditModalVisible && !isModalVisible) {
      setEditKeyboardHeight(0);
    }
  }, [isEditModalVisible, isModalVisible]);

  const tokens = getThemeTokens(theme);
  const isCompactHeader = width <= 390;
  const workspaceColor = tokens.primary;
  
  const appBg = tokens.background;
  const cardBg = tokens.card;
  const textPrimary = tokens.textPrimary;
  const textSecondary = tokens.textSecondary;
  const fieldBg = tokens.surfaceInteractive;
  const borderColor = tokens.border;
  const defaultAvatarBg = tokens.surfaceInteractive;
  const actionTextColor = '#FFFFFF';
  const localeTag = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language.startsWith('es') ? 'es-ES' : 'en-US';
  const maskedCurrency = getMaskedCurrency(currency, localeTag);

  const currentWorkspaceAccounts = useMemo(
    () =>
      (accounts ?? []).filter(
        (account) => !account.workspaceId || account.workspaceId === currentWorkspaceId
      ),
    [accounts, currentWorkspaceId]
  );

  const workspaceCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.workspaceId === currentWorkspaceId
      ),
    [categories, currentWorkspaceId]
  );

  // Lógica de Filtro do Extrato por Mês CORRIGIDA
  const monthTransactions = useMemo(() => {
    const accountIds = new Set(currentWorkspaceAccounts.map(a => a.id));
    
    return (transactions || []).filter(tx => {
      // Ignorar de outro workspace
      if (tx.workspaceId && tx.workspaceId !== currentWorkspaceId) return false;
      
      // CORREÇÃO: Ignorar lançamentos de cartão de crédito no extrato bancário
      if (tx.paymentMethod === 'credit') return false;

      // Exigir que a transação esteja vinculada a uma das contas bancárias
      if (!tx.accountId || !accountIds.has(tx.accountId)) return false;

      const txDate = new Date(tx.date);
      return txDate.getMonth() === currentDate.getMonth() && txDate.getFullYear() === currentDate.getFullYear();
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentWorkspaceAccounts, currentWorkspaceId, currentDate]);

  const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const monthFormatter = new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' });
  const formattedMonthName = uppercaseFirstLetter(monthFormatter.format(currentDate));

  const statementItems = useMemo<StatementListItem[]>(() => {
    const localDayFormatter = new Intl.DateTimeFormat(localeTag, {
      day: '2-digit',
      month: '2-digit',
    });

    let lastDateKey = '';

    return monthTransactions.reduce<StatementListItem[]>((acc, tx) => {
      const txDate = new Date(tx.date);
      const dateKey = `${txDate.getFullYear()}-${txDate.getMonth()}-${txDate.getDate()}`;

      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;

        acc.push({
          type: 'header',
          id: `header-${dateKey}`,
          label: localDayFormatter.format(txDate),
        });
      }

      acc.push({
        type: 'transaction',
        id: tx.id,
        transaction: tx,
      });

      return acc;
    }, []);
  }, [monthTransactions, currentDate, localeTag]);

  const suggestedBank = useMemo(() => {
    const normalizedName = normalizeText(nameInput);
    if (!normalizedName) return null;
    const dictionaryEntries = Object.entries(BankDictionary) as Array<[string, { themeColor: string; iconName: string }]>;
    return dictionaryEntries.find(([bankName]) => normalizedName.includes(normalizeText(bankName))) || null;
  }, [nameInput]);

  const handleCreateAccount = () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;

    addAccount({
      name: trimmedName,
      balance: Number.isFinite(balanceInput) ? balanceInput : 0,
      type: typeInput,
      themeColor: suggestedBank?.[1].themeColor || '#0A84FF',
      iconName: suggestedBank?.[1].iconName || (typeInput === 'cash' ? 'cash' : 'bank-outline'),
      workspaceId: currentWorkspaceId,
    });

    setNameInput('');
    setBalanceInput(0);
    setTypeInput('checking');
    setIsModalVisible(false);
  };

  const handleDeleteAccount = (accountId: string, accountName: string) => {
    const safeName = accountName || t('accounts.accountFallback');
    setAccountToDelete({ id: accountId, name: safeName });
  };

  const handleOpenTransactionEdit = (item: typeof monthTransactions[number]) => {
    if (item.type === 'transfer') {
      return;
    }

    setEditingTransactionId(item.id);
    setEditNoteInput(item.note || '');
    setEditAmountInput(item.amount || 0);
    setEditCategoryId(item.categoryId || workspaceCategories[0]?.id || '');
    setEditPaymentMethodInput(
      item.paymentMethod === 'credit'
        ? 'credit'
        : item.paymentMethod === 'debit'
          ? 'debit'
          : item.paymentMethod === 'cash'
            ? 'cash'
            : item.paymentMethod === 'pix'
              ? 'pix'
              : null
    );
    setIsEditModalVisible(true);
  };

  const handleSaveTransactionEdit = () => {
    if (!editingTransactionId) return;
    if (!Number.isFinite(editAmountInput) || editAmountInput <= 0) return;

    const updatePayload: {
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
      updatePayload.paymentMethod = editPaymentMethodInput;
    }

    updateTransaction(editingTransactionId, updatePayload);

    setIsEditModalVisible(false);
    setEditingTransactionId(null);
    setEditNoteInput('');
    setEditAmountInput(0);
    setEditCategoryId('');
    setEditPaymentMethodInput(null);
  };

  const currentEditingTx = useMemo(
    () => transactions.find((t) => t.id === editingTransactionId),
    [transactions, editingTransactionId]
  );

  const handleRequestDeleteTx = () => {
    if (!editingTransactionId) return;

    if (currentEditingTx?.installmentGroupId) {
      setIsDeleteTxInstallmentsModalVisible(true);
    } else {
      setIsDeleteTxConfirmVisible(true);
    }
  };

  const handleConfirmSingleDeleteTx = () => {
    if (!editingTransactionId) return;
    deleteTransaction(editingTransactionId);
    setIsDeleteTxConfirmVisible(false);
    setIsDeleteTxInstallmentsModalVisible(false);
    setIsEditModalVisible(false);
    setEditingTransactionId(null);
    setEditNoteInput('');
    setEditAmountInput(0);
    setEditCategoryId('');
    setEditPaymentMethodInput(null);
  };

  const handleConfirmAllInstallmentsDeleteTx = () => {
    if (!editingTransactionId) return;
    deleteTransaction(editingTransactionId, { deleteAllInstallments: true });
    setIsDeleteTxInstallmentsModalVisible(false);
    setIsEditModalVisible(false);
    setEditingTransactionId(null);
    setEditNoteInput('');
    setEditAmountInput(0);
    setEditCategoryId('');
    setEditPaymentMethodInput(null);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, isCompactHeader && styles.headerTitleCompact, { color: textPrimary }]}>
          {t('accounts.title')}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={togglePrivacyMode}
            style={styles.privacyButton}
            accessibilityLabel={t('dashboard.togglePrivacy', { defaultValue: 'Ocultar Valores' })}
          >
            <MaterialCommunityIcons
              name={hideBalances ? 'eye-off' : 'eye'}
              size={22}
              color={hideBalances ? textSecondary : workspaceColor}
            />
          </Pressable>
          <Pressable
            style={[styles.newButton, { backgroundColor: workspaceColor }]}
            onPress={() => setIsModalVisible(true)}
            accessibilityLabel={t('accounts.newAccount')}
          >
            <MaterialCommunityIcons name="bank-plus" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Carrossel de Contas */}
      {currentWorkspaceAccounts.length > 0 ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.accountsScroll}
          snapToInterval={width - 48 + 16}
          decelerationRate="fast"
          snapToAlignment="start"
        >
          {currentWorkspaceAccounts.map((account) => {
            const logoSource = getBankLogo(account.name || '');
            const accountAccentColor = account.themeColor || workspaceColor;

            return (
              <View
                key={account.id}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: cardBg,
                    borderColor,
                    width: width - 48,
                    borderLeftWidth: 4,
                    borderLeftColor: accountAccentColor,
                  },
                ]}
              >
                <Pressable
                  style={[styles.accountDeleteButton, { borderColor, backgroundColor: fieldBg }]}
                  onPress={() => handleDeleteAccount(account.id, account.name || '')}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={textSecondary} />
                </Pressable>
                <View style={[styles.avatar, { backgroundColor: logoSource ? 'transparent' : account.themeColor || defaultAvatarBg }]}>
                  {logoSource ? (
                    <Image
                      source={logoSource}
                      style={styles.bankLogoImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.bankLogoText}>
                      {getBankAbbreviation(account.name || '')}
                    </Text>
                  )}
                </View>
                <View style={styles.accountCardInfo}>
                  <Text style={[styles.itemName, { color: textPrimary }]} numberOfLines={1}>
                    {account.name || t('accounts.accountFallback')}
                  </Text>
                  <Text style={[styles.itemType, { color: textSecondary }]}>
                    {t(`accounts.types.${account.type}`)}
                  </Text>
                </View>
                <Text style={[styles.itemBalance, { color: textPrimary }]}>
                  {hideBalances ? maskedCurrency : formatCurrency(account.balance || 0, currency, localeTag)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={[styles.emptyWrap, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: `${workspaceColor}22` }]}>
            <MaterialCommunityIcons name="bank-outline" size={32} color={workspaceColor} />
          </View>
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t('accounts.emptyTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{t('accounts.emptySubtitle')}</Text>
          <Pressable style={[styles.addFirstButton, { backgroundColor: workspaceColor }]} onPress={() => setIsModalVisible(true)}>
            <Text style={[styles.addFirstButtonText, { color: actionTextColor }]}>{t('accounts.addAccount')}</Text>
          </Pressable>
        </View>
      )}

      {/* Navegador de Meses para o Extrato */}
      {currentWorkspaceAccounts.length > 0 && (
        <View style={styles.statementHeader}>
          <Text style={[styles.statementTitle, { color: textPrimary }]}>Extrato</Text>
          <View style={[styles.monthNavigator, { backgroundColor: cardBg, borderColor }]}>
            <Pressable onPress={handlePrevMonth} style={styles.monthNavBtn}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={textSecondary} />
            </Pressable>
            <Text style={[styles.monthNavText, { color: textPrimary }]}>{formattedMonthName}</Text>
            <Pressable onPress={handleNextMonth} style={styles.monthNavBtn}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={textSecondary} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6, backgroundColor: appBg }]}> 
      <FlatList
        data={statementItems}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          currentWorkspaceAccounts.length > 0 ? (
            <View style={styles.emptyStatementWrap}>
              <MaterialCommunityIcons name="receipt" size={48} color={borderColor} />
              <Text style={[styles.emptyStatementText, { color: textSecondary }]}>
                Nenhum lançamento neste mês.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.statementDayHeader}>
                <Text style={[styles.statementDayHeaderText, { color: textSecondary }]}>
                  {item.label}
                </Text>
              </View>
            );
          }

          const transaction = item.transaction;
          const category = categories.find((c) => c.id === transaction.categoryId);
          const categoryLabel = category
            ? getLocalizedCategoryName(category.id, category.name, t)
            : 'Outros';
          const consumedLabel = uppercaseFirstLetter((transaction.note || '').trim()) || categoryLabel;
          const isIncome = transaction.type === 'income';
          const typeColor = isIncome ? INCOME_COLOR : EXPENSE_COLOR;
          const sign = isIncome ? '+' : '-';
          const accountUsed = currentWorkspaceAccounts.find(a => a.id === transaction.accountId);

          return (
            <Pressable
              onPress={() => handleOpenTransactionEdit(transaction)}
              style={[styles.txCard, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={[styles.txIconWrap, { backgroundColor: `${typeColor}15` }]}>
                <MaterialCommunityIcons name={toMaterialIconName(category?.icon)} size={20} color={typeColor} />
              </View>
              <View style={styles.txInfo}>
                <Text style={[styles.txCategory, { color: textPrimary }]}>
                  {consumedLabel}
                </Text>
                <Text style={[styles.txCategory, { color: textSecondary, fontSize: 13, fontWeight: '600', marginTop: 2 }]}> 
                  {categoryLabel}
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: typeColor }]}>
                {hideBalances ? maskedCurrency : `${sign} ${formatCurrency(transaction.amount, currency, localeTag)}`}
              </Text>
            </Pressable>
          );
        }}
      />

      <AccountCreateModal
        balanceInput={balanceInput}
        isModalVisible={isModalVisible}
        nameInput={nameInput}
        keyboardHeight={editKeyboardHeight}
        onChangeBalance={setBalanceInput}
        onChangeName={setNameInput}
        onClose={() => setIsModalVisible(false)}
        onSave={handleCreateAccount}
        onTypeChange={setTypeInput}
        suggestedBank={suggestedBank}
        typeInput={typeInput}
        cardBg={cardBg}
        fieldBg={fieldBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
        workspaceColor={workspaceColor}
        actionTextColor={actionTextColor}
      />

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.bottom + 8}
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: cardBg,
                  marginBottom: Platform.OS === 'android' ? editKeyboardHeight : 0,
                },
              ]}
            >
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                  {t('dashboard.edit.title', { defaultValue: 'Editar' })}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    onPress={handleRequestDeleteTx}
                    style={[styles.closeBtn, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}
                    accessibilityLabel={t('dashboard.edit.delete', { defaultValue: 'Excluir' })}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF453A" />
                  </Pressable>
                  <Pressable onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={24} color={textPrimary} />
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.typeLabel, { color: textSecondary }]}>
                {t('dashboard.edit.description', { defaultValue: 'Descrição' })}
              </Text>
              <TextInput
                value={editNoteInput}
                onChangeText={(value) => setEditNoteInput(uppercaseFirstLetter(value))}
                placeholder={t('dashboard.edit.descriptionPlaceholder', { defaultValue: 'Ex: Conta de Luz' })}
                placeholderTextColor={textSecondary}
                autoCapitalize="sentences"
                style={[styles.input, { backgroundColor: fieldBg, borderColor, color: textPrimary }]}
              />

              <Text style={[styles.typeLabel, { color: textSecondary }]}>
                {t('dashboard.edit.amount', { defaultValue: 'Valor' })}
              </Text>
              <CurrencyInput
                value={editAmountInput}
                onChangeValue={setEditAmountInput}
                placeholder={t('dashboard.edit.amountPlaceholder', { defaultValue: '0,00' })}
                placeholderTextColor={textSecondary}
                style={[styles.input, { backgroundColor: fieldBg, borderColor, color: textPrimary }]}
              />

              <Text style={[styles.typeLabel, { color: textSecondary }]}>
                {t('fastEntry.paymentMethod.label', { defaultValue: 'Método de Pagamento' })}
              </Text>
              <View style={styles.typeRow}>
                {(['cash', 'debit', 'credit', 'pix'] as const).map((method) => {
                  const isActive = editPaymentMethodInput === method;
                  return (
                    <Pressable
                      key={method}
                      onPress={() => setEditPaymentMethodInput(method)}
                      style={[
                        styles.typePill,
                        {
                          backgroundColor: isActive ? `${workspaceColor}15` : fieldBg,
                          borderColor: isActive ? workspaceColor : borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          { color: isActive ? workspaceColor : textSecondary },
                        ]}
                      >
                        {method === 'cash'
                          ? t('fastEntry.paymentMethod.cash', { defaultValue: 'Dinheiro' })
                          : method === 'debit'
                            ? t('fastEntry.paymentMethod.debit', { defaultValue: 'Débito' })
                            : method === 'credit'
                              ? t('fastEntry.paymentMethod.credit', { defaultValue: 'Crédito' })
                              : t('fastEntry.paymentMethod.pix', { defaultValue: 'PIX' })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.typeLabel, { color: textSecondary }]}>
                {t('dashboard.edit.category', { defaultValue: 'Categoria' })}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
                {workspaceCategories.map((category) => {
                  const isActive = editCategoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setEditCategoryId(category.id)}
                      style={[
                        styles.monthChip,
                        {
                          borderColor: isActive ? workspaceColor : borderColor,
                          backgroundColor: isActive ? `${workspaceColor}15` : fieldBg,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isActive ? workspaceColor : textSecondary,
                          fontWeight: '700',
                        }}
                      >
                        {getLocalizedCategoryName(category.id, category.name, t)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.editActionsRow}>
                <Pressable
                  style={[
                    styles.editSecondaryButton,
                    {
                      backgroundColor: theme === 'light' ? '#FFFFFF' : APP_BG,
                      borderColor,
                    },
                  ]}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={[styles.editSecondaryButtonText, { color: textSecondary }]}>
                    {t('dashboard.edit.cancel', { defaultValue: 'Cancelar' })}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.editPrimaryButton, { backgroundColor: workspaceColor }]}
                  onPress={handleSaveTransactionEdit}
                >
                  <Text style={[styles.editPrimaryButtonText, { color: actionTextColor }]}>
                    {t('dashboard.edit.save', { defaultValue: 'Salvar' })}
                  </Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ConfirmActionModal
        visible={isDeleteTxConfirmVisible}
        title={t('dashboard.edit.deleteConfirmTitle', { defaultValue: 'Excluir movimentação' })}
        message={t('dashboard.edit.deleteConfirmMessage', {
          defaultValue: 'Tem certeza que deseja excluir esta movimentação? O saldo da conta e limites serão recalculados.',
        })}
        confirmLabel={t('dashboard.edit.delete', { defaultValue: 'Excluir' })}
        cancelLabel={t('dashboard.edit.cancel', { defaultValue: 'Cancelar' })}
        onConfirm={handleConfirmSingleDeleteTx}
        onCancel={() => setIsDeleteTxConfirmVisible(false)}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentColor="#FF453A"
      />

      <Modal
        visible={isDeleteTxInstallmentsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteTxInstallmentsModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.confirmTitle, { color: textPrimary }]}>
              {t('dashboard.edit.deleteInstallmentsTitle', { defaultValue: 'Compra Parcelada' })}
            </Text>
            <Text style={[styles.confirmMessage, { color: textSecondary }]}>
              {t('dashboard.edit.deleteInstallmentsMessage', {
                total: currentEditingTx?.installmentTotal || 1,
                defaultValue: `Esta movimentação faz parte de uma compra parcelada em ${currentEditingTx?.installmentTotal || 1}x. O que você deseja fazer?`,
              })}
            </Text>

            <View style={styles.installmentsDeleteActions}>
              <Pressable
                onPress={handleConfirmSingleDeleteTx}
                style={[styles.installmentActionBtn, { borderColor }]}
              >
                <Text style={[styles.installmentActionText, { color: textPrimary }]}>
                  {t('dashboard.edit.deleteOnlyThis', { defaultValue: 'Apenas esta parcela' })}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmAllInstallmentsDeleteTx}
                style={[
                  styles.installmentActionBtn,
                  { backgroundColor: 'rgba(255, 69, 58, 0.15)', borderColor: 'rgba(255, 69, 58, 0.4)' },
                ]}
              >
                <Text style={[styles.installmentActionText, { color: '#FF453A' }]}>
                  {t('dashboard.edit.deleteAllInstallments', { defaultValue: 'Todas as parcelas' })}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsDeleteTxInstallmentsModalVisible(false)}
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

      <ConfirmActionModal
        visible={!!accountToDelete}
        title={t('accounts.deleteConfirmTitle', { defaultValue: 'Excluir conta' })}
        message={t('accounts.deleteConfirmMessage', {
          defaultValue:
            'Tem certeza que deseja excluir a conta "{{name}}"? Esta ação remove também os lançamentos vinculados.',
          name: accountToDelete?.name || t('accounts.accountFallback'),
        })}
        cancelLabel={t('accounts.cancel', { defaultValue: 'Cancelar' })}
        confirmLabel={t('accounts.deleteAction', { defaultValue: 'Excluir' })}
        onCancel={() => setAccountToDelete(null)}
        onConfirm={() => {
          if (accountToDelete) {
            removeAccount(accountToDelete.id);
          }
          setAccountToDelete(null);
        }}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />
    </View>
  );
};

interface AccountCreateModalProps {
  isModalVisible: boolean;
  nameInput: string;
  balanceInput: number;
  keyboardHeight: number;
  typeInput: 'checking' | 'savings' | 'cash';
  onChangeName: (value: string) => void;
  onChangeBalance: (value: number) => void;
  onTypeChange: (value: 'checking' | 'savings' | 'cash') => void;
  onSave: () => void;
  onClose: () => void;
  suggestedBank: [string, { themeColor: string; iconName: string }] | null;
  cardBg: string;
  fieldBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  workspaceColor: string;
  actionTextColor: string;
}

const AccountCreateModal: React.FC<AccountCreateModalProps> = ({
  isModalVisible,
  nameInput,
  balanceInput,
  keyboardHeight,
  typeInput,
  onChangeName,
  onChangeBalance,
  onTypeChange,
  onSave,
  onClose,
  suggestedBank,
  cardBg,
  fieldBg,
  textPrimary,
  textSecondary,
  borderColor,
  workspaceColor,
  actionTextColor
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={isModalVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.bottom + 8}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: cardBg,
                marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
              },
            ]}
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>{t('accounts.newAccount')}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                 <MaterialCommunityIcons name="close" size={24} color={textPrimary} />
              </Pressable>
            </View>

            <TextInput
              value={nameInput}
              onChangeText={(value) => onChangeName(value)}
              placeholder={t('accounts.placeholders.name')}
              placeholderTextColor={textSecondary}
              autoCapitalize="sentences"
              style={[styles.input, { backgroundColor: fieldBg, borderColor, color: textPrimary }]}
            />

            <CurrencyInput
              value={balanceInput}
              onChangeValue={onChangeBalance}
              placeholder={t('accounts.placeholders.balance')}
              placeholderTextColor={textSecondary}
              style={[styles.input, { backgroundColor: fieldBg, borderColor, color: textPrimary }]}
            />

            <Text style={[styles.typeLabel, { color: textSecondary }]}>Tipo de Conta</Text>
            <View style={styles.typeRow}>
              {(['checking', 'savings', 'cash'] as const).map((type) => {
                const isActive = typeInput === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => onTypeChange(type)}
                    style={[
                      styles.typePill,
                      { backgroundColor: isActive ? `${workspaceColor}15` : fieldBg, borderColor: isActive ? workspaceColor : borderColor },
                    ]}
                  >
                    <Text style={[styles.typePillText, { color: isActive ? workspaceColor : textSecondary }]}>
                      {t(`accounts.types.${type}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!!suggestedBank && (
              <View style={styles.suggestionWrap}>
                <View style={[styles.suggestionColor, { backgroundColor: suggestedBank[1].themeColor }]} />
                <Text style={[styles.suggestionText, { color: textSecondary }]}>
                  {t('accounts.suggestedColor', { bank: suggestedBank[0] })}
                </Text>
              </View>
            )}

            <Pressable style={[styles.primaryBtn, { backgroundColor: workspaceColor }]} onPress={onSave}>
              <Text style={[styles.primaryBtnText, { color: actionTextColor }]}>{t('accounts.saveAccount')}</Text>
            </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  listContent: {
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyButton: {
    padding: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerTitleCompact: {
    fontSize: 22,
  },
  newButton: {
    borderRadius: 14,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  accountCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    position: 'relative',
  },
  accountDeleteButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  bankLogoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  bankLogoImage: {
    width: 40,
    height: 40,
    alignSelf: 'center',
  },
  avatarLetter: {
    fontWeight: '800',
    fontSize: 20,
  },
  accountCardInfo: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '800',
  },
  itemType: {
    fontSize: 14,
    marginTop: 4,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  itemBalance: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statementHeader: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
  },
  statementTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
  },
  statementDayHeader: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 10,
  },
  statementDayHeaderText: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthNavText: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginHorizontal: 24,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
    marginLeft: 12,
  },
  txCategory: {
    fontSize: 16,
    fontWeight: '700',
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  txDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  txDot: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  txAccountName: {
    fontSize: 13,
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  editSecondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editSecondaryButtonText: {
    fontWeight: '800',
    fontSize: 15,
  },
  editPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontWeight: '800',
    fontSize: 15,
  },
  monthsRow: {
    gap: 10,
    paddingBottom: 8,
  },
  monthChip: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyStatementWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStatementText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyWrap: {
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  addFirstButton: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  addFirstButtonText: {
    fontWeight: '800',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    width: '100%',
  },
  modalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typePill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typePillText: {
    fontWeight: '800',
    fontSize: 14,
  },
  suggestionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  suggestionColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
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

export default AccountsScreen;