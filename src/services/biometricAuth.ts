import * as LocalAuthentication from 'expo-local-authentication';

export async function canUseBiometricAuth() {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync()
  ]);

  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics(promptMessage = 'Entrar no app') {
  const available = await canUseBiometricAuth();

  if (!available) {
    return { success: false, available: false };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Agora nao',
    fallbackLabel: 'Usar senha'
  });

  return {
    success: result.success,
    available: true
  };
}
