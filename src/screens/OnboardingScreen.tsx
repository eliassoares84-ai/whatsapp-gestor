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

import { useFinanceStore } from '../store/useFinanceStore';

const APP_BG = '#0A0A0A';
const CARD_BG = '#121212';
const ACCENT_BLUE = '#0A84FF';
const ACCENT_GREEN = '#d2ff61';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#999999';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type ProfileType = 'personal' | 'business' | 'hybrid';

interface ProfileOption {
  type: ProfileType;
  title: string;
  description: string;
  icon: IconName;
  isPopular?: boolean;
}

const profileOptions: ProfileOption[] = [
  {
    type: 'personal',
    title: 'Pessoa Física',
    description: 'Apenas controle pessoal e da casa.',
    icon: 'account',
  },
  {
    type: 'business',
    title: 'Pessoa Jurídica',
    description: 'Apenas controle da minha empresa/negócio.',
    icon: 'briefcase',
  },
  {
    type: 'hybrid',
    title: 'Híbrido',
    description: 'Quero separar minhas contas pessoais da minha empresa.',
    icon: 'scale-balance',
    isPopular: true,
  },
];

export const OnboardingScreen: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(
    null
  );

  const { setupUserAccount } = useFinanceStore();

  const handleStart = () => {
    if (!selectedProfile) {
      return;
    }

    setupUserAccount(selectedProfile);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: APP_BG }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: TEXT_PRIMARY }]}>
            Como você vai usar o app?
          </Text>
          <Text style={[styles.subtitle, { color: TEXT_SECONDARY }]}>
            Escolha o perfil que melhor se adequa às suas necessidades.
          </Text>
        </View>

        {/* Profile Cards */}
        <View style={styles.cardsContainer}>
          {profileOptions.map((option) => {
            const isSelected = selectedProfile === option.type;
            const borderColor = isSelected ? ACCENT_BLUE : 'transparent';

            return (
              <Pressable
                key={option.type}
                onPress={() => setSelectedProfile(option.type)}
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: CARD_BG,
                    borderColor,
                    borderWidth: isSelected ? 2 : 0,
                  },
                ]}
              >
                {/* Popular Badge */}
                {option.isPopular && (
                  <View
                    style={[styles.popularBadge, { backgroundColor: ACCENT_GREEN }]}
                  >
                    <Text style={styles.popularText}>Mais popular</Text>
                  </View>
                )}

                {/* Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isSelected
                        ? `${ACCENT_BLUE}15`
                        : `${ACCENT_GREEN}15`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={40}
                    color={isSelected ? ACCENT_BLUE : ACCENT_GREEN}
                  />
                </View>

                {/* Content */}
                <Text style={[styles.cardTitle, { color: TEXT_PRIMARY }]}>
                  {option.title}
                </Text>
                <Text style={[styles.cardDescription, { color: TEXT_SECONDARY }]}>
                  {option.description}
                </Text>

                {/* Selection Indicator */}
                <View
                  style={[
                    styles.selectionIndicator,
                    {
                      borderColor: isSelected ? ACCENT_BLUE : CARD_BG,
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.selectionDot,
                        { backgroundColor: ACCENT_BLUE },
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
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.startButton,
            {
              backgroundColor: selectedProfile ? ACCENT_GREEN : CARD_BG,
              opacity: selectedProfile ? 1 : 0.5,
            },
          ]}
          onPress={handleStart}
          disabled={!selectedProfile}
        >
          <Text
            style={[
              styles.startButtonText,
              { color: selectedProfile ? '#000' : TEXT_SECONDARY },
            ]}
          >
            Começar
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
    paddingVertical: 20,
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 14,
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  startButton: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
