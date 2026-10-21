import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIVACY_POLICY_URL } from '../constants/links';
import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';

interface PaywallScreenProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

type PlanType = 'annual' | 'monthly';

export const PaywallScreen: React.FC<PaywallScreenProps> = ({
  visible,
  onClose,
  onSubscribe,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useThemeStore((state) => state.theme);
  const isPremium = useFinanceStore((state) => state.isPremium);
  const setPremiumStatus = useFinanceStore((state) => state.setPremiumStatus);
  const tokens = getThemeTokens(theme);

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPremiumStatus(true);
      onSubscribe();
      Alert.alert(
        '🌟 Bem-vindo ao SeuGestor PRO!',
        'Seu acesso ao Consultor Financeiro CFP® e aos Comandos de Voz por IA está liberado com sucesso.'
      );
    }, 450);
  };

  const handleRestorePurchases = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (isPremium) {
        Alert.alert('Assinatura Ativa', 'Sua assinatura PRO já está ativa neste dispositivo.');
      } else {
        setPremiumStatus(true);
        onSubscribe();
        Alert.alert('Restaurado!', 'Sua assinatura SeuGestor PRO foi restaurada com sucesso.');
      }
    }, 400);
  };

  const handleOpenPrivacy = () => {
    void Linking.openURL(PRIVACY_POLICY_URL).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o link de privacidade.');
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: tokens.overlay }]}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: tokens.backgroundElevated,
              borderColor: tokens.border,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header Superior com Botão Fechar e Restaurar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: tokens.surfaceInteractive }]}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityLabel="Fechar"
            >
              <MaterialCommunityIcons name="close" size={20} color={tokens.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRestorePurchases}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.restoreText, { color: tokens.textSecondary }]}>
                Restaurar Compras
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Hero Header */}
            <View style={styles.heroSection}>
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: tokens.primaryTonal,
                    borderColor: tokens.primaryTonalBorder,
                  },
                ]}
              >
                <MaterialCommunityIcons name="crown" size={16} color={tokens.primary} />
                <Text style={[styles.badgeText, { color: tokens.primary }]}>SEUGESTOR PRO</Text>
              </View>

              <Text style={[styles.mainTitle, { color: tokens.textPrimary }]}>
                Potencialize suas Finanças com Inteligência Artificial
              </Text>

              <Text style={[styles.mainSubtitle, { color: tokens.textSecondary }]}>
                100% sem anúncios em todas as versões. O plano PRO financia o poder dos servidores
                de Inteligência Artificial de última geração.
              </Text>
            </View>

            {/* Banner de Garantia Sem Anúncios */}
            <View
              style={[
                styles.noAdsBanner,
                {
                  backgroundColor: tokens.surfaceSubtle,
                  borderColor: tokens.border,
                },
              ]}
            >
              <View style={[styles.bannerIconWrap, { backgroundColor: tokens.positiveTonal }]}>
                <MaterialCommunityIcons name="shield-check" size={20} color={tokens.positive} />
              </View>
              <View style={styles.bannerContent}>
                <Text style={[styles.bannerTitle, { color: tokens.textPrimary }]}>
                  Compromisso Zero Anúncios
                </Text>
                <Text style={[styles.bannerDescription, { color: tokens.textSecondary }]}>
                  Você nunca verá banners nem vídeos que atrapalham sua rotina.
                </Text>
              </View>
            </View>

            {/* Lista dos 2 Superpoderes PRO */}
            <View style={styles.featuresList}>
              {/* Feature 1: Voz */}
              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: tokens.card,
                    borderColor: tokens.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    {
                      backgroundColor: tokens.primaryTonal,
                      borderColor: tokens.primaryTonalBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="microphone" size={24} color={tokens.primary} />
                </View>
                <View style={styles.featureTextContainer}>
                  <View style={styles.featureHeaderRow}>
                    <Text style={[styles.featureTitle, { color: tokens.textPrimary }]}>
                      Comando de Voz por IA
                    </Text>
                    <View
                      style={[
                        styles.miniTag,
                        {
                          backgroundColor: tokens.primaryTonal,
                        },
                      ]}
                    >
                      <Text style={[styles.miniTagText, { color: tokens.primary }]}>EXCLUSIVO</Text>
                    </View>
                  </View>
                  <Text style={[styles.featureDesc, { color: tokens.textSecondary }]}>
                    Dite seus gastos naturalmente: &quot;Gastei R$ 45 no almoço no cartão Nubank&quot;.
                    A IA categoriza, define data e conta instantaneamente sem você precisar digitar nada.
                  </Text>
                </View>
              </View>

              {/* Feature 2: CFP Chatbot */}
              <View
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: tokens.card,
                    borderColor: tokens.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    {
                      backgroundColor: tokens.primaryTonal,
                      borderColor: tokens.primaryTonalBorder,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="certificate-outline"
                    size={24}
                    color={tokens.primary}
                  />
                </View>
                <View style={styles.featureTextContainer}>
                  <View style={styles.featureHeaderRow}>
                    <Text style={[styles.featureTitle, { color: tokens.textPrimary }]}>
                      Consultor Financeiro CFP® por IA
                    </Text>
                    <View
                      style={[
                        styles.miniTag,
                        {
                          backgroundColor: tokens.positiveTonal,
                        },
                      ]}
                    >
                      <Text style={[styles.miniTagText, { color: tokens.positive }]}>ILIMITADO</Text>
                    </View>
                  </View>
                  <Text style={[styles.featureDesc, { color: tokens.textSecondary }]}>
                    Bate-papo consultivo 24/7 especialista em Ações, Renda Fixa, Previdência
                    PGBL/VGBL, Financiamento SAC/Price, Consórcio, Holding Familiar e Otimização
                    Tributária.
                  </Text>
                </View>
              </View>
            </View>

            {/* Seletor de Planos */}
            <View style={styles.planSection}>
              <Text style={[styles.planSectionTitle, { color: tokens.textPrimary }]}>
                Escolha seu plano
              </Text>

              {/* Plano Anual */}
              <Pressable
                onPress={() => setSelectedPlan('annual')}
                style={[
                  styles.planOptionCard,
                  {
                    backgroundColor: tokens.card,
                    borderColor:
                      selectedPlan === 'annual' ? tokens.primary : tokens.border,
                    borderWidth: selectedPlan === 'annual' ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.planRadioRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          selectedPlan === 'annual' ? tokens.primary : tokens.borderStrong,
                      },
                    ]}
                  >
                    {selectedPlan === 'annual' && (
                      <View
                        style={[styles.radioInnerCircle, { backgroundColor: tokens.primary }]}
                      />
                    )}
                  </View>

                  <View style={styles.planInfoColumn}>
                    <View style={styles.planNameRow}>
                      <Text style={[styles.planName, { color: tokens.textPrimary }]}>
                        Plano Anual
                      </Text>
                      <View
                        style={[
                          styles.savingBadge,
                          {
                            backgroundColor: tokens.positiveTonal,
                            borderColor: tokens.positiveTonalBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.savingBadgeText, { color: tokens.positive }]}>
                          ECONOMIZE 37%
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.planPriceDetail, { color: tokens.textSecondary }]}>
                      12x de R$ 12,49 / mês
                    </Text>
                    <Text style={[styles.planBilledTotal, { color: tokens.textTertiary }]}>
                      R$ 149,90 cobrados anualmente
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Plano Mensal */}
              <Pressable
                onPress={() => setSelectedPlan('monthly')}
                style={[
                  styles.planOptionCard,
                  {
                    backgroundColor: tokens.card,
                    borderColor:
                      selectedPlan === 'monthly' ? tokens.primary : tokens.border,
                    borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.planRadioRow}>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          selectedPlan === 'monthly' ? tokens.primary : tokens.borderStrong,
                      },
                    ]}
                  >
                    {selectedPlan === 'monthly' && (
                      <View
                        style={[styles.radioInnerCircle, { backgroundColor: tokens.primary }]}
                      />
                    )}
                  </View>

                  <View style={styles.planInfoColumn}>
                    <View style={styles.planNameRow}>
                      <Text style={[styles.planName, { color: tokens.textPrimary }]}>
                        Plano Mensal
                      </Text>
                      <Text style={[styles.flexibleTag, { color: tokens.textTertiary }]}>
                        Sem fidelidade
                      </Text>
                    </View>
                    <Text style={[styles.planPriceDetail, { color: tokens.textSecondary }]}>
                      R$ 19,90 / mês
                    </Text>
                    <Text style={[styles.planBilledTotal, { color: tokens.textTertiary }]}>
                      Cancele a qualquer momento
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Botão de Ação Primário */}
            <TouchableOpacity
              style={[
                styles.primaryCtaButton,
                {
                  backgroundColor: tokens.primary,
                  opacity: isProcessing ? 0.75 : 1,
                },
              ]}
              onPress={handleSubscribe}
              disabled={isProcessing}
              activeOpacity={0.88}
            >
              {isProcessing ? (
                <ActivityIndicator color={tokens.textInverse} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="crown"
                    size={20}
                    color={tokens.textInverse}
                  />
                  <Text style={[styles.primaryCtaText, { color: tokens.textInverse }]}>
                    {selectedPlan === 'annual'
                      ? 'Desbloquear PRO Anual (R$ 149,90/ano)'
                      : 'Desbloquear PRO Mensal (R$ 19,90/mês)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.guaranteeText, { color: tokens.textTertiary }]}>
              🔒 Pagamento seguro via Google Play • 7 dias de garantia incondicional
            </Text>

            {/* Rodapé com Termos e Privacidade */}
            <View style={styles.footerLinksRow}>
              <TouchableOpacity onPress={handleOpenPrivacy} activeOpacity={0.7}>
                <Text style={[styles.footerLink, { color: tokens.textSecondary }]}>
                  Política de Privacidade
                </Text>
              </TouchableOpacity>
              <Text style={{ color: tokens.textTertiary }}>•</Text>
              <TouchableOpacity onPress={handleOpenPrivacy} activeOpacity={0.7}>
                <Text style={[styles.footerLink, { color: tokens.textSecondary }]}>
                  Termos de Uso
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  modalContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  noAdsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  planSection: {
    marginBottom: 20,
  },
  planSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  planOptionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planInfoColumn: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
  },
  savingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  savingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  flexibleTag: {
    fontSize: 12,
  },
  planPriceDetail: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  planBilledTotal: {
    fontSize: 12,
  },
  primaryCtaButton: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '700',
  },
  guaranteeText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 18,
  },
  footerLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  footerLink: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
