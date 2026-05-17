import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useFinanceStore } from '../store/useFinanceStore';

const APP_BG = '#0A0A0A';
const HIGHLIGHT_COLOR = '#0A84FF';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#CCCCCC';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  balloonPosition?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
  fabPosition: { x: number; y: number; size: number };
  workspaceSelectorPosition: { x: number; y: number; width: number; height: number };
}

const STEPS: TutorialStep[] = [
  {
    id: 'voice-ai',
    title: '🎤 Entrada por Voz',
    description:
      'Diga algo como: "Gastei 50 reais com café na Snackscoffee" e eu cuido do resto.',
    balloonPosition: 'top',
  },
  {
    id: 'workspace-switch',
    title: '🏢 Troque de Contexto',
    description:
      'Separe sua vida pessoal das suas empresas com um toque. Cada workspace tem suas transações isoladas.',
    balloonPosition: 'bottom',
  },
  {
    id: 'confirmation-loop',
    title: '✅ Sempre Confirmo',
    description:
      'Eu sempre vou te perguntar se entendi direito antes de salvar. Nada é salvo sem sua aprovação.',
    balloonPosition: 'top',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  fabPosition,
  workspaceSelectorPosition,
}) => {
  const { markTutorialAsSeen } = useFinanceStore();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  if (!step) {
    return null;
  }

  // Determine target area based on current step
  const targetArea = useMemo(() => {
    if (step!.id === 'voice-ai') {
      return {
        x: fabPosition.x - fabPosition.size / 2,
        y: fabPosition.y - fabPosition.size / 2,
        width: fabPosition.size,
        height: fabPosition.size,
      };
    }

    if (step!.id === 'workspace-switch') {
      return workspaceSelectorPosition;
    }

    // Confirmation step: no specific target, just center
    return {
      x: Dimensions.get('window').width / 2 - 60,
      y: Dimensions.get('window').height / 2 - 60,
      width: 120,
      height: 120,
    };
  }, [step!.id, fabPosition, workspaceSelectorPosition]);

  // Animate in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, currentStep]);

  const handleNext = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isLastStep) {
        markTutorialAsSeen();
      } else {
        setCurrentStep((prev) => prev + 1);
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
      }
    });
  };

  const handleSkipAll = () => {
    markTutorialAsSeen();
  };

  const balloonLeft = Math.max(16, Math.min(targetArea.x, Dimensions.get('window').width - 200));
  const balloonTop =
    step!.balloonPosition === 'top'
      ? targetArea.y - 150
      : targetArea.y + targetArea.height + 40;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Semi-transparent overlay with spotlight hole */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.overlayFill} />
      </Animated.View>

      {/* Spotlight circle */}
      <View
        style={[
          styles.spotlight,
          {
            left: targetArea.x - 12,
            top: targetArea.y - 12,
            width: targetArea.width + 24,
            height: targetArea.height + 24,
          },
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.spotlightInner,
            {
              borderRadius: targetArea.width > 100 ? 20 : targetArea.width / 2,
            },
          ]}
        />
      </View>

      {/* Balloon tooltip */}
      <Animated.View
        style={[
          styles.balloonContainer,
          {
            left: balloonLeft,
            top: Math.max(40, balloonTop),
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.balloon}>
          <Text style={styles.balloonTitle}>{step!.title}</Text>
          <Text style={styles.balloonDescription}>{step!.description}</Text>

          {/* Step indicator dots */}
          <View style={styles.dotsContainer}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentStep ? HIGHLIGHT_COLOR : '#444',
                  },
                ]}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={styles.skipButton}
              onPress={handleSkipAll}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
            >
              <Text style={styles.skipButtonText}>Pular Tudo</Text>
            </Pressable>

            <Pressable
              style={styles.nextButton}
              onPress={handleNext}
              android_ripple={{ color: 'rgba(10, 132, 255, 0.2)' }}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Começar' : 'Próximo'}
              </Text>
              <MaterialCommunityIcons
                name={isLastStep ? 'check' : 'chevron-right'}
                size={18}
                color={TEXT_PRIMARY}
                style={styles.nextButtonIcon}
              />
            </Pressable>
          </View>
        </View>

        {/* Balloon arrow pointing to target */}
        <View
          style={[
            styles.balloonArrow,
            {
              [step!.balloonPosition === 'top' ? 'bottom' : 'top']: -12,
              borderTopColor:
                step!.balloonPosition === 'top' ? 'transparent' : '#1A1A1A',
              borderBottomColor:
                step!.balloonPosition === 'top' ? '#1A1A1A' : 'transparent',
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  overlayFill: {
    flex: 1,
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 999,
  },
  spotlightInner: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  balloonContainer: {
    position: 'absolute',
    width: 280,
  },
  balloon: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  balloonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: HIGHLIGHT_COLOR,
    marginBottom: 8,
  },
  balloonDescription: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  nextButton: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: HIGHLIGHT_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  nextButtonIcon: {
    marginLeft: 2,
  },
  balloonArrow: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
