import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFinanceStore, useThemeStore, type UserProfile } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';
import { getGoogleAccessToken } from '../utils/GoogleDriveService';

type StepKey = keyof UserProfile;

type StepOption<T extends string> = {
  id: T;
  titleKey: string;
  descriptionKey: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

type QuizStep<T extends string> = {
  key: StepKey;
  questionKey: string;
  options: Array<StepOption<T>>;
};

const QUIZ_STEPS: Array<QuizStep<string>> = [
  {
    key: 'focus',
    questionKey: 'onboardingQuiz.questions.focus',
    options: [
      {
        id: 'Sair das Dívidas',
        titleKey: 'onboardingQuiz.options.focus.debt.title',
        descriptionKey: 'onboardingQuiz.options.focus.debt.description',
        icon: 'cash-remove',
      },
      {
        id: 'Poupar/Investir',
        titleKey: 'onboardingQuiz.options.focus.save.title',
        descriptionKey: 'onboardingQuiz.options.focus.save.description',
        icon: 'chart-line',
      },
      {
        id: 'Gerir Negócio',
        titleKey: 'onboardingQuiz.options.focus.business.title',
        descriptionKey: 'onboardingQuiz.options.focus.business.description',
        icon: 'briefcase-account-outline',
      },
    ],
  },
  {
    key: 'scope',
    questionKey: 'onboardingQuiz.questions.scope',
    options: [
      {
        id: 'Vida Pessoal',
        titleKey: 'onboardingQuiz.options.scope.personal.title',
        descriptionKey: 'onboardingQuiz.options.scope.personal.description',
        icon: 'account-circle-outline',
      },
      {
        id: 'Empresa/Serviços',
        titleKey: 'onboardingQuiz.options.scope.business.title',
        descriptionKey: 'onboardingQuiz.options.scope.business.description',
        icon: 'domain',
      },
      {
        id: 'Ambos',
        titleKey: 'onboardingQuiz.options.scope.both.title',
        descriptionKey: 'onboardingQuiz.options.scope.both.description',
        icon: 'account-switch-outline',
      },
    ],
  },
  {
    key: 'control',
    questionKey: 'onboardingQuiz.questions.control',
    options: [
      {
        id: 'Iniciante',
        titleKey: 'onboardingQuiz.options.control.beginner.title',
        descriptionKey: 'onboardingQuiz.options.control.beginner.description',
        icon: 'seed-outline',
      },
      {
        id: 'Esforçado',
        titleKey: 'onboardingQuiz.options.control.effort.title',
        descriptionKey: 'onboardingQuiz.options.control.effort.description',
        icon: 'arm-flex-outline',
      },
      {
        id: 'Ninja',
        titleKey: 'onboardingQuiz.options.control.ninja.title',
        descriptionKey: 'onboardingQuiz.options.control.ninja.description',
        icon: 'lightning-bolt-outline',
      },
    ],
  },
];

export const OnboardingQuizScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);
  const {
    saveUserProfile,
    googleLinkedEmail,
    reopenGoogleLinkPrompt,
  } = useFinanceStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [results, setResults] = useState<UserProfile>({});
  const [transitionAnim] = useState(() => new Animated.Value(1));

  const step = QUIZ_STEPS[currentStep];
  const progress = (currentStep + 1) / QUIZ_STEPS.length;

  const progressWidth = useMemo(() => `${Math.max(progress * 100, 8)}%`, [progress]);

  const animateStepOutIn = (nextStep: number) => {
    Animated.timing(transitionAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(nextStep);
      setSelectedOptionId('');
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSkip = () => {
    saveUserProfile(results);
  };

  const finishQuiz = (nextResults: UserProfile) => {
    try {
      const requiresGoogleLink =
        nextResults.scope === 'Ambos' ||
        nextResults.scope === 'Empresa/Serviços';
      const hasGoogleLink = Boolean(googleLinkedEmail.trim());
      const hasGoogleToken = Boolean(getGoogleAccessToken());

      saveUserProfile(nextResults);

      if (requiresGoogleLink && (!hasGoogleLink || !hasGoogleToken)) {
        reopenGoogleLinkPrompt();
      }
    } catch {
      Alert.alert(
        t('onboardingQuiz.alert.title'),
        t('onboardingQuiz.alert.message')
      );
      saveUserProfile(nextResults);
    }
  };

  const handleOptionPress = (optionId: string) => {
    if (!step || selectedOptionId) {
      return;
    }

    setSelectedOptionId(optionId);

    const nextResults: UserProfile = {
      ...results,
      [step.key]: optionId,
    };

    setResults(nextResults);

    setTimeout(() => {
      const isLastStep = currentStep === QUIZ_STEPS.length - 1;

      if (isLastStep) {
        finishQuiz(nextResults);
        return;
      }

      animateStepOutIn(currentStep + 1);
    }, 280);
  };

  if (!step) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]}>
      <View style={styles.headerRow}>
        <View style={[styles.progressTrack, { backgroundColor: tokens.surfaceInteractive }]}>
          <View style={[styles.progressFill, { width: progressWidth as `${number}%`, backgroundColor: tokens.primary }]} />
        </View>

        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: tokens.textSecondary }]}>{t('onboardingQuiz.skip')}</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: transitionAnim,
            transform: [
              {
                translateY: transitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.stepText, { color: tokens.primary }]}>
          {t('onboardingQuiz.stepOf', { current: currentStep + 1, total: QUIZ_STEPS.length })}
        </Text>
        <Text style={[styles.question, { color: tokens.textPrimary }]}>{t(step.questionKey)}</Text>

        <View style={styles.cardsList}>
          {step.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const borderColor = isSelected ? tokens.primary : tokens.border;

            return (
              <Pressable
                key={option.id}
                onPress={() => handleOptionPress(option.id)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isSelected ? tokens.primaryTonal : tokens.card,
                    borderColor,
                    borderWidth: isSelected ? 1.5 : 1,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: isSelected ? tokens.primaryTonalBorder : tokens.surfaceInteractive,
                      borderColor: isSelected ? tokens.primary : tokens.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={22}
                    color={isSelected ? tokens.primary : tokens.textSecondary}
                  />
                </View>

                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>{t(option.titleKey)}</Text>
                  <Text style={[styles.cardDescription, { color: tokens.textSecondary }]}>{t(option.descriptionKey)}</Text>
                </View>

                {isSelected ? (
                  <MaterialCommunityIcons name="check-circle" size={22} color={tokens.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  skipButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  question: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 24,
  },
  cardsList: {
    gap: 12,
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
});
