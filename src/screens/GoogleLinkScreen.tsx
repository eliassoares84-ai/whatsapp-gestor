import { MaterialCommunityIcons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinanceStore, useThemeStore } from '../store/useFinanceStore';
import { getThemeTokens } from '../styles/themes';
import { GOOGLE_DRIVE_SCOPE, getGoogleAccessToken, setGoogleAccessToken } from '../utils/GoogleDriveService';

const normalizeClientId = (value?: string): string | undefined => {
  const trimmed = value?.trim();

  if (!trimmed || /^SEU_/i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
};

type NativeGoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

const getNativeGoogleSignInModule = (): NativeGoogleSignInModule | null => {
  try {
    return require('@react-native-google-signin/google-signin') as NativeGoogleSignInModule;
  } catch {
    return null;
  }
};

const getAvatarInitials = (name?: string, email?: string): string => {
  const source = (name || email || '').trim();

  if (!source) {
    return 'G';
  }

  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const firstInitial = words[0]?.[0] ?? 'G';
    const secondInitial = words[1]?.[0] ?? '';
    return `${firstInitial}${secondInitial}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

const getGooglePhotoUrl = (photoUrl?: string, size = 160): string | undefined => {
  if (!photoUrl) {
    return undefined;
  }

  if (!photoUrl.includes('googleusercontent.com')) {
    return photoUrl;
  }

  if (/=s\d+-c$/.test(photoUrl)) {
    return photoUrl.replace(/=s\d+-c$/, `=s${size}-c`);
  }

  return `${photoUrl}=s${size}-c`;
};

interface GoogleLinkScreenProps {
  onLinked: (email?: string, photoUrl?: string, name?: string) => void;
  onSkip: () => void;
  requireLink?: boolean;
}

export const GoogleLinkScreen: React.FC<GoogleLinkScreenProps> = ({
  onLinked,
  onSkip,
  requireLink = false,
}) => {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const insets = useSafeAreaInsets();
  const tokens = getThemeTokens(theme);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [nativeGoogleModule] = useState<NativeGoogleSignInModule | null>(() =>
    getNativeGoogleSignInModule()
  );

  const {
    currentWorkspaceId,
    workspaces,
    googleLinkedName,
    googleLinkedEmail,
    googleLinkedPhotoUrl,
    completeGoogleLinkPrompt,
  } = useFinanceStore();
  
  const appBg = tokens.background;
  const cardBg = tokens.card;
  const textPrimary = tokens.textPrimary;
  const textSecondary = tokens.textSecondary;
  const surfaceMuted = tokens.surfaceInteractive;
  const avatarBorder = tokens.borderStrong;
  const secondaryBorder = tokens.border;
  const accentColor = tokens.primary;
  const primaryButtonTextColor = '#FFFFFF';
  
  const resolvedPhotoUrl = useMemo(
    () => getGooglePhotoUrl(googleLinkedPhotoUrl, 180),
    [googleLinkedPhotoUrl]
  );
  
  const initials = useMemo(
    () => getAvatarInitials(googleLinkedName, googleLinkedEmail),
    [googleLinkedName, googleLinkedEmail]
  );

  const iosClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const androidClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  const webClientId = normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

  const resolvedAndroidClientId = androidClientId;
  const resolvedIosClientId = iosClientId;

  const isGoogleConfigured = useMemo(() => {
    if (Platform.OS === 'android') {
      return Boolean(resolvedAndroidClientId || webClientId);
    }

    if (Platform.OS === 'ios') {
      return Boolean(resolvedIosClientId);
    }

    return Boolean(webClientId);
  }, [resolvedAndroidClientId, resolvedIosClientId, webClientId]);

  const googleRedirectUri = makeRedirectUri({
    native: 'com.googleusercontent.apps.822719331832-mscfrmdbep64tlphcjimpj8qsj7s3ha5:/oauthredirect',
  });

  const authRequestConfig = useMemo(
    () => ({
      iosClientId,
      androidClientId,
      webClientId,
      scopes: [GOOGLE_DRIVE_SCOPE, 'openid', 'profile', 'email'],
      redirectUri: googleRedirectUri,
    }),
    [iosClientId, androidClientId, webClientId, googleRedirectUri]
  );

  const [request, , promptAsync] = Google.useAuthRequest(authRequestConfig);

  useEffect(() => {
    try {
      WebBrowser.maybeCompleteAuthSession();
    } catch {
      // No-op
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !nativeGoogleModule) {
      return;
    }

    try {
      nativeGoogleModule.GoogleSignin.configure({
        scopes: [GOOGLE_DRIVE_SCOPE, 'email', 'profile', 'openid'],
        ...(webClientId ? { webClientId } : {}),
      });
    } catch {
      setErrorMessage(t('googleLink.errors.connectError'));
    }
  }, [nativeGoogleModule, webClientId, t]);

  const signInWithExpoSession = async (): Promise<boolean> => {
    if (!request) {
      return false;
    }

    const result = await promptAsync();

    if (result.type !== 'success') {
      if (result.type !== 'dismiss') {
        setErrorMessage(t('googleLink.errors.cannotCompleteAuth'));
      }
      return false;
    }

    const token = result.authentication?.accessToken;

    if (!token) {
      setErrorMessage(t('googleLink.errors.invalidToken'));
      return false;
    }

    setGoogleAccessToken(token);

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) {
      completeGoogleLinkPrompt();
      onLinked();
      return true;
    }

    const profileData = (await profileResponse.json()) as {
      email?: string;
      picture?: string;
      name?: string;
    };
    
    completeGoogleLinkPrompt(profileData.email, profileData.picture, profileData.name);
    onLinked(profileData.email, profileData.picture, profileData.name);
    return true;
  };

  const isNativeConfigError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const code = (error as Record<string, unknown>).code;
    if (typeof code === 'string' && code === 'RNGoogleSignin') {
      return true;
    }
    if (code === 10) {
      return true;
    }
    return false;
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (Platform.OS === 'android' && nativeGoogleModule) {
        try {
          await nativeGoogleModule.GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });

          const nativeSignInResult = await nativeGoogleModule.GoogleSignin.signIn();

          if (!nativeGoogleModule.isSuccessResponse(nativeSignInResult)) {
            setErrorMessage(t('googleLink.errors.authCancelledRetry'));
            return;
          }

          const tokens = await nativeGoogleModule.GoogleSignin.getTokens();
          const token = tokens.accessToken;

          if (!token) {
            setErrorMessage(t('googleLink.errors.invalidToken'));
            return;
          }

          setGoogleAccessToken(token);
          
          completeGoogleLinkPrompt(
            nativeSignInResult.data.user.email,
            nativeSignInResult.data.user.photo ?? undefined,
            nativeSignInResult.data.user.name ?? undefined
          );
          onLinked(
            nativeSignInResult.data.user.email,
            nativeSignInResult.data.user.photo ?? undefined,
            nativeSignInResult.data.user.name ?? undefined
          );
          return;
        } catch (nativeError: unknown) {
          if (isNativeConfigError(nativeError)) {
            await signInWithExpoSession();
            return;
          }

          if (nativeGoogleModule.isErrorWithCode(nativeError)) {
            if (nativeError.code === nativeGoogleModule.statusCodes.SIGN_IN_CANCELLED) {
              setErrorMessage(t('googleLink.errors.authCancelled'));
            } else if (
              nativeError.code === nativeGoogleModule.statusCodes.PLAY_SERVICES_NOT_AVAILABLE
            ) {
              setErrorMessage(t('googleLink.errors.playServicesUnavailable'));
            } else {
              await signInWithExpoSession();
            }
          } else {
            await signInWithExpoSession();
          }
          return;
        }
      }

      await signInWithExpoSession();
    } catch {
      setErrorMessage(t('googleLink.errors.connectError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmExisting = async () => {
    if (isLoading) {
      return;
    }

    setErrorMessage('');

    if (!googleLinkedEmail) {
      await handleConnectGoogle();
      return;
    }

    if (!getGoogleAccessToken()) {
      await handleConnectGoogle();
      return;
    }

    setIsLoading(true);
    try {
      completeGoogleLinkPrompt(googleLinkedEmail, googleLinkedPhotoUrl, googleLinkedName);
      onLinked(googleLinkedEmail, googleLinkedPhotoUrl, googleLinkedName);
    } catch {
      setErrorMessage(t('googleLink.errors.connectError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: appBg,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconWrapper, { backgroundColor: tokens.primaryTonal, borderColor: tokens.primaryTonalBorder, borderWidth: 1 }]}>
          <MaterialCommunityIcons name="google" size={40} color={tokens.primary} />
        </View>

        <Text style={[styles.title, { color: textPrimary }]}>{t('googleLink.title')}</Text>

        <Text style={[styles.subtitle, { color: textSecondary }]}>
          {t('googleLink.subtitle')}
        </Text>

        {googleLinkedEmail ? (
          <View style={[styles.profileBadge, { backgroundColor: cardBg, borderColor: secondaryBorder, borderWidth: 1 }]}>
            {resolvedPhotoUrl ? (
              <Image source={{ uri: resolvedPhotoUrl }} style={[styles.profileAvatar, { borderColor: avatarBorder }]} />
            ) : (
              <View
                style={[
                  styles.profileAvatarFallback,
                  { backgroundColor: tokens.primaryTonal, borderColor: tokens.primaryTonalBorder },
                ]}
              >
                <Text style={[styles.profileAvatarInitials, { color: tokens.primary }]}>
                  {initials}
                </Text>
              </View>
            )}

            <View style={styles.profileTextWrap}>
              <Text style={[styles.profileBadgeTitle, { color: textPrimary }]} numberOfLines={1}>
                {googleLinkedName || t('googleLink.currentAccount')}
              </Text>
              <Text style={[styles.profileBadgeEmail, { color: textSecondary }]} numberOfLines={1}>
                {googleLinkedEmail}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: secondaryBorder, borderWidth: 1 }]}> 
          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="cloud-check-outline" size={18} color={accentColor} />
            <Text style={[styles.bulletText, { color: textPrimary }]}>{t('googleLink.driveBackup')}</Text>
          </View>

          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="shield-lock-outline" size={18} color={accentColor} />
            <Text style={[styles.bulletText, { color: textPrimary }]}>{t('googleLink.restore')}</Text>
          </View>

          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="folder-sync-outline" size={18} color={accentColor} />
            <Text style={[styles.bulletText, { color: textPrimary }]}>{t('googleLink.sync')}</Text>
          </View>
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {googleLinkedEmail ? (
          <>
            <Pressable
              onPress={handleConfirmExisting}
              style={[styles.primaryButton, { backgroundColor: accentColor }]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={primaryButtonTextColor} />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={18} color={primaryButtonTextColor} />
                  <Text style={[styles.primaryButtonText, { color: primaryButtonTextColor }]}>
                    Confirmar e Continuar
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleConnectGoogle}
              style={[styles.secondaryButton, { borderColor: secondaryBorder, marginTop: 14 }]}
              disabled={isLoading}
            >
              <Text style={[styles.secondaryButtonText, { color: textSecondary }]}>
                Vincular outra conta
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleConnectGoogle}
            style={[styles.primaryButton, { backgroundColor: accentColor }]}
            disabled={isLoading || !isGoogleConfigured || (Platform.OS !== 'android' && !request)}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={primaryButtonTextColor} />
            ) : (
              <>
                <MaterialCommunityIcons name="google" size={18} color={primaryButtonTextColor} />
                <Text style={[styles.primaryButtonText, { color: primaryButtonTextColor }]}>{t('googleLink.linkButton')}</Text>
              </>
            )}
          </Pressable>
        )}

        {!isGoogleConfigured && !googleLinkedEmail ? (
          <Text style={[styles.configHint, { color: textSecondary }]}> 
            {Platform.OS === 'android'
              ? t('googleLink.androidConfigHint')
              : t('googleLink.iosConfigHint')}
          </Text>
        ) : null}

        {!googleLinkedEmail ? (
          <Pressable onPress={onSkip} style={[styles.secondaryButton, { borderColor: secondaryBorder, marginTop: 12 }]}>
            <Text style={[styles.secondaryButtonText, { color: textSecondary }]}>
              {t('googleLink.continueWithoutLink', { defaultValue: 'Continuar sem vincular agora' })}
            </Text>
          </Pressable>
        ) : null}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    alignSelf: 'center',
  },
  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  profileBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  profileAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  profileAvatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  profileTextWrap: {
    flex: 1,
  },
  profileBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 1,
  },
  profileBadgeEmail: {
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  configHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  secondaryButton: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});