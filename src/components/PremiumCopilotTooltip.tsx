import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';
import { useCopilot } from '../utils/copilotSafe';

type StepMeta = {
  titleKey: string;
  defaultTitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const STEP_META: Record<string, StepMeta> = {
  dashboard_balance: {
    titleKey: 'tour.titles.balance',
    defaultTitle: 'Visão Geral & Saldo do Mês',
    icon: 'wallet-outline',
  },
  dashboard_accounts: {
    titleKey: 'tour.titles.balance',
    defaultTitle: 'Visão Geral & Saldo do Mês',
    icon: 'wallet-outline',
  },
  dashboard_ai: {
    titleKey: 'tour.titles.ai',
    defaultTitle: 'Análise Inteligente de Gastos',
    icon: 'creation',
  },
  dashboard_advisor: {
    titleKey: 'tour.titles.advisor',
    defaultTitle: 'Consultor Financeiro por IA',
    icon: 'brain',
  },
  dashboard_add: {
    titleKey: 'tour.titles.add',
    defaultTitle: 'Novo Lançamento Inteligente',
    icon: 'plus-circle-outline',
  },
  dashboard_transactions: {
    titleKey: 'tour.titles.transactions',
    defaultTitle: 'Extrato & Últimas Movimentações',
    icon: 'format-list-bulleted',
  },
  dashboard_reports_nav: {
    titleKey: 'tour.titles.reportsNav',
    defaultTitle: 'Relatórios & Desempenho',
    icon: 'chart-bar',
  },
  cards_create: {
    titleKey: 'tour.titles.cardsCreate',
    defaultTitle: 'Cadastrar Novo Cartão',
    icon: 'credit-card-plus-outline',
  },
  cards_list: {
    titleKey: 'tour.titles.cardsList',
    defaultTitle: 'Faturas & Limite em Tempo Real',
    icon: 'credit-card-outline',
  },
  cards_pay: {
    titleKey: 'tour.titles.cardsPay',
    defaultTitle: 'Pagamento de Fatura',
    icon: 'credit-card-check-outline',
  },
  reports_dre: {
    titleKey: 'tour.titles.reportsDre',
    defaultTitle: 'Resultado Mensal Consolidado',
    icon: 'file-document-outline',
  },
  reports_charts: {
    titleKey: 'tour.titles.reportsCharts',
    defaultTitle: 'Distribuição por Categorias',
    icon: 'chart-pie',
  },
};

interface PremiumCopilotTooltipProps {
  labels?: {
    skip?: string;
    previous?: string;
    next?: string;
    finish?: string;
  };
}

export const PremiumCopilotTooltip: React.FC<PremiumCopilotTooltipProps> = ({ labels }) => {
  const {
    currentStep,
    currentStepNumber,
    totalStepsNumber,
    goToNext,
    goToNth,
    stop,
    isLastStep: hookIsLastStep,
  } = useCopilot();
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);

  const isLastStep = hookIsLastStep ?? (currentStepNumber >= totalStepsNumber);
  const hasMultipleSteps = totalStepsNumber > 1;

  const handleNext = () => {
    if (isLastStep) {
      void stop();
    } else if (typeof goToNext === 'function') {
      void goToNext();
    } else {
      void goToNth(currentStepNumber + 1);
    }
  };

  const skipLabel = labels?.skip || t('tour.tooltip.skip', { defaultValue: 'Pular' });
  const nextLabel = labels?.next || t('tour.tooltip.next', { defaultValue: 'Próximo' });
  const finishLabel = labels?.finish || t('tour.tooltip.finish', { defaultValue: 'Concluir' });

  const stepName = currentStep?.name || '';
  const meta = STEP_META[stepName];
  const stepTitle = meta
    ? t(meta.titleKey, { defaultValue: meta.defaultTitle })
    : t('tour.tooltip.title', { defaultValue: 'Guia do App' });
  const stepIcon = meta?.icon || 'compass-outline';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.card,
          borderColor: tokens.border,
          shadowColor: '#000',
        },
      ]}
    >
      {/* Top Bar: Pill Badge + Close Button */}
      <View style={styles.topBar}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.stepBadge,
              {
                backgroundColor: tokens.primaryTonal,
                borderColor: tokens.primaryTonalBorder,
              },
            ]}
          >
            <MaterialCommunityIcons name={stepIcon} size={13} color={tokens.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.stepBadgeText, { color: tokens.primary }]}>
              {t('tour.tooltip.stepLabel', {
                current: currentStepNumber,
                total: totalStepsNumber,
                defaultValue: `Passo ${currentStepNumber} de ${totalStepsNumber}`,
              })}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => void stop()}
          hitSlop={12}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialCommunityIcons name="close" size={18} color={tokens.textTertiary} />
        </Pressable>
      </View>

      {/* Main Title & Description */}
      <Text style={[styles.title, { color: tokens.textPrimary }]}>
        {stepTitle}
      </Text>
      
      <Text style={[styles.description, { color: tokens.textSecondary }]}>
        {currentStep?.text}
      </Text>

      {/* Footer: Progress Dots + Actions */}
      <View style={styles.footerRow}>
        {/* Step Dots */}
        <View style={styles.dotsContainer}>
          {hasMultipleSteps &&
            Array.from({ length: totalStepsNumber }).map((_, index) => {
              const stepIndex = index + 1;
              const isActive = stepIndex === currentStepNumber;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    isActive
                      ? [styles.activeDot, { backgroundColor: tokens.primary }]
                      : { backgroundColor: tokens.surfaceInteractive, borderColor: tokens.border, borderWidth: 1 },
                  ]}
                />
              );
            })}
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          {!isLastStep && (
            <Pressable
              onPress={() => void stop()}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: tokens.surfaceInteractive,
                  borderColor: tokens.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: tokens.textSecondary }]}>
                {skipLabel}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? tokens.primaryPressed : tokens.primary,
              },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isLastStep ? finishLabel : nextLabel}
            </Text>
            <MaterialCommunityIcons
              name={isLastStep ? 'check' : 'arrow-right'}
              size={15}
              color="#FFFFFF"
              style={{ marginLeft: 6 }}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    marginBottom: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 16,
    height: 6,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#2997FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
