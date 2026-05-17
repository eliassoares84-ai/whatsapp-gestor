import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RecurringTemplate } from '../types/finance.types';

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

const frequencyOptions: Array<{ label: string; value: Frequency }> = [
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
];

const typeOptions: Array<{ label: string; value: 'income' | 'expense' }> = [
  { label: 'Receita', value: 'income' },
  { label: 'Despesa', value: 'expense' },
];

export const RecurringTemplateModal: React.FC<RecurringTemplateModalProps> = ({
  visible,
  accentColor,
  templateToEdit,
  onClose,
  onSave,
}) => {
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [dayOfMonthText, setDayOfMonthText] = useState('10');

  useEffect(() => {
    if (!visible) {
      setDescription('');
      setAmountText('');
      setType('expense');
      setFrequency('monthly');
      setDayOfMonthText('10');
      return;
    }

    if (templateToEdit) {
      setDescription(templateToEdit.note);
      setAmountText(templateToEdit.amount.toString().replace('.', ','));
      setType(templateToEdit.type === 'income' ? 'income' : 'expense');
      setFrequency(templateToEdit.frequency);
      setDayOfMonthText(templateToEdit.dayOfMonth.toString());
    }
  }, [visible, templateToEdit]);

  const parsedAmount = useMemo(() => {
    const normalized = amountText.replace(',', '.');
    const amount = Number.parseFloat(normalized);
    return Number.isFinite(amount) ? amount : NaN;
  }, [amountText]);

  const parsedDay = useMemo(() => {
    const day = Number.parseInt(dayOfMonthText, 10);
    if (!Number.isFinite(day)) {
      return NaN;
    }

    return Math.min(31, Math.max(1, day));
  }, [dayOfMonthText]);

  const canSave = description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

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
        <View style={[styles.container, { backgroundColor: CARD_BG }]}> 
          <View style={styles.header}>
            <Text style={[styles.title, { color: TEXT_PRIMARY }]}>
              {templateToEdit ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}
            </Text>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: TEXT_PRIMARY }]}>Descricao</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="O que e isso?"
              placeholderTextColor={TEXT_SECONDARY}
              style={[styles.input, { color: TEXT_PRIMARY, borderColor: accentColor, backgroundColor: APP_BG }]}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: TEXT_PRIMARY }]}>Valor</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0,00"
              placeholderTextColor={TEXT_SECONDARY}
              keyboardType="numeric"
              style={[styles.input, { color: TEXT_PRIMARY, borderColor: accentColor, backgroundColor: APP_BG }]}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: TEXT_PRIMARY }]}>Tipo</Text>
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
            <Text style={[styles.label, { color: TEXT_PRIMARY }]}>Frequencia</Text>
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
            <Text style={[styles.label, { color: TEXT_PRIMARY }]}>Dia do Mes (1 a 31)</Text>
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
              {templateToEdit ? 'Salvar Alteracoes' : 'Salvar Agendamento'}
            </Text>
          </Pressable>
        </View>
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
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 12,
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
