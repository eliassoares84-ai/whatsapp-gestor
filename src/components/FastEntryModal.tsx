import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { useFinanceStore } from '../store/useFinanceStore';
import type { Transaction } from '../types/finance.types';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const ACCENT_GREEN = '#d2ff61';
const ACCENT_BLUE = '#0A84FF';
const INCOME_COLOR = '#d2ff61';
const EXPENSE_COLOR = '#FF453A';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

interface FastEntryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FastEntryModal: React.FC<FastEntryModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState<string>('');
  const [parsedData, setParsedData] = useState<Partial<Transaction> | null>(null);
  const [confirmationMsg, setConfirmationMsg] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAiResult, setHasAiResult] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { addTransaction, currentWorkspaceId, categories } = useFinanceStore();

  // --- Speech recognition events ---
  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    // auto-analyze when speech ends if we have text
    setInputText(prev => {
      if (prev.trim()) {
        // trigger analysis after state flush
        setTimeout(() => handleAnalyze(), 50);
      }
      return prev;
    });
  });
  useSpeechRecognitionEvent('result', (event) => {
    if (event.results?.[0]?.transcript) {
      setInputText(event.results[0].transcript);
    }
  });
  useSpeechRecognitionEvent('error', () => setIsListening(false));

  const handleMicPress = async () => {
    if (isExpoGo || !ExpoSpeechRecognitionModule) return;
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) return;
    setInputText('');
    setParsedData(null);
    setHasAiResult(false);
    setConfirmationMsg('');
    ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true });
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setHasAiResult(false);
    setConfirmationMsg('');

    try {
      const result = await processFinanceCommand(inputText);
      const mappedData: Partial<Transaction> = {
        amount: result.data.amount,
        type: result.data.type,
        categoryId: mapGeminiCategoryToId(result.data.category),
        note: result.data.note,
      };
      setParsedData(mappedData);
      setConfirmationMsg(result.confirmationMsg);
      setHasAiResult(true);
    } catch {
      // Fallback: extract value via regex
      const match = inputText.match(/(\d+[.,]?\d*)/);
      const extracted = match ? parseFloat(match[1].replace(',', '.')) : undefined;
      const fallbackCategoryId =
        categories?.length ? categories[0].id : 'outros';
      setParsedData({
        type: 'expense',
        amount: extracted,
        categoryId: fallbackCategoryId,
        note: inputText,
      });
      setConfirmationMsg(
        extracted
          ? `Não consegui processar com IA agora. Valor detectado: R$ ${extracted.toFixed(2)}. Confirme manualmente.`
          : 'Não consegui processar com IA agora. Preencha o valor manualmente.'
      );
      setHasAiResult(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!hasAiResult || !parsedData) return;

    // Fallback: if AI didn't extract amount, try regex from raw text
    let amount = parsedData.amount;
    if (amount === undefined) {
      const match = inputText.match(/(\d+[.,]?\d*)/);
      amount = match ? parseFloat(match[1].replace(',', '.')) : undefined;
    }
    if (amount === undefined || isNaN(amount)) return;

    const fallbackCategoryId = categories?.length ? categories[0].id : 'outros';

    const transactionPayload: Omit<Transaction, 'id' | 'workspaceId'> = {
      amount,
      type: parsedData.type || 'expense',
      categoryId: parsedData.categoryId || fallbackCategoryId,
      date: new Date().toISOString(),
      note: parsedData.note,
      isRecurring: false,
    };

    setIsSaving(true);
    try {
      addTransaction(transactionPayload);
    } finally {
      setIsSaving(false);
    }

    setInputText('');
    setParsedData(null);
    setConfirmationMsg('');
    setHasAiResult(false);
    onClose();
  };

  const handleClear = () => {
    setInputText('');
    setParsedData(null);
    setConfirmationMsg('');
    setHasAiResult(false);
  };

  const typeColor =
    parsedData?.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR;
  const typeLabel = parsedData?.type === 'income' ? 'Receita' : 'Despesa';
  const typeIcon =
    parsedData?.type === 'income' ? 'plus-circle' : 'minus-circle';

  const workspaceColor =
    currentWorkspaceId === 'personal'
      ? ACCENT_BLUE
      : currentWorkspaceId === 'indikcon'
        ? ACCENT_GREEN
        : ACCENT_GREEN;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <View style={[styles.container, { backgroundColor: CARD_BG, paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: TEXT_PRIMARY }]}>
              Novo Lançamento
            </Text>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={28}
                color={TEXT_SECONDARY}
              />
            </Pressable>
          </View>

          {/* Input Field */}
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: APP_BG,
                color: TEXT_PRIMARY,
                borderColor: workspaceColor,
              },
            ]}
            placeholder="Ex: Recebi 1500 de consultoria na Indikcon..."
            placeholderTextColor={TEXT_SECONDARY}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={300}
          />

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.micButton,
                isListening && { backgroundColor: `${EXPENSE_COLOR}30`, borderWidth: 1, borderColor: EXPENSE_COLOR },
                isExpoGo && { opacity: 0.3 },
              ]}
              onPress={handleMicPress}
              disabled={isExpoGo}
            >
              <MaterialCommunityIcons
                name={isListening ? 'microphone-off' : 'microphone'}
                size={24}
                color={isListening ? EXPENSE_COLOR : TEXT_SECONDARY}
              />
            </Pressable>

            <Pressable
              style={[styles.analyzeButton, { backgroundColor: workspaceColor }]}
              onPress={handleAnalyze}
            >
              <Text
                style={[
                  styles.analyzeButtonText,
                  { color: parsedData ? '#000' : '#000' },
                ]}
              >
                Analisar
              </Text>
            </Pressable>
          </View>

          {isAnalyzing ? (
            <View style={[styles.confirmCard, { backgroundColor: APP_BG }]}>
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={workspaceColor} />
                <Text style={[styles.loadingText, { color: TEXT_SECONDARY }]}>
                  Carregando...
                </Text>
              </View>
            </View>
          ) : null}

          {/* AI Confirmation Loop */}
          {hasAiResult && (
            <View style={[styles.confirmCard, { backgroundColor: APP_BG }]}>
              <View style={styles.confirmationMsgCard}>
                <MaterialCommunityIcons
                  name="chat-processing-outline"
                  size={20}
                  color={workspaceColor}
                />
                <Text style={[styles.confirmationMsgText, { color: TEXT_PRIMARY }]}>
                  {confirmationMsg}
                </Text>
              </View>

              {parsedData && parsedData.amount !== undefined ? (
                <View style={styles.cardHeader}>
                  <View style={styles.amountSection}>
                    <Text style={[styles.amountLabel, { color: TEXT_SECONDARY }]}>Valor</Text>
                    <Text style={[styles.amountValue, { color: typeColor }]}>
                      R$ {parsedData.amount.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: `${typeColor}20` },
                    ]}
                  >
                    <MaterialCommunityIcons name={typeIcon} size={18} color={typeColor} />
                    <Text style={[styles.typeLabel, { color: typeColor }]}>{typeLabel}</Text>
                  </View>
                </View>
              ) : null}

              {/* Save Button */}
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
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#000" />
                    <Text style={styles.saveButtonText}>Confirmar e Salvar</Text>
                  </>
                )}
              </Pressable>

              {/* Clear Button */}
              <Pressable
                style={styles.clearButton}
                onPress={handleClear}
              >
                <Text
                  style={[
                    styles.clearButtonText,
                    { color: TEXT_SECONDARY },
                  ]}
                >
                  Cancelar
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  confirmationMsgCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  confirmationMsgText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  amountSection: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  typeBadge: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  clearButton: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
