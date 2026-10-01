import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AppBottomNav from '../components/AppBottomNav';
import { getCurrentUser } from '../database/authService';
import { getCards } from '../database/cardService';
import { getInstallmentsByMonth, getRecentPurchases } from '../database/purchaseService';

type HomeScreenProps = {
  navigation: any;
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Bom dia';
  }

  if (hour < 18) {
    return 'Boa tarde';
  }

  return 'Boa noite';
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [userEmail, setUserEmail] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthPurchases = useMemo(
    () =>
      purchases.filter((item) => {
        const purchaseDate = String(item.purchase_date || '');
        return (
          Number(purchaseDate.slice(5, 7)) === currentMonth &&
          Number(purchaseDate.slice(0, 4)) === currentYear
        );
      }),
    [purchases, currentMonth, currentYear]
  );

  const monthTotal = monthPurchases.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const invoiceTotal = installments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidTotal = installments
    .filter((item) => Number(item.is_paid) === 1)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingTotal = Math.max(invoiceTotal - paidTotal, 0);
  const plannedLimit = cards.reduce((sum, item) => sum + Number(item.limit_amount || 0), 0);
  const availableLimit = plannedLimit - monthTotal;
  const limitUsage = plannedLimit > 0 ? Math.min((monthTotal / plannedLimit) * 100, 100) : 0;
  const firstName = userEmail ? userEmail.split('@')[0] : 'tudo certo';

  async function loadData() {
    const [user, cardList, purchaseList, installmentList] = await Promise.all([
      getCurrentUser(),
      getCards(),
      getRecentPurchases(),
      getInstallmentsByMonth(now.getMonth() + 1, now.getFullYear())
    ]);

    setUserEmail(user?.email ?? '');
    setCards(cardList as any[]);
    setPurchases(purchaseList as any[]);
    setInstallments(installmentList as any[]);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
          <Text style={styles.title}>Home</Text>
        </View>

        <View style={styles.balancePanel}>
          <Text style={styles.label}>Total da fatura</Text>
          <Text style={styles.amount}>{formatMoney(invoiceTotal || monthTotal)}</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${limitUsage}%` }]} />
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{Math.round(limitUsage)}% do limite</Text>
            <Text style={styles.metaText}>{formatMoney(availableLimit)} livre</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate(cards.length === 0 ? 'Cartao' : 'NovaEntrada')}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>
            {cards.length === 0 ? 'Cadastrar cartao' : 'Cadastrar compra'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatMoney(pendingTotal)}</Text>
            <Text style={styles.statLabel}>A pagar</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthPurchases.length}</Text>
            <Text style={styles.statLabel}>Compras no mes</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ultimas compras</Text>
          <View style={styles.sectionLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('HistoricoFatura')} activeOpacity={0.8}>
              <Text style={styles.linkText}>Ver mes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('HistoricoCompras')} activeOpacity={0.8}>
              <Text style={styles.linkText}>Historico</Text>
            </TouchableOpacity>
          </View>
        </View>

        {purchases.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nada cadastrado ainda</Text>
            <Text style={styles.emptyText}>Comece por uma compra ou pelo seu primeiro cartao.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {purchases.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.purchaseRow}>
                <View style={styles.purchaseInfo}>
                  <Text style={styles.purchaseTitle} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <Text style={styles.purchaseMeta} numberOfLines={1}>
                    {item.payment_method === 'pix' ? 'Pix' : item.card_name || 'Sem cartao'}
                  </Text>
                </View>
                <Text style={styles.purchaseAmount}>{formatMoney(Number(item.total_amount || 0))}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AppBottomNav navigation={navigation} current="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8FA'
  },
  scroll: {
    flex: 1
  },
  content: {
    padding: 24,
    paddingBottom: 116,
    gap: 20
  },
  header: {
    gap: 4
  },
  greeting: {
    color: '#6B7280',
    fontSize: 14
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800'
  },
  balancePanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 20,
    gap: 12
  },
  label: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700'
  },
  amount: {
    color: '#111827',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#111827'
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  metaText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 16
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  statsRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center'
  },
  statItem: {
    flex: 1,
    gap: 4
  },
  statValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700'
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800'
  },
  linkText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800'
  },
  sectionLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18,
    gap: 6
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800'
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    overflow: 'hidden'
  },
  purchaseRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F4'
  },
  purchaseInfo: {
    flex: 1
  },
  purchaseTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3
  },
  purchaseMeta: {
    color: '#6B7280',
    fontSize: 13
  },
  purchaseAmount: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  }
});
