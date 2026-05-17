import * as LocalAuthentication from 'expo-local-authentication';

export const authenticateUser = async (): Promise<boolean> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware && !isEnrolled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear acesso ao app',
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar senha do dispositivo',
      biometricsSecurityLevel: 'weak',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch {
    return false;
  }
};