import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
  Keyboard,
  KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinanceStore } from '../store/useFinanceStore';

const APP_BG = '#0A0A0A';
const HIGHLIGHT_COLOR = '#0A84FF';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#CCCCCC';

interface TutorialStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
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
    titleKey: 'tutorialOverlay.steps.voice.title',
    descriptionKey: 'tutorialOverlay.steps.voice.description',
    balloonPosition: 'top',
  },
  {
    id: 'workspace-switch',
    titleKey: 'tutorialOverlay.steps.workspace.title',
    descriptionKey: 'tutorialOverlay.steps.workspace.description',
    balloonPosition: 'bottom',
  },
  {
    id: 'confirmation-loop',
    titleKey: 'tutorialOverlay.steps.confirmation.title',
    descriptionKey: 'tutorialOverlay.steps.confirmation.description',
    balloonPosition: 'top',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  fabPosition,
  workspaceSelectorPosition,
}) => {
  const { t } = useTranslation();
  const { width, height } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const { markTutorialAsSeen } = useFinanceStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const balloonTopAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnimConfigRef = useRef<{
    duration: number;
    easing: (value: number) => number;
  }>({
    duration: 220,
    easing: Easing.out(Easing.cubic),
  });

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const sideMargin = 16;
  const balloonWidth = Math.min(340, width - sideMargin * 2);
  const estimatedBalloonHeight = 250;

  if (!step) {
    return null;
  }

  const resolveKeyboardEasing = (easing?: string) => {
    switch (easing) {
      case 'easeIn':
        return Easing.in(Easing.ease);
      case 'easeOut':
        return Easing.out(Easing.ease);
      case 'easeInEaseOut':
        return Easing.inOut(Easing.ease);
      case 'linear':
        return Easing.linear;
      default:
        return Easing.out(Easing.cubic);
    }
  };

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
      x: width / 2 - 60,
      y: height / 2 - 60,
      width: 120,
      height: 120,
    };
  }, [step!.id, fabPosition, workspaceSelectorPosition, width, height]);

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

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      keyboardAnimConfigRef.current = {
        duration:
          Platform.OS === 'ios' && event?.duration
            ? Math.max(120, event.duration)
            : 220,
        easing:
          Platform.OS === 'ios'
            ? resolveKeyboardEasing((event as KeyboardEvent & { easing?: string }).easing)
            : Easing.out(Easing.cubic),
      };
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, (event: KeyboardEvent) => {
      keyboardAnimConfigRef.current = {
        duration:
          Platform.OS === 'ios' && event?.duration
            ? Math.max(120, event.duration)
            : 220,
        easing:
          Platform.OS === 'ios'
            ? resolveKeyboardEasing((event as KeyboardEvent & { easing?: string }).easing)
            : Easing.out(Easing.cubic),
      };
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const targetCenterX = targetArea.x + targetArea.width / 2;
  const balloonLeft = Math.max(
    sideMargin,
    Math.min(targetCenterX - balloonWidth / 2, width - sideMargin - balloonWidth)
  );
  const balloonTop =
    step!.balloonPosition === 'top'
      ? targetArea.y - 150
      : targetArea.y + targetArea.height + 40;
  const minBalloonTop = insets.top + 16;
  const keyboardOffset = keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom;
  const maxBalloonTop = Math.max(minBalloonTop, height - keyboardOffset - estimatedBalloonHeight);
  const clampedBalloonTop = Math.max(minBalloonTop, Math.min(balloonTop, maxBalloonTop));
  const resolvedBalloonLeft =
    step!.id === 'voice-ai'
      ? width - sideMargin - balloonWidth
      : step!.id === 'confirmation-loop'
        ? sideMargin
        : balloonLeft;
  const arrowMargin = 24;
  const arrowHalfWidth = 12;
  const arrowOffset = Math.max(
    arrowMargin,
    Math.min(
      targetCenterX - resolvedBalloonLeft - arrowHalfWidth,
      balloonWidth - arrowMargin - arrowHalfWidth * 2
    )
  );
  const balloonHorizontalPosition =
    step!.id === 'voice-ai'
      ? { right: sideMargin }
      : step!.id === 'confirmation-loop'
        ? { left: sideMargin, right: sideMargin }
        : { left: balloonLeft };

  useEffect(() => {
    const { duration, easing } = keyboardAnimConfigRef.current;

    Animated.timing(balloonTopAnim, {
      toValue: clampedBalloonTop,
      duration,
      easing,
      useNativeDriver: false,
    }).start();
  }, [balloonTopAnim, clampedBalloonTop]);

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
          balloonHorizontalPosition,
          {
            top: balloonTopAnim,
            width: balloonWidth,
            maxWidth: width - sideMargin * 2,
          },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.balloon}>
          <Text style={styles.balloonTitle}>{t(step!.titleKey)}</Text>
          <Text style={styles.balloonDescription}>{t(step!.descriptionKey)}</Text>

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
              <Text style={styles.skipButtonText}>{t('tutorialOverlay.skipAll')}</Text>
            </Pressable>

            <Pressable
              style={styles.nextButton}
              onPress={handleNext}
              android_ripple={{ color: 'rgba(10, 132, 255, 0.2)' }}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? t('tutorialOverlay.start') : t('tutorialOverlay.next')}
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
              marginLeft: arrowOffset,
              [step!.balloonPosition === 'top' ? 'bottom' : 'top']: -12,
              borderTopColor:
                step!.balloonPosition === 'top' ? 'transparent' : '#1A1A1A',
              borderBottomColor:
                step!.balloonPosition === 'top' ? '#1A1A1A' : 'transparent',
            },
          ]}
        />
        </Animated.View>
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
    width: 'auto',
    paddingBottom: 40,
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
    flexShrink: 1,
    flexWrap: 'wrap',
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
