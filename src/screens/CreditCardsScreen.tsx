import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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

import ConfirmActionModal from '../components/ConfirmActionModal';
import { CurrencyInput } from '../components/CurrencyInput';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';
import type { CreditCard, Transaction } from '../types/finance.types';
import BankDictionary from '../utils/BankDictionary';
import { CopilotStep, useCopilot, walkthroughable } from '../utils/copilotSafe';
import { formatCurrency, getMaskedCurrency } from '../utils/formatters';
import { uppercaseFirstLetter } from '../utils/textInputFormat';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#9CA3AF';
const INCOME_COLOR = '#30D158';
const EXPENSE_COLOR = '#FF453A';

const WalkthroughableView = walkthroughable(View);
const WalkthroughablePressable = walkthroughable(Pressable);
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const toMaterialIconName = (icon?: string): MaterialIconName =>
  (icon as MaterialIconName) || 'tag';

const normalizeForLookup = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const resolveCardAccentColor = (cardName: string, fallbackColor: string): string => {
  const normalized = normalizeForLookup(cardName);
  const entries = Object.entries(BankDictionary) as Array<
    [string, { themeColor: string; iconName: string }]
  >;

  const match = entries.find(([bankName]) =>
    normalized.includes(normalizeForLookup(bankName))
  );

  return match?.[1].themeColor || fallbackColor;
};

const toMonthLabel = (monthKey: string, localeTag: string): string => {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthLabel = new Intl.DateTimeFormat(localeTag, { month: 'long' }).format(date);
  const yearLabel = new Intl.DateTimeFormat(localeTag, { year: 'numeric' }).format(date);
  return `${monthLabel} ${yearLabel}`;
};

const toMonthKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const addMonths = (date: Date, count: number): Date => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
};

const normalizeMonthCursor = (monthKey: string): Date => {
  const [yearValue, monthValue] = monthKey.split('-');
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return new Date();
  }

  return new Date(year, month - 1, 1);
};

const resolveInvoiceMonth = (txDateIso: string, closingDay: number): string => {
  const txDate = new Date(txDateIso);
  if (Number.isNaN(txDate.getTime())) {
    return toMonthKey(new Date());
  }

  const invoiceDate = txDate.getDate() > closingDay ? addMonths(txDate, 1) : txDate;
  return toMonthKey(invoiceDate);
};

const CreditCardsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useThemeStore((state) => state.theme);
  const isFocused = useIsFocused();
  const { start, copilotEvents, currentStepNumber } = useCopilot();
  const tourStartInFlightRef = useRef(false);

  const {
    currentWorkspaceId,
    workspaces,
    transactions,
    accounts,
    categories,
    currency,
    addCreditCard,
    removeCreditCard,
    payInvoice,
    deleteTransaction,
    hasSeenCardsTour,
    markCardsTourSeen,
    hideBalances,
    togglePrivacyMode,
  } = useFinanceStore();

  useFocusEffect(
    useCallback(() => {
      if (!isFocused || !start || hasSeenCardsTour) {
        return;
      }

      const timeoutId = setTimeout(() => {
        if (tourStartInFlightRef.current) {
          return;
        }

        tourStartInFlightRef.current = true;
        void start('cards_create').finally(() => {
          tourStartInFlightRef.current = false;
        });
      }, 700);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [hasSeenCardsTour, isFocused, start])
  );

  useEffect(() => {
    const onStop = () => {
      if (!isFocused) {
        return;
      }

      if (currentStepNumber > 0 && !useFinanceStore.getState().hasSeenCardsTour) {
        markCardsTourSeen();
      }
    };

    copilotEvents.on('stop', onStop);
    return () => {
      copilotEvents.off('stop', onStop);
    };
  }, [copilotEvents, currentStepNumber, isFocused, markCardsTourSeen]);

  const tokens = getThemeTokens(theme);
  const appBg = tokens.background;
  const cardBg = tokens.card;
  const textPrimary = tokens.textPrimary;
  const textSecondary = tokens.textSecondary;
  const fieldBg = tokens.surfaceInteractive;
  const borderColor = tokens.border;
  const localeTag = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language.startsWith('es') ? 'es-ES' : 'en-US';
  const maskedCurrency = getMaskedCurrency(currency, localeTag);
  const newCardCtaLabel = t('cards.newCardAction', {
    defaultValue: i18n.language.startsWith('pt')
      ? 'Adicionar cartao'
      : i18n.language.startsWith('es')
        ? 'Agregar tarjeta'
        : 'Add card',
  });
  const newCardCtaHint = t('cards.newCardActionHint', {
    defaultValue: i18n.language.startsWith('pt')
      ? 'Abre o formulario para cadastrar um novo cartao de credito'
      : i18n.language.startsWith('es')
        ? 'Abre el formulario para crear una nueva tarjeta de credito'
        : 'Opens the form to create a new credit card',
  });

  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isPayVisible, setIsPayVisible] = useState(false);

  const [cardName, setCardName] = useState('');
  const [limitValue, setLimitValue] = useState(0);
  const [closingDayText, setClosingDayText] = useState('');
  const [dueDayText, setDueDayText] = useState('');
  const [cardColor, setCardColor] = useState('#0A84FF');

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [paidAmountValue, setPaidAmountValue] = useState(0);
  const [cardsMonthCursor, setCardsMonthCursor] = useState<Date>(new Date());
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [selectedTxToDelete, setSelectedTxToDelete] = useState<Transaction | null>(null);
  const [isDeleteTxConfirmVisible, setIsDeleteTxConfirmVisible] = useState(false);
  const [isDeleteTxInstallmentsModalVisible, setIsDeleteTxInstallmentsModalVisible] = useState(false);

  const handleRequestDeleteTx = (tx: Transaction) => {
    setSelectedTxToDelete(tx);
    if (tx.installmentGroupId) {
      setIsDeleteTxInstallmentsModalVisible(true);
    } else {
      setIsDeleteTxConfirmVisible(true);
    }
  };

  const handleConfirmSingleDeleteTx = () => {
    if (!selectedTxToDelete) return;
    deleteTransaction(selectedTxToDelete.id);
    setIsDeleteTxConfirmVisible(false);
    setIsDeleteTxInstallmentsModalVisible(false);
    setSelectedTxToDelete(null);
  };

  const handleConfirmAllInstallmentsDeleteTx = () => {
    if (!selectedTxToDelete) return;
    deleteTransaction(selectedTxToDelete.id, { deleteAllInstallments: true });
    setIsDeleteTxInstallmentsModalVisible(false);
    setSelectedTxToDelete(null);
  };

  const workspace = useMemo(
    () => workspaces.find((item) => item.id === currentWorkspaceId),
    [workspaces, currentWorkspaceId]
  );

  const cards = useMemo(
    () => (workspace?.creditCards || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [workspace]
  );

  const workspaceAccounts = useMemo(
    () => accounts.filter((item) => !item.workspaceId || item.workspaceId === currentWorkspaceId),
    [accounts, currentWorkspaceId]
  );

  const selectedCard = useMemo(
    () => cards.find((item) => item.id === selectedCardId),
    [cards, selectedCardId]
  );

  const cardTransactions = useMemo(() => {
    if (!selectedCard) {
      return [] as Transaction[];
    }

    return transactions
      .filter(
        (tx) =>
          tx.workspaceId === currentWorkspaceId &&
          tx.paymentMethod === 'credit' &&
          tx.creditCardId === selectedCard.id
      )
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, currentWorkspaceId, selectedCard]);

  const cardInvoiceProjection = useMemo(() => {
    const currentMonthKey = toMonthKey(new Date());

    return cards.reduce<Record<string, Array<{ monthKey: string; amount: number }>>>(
      (acc, card) => {
        const monthTotals = transactions.reduce<Record<string, number>>((map, tx) => {
          if (
            tx.workspaceId !== currentWorkspaceId ||
            tx.paymentMethod !== 'credit' ||
            tx.creditCardId !== card.id ||
            (tx.invoiceStatus || 'open') === 'paid'
          ) {
            return map;
          }

          const monthKey = tx.invoiceMonth || resolveInvoiceMonth(tx.date, card.closingDay);
          const signedAmount = tx.type === 'income' ? -tx.amount : tx.amount;
          map[monthKey] = Number(((map[monthKey] || 0) + signedAmount).toFixed(2));
          return map;
        }, {});

        acc[card.id] = Object.entries(monthTotals)
          .filter(([monthKey, amount]) => monthKey >= currentMonthKey && amount > 0)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, 3)
          .map(([monthKey, amount]) => ({ monthKey, amount }));

        return acc;
      },
      {}
    );
  }, [cards, currentWorkspaceId, transactions]);

  const selectedCardsMonthKey = useMemo(() => toMonthKey(cardsMonthCursor), [cardsMonthCursor]);
  const selectedCardsMonthLabel = useMemo(
    () => toMonthLabel(selectedCardsMonthKey, localeTag),
    [selectedCardsMonthKey, localeTag]
  );

  const cardInvoiceTotalsByMonth = useMemo(() => {
    return cards.reduce<Record<string, Record<string, number>>>((acc, card) => {
      const monthTotals = transactions.reduce<Record<string, number>>((map, tx) => {
        if (
          tx.workspaceId !== currentWorkspaceId ||
          tx.paymentMethod !== 'credit' ||
          tx.creditCardId !== card.id ||
          (tx.invoiceStatus || 'open') === 'paid'
        ) {
          return map;
        }

        const monthKey = tx.invoiceMonth || resolveInvoiceMonth(tx.date, card.closingDay);
        const signedAmount = tx.type === 'income' ? -tx.amount : tx.amount;
        map[monthKey] = Number(((map[monthKey] || 0) + signedAmount).toFixed(2));
        return map;
      }, {});

      acc[card.id] = monthTotals;
      return acc;
    }, {});
  }, [cards, currentWorkspaceId, transactions]);

  const cardTransactionsBySelectedMonth = useMemo(() => {
    return cards.reduce<Record<string, Transaction[]>>((acc, card) => {
      const monthTransactions = transactions
        .filter((tx) => {
          if (
            tx.workspaceId !== currentWorkspaceId ||
            tx.paymentMethod !== 'credit' ||
            tx.creditCardId !== card.id
          ) {
            return false;
          }

          const monthKey = tx.invoiceMonth || resolveInvoiceMonth(tx.date, card.closingDay);
          return monthKey === selectedCardsMonthKey;
        })
        .slice()
        .sort((a, b) => {
          const aInstallment = a.installmentNumber || 0;
          const bInstallment = b.installmentNumber || 0;

          if (aInstallment !== bInstallment) {
            return aInstallment - bInstallment;
          }

          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

      acc[card.id] = monthTransactions;
      return acc;
    }, {});
  }, [cards, currentWorkspaceId, selectedCardsMonthKey, transactions]);

  const invoiceMonths = useMemo(() => {
    const months = new Set<string>();
    cardTransactions.forEach((tx) => {
      if (tx.invoiceMonth) {
        months.add(tx.invoiceMonth);
      }
    });

    return Array.from(months).sort((a, b) => a.localeCompare(b));
  }, [cardTransactions]);

  const invoiceTransactions = useMemo(() => {
    if (!selectedInvoiceMonth) {
      return [] as Transaction[];
    }

    return cardTransactions.filter((tx) => tx.invoiceMonth === selectedInvoiceMonth);
  }, [cardTransactions, selectedInvoiceMonth]);

  const openInvoiceTransactions = useMemo(
    () => invoiceTransactions.filter((tx) => (tx.invoiceStatus || 'open') !== 'paid'),
    [invoiceTransactions]
  );

  const calculatedInvoiceAmount = useMemo(
    () =>
      invoiceTransactions.reduce((sum, tx) => {
        if (tx.type === 'expense') {
          return sum + tx.amount;
        }

        if (tx.type === 'income') {
          return sum - tx.amount;
        }

        return sum;
      }, 0),
    [invoiceTransactions]
  );

  const openInvoiceAmount = useMemo(
    () =>
      openInvoiceTransactions.reduce((sum, tx) => {
        if (tx.type === 'expense') {
          return sum + tx.amount;
        }

        if (tx.type === 'income') {
          return sum - tx.amount;
        }

        return sum;
      }, 0),
    [openInvoiceTransactions]
  );

  const handleOpenCard = (card: CreditCard) => {
    setSelectedCardId(card.id);
    const fallbackMonth =
      invoiceMonths.find((month) => month === selectedCardsMonthKey) ||
      invoiceMonths[0] ||
      selectedCardsMonthKey;
    setSelectedInvoiceMonth(fallbackMonth);
    setCardsMonthCursor(normalizeMonthCursor(fallbackMonth));
    setPaidAmountValue(0);
    setIsDetailVisible(true);
  };

  const handleDeleteCard = (card: CreditCard) => {
    setCardToDelete(card);
  };

  const handlePreviousCardsMonth = () => {
    setCardsMonthCursor((prev) => addMonths(prev, -1));
  };

  const handleNextCardsMonth = () => {
    setCardsMonthCursor((prev) => addMonths(prev, 1));
  };

  const handleCreateCard = () => {
    const parsedClosing = Number.parseInt(closingDayText, 10);
    const parsedDue = Number.parseInt(dueDayText, 10);

    if (!cardName.trim() || !Number.isFinite(limitValue) || limitValue <= 0) {
      return;
    }

    if (!Number.isFinite(parsedClosing) || parsedClosing < 1 || parsedClosing > 31) {
      return;
    }

    if (!Number.isFinite(parsedDue) || parsedDue < 1 || parsedDue > 31) {
      return;
    }

    addCreditCard({
      name: cardName.trim(),
      limit: limitValue,
      closingDay: parsedClosing,
      dueDay: parsedDue,
      themeColor: cardColor,
    });

    setCardName('');
    setLimitValue(0);
    setClosingDayText('');
    setDueDayText('');
    setCardColor('#0A84FF');
    setIsCreateVisible(false);
  };

  const handleOpenPay = () => {
    if (!selectedCard || !selectedInvoiceMonth || workspaceAccounts.length === 0) {
      return;
    }

    setFromAccountId(workspaceAccounts[0]?.id || '');
    setPaidAmountValue(openInvoiceAmount);
    setIsPayVisible(true);
  };

  const handlePayInvoice = async () => {
    if (!selectedCard || !selectedInvoiceMonth || !fromAccountId) {
      return;
    }

    if (!Number.isFinite(paidAmountValue) || paidAmountValue <= 0) {
      return;
    }

    await payInvoice(selectedCard.id, selectedInvoiceMonth, fromAccountId, paidAmountValue);
    setIsPayVisible(false);
    setIsDetailVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: appBg, paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('cards.title')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={togglePrivacyMode}
            style={styles.privacyButton}
            accessibilityLabel={t('dashboard.togglePrivacy', { defaultValue: 'Ocultar Valores' })}
          >
            <MaterialCommunityIcons
              name={hideBalances ? 'eye-off' : 'eye'}
              size={22}
              color={hideBalances ? textSecondary : (workspace?.themeColor || '#0A84FF')}
            />
          </Pressable>
          <CopilotStep
            active={isFocused}
            text={t('tour.cards.create')}
            order={1}
            name="cards_create"
          >
            <WalkthroughablePressable
              style={styles.newButton}
              onPress={() => setIsCreateVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={newCardCtaLabel}
              accessibilityHint={newCardCtaHint}
            >
              <MaterialCommunityIcons name="credit-card-plus-outline" size={22} color="#FFFFFF" />
            </WalkthroughablePressable>
          </CopilotStep>
        </View>
      </View>

      <View style={[styles.topMonthNavigator, { backgroundColor: cardBg }]}>
        <Pressable style={styles.monthNavButton} onPress={handlePreviousCardsMonth}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={textPrimary} />
        </Pressable>

        <Text style={[styles.topMonthLabel, { color: textPrimary }]}>
          {selectedCardsMonthLabel}
        </Text>

        <Pressable style={styles.monthNavButton} onPress={handleNextCardsMonth}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CopilotStep
          active={isFocused}
          text={t('tour.cards.list')}
          order={2}
          name="cards_list"
        >
          <WalkthroughableView>
            {cards.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: cardBg }]}> 
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t('cards.emptyTitle')}</Text>
                <Text style={[styles.emptySubtitle, { color: textSecondary }]}>{t('cards.emptySubtitle')}</Text>
              </View>
            ) : (
              cards.map((card) => {
                const used = Math.max(card.limit - card.availableLimit, 0);
                const progress = Math.min((used / card.limit) * 100, 100);
                const cardAccentColor = resolveCardAccentColor(card.name, card.themeColor || '#0A84FF');
                const projectedMonths = cardInvoiceProjection[card.id] || [];
                const selectedMonthInvoice =
                  cardInvoiceTotalsByMonth[card.id]?.[selectedCardsMonthKey] || 0;
                const selectedMonthTransactions = cardTransactionsBySelectedMonth[card.id] || [];

                return (
                  <Pressable
                    key={card.id}
                    style={styles.cardWrapper}
                    onPress={() => handleOpenCard(card)}
                  >
                    {/* VISUAL PREMIUM: Cartão Físico */}
                    <View style={[styles.physicalCard, { backgroundColor: '#1A1C1E', borderColor: `${cardAccentColor}55`, borderLeftColor: cardAccentColor, borderLeftWidth: 4 }]}>
                      <View style={styles.physicalCardHeader}>
                        <Text style={[styles.physicalCardName]}>{card.name}</Text>
                        <View style={styles.physicalCardActions}>
                          <MaterialCommunityIcons name="contactless-payment" size={24} color={cardAccentColor} />
                          <Pressable
                            style={styles.physicalCardDeleteButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              handleDeleteCard(card);
                            }}
                            hitSlop={8}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#9CA3AF" />
                          </Pressable>
                        </View>
                      </View>

                      <Text style={[styles.physicalCardDates]}>
                        {t('cards.closingDue', { closingDay: card.closingDay, dueDay: card.dueDay })}
                      </Text>

                      <View style={styles.physicalCardLimitSection}>
                        <View>
                          <Text style={[styles.physicalCardUsedAmount, { color: '#FFFFFF' }]}>
                            {hideBalances ? maskedCurrency : formatCurrency(used, currency, localeTag, true)}
                          </Text>
                          <Text style={styles.physicalCardTotalAmount}>
                            / {hideBalances ? maskedCurrency : formatCurrency(card.limit, currency, localeTag, true)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumProgressTrack}>
                        <View style={[styles.premiumProgressBar, { width: `${progress}%`, backgroundColor: cardAccentColor }]} />
                      </View>

                      <Text style={[styles.physicalCardAvailable, { color: cardAccentColor }]}>
                        {t('cards.available', { amount: hideBalances ? maskedCurrency : formatCurrency(card.availableLimit, currency, localeTag, true) })}
                      </Text>
                    </View>

                    {/* EXTRATO DA FATURA: Anexado abaixo do cartão */}
                    <View style={[styles.invoiceReceipt, { backgroundColor: cardBg }]}>
                      <View style={styles.projectionBlock}>
                        <Text style={[styles.receiptSectionTitle, { color: textSecondary }]}>
                          {`${t('cards.invoiceFallback')} • ${selectedCardsMonthLabel}`}
                        </Text>

                        <Text
                          style={[
                            styles.selectedMonthAmount,
                            { color: selectedMonthInvoice > 0 ? '#FF453A' : textPrimary },
                          ]}
                        >
                          {hideBalances ? maskedCurrency : formatCurrency(selectedMonthInvoice, currency, localeTag, true)}
                        </Text>

                        {projectedMonths.length > 0 && (
                          <>
                            <View style={styles.divider} />
                            <Text style={[styles.receiptSectionTitle, { color: textSecondary }]}>{t('cards.nextInvoices')}</Text>
                            {projectedMonths.map((projection) => (
                              <View key={`${card.id}-${projection.monthKey}`} style={styles.projectionRow}>
                                <Text style={[styles.projectionMonth, { color: textPrimary }]}>
                                  {toMonthLabel(projection.monthKey, localeTag)}
                                </Text>
                                <Text style={[styles.projectionAmount, { color: '#FF453A' }]}>
                                  {hideBalances ? maskedCurrency : formatCurrency(projection.amount, currency, localeTag, true)}
                                </Text>
                              </View>
                            ))}
                          </>
                        )}

                        <View style={styles.divider} />
                        <Text style={[styles.receiptSectionTitle, { color: textSecondary }]}>Lançamentos da Fatura</Text>
                        
                        {selectedMonthTransactions.length === 0 ? (
                          <Text style={[styles.emptySubtitle, { color: textSecondary, marginTop: 4 }]}>{t('cards.noProjectedInvoices')}</Text>
                        ) : (
                          <View style={styles.invoiceCompositionList}>
                            {selectedMonthTransactions.map((tx) => {
                              const category = categories.find((c) => c.id === tx.categoryId);
                              const isIncome = tx.type === 'income';
                              const typeColor = isIncome ? INCOME_COLOR : EXPENSE_COLOR;
                              const sign = isIncome ? '+' : '';
                              const txStatus = tx.invoiceStatus || 'open';
                              const txNote = tx.note || t('cards.purchaseFallback');

                              return (
                                <View key={tx.id} style={[styles.txCard, { backgroundColor: fieldBg, borderColor }]}>
                                  <View style={[styles.txIconWrap, { backgroundColor: `${typeColor}15` }]}>
                                    <MaterialCommunityIcons name={toMaterialIconName(category?.icon)} size={20} color={typeColor} />
                                  </View>
                                  <View style={styles.txInfo}>
                                    <Text style={[styles.txCategory, { color: textPrimary }]} numberOfLines={2}>
                                      {txNote}
                                    </Text>
                                    <View style={styles.txMetaRow}>
                                      <Text style={[styles.txDate, { color: textSecondary }]}>
                                        {new Date(tx.date).toLocaleDateString(localeTag, { day: '2-digit', month: 'short' })}
                                      </Text>
                                      {tx.installmentNumber && tx.installmentTotal ? (
                                        <>
                                          <Text style={[styles.txDot, { color: textSecondary }]}>•</Text>
                                          <Text style={[styles.txAccountName, { color: textSecondary }]}>
                                            {t('cards.installmentOf', {
                                              current: tx.installmentNumber,
                                              total: tx.installmentTotal,
                                            })}
                                          </Text>
                                        </>
                                      ) : null}
                                      <Text style={[styles.txDot, { color: textSecondary }]}>•</Text>
                                      <Text style={[styles.txStatusInline, { color: txStatus === 'paid' ? '#22C55E' : textSecondary }]}>
                                        {txStatus === 'paid' ? t('cards.statusPaid') : t('cards.statusOpen')}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={[styles.txAmount, { color: typeColor }]}>
                                    {sign}{hideBalances ? maskedCurrency : formatCurrency(tx.amount, currency, localeTag, true)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </WalkthroughableView>
        </CopilotStep>
      </ScrollView>

      {/* MODAL DE CRIAÇÃO (Design Clean) */}
      <Modal visible={isCreateVisible} transparent animationType="slide" onRequestClose={() => setIsCreateVisible(false)}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.bottom + 8}
        >
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}> 
            <Text style={[styles.modalTitle, { color: textPrimary, marginBottom: 8 }]}>{t('cards.newCard')}</Text>

            <TextInput
              value={cardName}
              onChangeText={(value) => setCardName(uppercaseFirstLetter(value))}
              placeholder={t('cards.placeholders.name')}
              placeholderTextColor={textSecondary}
              style={[styles.input, { color: textPrimary, borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E', backgroundColor: theme === 'light' ? '#F9FAFB' : '#1A1A1A' }]}
            />

            <CurrencyInput
              value={limitValue}
              onChangeValue={setLimitValue}
              placeholder={t('cards.placeholders.limit')}
              placeholderTextColor={textSecondary}
              style={[styles.input, { color: textPrimary, borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E', backgroundColor: theme === 'light' ? '#F9FAFB' : '#1A1A1A' }]}
            />

            <View style={styles.row}>
              <TextInput
                value={closingDayText}
                onChangeText={setClosingDayText}
                placeholder={t('cards.placeholders.closing')}
                keyboardType="numeric"
                placeholderTextColor={textSecondary}
                style={[styles.input, styles.halfInput, { color: textPrimary, borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E', backgroundColor: theme === 'light' ? '#F9FAFB' : '#1A1A1A' }]}
              />
              <TextInput
                value={dueDayText}
                onChangeText={setDueDayText}
                placeholder={t('cards.placeholders.due')}
                keyboardType="numeric"
                placeholderTextColor={textSecondary}
                style={[styles.input, styles.halfInput, { color: textPrimary, borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E', backgroundColor: theme === 'light' ? '#F9FAFB' : '#1A1A1A' }]}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.secondaryBtn, { borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E' }]} onPress={() => setIsCreateVisible(false)}>
                <Text style={[styles.secondaryText, { color: textSecondary }]}>{t('cards.cancel')}</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={handleCreateCard}>
                <Text style={styles.primaryText}>{t('cards.save')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL DE DETALHES (Design Premium) */}
      <Modal visible={isDetailVisible} transparent animationType="slide" onRequestClose={() => setIsDetailVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.detailCard, { backgroundColor: cardBg }]}> 
            <View style={styles.detailHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>{selectedCard?.name || t('cards.invoiceFallback')}</Text>
              <Pressable onPress={() => setIsDetailVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
              {invoiceMonths.map((monthKey) => {
                const active = monthKey === selectedInvoiceMonth;
                return (
                  <Pressable
                    key={monthKey}
                    onPress={() => {
                      setSelectedInvoiceMonth(monthKey);
                      setCardsMonthCursor(normalizeMonthCursor(monthKey));
                    }}
                    style={[styles.monthChip, { borderColor: active ? selectedCard?.themeColor || '#0A84FF' : (theme === 'light' ? '#E5E7EB' : '#2C2C2E') }]}
                  >
                    <Text style={{ color: active ? selectedCard?.themeColor || '#0A84FF' : textSecondary, fontWeight: '700' }}>{toMonthLabel(monthKey, localeTag)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.invoiceAmountWrapper}>
              <Text style={[styles.invoiceAmount, { color: textPrimary }]}>
                {formatCurrency(openInvoiceAmount, currency, localeTag, true)}
              </Text>
              <Text style={[styles.invoiceMeta, { color: textSecondary }]}>
                {t('cards.invoiceSummary', {
                  open: formatCurrency(openInvoiceAmount, currency, localeTag, true),
                  total: formatCurrency(calculatedInvoiceAmount, currency, localeTag, true),
                })}
              </Text>
            </View>

            <ScrollView style={styles.invoiceList} showsVerticalScrollIndicator={false}>
              {invoiceTransactions.map((tx) => {
                const category = categories.find((c) => c.id === tx.categoryId);
                const isIncome = tx.type === 'income';
                const typeColor = isIncome ? INCOME_COLOR : EXPENSE_COLOR;
                const sign = isIncome ? '+' : '';
                const txStatus = tx.invoiceStatus || 'open';
                const txNote = tx.note || t('cards.purchaseFallback');

                return (
                  <View key={tx.id} style={[styles.txCard, { backgroundColor: fieldBg, borderColor }]}>
                    <View style={[styles.txIconWrap, { backgroundColor: `${typeColor}15` }]}>
                      <MaterialCommunityIcons name={toMaterialIconName(category?.icon)} size={20} color={typeColor} />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txCategory, { color: textPrimary }]} numberOfLines={2}>
                        {txNote}
                      </Text>
                      <View style={styles.txMetaRow}>
                        <Text style={[styles.txDate, { color: textSecondary }]}>
                          {new Date(tx.date).toLocaleDateString(localeTag, { day: '2-digit', month: 'short' })}
                        </Text>
                        {tx.installmentNumber && tx.installmentTotal ? (
                          <>
                            <Text style={[styles.txDot, { color: textSecondary }]}>•</Text>
                            <Text style={[styles.txAccountName, { color: textSecondary }]}>
                              {t('cards.installmentOf', {
                                current: tx.installmentNumber,
                                total: tx.installmentTotal,
                              })}
                            </Text>
                          </>
                        ) : null}
                        <Text style={[styles.txDot, { color: textSecondary }]}>•</Text>
                        <Text style={[styles.txStatusInline, { color: txStatus === 'paid' ? '#22C55E' : textSecondary }]}>
                          {txStatus === 'paid' ? t('cards.statusPaid') : t('cards.statusOpen')}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                      <Text style={[styles.txAmount, { color: typeColor }]}>
                        {sign}{formatCurrency(tx.amount, currency, localeTag, true)}
                      </Text>
                      {txStatus !== 'paid' && (
                        <Pressable
                          onPress={() => handleRequestDeleteTx(tx)}
                          hitSlop={8}
                          style={{ padding: 4 }}
                          accessibilityLabel={t('dashboard.edit.delete', { defaultValue: 'Excluir' })}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color={EXPENSE_COLOR} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <CopilotStep
              active={isFocused && isDetailVisible}
              text={t('tour.cards.pay')}
              order={3}
              name="cards_pay"
            >
              <WalkthroughablePressable
                style={[
                  styles.invoiceActionButton,
                  { backgroundColor: selectedCard?.themeColor || '#0A84FF' },
                  openInvoiceAmount <= 0 && styles.disabledButton,
                ]}
                onPress={handleOpenPay}
                disabled={openInvoiceAmount <= 0}
              >
                <Text style={[styles.primaryText, { color: selectedCard?.themeColor === '#d2ff61' ? '#101010' : '#FFFFFF' }]}>{t('cards.payInvoice')}</Text>
              </WalkthroughablePressable>
            </CopilotStep>
          </View>
        </View>
      </Modal>

      {/* MODAL DE PAGAMENTO */}
      <Modal visible={isPayVisible} transparent animationType="fade" onRequestClose={() => setIsPayVisible(false)}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.bottom + 8}
        >
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}> 
            <Text style={[styles.modalTitle, { color: textPrimary }]}>{t('cards.invoicePayment')}</Text>

            <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('cards.paidAmount')}</Text>
            <CurrencyInput
              value={paidAmountValue}
              onChangeValue={setPaidAmountValue}
              placeholder={t('cards.placeholders.amount')}
              placeholderTextColor={textSecondary}
              style={[styles.input, { color: textPrimary, borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E', backgroundColor: theme === 'light' ? '#F9FAFB' : '#1A1A1A' }]}
            />

            <Text style={[styles.fieldLabel, { color: textSecondary }]}>{t('cards.debitAccount')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsRow}>
              {workspaceAccounts.map((account) => {
                const active = account.id === fromAccountId;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setFromAccountId(account.id)}
                    style={[styles.monthChip, { borderColor: active ? selectedCard?.themeColor || '#0A84FF' : (theme === 'light' ? '#E5E7EB' : '#2C2C2E') }]}
                  >
                    <Text style={{ color: active ? selectedCard?.themeColor || '#0A84FF' : textSecondary, fontWeight: '700' }}>{account.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={[styles.secondaryBtn, { borderColor: theme === 'light' ? '#E5E7EB' : '#2C2C2E' }]} onPress={() => setIsPayVisible(false)}>
                <Text style={[styles.secondaryText, { color: textSecondary }]}>{t('cards.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { backgroundColor: selectedCard?.themeColor || '#0A84FF' }]} onPress={() => void handlePayInvoice()}>
                <Text style={[styles.primaryText, { color: selectedCard?.themeColor === '#d2ff61' ? '#101010' : '#FFFFFF' }]}>{t('cards.confirm')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmActionModal
        visible={!!cardToDelete}
        title={t('cards.deleteConfirmTitle', { defaultValue: 'Excluir cartão' })}
        message={t('cards.deleteConfirmMessage', {
          defaultValue:
            'Tem certeza que deseja excluir o cartão "{{name}}"? Esta ação remove também os lançamentos vinculados.',
          name: cardToDelete?.name || '',
        })}
        cancelLabel={t('cards.cancel', { defaultValue: 'Cancelar' })}
        confirmLabel={t('cards.deleteAction', { defaultValue: 'Excluir' })}
        onCancel={() => setCardToDelete(null)}
        onConfirm={() => {
          if (cardToDelete) {
            removeCreditCard(cardToDelete.id);
            if (selectedCardId === cardToDelete.id) {
              setIsPayVisible(false);
              setIsDetailVisible(false);
              setSelectedCardId(null);
              setSelectedInvoiceMonth('');
            }
          }
          setCardToDelete(null);
        }}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      <ConfirmActionModal
        visible={isDeleteTxConfirmVisible}
        title={t('cards.deleteTransactionTitle', { defaultValue: 'Excluir lançamento do cartão' })}
        message={t('cards.deleteTransactionMessage', {
          defaultValue: 'Deseja excluir este lançamento da fatura? O limite disponível do cartão será recalculado.',
        })}
        confirmLabel={t('dashboard.edit.delete', { defaultValue: 'Excluir' })}
        cancelLabel={t('dashboard.edit.cancel', { defaultValue: 'Cancelar' })}
        onConfirm={handleConfirmSingleDeleteTx}
        onCancel={() => {
          setIsDeleteTxConfirmVisible(false);
          setSelectedTxToDelete(null);
        }}
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
        onRequestClose={() => {
          setIsDeleteTxInstallmentsModalVisible(false);
          setSelectedTxToDelete(null);
        }}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.confirmTitle, { color: textPrimary }]}>
              {t('dashboard.edit.deleteInstallmentsTitle', { defaultValue: 'Compra Parcelada' })}
            </Text>
            <Text style={[styles.confirmMessage, { color: textSecondary }]}>
              {t('dashboard.edit.deleteInstallmentsMessage', {
                total: selectedTxToDelete?.installmentTotal || 1,
                defaultValue: `Esta movimentação faz parte de uma compra parcelada em ${selectedTxToDelete?.installmentTotal || 1}x. O que você deseja fazer?`,
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
                onPress={() => {
                  setIsDeleteTxInstallmentsModalVisible(false);
                  setSelectedTxToDelete(null);
                }}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  newButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 14,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMonthNavigator: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  topMonthLabel: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 24,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  
  /* --- ESTILOS DO CARTÃO PREMIUM --- */
  cardWrapper: {
    marginBottom: 12,
  },
  physicalCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    zIndex: 2, 
  },
  physicalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  physicalCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  physicalCardDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111315',
  },
  physicalCardName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  physicalCardDates: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  physicalCardLimitSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  physicalCardUsedAmount: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  physicalCardTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 4,
  },
  premiumProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  premiumProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  physicalCardAvailable: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  /* --- EXTRATO (RECIBO) ABAIXO DO CARTÃO --- */
  invoiceReceipt: {
    marginTop: -8,
    paddingTop: 24,
    paddingHorizontal: 14,
    paddingBottom: 24,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    zIndex: 1,
  },
  receiptSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    marginVertical: 14,
  },
  projectionBlock: {
    gap: 8,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  projectionMonth: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  projectionAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  invoiceCompositionList: {
    gap: 12,
  },
  selectedMonthAmount: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 42,
    marginBottom: 8,
  },

  /* --- MODAIS COMUNS --- */
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    gap: 14,
  },
  detailCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '90%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A84FF',
  },
  invoiceActionButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryText: {
    color: '#FFFFFF',
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
  invoiceAmountWrapper: {
    marginVertical: 20,
    alignItems: 'center',
  },
  invoiceAmount: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  invoiceMeta: {
    fontSize: 14,
    fontWeight: '600',
  },
  invoiceList: {
    maxHeight: 320,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* --- TRANSACTIONS (IDÊNTICO À ACCOUNTS) --- */
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 10,
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
    marginRight: 10,
  },
  txCategory: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  txDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  txDot: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  txAccountName: {
    fontSize: 12,
    fontWeight: '600',
  },
  txStatusInline: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 108,
    textAlign: 'right',
    marginLeft: 8,
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

export default CreditCardsScreen;