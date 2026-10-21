import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';

interface MonthSelectorProps {
  accentColor: string;
}

const capitalize = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const MonthSelector: React.FC<MonthSelectorProps> = ({ accentColor }) => {
  const { t, i18n } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const selectedMonth = useFinanceStore((state) => state.selectedMonth);
  const selectedYear = useFinanceStore((state) => state.selectedYear);
  const nextMonth = useFinanceStore((state) => state.nextMonth);
  const prevMonth = useFinanceStore((state) => state.prevMonth);
  const setSpecificMonthYear = useFinanceStore((state) => state.setSpecificMonthYear);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalYear, setModalYear] = useState(selectedYear);

  const localeTag = i18n.language === 'pt-BR'
    ? 'pt-BR'
    : i18n.language.startsWith('es')
      ? 'es-ES'
      : 'en-US';

  const selectedMonthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeTag, { month: 'long' });
    const monthName = capitalize(formatter.format(new Date(selectedYear, selectedMonth, 1)));
    return `${monthName} ${selectedYear}`;
  }, [localeTag, selectedMonth, selectedYear]);

  const monthGrid = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => {
        const label = new Intl.DateTimeFormat(localeTag, { month: 'short' })
          .format(new Date(modalYear, monthIndex, 1))
          .replace(/\./g, '');

        return {
          monthIndex,
          label: capitalize(label),
        };
      }),
    [localeTag, modalYear]
  );

  const openHistory = () => {
    setModalYear(selectedYear);
    setModalVisible(true);
  };

  const handleSelectMonth = (monthIndex: number) => {
    setSpecificMonthYear(monthIndex, modalYear);
    setModalVisible(false);
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: tokens.card, borderColor: tokens.border }]}> 
        <Pressable
          style={styles.arrowButton}
          onPress={prevMonth}
          hitSlop={8}
          accessibilityLabel={t('monthSelector.previousMonth', { defaultValue: 'Mês anterior' })}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={tokens.textSecondary} />
        </Pressable>

        <TouchableOpacity
          style={styles.centerButton}
          onPress={openHistory}
          activeOpacity={0.75}
          accessibilityLabel={t('monthSelector.openHistory', { defaultValue: 'Selecionar mês' })}
        >
          <Text style={[styles.centerLabel, { color: tokens.textPrimary }]}>{selectedMonthLabel}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={tokens.textTertiary} />
        </TouchableOpacity>

        <Pressable
          style={styles.arrowButton}
          onPress={nextMonth}
          hitSlop={8}
          accessibilityLabel={t('monthSelector.nextMonth', { defaultValue: 'Próximo mês' })}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color={tokens.textSecondary} />
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={[styles.overlay, { backgroundColor: tokens.overlay }]} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: tokens.card, borderColor: tokens.border }]} onPress={(e) => e.stopPropagation()}> 
            <View style={styles.yearHeader}>
              <Pressable
                style={[styles.yearArrowButton, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}
                onPress={() => setModalYear((prev) => prev - 1)}
                hitSlop={8}
                accessibilityLabel={t('monthSelector.previousYear', { defaultValue: 'Ano anterior' })}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color={tokens.textPrimary} />
              </Pressable>

              <Text style={[styles.yearText, { color: tokens.textPrimary }]}>{modalYear}</Text>

              <Pressable
                style={[styles.yearArrowButton, { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border }]}
                onPress={() => setModalYear((prev) => prev + 1)}
                hitSlop={8}
                accessibilityLabel={t('monthSelector.nextYear', { defaultValue: 'Próximo ano' })}
              >
                <MaterialCommunityIcons name="chevron-right" size={20} color={tokens.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.monthGrid}>
              {monthGrid.map((item) => {
                const isSelected =
                  item.monthIndex === selectedMonth && modalYear === selectedYear;

                return (
                  <Pressable
                    key={`${modalYear}-${item.monthIndex}`}
                    onPress={() => handleSelectMonth(item.monthIndex)}
                    style={[
                      styles.monthChip,
                      {
                        backgroundColor: isSelected ? tokens.primaryTonal : tokens.surfaceInteractive,
                        borderColor: isSelected ? tokens.primary : tokens.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthChipLabel,
                        {
                          color: isSelected ? tokens.primary : tokens.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  centerLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  yearArrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthChip: {
    width: '31%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChipLabel: {
    fontSize: 14,
  },
});
