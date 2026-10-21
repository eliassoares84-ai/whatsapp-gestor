import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type ProfileType = 'personal' | 'business' | 'hybrid';

interface ProfileOption {
  type: ProfileType;
  icon: IconName;
  isPopular?: boolean;
}

const profileOptions: ProfileOption[] = [
  {
    type: 'personal',
    icon: 'account-outline',
  },
  {
    type: 'business',
    icon: 'briefcase-outline',
  },
  {
    type: 'hybrid',
    icon: 'scale-balance',
    isPopular: true,
  },
];

export const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const tokens = getThemeTokens(theme);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(null);

  const { setupUserAccount } = useFinanceStore();

  const handleStart = () => {
    if (!selectedProfile) {
      return;
    }

    setupUserAccount(selectedProfile);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tokens.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            {t('onboarding.title')}
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            {t('onboarding.subtitle')}
          </Text>
        </View>

        {/* Profile Cards */}
        <View style={styles.cardsContainer}>
          {profileOptions.map((option) => {
            const isSelected = selectedProfile === option.type;
            const borderColor = isSelected ? tokens.primary : tokens.border;

            return (
              <Pressable
                key={option.type}
                onPress={() => setSelectedProfile(option.type)}
                style={({ pressed }) => [
                  styles.profileCard,
                  {
                    backgroundColor: tokens.card,
                    borderColor,
                    borderWidth: isSelected ? 1.5 : 1,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                {/* Popular Badge */}
                {option.isPopular && (
                  <View
                    style={[
                      styles.popularBadge,
                      {
                        backgroundColor: tokens.primaryTonal,
                        borderColor: tokens.primaryTonalBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.popularText, { color: tokens.primary }]}>
                      {t('onboarding.popular')}
                    </Text>
                  </View>
                )}

                {/* Icon Container */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isSelected
                        ? tokens.primaryTonal
                        : tokens.surfaceInteractive,
                      borderColor: isSelected
                        ? tokens.primaryTonalBorder
                        : tokens.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={30}
                    color={isSelected ? tokens.primary : tokens.textSecondary}
                  />
                </View>

                {/* Content */}
                <Text style={[styles.cardTitle, { color: tokens.textPrimary }]}>
                  {t(`onboarding.profiles.${option.type}.title`)}
                </Text>
                <Text style={[styles.cardDescription, { color: tokens.textSecondary }]}>
                  {t(`onboarding.profiles.${option.type}.description`)}
                </Text>

                {/* Selection Indicator */}
                <View
                  style={[
                    styles.selectionIndicator,
                    {
                      borderColor: isSelected ? tokens.primary : tokens.borderStrong,
                      backgroundColor: isSelected ? tokens.primaryTonal : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.selectionDot,
                        { backgroundColor: tokens.primary },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { backgroundColor: tokens.background, borderTopColor: tokens.divider }]}>
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            {
              backgroundColor: selectedProfile ? (pressed ? tokens.primaryPressed : tokens.primary) : tokens.surfaceInteractive,
              borderColor: selectedProfile ? 'transparent' : tokens.border,
            },
          ]}
          onPress={handleStart}
          disabled={!selectedProfile}
        >
          <Text
            style={[
              styles.startButtonText,
              { color: selectedProfile ? '#FFFFFF' : tokens.textTertiary },
            ]}
          >
            {t('onboarding.start')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 28,
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 16,
  },
  selectionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  startButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
