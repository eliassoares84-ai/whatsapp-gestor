import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, TextInput, type TextInputProps } from 'react-native';

import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/formatters';

type CurrencyInputProps = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: number;
  onChangeValue: (value: number) => void;
};

const resolveLocaleTag = (language: string): string => {
  if (language === 'pt-BR') {
    return 'pt-BR';
  }

  return language.startsWith('es') ? 'es-ES' : 'en-US';
};

const toCentsDigits = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  return Math.round(value * 100).toString();
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChangeValue,
  ...textInputProps
}) => {
  const { i18n } = useTranslation();
  const currency = useFinanceStore((state) => state.currency);
  const localeTag = resolveLocaleTag(i18n.language);

  const handleChangeText = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '');

    if (!digits) {
      onChangeValue(0);
      return;
    }

    onChangeValue(Number.parseInt(digits, 10) / 100);
  };

  const displayValue = toCentsDigits(value)
    ? formatCurrency(value, currency, localeTag, true)
    : '';

  return (
    <TextInput
      {...textInputProps}
      keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
      value={displayValue}
      onChangeText={handleChangeText}
    />
  );
};
