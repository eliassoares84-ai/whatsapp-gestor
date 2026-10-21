import * as Localization from 'expo-localization';

const getFallbackLocale = (): string =>
  Localization.getLocales()[0]?.languageTag || 'pt-BR';

export const formatCurrency = (
  value: number,
  currencyCode: string,
  localeTag?: string,
  absolute = false
): string => {
  const normalizedCurrency = currencyCode?.trim()?.toUpperCase() || 'BRL';
  const normalizedValue = absolute ? Math.abs(value) : value;

  try {
    return new Intl.NumberFormat(localeTag || getFallbackLocale(), {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(normalizedValue);
  } catch {
    return new Intl.NumberFormat(localeTag || getFallbackLocale(), {
      style: 'currency',
      currency: 'BRL',
    }).format(normalizedValue);
  }
};

export const getMaskedCurrency = (
  currencyCode: string,
  localeTag?: string
): string => {
  const formatted = formatCurrency(0, currencyCode, localeTag, true);
  return formatted.replace(/[\d.,\s]+/g, '••••').replace(/••••+/g, '••••');
};
