import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import NovaEntradaScreen from './src/screens/NovaEntradaScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>

        {/* 🔐 Login */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* 📝 Cadastro */}
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* 🏠 App */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="NovaEntrada" component={NovaEntradaScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}