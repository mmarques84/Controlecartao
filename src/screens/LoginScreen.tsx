import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useEffect, useState } from 'react';
import { getCurrentUser, login } from '../database/authService';
import { authenticateWithBiometrics, canUseBiometricAuth } from '../services/biometricAuth';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    async function loadBiometricState() {
      try {
        const [currentUser, biometricReady] = await Promise.all([
          getCurrentUser(),
          canUseBiometricAuth()
        ]);

        setCanUseBiometrics(Boolean(currentUser && biometricReady));
      } catch {
        setCanUseBiometrics(false);
      }
    }

    loadBiometricState();
  }, []);

  async function handleLogin() {
    const emailFormatted = email.trim().toLowerCase();
    const passwordFormatted = password.trim();

    if (!emailFormatted || !passwordFormatted) {
      setMessage({ type: 'error', text: 'Preencha email e senha para entrar.' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const user = await login(emailFormatted, passwordFormatted);

      if (!user) {
        setMessage({ type: 'error', text: 'Usuario ou senha invalidos.' });
        return;
      }

      setMessage({ type: 'success', text: 'Login realizado com sucesso.' });

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }]
      });
    } catch (error) {
      console.log(error);
      setMessage({ type: 'error', text: 'Nao foi possivel entrar agora.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    try {
      setLoading(true);
      setMessage(null);
      const result = await authenticateWithBiometrics('Entrar no ControleCartao');

      if (!result.success) {
        setMessage({ type: 'error', text: 'Nao foi possivel validar sua biometria.' });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }]
      });
    } catch (error) {
      console.log(error);
      setMessage({ type: 'error', text: 'Erro ao abrir com biometria.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.hero}>
          <Image
            source={require('../../assets/splash.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <Text style={styles.title}>Entrar na sua central de gastos</Text>
          <Text style={styles.subtitle}>Acompanhe fatura, cartoes e relatorios em uma experiencia mais premium.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            style={styles.input}
          />

          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Senha"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              autoComplete="password"
              style={styles.passwordInput}
            />
            <TouchableOpacity onPress={() => setShowPassword((current) => !current)}>
              <Text style={styles.toggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
            </TouchableOpacity>
          </View>

          {message ? (
            <View style={message.type === 'error' ? styles.messageError : styles.messageSuccess}>
              <Text style={message.type === 'error' ? styles.messageErrorText : styles.messageSuccessText}>
                {message.text}
              </Text>
            </View>
          ) : null}

          {canUseBiometrics ? (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              disabled={loading}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Entrar com Face ID ou digital</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB'
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center'
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 18
  },
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: 22,
    marginBottom: 16
  },
  title: {
    color: '#141A2E',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    marginBottom: 10
  },
  subtitle: {
    color: '#6F7990',
    lineHeight: 22
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  label: {
    color: '#4F5A73',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14
  },
  passwordWrapper: {
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12
  },
  toggleText: {
    color: '#2F5BFF',
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 12
  },
  secondaryButtonText: {
    color: '#2F5BFF',
    fontWeight: '700'
  },
  messageError: {
    backgroundColor: '#FFF1F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14
  },
  messageSuccess: {
    backgroundColor: '#E9F8EF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14
  },
  messageErrorText: {
    color: '#D9544D',
    fontWeight: '700'
  },
  messageSuccessText: {
    color: '#1E8E5A',
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: '#141A2E',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center'
  },
  primaryButtonDisabled: {
    backgroundColor: '#98A2B3'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center'
  },
  linkText: {
    color: '#2F5BFF',
    fontWeight: '700'
  }
});
