import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import NovaEntradaScreen from './src/screens/NovaEntradaScreen';
import CardScreen from './src/screens/CardScreen';
import InvoiceHistoryScreen from './src/screens/InvoiceHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PurchaseHistoryScreen from './src/screens/PurchaseHistoryScreen';

import { initDatabase } from './src/database/init';
import { getCurrentUser } from './src/database/authService';
import { authenticateWithBiometrics, canUseBiometricAuth } from './src/services/biometricAuth';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  NovaEntrada: undefined;
  Cartao: undefined;
  HistoricoFatura: undefined;
  HistoricoCompras: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [initialRouteName, setInitialRouteName] = useState<'Login' | 'Home'>('Login');

  useEffect(() => {
    async function bootstrap() {
      try {
        initDatabase();

        const user = await getCurrentUser();

        if (!user) {
          setInitialRouteName('Login');
          return;
        }

        const canUseBiometrics = await canUseBiometricAuth();

        if (!canUseBiometrics) {
          setInitialRouteName('Home');
          return;
        }

        const result = await authenticateWithBiometrics('Desbloquear ControleCartao');
        setInitialRouteName(result.success ? 'Home' : 'Login');
      } catch {
        setInitialRouteName('Login');
      } finally {
        setBooting(false);
      }
    }

    bootstrap();
  }, []);

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F6F7FB'
        }}
      >
        <ActivityIndicator size="large" color="#141A2E" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        id="main"
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F6F7FB'
          },
          headerShadowVisible: false,
          headerTintColor: '#141A2E',
          headerTitleStyle: {
            fontWeight: '700'
          },
          contentStyle: {
            backgroundColor: '#F6F7FB'
          }
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Criar conta' }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Home' }}
        />
        <Stack.Screen
          name="NovaEntrada"
          component={NovaEntradaScreen}
          options={{ title: 'Nova entrada' }}
        />
        <Stack.Screen
          name="Cartao"
          component={CardScreen}
          options={{ title: 'Controle' }}
        />
        <Stack.Screen
          name="HistoricoFatura"
          component={InvoiceHistoryScreen}
          options={{ title: 'Relatorios' }}
        />
        <Stack.Screen
          name="HistoricoCompras"
          component={PurchaseHistoryScreen}
          options={{ title: 'Historico' }}
        />
        <Stack.Screen
          name="Perfil"
          component={ProfileScreen}
          options={{ title: 'Perfil' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
