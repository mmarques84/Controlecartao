import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useState } from 'react';
import { persistSession, register } from '../database/authService';

type Props = {
  navigation: any;
};

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleRegister() {
    const emailFormatted = email.trim().toLowerCase();
    const passwordFormatted = password.trim();

    if (!emailFormatted || !passwordFormatted) {
      setMessage({ type: 'error', text: 'Preencha email e senha para criar a conta.' });
      return;
    }

    if (passwordFormatted.length < 4) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 4 caracteres.' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const result = await register(emailFormatted, passwordFormatted);

      if (result?.error === 'EMAIL_EXISTS') {
        setMessage({ type: 'error', text: 'Esse email ja esta cadastrado.' });
        return;
      }

      if (result?.userId) {
        await persistSession(result.userId);
      }

      setEmail('');
      setPassword('');

      setMessage({ type: 'success', text: 'Conta criada com sucesso.' });

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }]
      });
    } catch (error) {
      console.log(error);
      setMessage({ type: 'error', text: 'Erro ao cadastrar usuario.' });
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
          <View style={styles.heroGlowOrange} />
          <View style={styles.heroGlowBlue} />
          <Text style={styles.brand}>ControleCartao</Text>
          <Text style={styles.title}>Crie sua conta e comece com o pe direito</Text>
          <Text style={styles.subtitle}>Seu painel de gastos, cartoes e relatorios em uma experiencia mais bonita.</Text>
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
              textContentType="newPassword"
              autoComplete="new-password"
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

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Criando...' : 'Cadastrar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Ja tenho conta</Text>
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
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 18
  },
  heroGlowOrange: {
    position: 'absolute',
    top: -44,
    right: -28,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFE4D5'
  },
  heroGlowBlue: {
    position: 'absolute',
    bottom: -36,
    left: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DDE7FF'
  },
  brand: {
    color: '#5E6A85',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10
  },
  title: {
    color: '#141A2E',
    fontSize: 27,
    lineHeight: 33,
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
