import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import AppBottomNav from '../components/AppBottomNav';
import { clearSession, getCurrentUser, updateProfilePhoto } from '../database/authService';
import { getCards } from '../database/cardService';
import { getRecentPurchases } from '../database/purchaseService';

export default function ProfileScreen({ navigation }: any) {
  const [userId, setUserId] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [cardCount, setCardCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getCurrentUser(), getCards(), getRecentPurchases()]).then(([user, cards, purchases]) => {
        setUserId(user?.id ?? null);
        setUserEmail(user?.email ?? '');
        setProfilePhoto(user?.profile_photo ?? '');
        setCardCount((cards as any[])?.length ?? 0);
        setPurchaseCount((purchases as any[])?.length ?? 0);
      });
    }, [])
  );

  async function handleLogout() {
    await clearSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (result.canceled || !result.assets?.[0]?.uri || !userId) {
      return;
    }

    const selectedUri = result.assets[0].uri;
    await updateProfilePhoto(userId, selectedUri);
    setProfilePhoto(selectedUri);
  }

  async function handleRemovePhoto() {
    if (!userId) {
      return;
    }

    await updateProfilePhoto(userId, '');
    setProfilePhoto('');
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
        <Text style={styles.eyebrow}>Perfil</Text>
        <Text style={styles.title}>Sua conta e seus atalhos</Text>
        <Text style={styles.subtitle}>Aqui voce acompanha o perfil ativo e os dados principais do app.</Text>
      </View>

        <View style={styles.avatarCard}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{userEmail ? userEmail.charAt(0).toUpperCase() : 'C'}</Text>
            </View>
          )}

          <View style={styles.avatarInfo}>
            <Text style={styles.avatarTitle}>Foto do perfil</Text>
            <Text style={styles.avatarSubtitle}>Deixe sua conta com um visual mais pessoal.</Text>
          </View>
        </View>

        <View style={styles.avatarButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handlePickPhoto}>
            <Text style={styles.primaryButtonText}>Escolher foto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleRemovePhoto}>
            <Text style={styles.secondaryButtonText}>Remover foto</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Conta conectada</Text>
          <Text style={styles.value}>{userEmail || 'Sem sessao ativa'}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <Text style={styles.gridNumber}>{cardCount}</Text>
            <Text style={styles.gridLabel}>Cartoes</Text>
          </View>

          <View style={styles.gridCard}>
            <Text style={styles.gridNumber}>{purchaseCount}</Text>
            <Text style={styles.gridLabel}>Compras</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.darkButton} onPress={() => navigation.navigate('Cartao')}>
          <Text style={styles.darkButtonText}>Gerenciar cartoes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppBottomNav navigation={navigation} current="Perfil" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 20
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 18
  },
  avatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 999
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: '#DDE7FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    color: '#1D4ED8',
    fontSize: 28,
    fontWeight: '800'
  },
  avatarInfo: {
    flex: 1
  },
  avatarTitle: {
    color: '#141A2E',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  avatarSubtitle: {
    color: '#6F7990',
    lineHeight: 20
  },
  avatarButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14
  },
  eyebrow: {
    color: '#5E6A85',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10
  },
  title: {
    color: '#141A2E',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 10
  },
  subtitle: {
    color: '#6F7990',
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 14
  },
  label: {
    color: '#7A839A',
    fontSize: 13,
    marginBottom: 6
  },
  value: {
    color: '#141A2E',
    fontSize: 20,
    fontWeight: '800'
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  gridNumber: {
    color: '#141A2E',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6
  },
  gridLabel: {
    color: '#6F7990'
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  primaryButtonText: {
    color: '#2F5BFF',
    fontWeight: '700'
  },
  darkButton: {
    backgroundColor: '#141A2E',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  darkButtonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  secondaryButtonText: {
    color: '#6F7990',
    fontWeight: '700'
  },
  logoutButton: {
    backgroundColor: '#FFF5F4',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD8D4'
  },
  logoutButtonText: {
    color: '#D9544D',
    fontWeight: '700'
  }
});
