import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

export const STORAGE_KEY_PIN_HASH = '@seugestor_pin_hash';
export const LEGACY_STORAGE_KEY_PIN_HASH = '@whatsapp_gestor_pin_hash';

export interface AuthPromptLabels {
  promptMessage: string;
  cancelLabel: string;
  fallbackLabel: string;
}

export interface BiometricsStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
}

export const isBiometricsAvailable = async (): Promise<BiometricsStatus> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return { hasHardware, isEnrolled };
  } catch {
    return { hasHardware: false, isEnrolled: false };
  }
};

export const hasAppPin = async (): Promise<boolean> => {
  try {
    const hash =
      (await AsyncStorage.getItem(STORAGE_KEY_PIN_HASH)) ||
      (await AsyncStorage.getItem(LEGACY_STORAGE_KEY_PIN_HASH));
    return Boolean(hash && hash.trim().length > 0);
  } catch {
    return false;
  }
};

export const legacyHashPin = async (pin: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `whatsapp_gestor_salt_${pin.trim()}`
  );
};

export const hashPin = async (pin: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `seugestor_salt_${pin.trim()}`
  );
};

export const setAppPin = async (pin: string): Promise<boolean> => {
  try {
    const cleanPin = pin.trim();
    if (cleanPin.length < 4) {
      return false;
    }
    const hash = await hashPin(cleanPin);
    await AsyncStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY_PIN_HASH);
    return true;
  } catch {
    return false;
  }
};

export const verifyAppPin = async (pin: string): Promise<boolean> => {
  try {
    const cleanPin = pin.trim();
    const storedHash = await AsyncStorage.getItem(STORAGE_KEY_PIN_HASH);
    if (!storedHash) {
      const legacyHash = await AsyncStorage.getItem(LEGACY_STORAGE_KEY_PIN_HASH);
      if (legacyHash) {
        const legacyCandidate = await legacyHashPin(cleanPin);
        if (legacyHash === legacyCandidate) {
          const newHash = await hashPin(cleanPin);
          await AsyncStorage.setItem(STORAGE_KEY_PIN_HASH, newHash);
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY_PIN_HASH);
          return true;
        }
      }
      return false;
    }
    const inputHash = await hashPin(cleanPin);
    return storedHash === inputHash;
  } catch {
    return false;
  }
};

export const removeAppPin = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_PIN_HASH);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY_PIN_HASH);
    return true;
  } catch {
    return false;
  }
};

export const authenticateBiometrics = async (
  labels?: AuthPromptLabels
): Promise<boolean> => {
  try {
    const { hasHardware, isEnrolled } = await isBiometricsAvailable();

    if (!hasHardware || !isEnrolled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: labels?.promptMessage || 'Desbloquear SeuGestor',
      cancelLabel: labels?.cancelLabel || 'Cancelar',
      fallbackLabel: labels?.fallbackLabel || 'Usar PIN ou senha',
      biometricsSecurityLevel: 'weak',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch {
    return false;
  }
};

export const authenticateUser = async (
  labels?: AuthPromptLabels
): Promise<boolean> => {
  return authenticateBiometrics(labels);
};