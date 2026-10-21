import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export const CURRENCY_OPTIONS = [
  { code: 'BRL', label: 'BRL - Real Brasileiro' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'JPY', label: 'JPY - Japanese Yen' },
  { code: 'CAD', label: 'CAD - Canadian Dollar' },
  { code: 'AUD', label: 'AUD - Australian Dollar' },
  { code: 'CHF', label: 'CHF - Swiss Franc' },
  { code: 'MXN', label: 'MXN - Mexican Peso' },
  { code: 'ARS', label: 'ARS - Argentine Peso' },
];

interface SettingsCurrencyModalProps {
  visible: boolean;
  selectedCurrency: string;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  fieldBg: string;
  onClose: () => void;
  onSelectCurrency: (currencyCode: string) => void;
}

export const SettingsCurrencyModal: React.FC<SettingsCurrencyModalProps> = ({
  visible,
  selectedCurrency,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
  fieldBg,
  onClose,
  onSelectCurrency,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {t('settings.currency.title', { defaultValue: 'Moeda Principal' })}
              </Text>
              <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                {t('settings.currency.subtitle', {
                  defaultValue: 'Selecione a moeda padrão para exibição',
                })}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
            {CURRENCY_OPTIONS.map((option) => {
              const isSelected = selectedCurrency === option.code;
              return (
                <Pressable
                  key={option.code}
                  style={[
                    styles.currencyOption,
                    {
                      backgroundColor: isSelected ? `${accentColor}15` : fieldBg,
                      borderColor: isSelected ? accentColor : borderColor,
                    },
                  ]}
                  onPress={() => onSelectCurrency(option.code)}
                >
                  <Text
                    style={[
                      styles.currencyOptionText,
                      { color: isSelected ? accentColor : textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '75%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyList: {
    marginBottom: 10,
  },
  currencyOption: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  currencyOptionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
