const storageMap = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(storageMap.get(key) || null)),
  setItem: jest.fn((key: string, value: string) => {
    storageMap.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    storageMap.delete(key);
    return Promise.resolve();
  }),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn((algorithm: string, str: string) => {
    return Promise.resolve(`hash_${str}`);
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

let mockHasHardware = true;
let mockIsEnrolled = true;
let mockAuthSuccess = true;

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(mockHasHardware)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(mockIsEnrolled)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: mockAuthSuccess })),
}));

import {
  setAppPin,
  verifyAppPin,
  removeAppPin,
  hasAppPin,
  isBiometricsAvailable,
  authenticateBiometrics,
} from '../securityService';

describe('securityService - PIN and Biometrics', () => {
  beforeEach(() => {
    storageMap.clear();
    mockHasHardware = true;
    mockIsEnrolled = true;
    mockAuthSuccess = true;
  });

  it('salva e valida o PIN corretamente', async () => {
    expect(await hasAppPin()).toBe(false);

    const saved = await setAppPin('1234');
    expect(saved).toBe(true);
    expect(await hasAppPin()).toBe(true);

    const valid = await verifyAppPin('1234');
    expect(valid).toBe(true);

    const invalid = await verifyAppPin('9999');
    expect(invalid).toBe(false);
  });

  it('rejeita PIN com menos de 4 digitos', async () => {
    const saved = await setAppPin('12');
    expect(saved).toBe(false);
    expect(await hasAppPin()).toBe(false);
  });

  it('remove o PIN corretamente', async () => {
    await setAppPin('4321');
    expect(await hasAppPin()).toBe(true);

    await removeAppPin();
    expect(await hasAppPin()).toBe(false);
    expect(await verifyAppPin('4321')).toBe(false);
  });

  it('detecta status da biometria', async () => {
    const status = await isBiometricsAvailable();
    expect(status.hasHardware).toBe(true);
    expect(status.isEnrolled).toBe(true);

    const authenticated = await authenticateBiometrics();
    expect(authenticated).toBe(true);
  });

  it('retorna false quando biometria nao esta disponivel sem gerar crash', async () => {
    mockHasHardware = false;
    mockIsEnrolled = false;

    const status = await isBiometricsAvailable();
    expect(status.hasHardware).toBe(false);
    expect(status.isEnrolled).toBe(false);

    const authenticated = await authenticateBiometrics();
    expect(authenticated).toBe(false);
  });
});
