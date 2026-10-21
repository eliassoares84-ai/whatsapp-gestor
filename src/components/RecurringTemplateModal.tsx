import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
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

import { CurrencyInput } from './CurrencyInput';
import type { RecurringTemplate } from '../types/finance.types';
import { uppercaseFirstLetter } from '../utils/textInputFormat';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

type Frequency = RecurringTemplate['frequency'];
type TemplatePayload = Omit<
  RecurringTemplate,
  'id' | 'workspaceId' | 'lastProcessedDate' | 'isActive'
>;

interface RecurringTemplateModalProps {
  visible: boolean;
  accentColor: string;
  templateToEdit?: RecurringTemplate | null;
  onClose: () => void;
  onSave: (payload: TemplatePayload, templateId?: string) => void;
}

export const RecurringTemplateModal: React.FC<RecurringTemplateModalProps> = ({
  visible,
  accentColor,
  templateToEdit,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState('');
  const [amountValue, setAmountValue] = useState(0);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [dayOfMonthText, setDayOfMonthText] = useState('10');

  useEffect(() => {
    if (!visible) {
      setDescription('');
      setAmountValue(0);
      setType('expense');
      setFrequency('monthly');
      setDayOfMonthText('10');
      return;
    }

    if (templateToEdit) {
      setDescription(templateToEdit.note);
      setAmountValue(templateToEdit.amount);
      setType(templateToEdit.type === 'income' ? 'income' : 'expense');
      setFrequency(templateToEdit.frequency);
      setDayOfMonthText(templateToEdit.dayOfMonth.toString());
    }
  }, [visible, templateToEdit]);

  const parsedAmount = useMemo(
    () => (Number.isFinite(amountValue) ? amountValue : NaN),
    [amountValue]
  );

  const parsedDay = useMemo(() => {
    const day = Number.parseInt(dayOfMonthText, 10);
    if (!Number.isFinite(day)) {
      return NaN;
    }

    return Math.min(31, Math.max(1, day));
  }, [dayOfMonthText]);

  const canSave = description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const frequencyOptions: Array<{ label: string; value: Frequency }> = [
    { label: t('recurringModal.frequency.weekly'), value: 'weekly' },
    { label: t('recurringModal.frequency.monthly'), value: 'monthly' },
    { label: t('recurringModal.frequency.yearly'), value: 'yearly' },
  ];

  const typeOptions: Array<{ label: string; value: 'income' | 'expense' }> = [
    { label: t('recurringModal.type.income'), value: 'income' },
    { label: t('recurringModal.type.expense'), value: 'expense' },
  ];

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const payload: TemplatePayload = {
      amount: parsedAmount,
      type,
      categoryId: templateToEdit?.categoryId || 'recurring',
      note: description.trim(),
      frequency,
      dayOfMonth: Number.isFinite(parsedDay) ? parsedDay : 1,
    };

    if (templateToEdit) {
      onSave(payload, templateToEdit.id);
      return;
    }

    onSave(payload);
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.bottom + 8}
        >
          <View style={[styles.container, { backgroundColor: CARD_BG }]}> 
            <View style={styles.header}>
              <Text style={[styles.title, { color: TEXT_PRIMARY }]}>
                {templateToEdit ? t('recurringModal.editTitle') : t('recurringModal.createTitle')}
              </Text>
              <Pressable onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={TEXT_SECONDARY} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
            >
              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{t('recurringModal.description')}</Text>
                <TextInput
                  value={description}
                  onChangeText={(value) => setDescription(uppercaseFirstLetter(value))}
                  placeholder={t('recurringModal.descriptionPlaceholder')}
                  placeholderTextColor={TEXT_SECONDARY}
                  autoCapitalize="sentences"
                  style={[styles.input, { color: TEXT_PRIMARY, borderColor: accentColor, backgroundColor: APP_BG }]}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{t('recurringModal.amount')}</Text>
                <CurrencyInput
                  value={amountValue}
                  onChangeValue={setAmountValue}
                  placeholder="0,00"
                  placeholderTextColor={TEXT_SECONDARY}
                  style={[styles.input, { color: TEXT_PRIMARY, borderColor: accentColor, backgroundColor: APP_BG }]}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{t('recurringModal.typeLabel')}</Text>
                <View style={styles.optionRow}>
                  {typeOptions.map((option) => {
                    const selected = option.value === type;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setType(option.value)}
                        style={[
                          styles.optionButton,
                          {
                            borderColor: selected ? accentColor : 'rgba(255, 255, 255, 0.15)',
                            backgroundColor: selected ? `${accentColor}22` : 'transparent',
                          },
                        ]}
                      >
                        <Text style={{ color: selected ? accentColor : TEXT_SECONDARY, fontWeight: '600' }}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{t('recurringModal.frequencyLabel')}</Text>
                <View style={styles.optionRow}>
                  {frequencyOptions.map((option) => {
                    const selected = option.value === frequency;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setFrequency(option.value)}
                        style={[
                          styles.optionButton,
                          {
                            borderColor: selected ? accentColor : 'rgba(255, 255, 255, 0.15)',
                            backgroundColor: selected ? `${accentColor}22` : 'transparent',
                          },
                        ]}
                      >
                        <Text style={{ color: selected ? accentColor : TEXT_SECONDARY, fontWeight: '600' }}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: TEXT_PRIMARY }]}>{t('recurringModal.dayOfMonth')}</Text>
                <TextInput
                  value={dayOfMonthText}
                  onChangeText={setDayOfMonthText}
                  keyboardType="number-pad"
                  style={[styles.input, { color: TEXT_PRIMARY, borderColor: accentColor, backgroundColor: APP_BG }]}
                />
              </View>

              <Pressable
                onPress={handleSave}
                disabled={!canSave}
                style={[
                  styles.saveButton,
                  { backgroundColor: canSave ? accentColor : '#3A3A3A' },
                ]}
              >
                <Text style={[styles.saveText, { color: '#000000' }]}>
                  {templateToEdit ? t('recurringModal.saveChanges') : t('recurringModal.saveSchedule')}
                </Text>
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  keyboardAvoiding: {
    width: '100%',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 12,
  },
  formContent: {
    gap: 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  fieldBlock: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
