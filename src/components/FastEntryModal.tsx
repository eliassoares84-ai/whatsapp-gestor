  import { MaterialCommunityIcons } from '@expo/vector-icons';
  import Constants from 'expo-constants';
  import React, { useMemo, useState } from 'react';
  import {
    ActivityIndicator,
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
  import { useTranslation } from 'react-i18next';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';

  // expo-speech-recognition requires native modules — not available in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  let ExpoSpeechRecognitionModule: any = null;
  let useSpeechRecognitionEvent: (event: string, cb: (e: any) => void) => void = () => {};
  if (!isExpoGo) {
    try {
      const sr = require('expo-speech-recognition');
      ExpoSpeechRecognitionModule = sr.ExpoSpeechRecognitionModule;
      useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent;
    } catch {
      // native module unavailable
    }
  }

  import {
    mapGeminiCategoryToId,
    processFinanceCommand,
  } from '../services/geminiService';
  import { PaywallScreen } from '../screens/PaywallScreen';
  import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
  import type { PaymentMethod, Transaction } from '../types/finance.types';
  import { getLocalizedCategoryName } from '../utils/categoryLocalization';
  import { formatCurrency } from '../utils/formatters';
  import { uppercaseFirstLetter } from '../utils/textInputFormat';
  import { parseVoiceCommand } from '../utils/voiceParser';
  import { CurrencyInput } from './CurrencyInput';
  import { getThemeTokens, sharedTokens } from '../styles/themes';

  const APP_BG = '#0A0A0A';
  const CARD_BG = '#121212';
  const ACCENT_GREEN = '#d2ff61';
  const ACCENT_BLUE = '#0A84FF';
  const INCOME_COLOR = '#30D158';
  const EXPENSE_COLOR = '#FF453A';
  const TEXT_PRIMARY = '#FFFFFF';
  const TEXT_SECONDARY = '#9CA3AF';

  const MONEY_PATTERN = /(?:r\$\s*)?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/gi;

  const sanitizeEntryNote = (value?: string): string | undefined => {
    if (!value) {
      return undefined;
    }

    let cleaned = value
      .replace(MONEY_PATTERN, ' ')
      .replace(/\b(?:gastei|paguei|comprei|recebi|ganhei|entrada|saida|saída|despesa|receita|custou|deu)\b/gi, ' ')
      .replace(/\b(?:r\$|reais|real|rs|conto|contos|pila|pilas|pau|paus)\b/gi, ' ')
      .replace(/\b(?:no\s+cart[aã]o(?:\s+de\s+(?:cr[eé]dito|d[eé]bito))?|no\s+cr[eé]dito|no\s+d[eé]bito|no\s+pix|em\s+dinheiro|no\s+dinheiro|em\s+esp[eé]cie|a\s+vista|[aà]\s+vista)\b/gi, ' ')
      .replace(/\b(?:em\s+\d{1,2}\s*(?:x|vezes|parcelas?)|\d{1,2}\s*(?:x|vezes|parcelas?)|parcelad[oa])\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    cleaned = cleaned.replace(/^(?:de|com|em|para|pra|no|na)\s+/i, '');
    cleaned = cleaned.replace(/\s+(?:de|com|em|para|pra|no|na)$/i, '');
    cleaned = cleaned.trim();

    if (!cleaned) {
      return undefined;
    }

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const resolveMaterialIconName = (
    iconName?: string
  ): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
    return (iconName || 'bank-outline') as React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  };

  interface FastEntryModalProps {
    visible: boolean;
    onClose: () => void;
    autoStartVoice?: boolean;
    initialAmount?: number;
    initialType?: 'expense' | 'income';
    initialNote?: string;
    initialText?: string;
  }

  type ParsedEntryData = Partial<Transaction> & {
    installments?: number;
  };

  export const FastEntryModal: React.FC<FastEntryModalProps> = ({
    visible,
    onClose,
    autoStartVoice,
    initialAmount,
    initialType,
    initialNote,
    initialText,
  }) => {
    const { t, i18n } = useTranslation();
    const theme = useThemeStore((state) => state.theme);
    const insets = useSafeAreaInsets();
    const [inputText, setInputText] = useState<string>('');
    const [parsedData, setParsedData] = useState<ParsedEntryData | null>(null);
    const [confirmationMsg, setConfirmationMsg] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAiResult, setHasAiResult] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPaywallVisible, setIsPaywallVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [selectedCreditCardId, setSelectedCreditCardId] = useState<string | null>(null);
    const [selectedInstallments, setSelectedInstallments] = useState(1);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [entryMode, setEntryMode] = useState<'voice' | 'manual'>('manual');
    const [manualType, setManualType] = useState<'expense' | 'income'>('expense');
    const [manualAmount, setManualAmount] = useState<number>(0);
    const [manualDescription, setManualDescription] = useState<string>('');
    const inputTextRef = React.useRef('');
    const scrollViewRef = React.useRef<ScrollView>(null);

    const {
      addTransaction,
      addCategory,
      currency,
      currentWorkspaceId,
      workspaces,
      categories,
      accounts,
      isPremium,
      togglePremiumStatus,
    } = useFinanceStore();
    const localeTag = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language.startsWith('es') ? 'es-ES' : 'en-US';

    const workspaceAccounts = useMemo(
      () =>
        (accounts || [])
          .filter((account) => !account.workspaceId || account.workspaceId === currentWorkspaceId)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
      [accounts, currentWorkspaceId]
    );

    const workspaceCreditCards = useMemo(() => {
      const workspace = workspaces.find((item) => item.id === currentWorkspaceId);
      return (workspace?.creditCards || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    }, [workspaces, currentWorkspaceId]);

    const requiresExplicitAccount = workspaceAccounts.length > 1;

    const selectedAccount = useMemo(
      () => workspaceAccounts.find((account) => account.id === selectedAccountId),
      [workspaceAccounts, selectedAccountId]
    );

    const selectedCreditCard = useMemo(
      () => workspaceCreditCards.find((card) => card.id === selectedCreditCardId),
      [workspaceCreditCards, selectedCreditCardId]
    );

    const workspaceCategories = useMemo(
      () =>
        categories
          .filter((category) => category.workspaceId === currentWorkspaceId)
          .sort((a, b) =>
            getLocalizedCategoryName(a.id, a.name, t).localeCompare(
              getLocalizedCategoryName(b.id, b.name, t),
              i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language.startsWith('es') ? 'es-ES' : 'en-US',
              { sensitivity: 'base' }
            )
          ),
      [categories, currentWorkspaceId, i18n.language, t]
    );

    function getCategoryDisplayName(categoryId: string, fallbackName: string): string {
      return getLocalizedCategoryName(categoryId, fallbackName, t);
    }

    const orderedWorkspaceCategories = useMemo(() => {
      const firstCategoryId = workspaceCategories.find(() => true)?.id || null;
      const activeId = selectedCategoryId || firstCategoryId;
      const selectedCategory = workspaceCategories.find((category) => category.id === activeId);
      
      const remainingCategories = workspaceCategories
        .filter((category) => category.id !== activeId)
        .slice()
        .sort((a, b) =>
          getCategoryDisplayName(a.id, a.name).localeCompare(
            getCategoryDisplayName(b.id, b.name),
            localeTag,
            { sensitivity: 'base' }
          )
        );

      return selectedCategory ? [selectedCategory, ...remainingCategories] : remainingCategories;
    }, [localeTag, selectedCategoryId, workspaceCategories, t]);

    const availableCategoryNames = useMemo(
      () => workspaceCategories.map((category) => category.name),
      [workspaceCategories]
    );

    const selectedCategory = useMemo(
      () => workspaceCategories.find((category) => category.id === selectedCategoryId),
      [workspaceCategories, selectedCategoryId]
    );

    React.useEffect(() => {
      if (workspaceAccounts.length === 1) {
        setSelectedAccountId(workspaceAccounts[0]?.id || null);
        return;
      }

      if (
        selectedAccountId &&
        workspaceAccounts.some((account) => account.id === selectedAccountId)
      ) {
        return;
      }

      setSelectedAccountId(null);
    }, [workspaceAccounts, selectedAccountId]);

    React.useEffect(() => {
      if (workspaceCreditCards.length === 1) {
        setSelectedCreditCardId(workspaceCreditCards[0]?.id || null);
        return;
      }

      if (
        selectedCreditCardId &&
        workspaceCreditCards.some((card) => card.id === selectedCreditCardId)
      ) {
        return;
      }

      setSelectedCreditCardId(null);
    }, [workspaceCreditCards, selectedCreditCardId]);

    React.useEffect(() => {
      if (Platform.OS !== 'android') {
        return;
      }

      const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
        const nextHeight = Math.max(0, event.endCoordinates.height - insets.bottom);
        setKeyboardHeight(nextHeight);
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [insets.bottom]);

    React.useEffect(() => {
      if (visible) {
        setEntryMode(isPremium ? 'voice' : 'manual');
        if (!selectedPaymentMethod) {
          setSelectedPaymentMethod('pix');
        }
        if (!selectedCategoryId) {
          const firstCat = workspaceCategories[0]?.id || null;
          setSelectedCategoryId(firstCat);
        }
      } else {
        setKeyboardHeight(0);
        setManualAmount(0);
        setManualDescription('');
        setConfirmationMsg('');
      }
    }, [visible, isPremium, workspaceCategories]);

    const normalizeLabel = (value: string): string =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    const resolveAccountIdFromText = (rawText?: string): string | null => {
      if (!rawText) {
        return workspaceAccounts.length === 1 ? workspaceAccounts[0]?.id || null : null;
      }

      const normalizedText = normalizeLabel(rawText);
      const exact = workspaceAccounts.find((account) => {
        const normalizedName = normalizeLabel(account.name);
        return normalizedName.length > 2 && normalizedText.includes(normalizedName);
      });

      if (exact) {
        return exact.id;
      }

      const partial = workspaceAccounts.find((account) => {
        const tokens = normalizeLabel(account.name)
          .split(/\s+/)
          .filter((token) => token.length >= 3);
        return tokens.some((token) => normalizedText.includes(token));
      });

      if (partial) {
        return partial.id;
      }

      return workspaceAccounts.length === 1 ? workspaceAccounts[0]?.id || null : null;
    };

    const resolvePaymentMethodFromText = (rawText?: string): PaymentMethod | null => {
      const normalizedText = normalizeLabel(rawText || '');
      if (/(debito|debit)/.test(normalizedText)) {
        return 'debit';
      }

      if (/(credito|cartao|credit|fatura)/.test(normalizedText)) {
        return 'credit';
      }

      if (/(pix)/.test(normalizedText)) {
        return 'pix';
      }

      if (/(dinheiro|cash|especie|esp[eé]cie)/.test(normalizedText)) {
        return 'cash';
      }

      return null;
    };

    const resolveInstallmentsFromText = (rawText?: string): number => {
      if (!rawText) {
        return 1;
      }

      const normalizedText = normalizeLabel(rawText);
      const match = normalizedText.match(/(\d{1,2})\s*(?:x|vezes|parcela|parcelas)/i);

      if (!match?.[1]) {
        return 1;
      }

      const parsed = Number.parseInt(match[1], 10);
      if (!Number.isFinite(parsed) || parsed <= 1) {
        return 1;
      }

      return Math.min(parsed, 48);
    };

    const resolveCreditCardIdFromText = (rawText?: string): string | null => {
      if (!rawText) {
        return workspaceCreditCards.length === 1 ? workspaceCreditCards[0]?.id || null : null;
      }

      const normalizedText = normalizeLabel(rawText);
      const exact = workspaceCreditCards.find((card) => {
        const normalizedName = normalizeLabel(card.name);
        return normalizedName.length > 2 && normalizedText.includes(normalizedName);
      });

      if (exact) {
        return exact.id;
      }

      const partial = workspaceCreditCards.find((card) => {
        const tokens = normalizeLabel(card.name)
          .split(/\s+/)
          .filter((token) => token.length >= 3);
        return tokens.some((token) => normalizedText.includes(token));
      });

      if (partial) {
        return partial.id;
      }

      return workspaceCreditCards.length === 1 ? workspaceCreditCards[0]?.id || null : null;
    };

    const resolveCategoryId = (categoryName?: string): string => {
      const fallbackCategory =
        workspaceCategories.find(
          (category) => normalizeLabel(category.name) === 'outros'
        ) || workspaceCategories[0];

      if (!categoryName) {
        return fallbackCategory?.id || 'uncategorized';
      }

      const normalizedTarget = normalizeLabel(categoryName);
      const exactMatch = workspaceCategories.find(
        (category) => normalizeLabel(category.name) === normalizedTarget
      );

      if (exactMatch) {
        return exactMatch.id;
      }

      return fallbackCategory?.id || mapGeminiCategoryToId(categoryName);
    };

    useSpeechRecognitionEvent('start', () => setIsListening(true));
    useSpeechRecognitionEvent('end', () => {
      setIsListening(false);
      setInputText(prev => {
        if (prev.trim()) {
          setTimeout(() => handleAnalyze(), 50);
        }
        return prev;
      });
    });
    useSpeechRecognitionEvent('result', (event) => {
      if (event.results && event.results.length > 0) {
        // Concatena todos os segmentos de transcrição recebidos para não perder partes da frase
        const fullTranscript = event.results
          .map((r: any) => r?.transcript || '')
          .filter(Boolean)
          .join(' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (fullTranscript) {
          inputTextRef.current = fullTranscript;
          setInputText(fullTranscript);
        }
      }
    });
    useSpeechRecognitionEvent('error', () => setIsListening(false));

    const handleMicPress = async () => {
      if (!isPremium) {
        setIsPaywallVisible(true);
        return;
      }
      if (isExpoGo || !ExpoSpeechRecognitionModule) return;
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        return;
      }
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) return;
      inputTextRef.current = '';
      setInputText('');
      setParsedData(null);
      setHasAiResult(false);
      setConfirmationMsg('');

      // Vocabulário contextual para calibrar o motor acústico e evitar erros fonéticos
      const contextualVocabulary = [
        ...workspaceCategories.map((c) => c.name),
        ...workspaceAccounts.map((a) => a.name),
        ...workspaceCreditCards.map((c) => c.name),
        'reais', 'centavos', 'real', 'conto', 'pila', 'pau',
        'pix', 'crédito', 'débito', 'cartão', 'dinheiro', 'espécie',
        'parcelado', 'fatura', 'à vista', 'vezes',
        'almoço', 'jantar', 'café', 'lanche', 'refeição',
        'mercado', 'supermercado', 'padaria', 'açougue', 'hortifruti',
        'farmácia', 'remédio', 'medicamento',
        'gasolina', 'combustível', 'etanol', 'posto', 'abastecimento',
        'uber', '99', 'táxi', 'estacionamento', 'pedágio',
        'aluguel', 'condomínio', 'luz', 'energia', 'água', 'internet',
        'Nubank', 'Inter', 'Itaú', 'Bradesco', 'Santander', 'Caixa', 'C6',
        'paguei', 'gastei', 'comprei', 'recebi', 'salário',
      ].filter(Boolean);

      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        contextualStrings: contextualVocabulary,
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'free_form',
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1800,
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1200,
          EXTRA_MASK_OFFENSIVE_WORDS: false,
        },
      });
    };

    const handleAnalyze = async () => {
      const currentInput = (inputTextRef.current || inputText).trim();
      if (!currentInput) return;

      Keyboard.dismiss();

      // 1. Análise local contextual e inteligente (imediata, offline e para todas as contas)
      const localResult = parseVoiceCommand(currentInput, workspaceCategories);
      const inferredPaymentMethod = resolvePaymentMethodFromText(currentInput);
      const defaultPaymentMethod = inferredPaymentMethod || 'pix';
      
      const matchedCategoryId =
        localResult.categoryId && workspaceCategories.some((c) => c.id === localResult.categoryId)
          ? localResult.categoryId
          : workspaceCategories.find((c) => normalizeLabel(c.name) === 'outros')?.id ||
            workspaceCategories[0]?.id ||
            'outros';

      const resolvedAccountId =
        resolveAccountIdFromText(currentInput) || workspaceAccounts[0]?.id || null;
      const resolvedCardId =
        defaultPaymentMethod === 'credit'
          ? resolveCreditCardIdFromText(currentInput) || workspaceCreditCards[0]?.id || null
          : null;

      // Popula instantaneamente o formulário com a análise local precisa
      setParsedData({
        type: localResult.type || 'expense',
        amount: localResult.amount,
        categoryId: matchedCategoryId,
        note: sanitizeEntryNote(localResult.note || currentInput),
        paymentMethod: defaultPaymentMethod,
        installments: localResult.installments || resolveInstallmentsFromText(currentInput),
        creditCardId: resolvedCardId || undefined,
        accountId: resolvedAccountId || undefined,
      });

      setSelectedCategoryId(matchedCategoryId);
      setSelectedAccountId(resolvedAccountId);
      setSelectedPaymentMethod(defaultPaymentMethod);
      setSelectedCreditCardId(resolvedCardId);
      setSelectedInstallments(localResult.installments || 1);
      setHasAiResult(true);

      // Se a IA Gemini não estiver habilitada ou sem chave, já encerra pronto para confirmação
      if (!isPremium || !process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        setConfirmationMsg(
          localResult.amount
            ? t('fastEntry.messages.freeModeReady', 'Lançamento reconhecido! Confira e confirme.')
            : t('fastEntry.messages.freeModeNeedAmount', 'Informe o valor da transação.')
        );
        return;
      }

      // Se for Premium e com chave de IA, refina o note e categorias via Gemini
      setIsAnalyzing(true);
      try {
        const result = await processFinanceCommand(currentInput, {
          availableCategories: availableCategoryNames,
        });

        const refinedCategoryId = resolveCategoryId(result.data.category) || matchedCategoryId;
        const refinedPaymentMethod =
          inferredPaymentMethod ||
          (result.data.paymentMethod ? (result.data.paymentMethod as PaymentMethod) : defaultPaymentMethod);

        const mappedData: ParsedEntryData = {
          amount: result.data.amount ?? localResult.amount,
          type: result.data.type || localResult.type,
          categoryId: refinedCategoryId,
          note: sanitizeEntryNote(result.data.note || currentInput),
          paymentMethod: refinedPaymentMethod,
          installments: result.data.installments || localResult.installments || 1,
          creditCardId:
            resolveCreditCardIdFromText(result.data.note || currentInput) ||
            resolvedCardId ||
            undefined,
          accountId:
            resolveAccountIdFromText(result.data.note || currentInput) ||
            resolvedAccountId ||
            undefined,
        };

        setParsedData(mappedData);
        setSelectedCategoryId(refinedCategoryId);
        setSelectedAccountId(mappedData.accountId || resolvedAccountId);
        setSelectedPaymentMethod(refinedPaymentMethod);
        setSelectedCreditCardId(mappedData.creditCardId || resolvedCardId);
        setSelectedInstallments(mappedData.installments || 1);
        setConfirmationMsg(result.confirmationMsg);
        
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch {
        setConfirmationMsg(
          localResult.amount
            ? t('fastEntry.messages.freeModeReady', 'Lançamento reconhecido localmente!')
            : t('fastEntry.messages.freeModeNeedAmount', 'Informe o valor da transação.')
        );
      } finally {
        setIsAnalyzing(false);
      }
    };

    React.useEffect(() => {
      if (!visible) {
        return;
      }

      if (autoStartVoice) {
        setEntryMode('voice');
        const timer = setTimeout(() => {
          void handleMicPress();
        }, 400);
        return () => clearTimeout(timer);
      }

      if (initialText) {
        setInputText(initialText);
        inputTextRef.current = initialText;
        setEntryMode('voice');
        const timer = setTimeout(() => {
          void handleAnalyze();
        }, 300);
        return () => clearTimeout(timer);
      } else if (initialAmount !== undefined || initialNote) {
        setEntryMode('manual');
        if (initialAmount !== undefined) {
          setManualAmount(initialAmount);
        }
        if (initialType) {
          setManualType(initialType);
        }
        if (initialNote) {
          setManualDescription(initialNote);
        }
      }
    }, [visible, autoStartVoice, initialText, initialAmount, initialType, initialNote]);

    const handleConfirmAndSave = async () => {
      if (!hasAiResult || !parsedData) return;
      const currentInput = (inputTextRef.current || inputText).trim();

      Keyboard.dismiss();

      let amount = parsedData.amount;
      if (amount === undefined) {
        const match = currentInput.match(/(\d+[.,]?\d*)/);
        const amountToken = match?.[1];
        amount = amountToken ? parseFloat(amountToken.replace(',', '.')) : undefined;
      }
      if (amount === undefined || isNaN(amount)) {
        setConfirmationMsg(t('fastEntry.messages.aiFailedNoAmount'));
        return;
      }

      const fallbackCategoryId = workspaceCategories[0]?.id || categories.find(() => true)?.id || 'outros';
      const finalCategoryId = selectedCategoryId || parsedData.categoryId || fallbackCategoryId;
      const txType = parsedData.type || 'expense';
      let finalPaymentMethod = selectedPaymentMethod || parsedData.paymentMethod || 'pix';

      if (!finalPaymentMethod) {
        finalPaymentMethod = 'pix';
        setSelectedPaymentMethod('pix');
      }

      if (finalPaymentMethod === 'credit' && !selectedCreditCardId && workspaceCreditCards.length === 0) {
        const inferredFromInput = resolvePaymentMethodFromText(currentInput);
        finalPaymentMethod = inferredFromInput || 'credit';
        setSelectedPaymentMethod(finalPaymentMethod);
      }

      const resolvedAccountId = selectedAccountId || workspaceAccounts[0]?.id || null;

      const finalInstallments =
        finalPaymentMethod === 'credit' && txType === 'expense'
          ? Math.max(1, Math.min(48, selectedInstallments || parsedData.installments || 1))
          : 1;

      if (!finalCategoryId) {
        setConfirmationMsg(t('fastEntry.messages.selectCategoryRequired'));
        return;
      }

      const transactionPayload: Omit<Transaction, 'id' | 'workspaceId'> & { installments?: number } = {
        amount,
        type: txType,
        paymentMethod: finalPaymentMethod,
        categoryId: finalCategoryId,
        date: new Date().toISOString(),
        note: sanitizeEntryNote(parsedData.note || currentInput),
        isRecurring: false,
        installments: finalInstallments,
        accountId:
          finalPaymentMethod === 'credit'
            ? undefined
            : resolvedAccountId || undefined,
        creditCardId: finalPaymentMethod === 'credit' ? (selectedCreditCardId || workspaceCreditCards[0]?.id || undefined) : undefined,
      };

      setIsSaving(true);
      try {
        addTransaction(transactionPayload);
      } finally {
        setIsSaving(false);
      }

      handleClear();
      onClose();
    };

    const handleSaveManualEntry = () => {
      Keyboard.dismiss();
      if (!manualAmount || manualAmount <= 0) {
        setConfirmationMsg(t('fastEntry.messages.freeModeNeedAmount', { defaultValue: 'Informe o valor da transação.' }));
        return;
      }

      const fallbackCategoryId = workspaceCategories[0]?.id || categories.find(() => true)?.id || 'outros';
      const finalCategoryId = selectedCategoryId || fallbackCategoryId;
      const finalPaymentMethod = selectedPaymentMethod || 'pix';
      const finalInstallments =
        finalPaymentMethod === 'credit' && manualType === 'expense'
          ? Math.max(1, Math.min(48, selectedInstallments || 1))
          : 1;

      const note = manualDescription.trim() || undefined;

      const transactionPayload: Omit<Transaction, 'id' | 'workspaceId'> & { installments?: number } = {
        amount: manualAmount,
        type: manualType,
        paymentMethod: finalPaymentMethod,
        categoryId: finalCategoryId,
        date: new Date().toISOString(),
        note,
        isRecurring: false,
        installments: finalInstallments,
        accountId: workspaceAccounts[0]?.id || undefined,
        creditCardId: finalPaymentMethod === 'credit' ? (selectedCreditCardId || workspaceCreditCards[0]?.id || undefined) : undefined,
      };

      setIsSaving(true);
      try {
        addTransaction(transactionPayload);
      } finally {
        setIsSaving(false);
      }

      handleClear();
      onClose();
    };

    const handleClear = () => {
      inputTextRef.current = '';
      setInputText('');
      setParsedData(null);
      setConfirmationMsg('');
      setHasAiResult(false);
      setSelectedPaymentMethod(null);
      setSelectedCategoryId(workspaceCategories[0]?.id || null);
      setSelectedAccountId(null);
      setSelectedCreditCardId(null);
      setSelectedInstallments(1);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setManualAmount(0);
      setManualDescription('');
    };

    const handleCreateCategory = () => {
      const trimmed = newCategoryName.trim();
      if (!trimmed) {
        return;
      }

      const normalized = normalizeLabel(trimmed);
      const alreadyExists = workspaceCategories.some(
        (category) => normalizeLabel(category.name) === normalized
      );

      if (alreadyExists) {
        const existing = workspaceCategories.find(
          (category) => normalizeLabel(category.name) === normalized
        );
        setSelectedCategoryId(existing?.id || null);
        setIsCreatingCategory(false);
        setNewCategoryName('');
        return;
      }

      const createdId = addCategory({
        name: uppercaseFirstLetter(trimmed),
        icon: 'tag',
        color: workspaceColor,
      });

      setSelectedCategoryId(createdId);
      setIsCreatingCategory(false);
      setNewCategoryName('');
    };

    const tokens = getThemeTokens(theme);
    const typeColor = parsedData?.type === 'income' ? tokens.positive : tokens.negative;
    const typeLabel = parsedData?.type === 'income' ? t('fastEntry.type.income') : t('fastEntry.type.expense');
    const typeIcon = parsedData?.type === 'income' ? 'plus-circle' : 'minus-circle';

    const workspaceColor = tokens.primary;

    const appBg = tokens.background;
    const cardBg = tokens.card;
    const textPrimary = tokens.textPrimary;
    const textSecondary = tokens.textSecondary;
    const overlayBg = tokens.overlay;
    const surfaceSubtle = tokens.surfaceInteractive;
    const mutedChipBorder = tokens.border;
    const mutedChipBg = tokens.card;
    const clearBorder = tokens.border;
    const actionTextColor = '#FFFFFF';

    return (
      <>
        <Modal
          visible={visible}
          transparent
          animationType="slide"
          onRequestClose={onClose}
        >
          <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
              style={styles.keyboardAvoiding}
            >
              <View
                style={[
                  styles.container,
                  {
                    backgroundColor: cardBg,
                    paddingBottom: insets.bottom + 20,
                    marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
                  },
                ]}
              > 
            
                <View style={styles.header}>
                  <Text style={[styles.title, { color: textPrimary }]}>
                    {t('fastEntry.title')}
                  </Text>
                  <Pressable onPress={onClose} style={styles.closeButton}>
                    <MaterialCommunityIcons name="close" size={24} color={textPrimary} />
                  </Pressable>
                </View>

                {/* Mode Selector Tabs */}
                <View style={styles.modeToggleRow}>
                  <Pressable
                    style={[
                      styles.modeToggleBtn,
                      {
                        backgroundColor: entryMode === 'manual' ? `${workspaceColor}18` : mutedChipBg,
                        borderColor: entryMode === 'manual' ? workspaceColor : mutedChipBorder,
                      },
                    ]}
                    onPress={() => setEntryMode('manual')}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={17}
                      color={entryMode === 'manual' ? workspaceColor : textSecondary}
                    />
                    <Text
                      style={[
                        styles.modeToggleText,
                        { color: entryMode === 'manual' ? workspaceColor : textSecondary },
                      ]}
                    >
                      {t('fastEntry.modeManual', { defaultValue: 'Digitar Manual' })}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.modeToggleBtn,
                      {
                        backgroundColor: entryMode === 'voice' ? `${workspaceColor}18` : mutedChipBg,
                        borderColor: entryMode === 'voice' ? workspaceColor : mutedChipBorder,
                      },
                    ]}
                    onPress={() => {
                      if (!isPremium) {
                        setIsPaywallVisible(true);
                        return;
                      }
                      setEntryMode('voice');
                    }}
                  >
                    <MaterialCommunityIcons
                      name="microphone"
                      size={17}
                      color={entryMode === 'voice' ? workspaceColor : textSecondary}
                    />
                    <Text
                      style={[
                        styles.modeToggleText,
                        { color: entryMode === 'voice' ? workspaceColor : textSecondary },
                      ]}
                    >
                      {t('fastEntry.modeVoice', { defaultValue: 'Voz & IA' })}
                    </Text>
                    {!isPremium ? (
                      <View style={styles.proPill}>
                        <Text style={styles.proPillText}>PRO</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>

                <ScrollView 
                  ref={scrollViewRef}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                  automaticallyAdjustKeyboardInsets
                >
                  {entryMode === 'manual' ? (
                    <View style={styles.manualContainer}>
                      {/* Tipo: Despesa / Receita */}
                      <View style={styles.typeSelectorRow}>
                        <Pressable
                          style={[
                            styles.typeSelectorBtn,
                            manualType === 'expense' && {
                              backgroundColor: `${EXPENSE_COLOR}18`,
                              borderColor: EXPENSE_COLOR,
                            },
                            { borderColor: manualType === 'expense' ? EXPENSE_COLOR : mutedChipBorder },
                          ]}
                          onPress={() => setManualType('expense')}
                        >
                          <MaterialCommunityIcons
                            name="arrow-down-bold"
                            size={18}
                            color={manualType === 'expense' ? EXPENSE_COLOR : textSecondary}
                          />
                          <Text
                            style={[
                              styles.typeSelectorText,
                              { color: manualType === 'expense' ? EXPENSE_COLOR : textSecondary },
                            ]}
                          >
                            {t('dashboard.monthExpenses', { defaultValue: 'Despesa' })}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.typeSelectorBtn,
                            manualType === 'income' && {
                              backgroundColor: `${INCOME_COLOR}18`,
                              borderColor: INCOME_COLOR,
                            },
                            { borderColor: manualType === 'income' ? INCOME_COLOR : mutedChipBorder },
                          ]}
                          onPress={() => setManualType('income')}
                        >
                          <MaterialCommunityIcons
                            name="arrow-up-bold"
                            size={18}
                            color={manualType === 'income' ? INCOME_COLOR : textSecondary}
                          />
                          <Text
                            style={[
                              styles.typeSelectorText,
                              { color: manualType === 'income' ? INCOME_COLOR : textSecondary },
                            ]}
                          >
                            {t('dashboard.monthIncome', { defaultValue: 'Receita' })}
                          </Text>
                        </Pressable>
                      </View>

                      {/* Valor R$ */}
                      <View style={styles.manualFieldWrap}>
                        <Text style={[styles.fieldTitle, { color: textSecondary }]}>
                          {t('fastEntry.amount', { defaultValue: 'Valor (R$)' })}
                        </Text>
                        <CurrencyInput
                          value={manualAmount}
                          onChangeValue={setManualAmount}
                          style={[
                            styles.manualAmountInput,
                            {
                              color: manualType === 'expense' ? EXPENSE_COLOR : INCOME_COLOR,
                              borderColor: mutedChipBorder,
                              backgroundColor: appBg,
                            },
                          ]}
                          placeholder="R$ 0,00"
                          placeholderTextColor={textSecondary}
                        />
                      </View>

                      {/* Descrição */}
                      <View style={styles.manualFieldWrap}>
                        <Text style={[styles.fieldTitle, { color: textSecondary }]}>
                          {t('fastEntry.descriptionLabel', { defaultValue: 'Descrição' })}
                        </Text>
                        <TextInput
                          value={manualDescription}
                          onChangeText={setManualDescription}
                          placeholder={t('fastEntry.descriptionPlaceholder', { defaultValue: 'Ex: Padaria, Gasolina, Aluguel...' })}
                          placeholderTextColor={textSecondary}
                          style={[
                            styles.manualDescInput,
                            {
                              color: textPrimary,
                              borderColor: mutedChipBorder,
                              backgroundColor: appBg,
                            },
                          ]}
                          maxLength={150}
                        />
                      </View>

                      {/* Forma de Pagamento */}
                      <View style={styles.paymentMethodBlock}>
                        <Text style={[styles.categoryLabel, { color: textSecondary }]}>
                          {t('fastEntry.paymentMethod.label', { defaultValue: 'Forma de Pagamento' })}
                        </Text>
                        <View style={styles.paymentMethodRow}>
                          {([
                            { id: 'pix', label: t('fastEntry.paymentMethod.pix', { defaultValue: 'Pix' }) },
                            { id: 'credit', label: t('fastEntry.paymentMethod.credit', { defaultValue: 'Crédito' }) },
                            { id: 'debit', label: t('fastEntry.paymentMethod.debit', { defaultValue: 'Débito' }) },
                            { id: 'cash', label: t('fastEntry.paymentMethod.cash', { defaultValue: 'Dinheiro' }) },
                          ] as Array<{ id: PaymentMethod; label: string }>).map((option) => {
                            const active = (selectedPaymentMethod || 'pix') === option.id;
                            return (
                              <Pressable
                                key={option.id}
                                onPress={() => setSelectedPaymentMethod(option.id)}
                                style={[
                                  styles.chip,
                                  {
                                    borderColor: active ? workspaceColor : mutedChipBorder,
                                    backgroundColor: active ? `${workspaceColor}15` : mutedChipBg,
                                  },
                                ]}
                              >
                                <Text style={[styles.chipText, { color: active ? workspaceColor : textPrimary }]}>
                                  {option.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      {/* Parcelas se Crédito e Despesa */}
                      {selectedPaymentMethod === 'credit' && manualType === 'expense' ? (
                        <View style={styles.installmentBlock}>
                          <View style={styles.installmentHeader}>
                            <Text style={[styles.categoryLabel, { color: textSecondary }]}>
                              {t('fastEntry.installmentsLabel', { defaultValue: 'Parcelamento' })}
                            </Text>
                          </View>
                          <View style={styles.installmentRow}>
                            {[1, 2, 3, 4, 6, 10, 12].map((value) => {
                              const active = selectedInstallments === value;
                              return (
                                <Pressable
                                  key={`manual-installment-${value}`}
                                  onPress={() => setSelectedInstallments(value)}
                                  style={[
                                    styles.chip,
                                    {
                                      borderColor: active ? workspaceColor : mutedChipBorder,
                                      backgroundColor: active ? `${workspaceColor}15` : mutedChipBg,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.chipText, { color: active ? workspaceColor : textPrimary }]}>
                                    {value}x
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <Text style={[styles.categoryHint, { color: textSecondary, marginTop: 8 }]}>
                            {selectedInstallments > 1
                              ? `${selectedInstallments}x de ${formatCurrency((manualAmount || 0) / selectedInstallments, currency, localeTag, true)}`
                              : t('fastEntry.installmentsHint', { count: selectedInstallments, defaultValue: 'À vista (1x)' })}
                          </Text>
                        </View>
                      ) : null}

                      {/* Categoria */}
                      <View style={styles.categoryBlock}>
                        <Text style={[styles.categoryLabel, { color: textSecondary }]}>
                          {t('fastEntry.category', { defaultValue: 'Categoria' })}
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipScrollContent}
                        >
                          {orderedWorkspaceCategories.map((category) => {
                            const active = category.id === selectedCategoryId;
                            return (
                              <Pressable
                                key={category.id}
                                onPress={() => setSelectedCategoryId(category.id)}
                                style={[
                                  styles.chip,
                                  {
                                    borderColor: active ? workspaceColor : mutedChipBorder,
                                    backgroundColor: active ? `${workspaceColor}15` : mutedChipBg,
                                  },
                                ]}
                              >
                                <Text style={[styles.chipText, { color: active ? workspaceColor : textPrimary }]}>
                                  {getCategoryDisplayName(category.id, category.name)}
                                </Text>
                              </Pressable>
                            );
                          })}
                          <Pressable
                            onPress={() => setIsCreatingCategory((prev) => !prev)}
                            style={[styles.newCategoryButton, { borderColor: workspaceColor }]}
                          >
                            <MaterialCommunityIcons name="plus" size={16} color={workspaceColor} />
                            <Text style={[styles.newCategoryButtonText, { color: workspaceColor }]}>
                              {t('fastEntry.newCategory', { defaultValue: 'Nova' })}
                            </Text>
                          </Pressable>
                        </ScrollView>

                        {isCreatingCategory ? (
                          <View style={styles.newCategoryRow}>
                            <TextInput
                              style={[styles.newCategoryInput, { color: textPrimary, borderColor: workspaceColor, backgroundColor: appBg }]}
                              placeholder={t('fastEntry.newCategoryPlaceholder', { defaultValue: 'Nome da categoria' })}
                              placeholderTextColor={textSecondary}
                              value={newCategoryName}
                              onChangeText={(value) => setNewCategoryName(value)}
                              autoCapitalize="sentences"
                            />
                            <Pressable
                              onPress={handleCreateCategory}
                              style={[styles.newCategorySaveButton, { backgroundColor: workspaceColor }]}
                            >
                              <Text style={[styles.newCategorySaveText, { color: actionTextColor }]}>
                                {t('fastEntry.addCategory', { defaultValue: 'Criar' })}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>

                      {confirmationMsg ? (
                        <Text style={{ color: EXPENSE_COLOR, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                          {confirmationMsg}
                        </Text>
                      ) : null}

                      {/* Botão Salvar Manual */}
                      <Pressable
                        style={[
                          styles.saveButton,
                          { backgroundColor: workspaceColor, marginTop: 14, width: '100%' },
                          isSaving && { opacity: 0.7 },
                        ]}
                        onPress={handleSaveManualEntry}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color={actionTextColor} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="check" size={22} color={actionTextColor} />
                            <Text style={[styles.saveButtonText, { color: actionTextColor }]}>
                              {manualType === 'expense'
                                ? t('fastEntry.saveExpense', { defaultValue: 'Salvar Despesa' })
                                : t('fastEntry.saveIncome', { defaultValue: 'Salvar Receita' })}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <View>
                      <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: appBg,
                        color: textPrimary,
                        borderColor: isAnalyzing ? workspaceColor : mutedChipBorder,
                      },
                    ]}
                    placeholder={t('fastEntry.inputPlaceholder')}
                    placeholderTextColor={textSecondary}
                    value={inputText}
                    onChangeText={(value) => {
                      inputTextRef.current = value;
                      setInputText(value);
                    }}
                    autoCapitalize="sentences"
                    multiline
                    maxLength={300}
                  />

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[
                        styles.micButton,
                        { backgroundColor: theme === 'light' ? '#F3F4F6' : '#1C1C1E' },
                        isListening && { backgroundColor: `${EXPENSE_COLOR}15`, borderWidth: 1, borderColor: EXPENSE_COLOR },
                        isExpoGo && { opacity: 0.3 },
                      ]}
                      onPress={handleMicPress}
                      disabled={isExpoGo}
                    >
                      <MaterialCommunityIcons
                        name={isListening ? 'microphone-off' : 'microphone'}
                        size={24}
                        color={isListening ? EXPENSE_COLOR : textSecondary}
                      />
                    </Pressable>

                    <Pressable
                      style={[styles.analyzeButton, { backgroundColor: workspaceColor }]}
                      onPress={handleAnalyze}
                    >
                      <Text style={[styles.analyzeButtonText, { color: actionTextColor }]}>
                        {t('fastEntry.analyze')}
                      </Text>
                    </Pressable>
                  </View>

                  {isAnalyzing ? (
                    <View style={[styles.confirmCard, { backgroundColor: surfaceSubtle }]}>
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={workspaceColor} />
                        <Text style={[styles.loadingText, { color: textSecondary }]}>
                          {t('fastEntry.loading')}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {hasAiResult && (
                    <View style={[styles.confirmCard, { backgroundColor: surfaceSubtle }]}>
                      <View style={styles.confirmationMsgCard}>
                        <MaterialCommunityIcons
                          name="robot-outline"
                          size={22}
                          color={workspaceColor}
                        />
                        <Text style={[styles.confirmationMsgText, { color: textPrimary }]}>
                          {confirmationMsg}
                        </Text>
                      </View>

                      {parsedData && parsedData.amount !== undefined ? (
                        <View style={styles.cardHeader}>
                          <View style={styles.amountSection}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>{t('fastEntry.amount')}</Text>
                            <Text style={[styles.amountValue, { color: typeColor }]}>
                              {formatCurrency(parsedData.amount, currency, localeTag, true)}
                            </Text>
                          </View>

                          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
                            <MaterialCommunityIcons name={typeIcon} size={18} color={typeColor} />
                            <Text style={[styles.typeLabel, { color: typeColor }]}>{typeLabel}</Text>
                          </View>
                        </View>
                      ) : null}

                      <View style={styles.paymentMethodBlock}>
                        <Text style={[styles.categoryLabel, { color: textSecondary }]}>{t('fastEntry.paymentMethod.label')}</Text>

                        <View style={styles.paymentMethodRow}>
                          {([
                            { id: 'cash', label: t('fastEntry.paymentMethod.cash') },
                            { id: 'debit', label: t('fastEntry.paymentMethod.debit') },
                            { id: 'credit', label: t('fastEntry.paymentMethod.credit') },
                            { id: 'pix', label: t('fastEntry.paymentMethod.pix') },
                          ] as Array<{ id: PaymentMethod; label: string }>).map((option) => {
                            const active = selectedPaymentMethod === option.id;
                            return (
                              <Pressable
                                key={option.id}
                                onPress={() => setSelectedPaymentMethod(option.id)}
                                style={[
                                  styles.chip,
                                  {
                                    borderColor: active ? workspaceColor : mutedChipBorder,
                                    backgroundColor: active ? `${workspaceColor}15` : mutedChipBg,
                                  },
                                ]}
                              >
                                <Text style={[styles.chipText, { color: active ? workspaceColor : textPrimary }]}>
                                  {option.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.categoryBlock}>
                        <Text style={[styles.categoryLabel, { color: textSecondary }]}>{t('fastEntry.category')}</Text>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.chipScrollContent}
                        >
                          {orderedWorkspaceCategories.map((category) => {
                            const active = category.id === selectedCategoryId;
                            return (
                              <Pressable
                                key={category.id}
                                onPress={() => setSelectedCategoryId(category.id)}
                                style={[
                                  styles.chip,
                                  {
                                    borderColor: active ? workspaceColor : mutedChipBorder,
                                    backgroundColor: active ? `${workspaceColor}15` : mutedChipBg,
                                  },
                                ]}
                              >
                                <Text style={[styles.chipText, { color: active ? workspaceColor : textPrimary }]}>
                                  {getCategoryDisplayName(category.id, category.name)}
                                </Text>
                              </Pressable>
                            );
                          })}

                          <Pressable
                            onPress={() => setIsCreatingCategory((prev) => !prev)}
                            style={[styles.newCategoryButton, { borderColor: workspaceColor }]}
                          >
                            <MaterialCommunityIcons name="plus" size={16} color={workspaceColor} />
                            <Text style={[styles.newCategoryButtonText, { color: workspaceColor }]}>{t('fastEntry.newCategory')}</Text>
                          </Pressable>
                        </ScrollView>

                        {isCreatingCategory ? (
                          <View style={styles.newCategoryRow}>
                            <TextInput
                              style={[styles.newCategoryInput, { color: textPrimary, borderColor: workspaceColor, backgroundColor: appBg }]}
                              placeholder={t('fastEntry.newCategoryPlaceholder')}
                              placeholderTextColor={textSecondary}
                              value={newCategoryName}
                              onChangeText={(value) => setNewCategoryName(value)}
                              autoCapitalize="sentences"
                            />

                            <Pressable
                              onPress={handleCreateCategory}
                              style={[styles.newCategorySaveButton, { backgroundColor: workspaceColor }]}
                            >
                              <Text style={[styles.newCategorySaveText, { color: actionTextColor }]}>{t('fastEntry.addCategory')}</Text>
                            </Pressable>
                          </View>
                        ) : null}

                        <Text style={[styles.categoryHint, { color: textSecondary }]}> 
                          {selectedCategory
                            ? t('fastEntry.selectedCategory', {
                                name: getCategoryDisplayName(selectedCategory.id, selectedCategory.name),
                              })
                            : t('fastEntry.selectCategoryHint')}
                        </Text>
                      </View>



                      {selectedPaymentMethod === 'credit' && parsedData?.type === 'expense' ? (
                        <View style={styles.installmentBlock}>
                          <View style={styles.installmentHeader}>
                            <Text style={[styles.categoryLabel, { color: textSecondary }]}>
                              {t('fastEntry.installmentsLabel')}
                            </Text>
                          </View>

                          <View style={styles.installmentRow}>
                            {[1, 2, 3, 4, 6, 10, 12].map((value) => {
                              const active = selectedInstallments === value;
                              return (
                                <Pressable
                                  key={`installment-${value}`}
                                  onPress={() => setSelectedInstallments(value)}
                                  style={[
                                    styles.chip,
                                    {
                                      borderColor: active ? workspaceColor : mutedChipBorder,
                                      backgroundColor: active ? `${workspaceColor}15` : mutedChipBg,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.chipText, { color: active ? workspaceColor : textPrimary }]}>
                                    {value}x
                                  </Text>
                                </Pressable>
                              );
                            })}
                            
                            <TextInput
                              style={[
                                styles.customInstallmentInput,
                                { 
                                  color: textPrimary, 
                                  borderColor: mutedChipBorder,
                                  backgroundColor: mutedChipBg 
                                }
                              ]}
                              placeholder="Outro"
                              placeholderTextColor={textSecondary}
                              keyboardType="numeric"
                              maxLength={2}
                              onChangeText={(val) => {
                                const num = parseInt(val, 10);
                                if (!isNaN(num) && num > 0) setSelectedInstallments(Math.min(num, 48));
                              }}
                            />
                          </View>

                          <Text style={[styles.categoryHint, { color: textSecondary, marginTop: 8 }]}> 
                            {selectedInstallments > 1 
                              ? `${selectedInstallments}x de ${formatCurrency((parsedData?.amount || 0) / selectedInstallments, currency, localeTag, true)}`
                              : t('fastEntry.installmentsHint', { count: selectedInstallments })}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.finalActionsRow}>
                        <Pressable
                          style={[styles.clearButton, { borderColor: clearBorder }]}
                          onPress={handleClear}
                        >
                          <Text style={[styles.clearButtonText, { color: textSecondary }]}>
                            {t('settings.cancel')}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.saveButton,
                            { backgroundColor: workspaceColor },
                            isSaving && { opacity: 0.7 },
                          ]}
                          onPress={handleConfirmAndSave}
                          disabled={isSaving || !parsedData}
                        >
                          {isSaving ? (
                            <ActivityIndicator size="small" color={actionTextColor} />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="check" size={22} color={actionTextColor} />
                              <Text style={[styles.saveButtonText, { color: actionTextColor }]}>{t('fastEntry.confirmSave')}</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <PaywallScreen
          visible={isPaywallVisible}
          onClose={() => setIsPaywallVisible(false)}
          onSubscribe={() => {
            togglePremiumStatus();
            setIsPaywallVisible(false);
          }}
        />
      </>
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    keyboardAvoiding: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    container: {
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 24,
      paddingTop: 24,
      maxHeight: '90%',
    },
    scrollContent: {
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(156, 163, 175, 0.15)',
    },
    modeToggleRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    modeToggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    modeToggleText: {
      fontSize: 14,
      fontWeight: '700',
    },
    proPill: {
      backgroundColor: '#EAB308',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    proPillText: {
      color: '#000000',
      fontSize: 10,
      fontWeight: '900',
    },
    manualContainer: {
      paddingBottom: 10,
    },
    typeSelectorRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    typeSelectorBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    typeSelectorText: {
      fontSize: 15,
      fontWeight: '800',
    },
    manualFieldWrap: {
      marginBottom: 16,
    },
    fieldTitle: {
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    manualAmountInput: {
      borderWidth: 1.5,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 26,
      fontWeight: '900',
    },
    manualDescInput: {
      borderWidth: 1.5,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      fontWeight: '600',
    },
    textInput: {
      borderWidth: 1.5,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    micButton: {
      width: 54,
      height: 54,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    analyzeButton: {
      flex: 1,
      height: 54,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    analyzeButtonText: {
      fontSize: 16,
      fontWeight: '800',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    loadingText: {
      fontSize: 15,
      fontWeight: '600',
    },
    confirmCard: {
      borderRadius: 24,
      padding: 20,
      marginBottom: 12,
    },
    confirmationMsgCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
    },
    confirmationMsgText: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    amountSection: {
      flex: 1,
    },
    amountLabel: {
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    amountValue: {
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: -1,
    },
    categoryBlock: {
      marginBottom: 20,
    },
    categoryLabel: {
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    chipScrollContent: {
      gap: 10,
      paddingRight: 4,
      paddingBottom: 4,
    },
    chip: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    chipWithIcon: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '700',
    },
    newCategoryButton: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    newCategoryButtonText: {
      fontSize: 14,
      fontWeight: '800',
    },
    newCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    newCategoryInput: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontWeight: '600',
    },
    newCategorySaveButton: {
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    newCategorySaveText: {
      fontSize: 14,
      fontWeight: '800',
    },
    categoryHint: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: '600',
    },
    paymentMethodBlock: {
      marginBottom: 20,
    },
    paymentMethodRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    accountBlock: {
      marginBottom: 20,
    },
    installmentBlock: {
      marginTop: 16,
    },
    installmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    customInstallmentInput: {
      width: 60,
      height: 40,
      borderWidth: 1.5,
      borderRadius: 14,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '700',
    },
    installmentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    typeBadge: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      gap: 8,
    },
    typeLabel: {
      fontSize: 14,
      fontWeight: '800',
    },
    finalActionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    saveButton: {
      flex: 2,
      height: 54,
      borderRadius: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '800',
    },
    clearButton: {
      flex: 1,
      height: 54,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
    },
    clearButtonText: {
      fontSize: 15,
      fontWeight: '700',
    },
  });