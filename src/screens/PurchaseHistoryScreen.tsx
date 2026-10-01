import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AppBottomNav from '../components/AppBottomNav';
import ConfirmSwal from '../components/ConfirmSwal';
import { getCards } from '../database/cardService';
import { deletePurchase, getRecentPurchases } from '../database/purchaseService';

type PurchaseItem = {
  id: number;
  description: string;
  total_amount: number;
  installments: number;
  category?: string;
  payment_method?: 'card' | 'pix';
  is_recurring?: number;
  recurring_label?: string | null;
  purchase_date: string;
  card_name?: string;
};

type CardItem = {
  id: number;
  name: string;
};

export default function PurchaseHistoryScreen({ navigation }: any) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState('Todos');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PurchaseItem | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadData() {
    const [cardList, purchaseList] = await Promise.all([getCards(), getRecentPurchases()]);
    setCards(cardList as CardItem[]);
    setPurchases(purchaseList as PurchaseItem[]);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function confirmRemovePurchase() {
    if (!pendingDelete?.id) {
      return;
    }

    try {
      await deletePurchase(pendingDelete.id);
      if (expandedId === pendingDelete.id) {
        setExpandedId(null);
      }
      setPendingDelete(null);
      setNotice({ type: 'success', text: 'Compra removida com sucesso.' });
      await loadData();
    } catch (error) {
      console.log(error);
      setNotice({ type: 'error', text: 'Nao foi possivel remover a compra.' });
    }
  }

  const filteredPurchases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return purchases.filter((item) => {
      const paymentLabel = item.payment_method === 'pix' ? 'Pix' : item.card_name || 'Sem cartao';
      const matchesCard = selectedCard === 'Todos' || paymentLabel === selectedCard;
      const haystack = `${item.description} ${item.category || 'Outros'} ${paymentLabel} ${item.purchase_date}`.toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesCard && matchesSearch;
    });
  }, [purchases, search, selectedCard]);

  const hasPix = purchases.some((item) => item.payment_method === 'pix');
  const filterOptions = ['Todos', ...cards.map((card) => card.name), ...(hasPix ? ['Pix'] : [])];

  return (
    <View style={styles.root}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {notice ? (
          <View style={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}>
            <Text style={notice.type === 'success' ? styles.noticeSuccessText : styles.noticeErrorText}>
              {notice.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Compras</Text>
          <Text style={styles.title}>Historico</Text>
          <Text style={styles.subtitle}>{filteredPurchases.length} de {purchases.length} compra(s)</Text>
        </View>

        <View style={styles.filterCard}>
          <TextInput
            style={styles.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar compra, cartao ou data"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {filterOptions.map((option) => {
              const active = option === selectedCard;

              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedCard(option)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filteredPurchases.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma compra encontrada</Text>
            <Text style={styles.emptyDescription}>
              Tente buscar outro termo ou trocar o filtro do cartao.
            </Text>
          </View>
        ) : (
          <View style={styles.purchaseList}>
            {filteredPurchases.map((item, index) => {
              const expanded = expandedId === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.purchaseRow, index === filteredPurchases.length - 1 && styles.purchaseRowLast]}
                  activeOpacity={0.95}
                  onPress={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                >
                  <View style={styles.purchaseTop}>
                    <View style={styles.purchaseLeft}>
                      <View style={styles.purchaseDot} />
                      <View style={styles.purchaseInfo}>
                        <Text style={styles.purchaseTitle} numberOfLines={1}>{item.description}</Text>
                        <Text style={styles.purchaseMeta} numberOfLines={1}>
                          {item.payment_method === 'pix' ? 'Pix' : item.card_name || 'Sem cartao'} . {item.category || 'Outros'} . {item.purchase_date}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.purchaseAmount}>
                      {Number(item.total_amount).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </Text>
                  </View>

                  {expanded ? (
                    <View style={styles.detailBox}>
                      <View style={styles.detailGrid}>
                        <View style={styles.detailPill}>
                          <Text style={styles.detailLabel}>Parcelas</Text>
                          <Text style={styles.detailValue}>
                            {item.payment_method === 'pix' ? 'A vista' : `${item.installments}x`}
                          </Text>
                        </View>
                        <View style={styles.detailPill}>
                          <Text style={styles.detailLabel}>Recorrente</Text>
                          <Text style={styles.detailValue}>
                            {Number(item.is_recurring) === 1 ? item.recurring_label || 'Sim' : 'Nao'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => setPendingDelete(item)}
                        style={styles.removeButton}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.removeButtonText}>Remover compra</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <ConfirmSwal
          visible={Boolean(pendingDelete)}
          title="Remover esta compra?"
          message={
            pendingDelete
              ? `${pendingDelete.description} - ${Number(pendingDelete.total_amount || 0).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}`
              : ''
          }
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemovePurchase}
        />
      </ScrollView>

      <AppBottomNav navigation={navigation} current="Historico" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F7FB'
  },
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB'
  },
  content: {
    padding: 20,
    paddingBottom: 116,
    gap: 14
  },
  noticeSuccess: {
    backgroundColor: '#E9F8EF',
    borderWidth: 1,
    borderColor: '#BCE9CE',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14
  },
  noticeError: {
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFD4D0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14
  },
  noticeSuccessText: {
    color: '#1E7F52',
    fontWeight: '800'
  },
  noticeErrorText: {
    color: '#D9544D',
    fontWeight: '800'
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  eyebrow: {
    color: '#5E6A85',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8
  },
  title: {
    color: '#141A2E',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    marginBottom: 6
  },
  subtitle: {
    color: '#6F7990',
    fontSize: 15,
    lineHeight: 22
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#141A2E',
    marginBottom: 12
  },
  chipsRow: {
    gap: 10,
    paddingRight: 4
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  chipActive: {
    backgroundColor: '#141A2E',
    borderColor: '#141A2E'
  },
  chipText: {
    color: '#5E6A85',
    fontWeight: '700'
  },
  chipTextActive: {
    color: '#FFFFFF'
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  emptyTitle: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  emptyDescription: {
    color: '#6F7990',
    lineHeight: 20
  },
  purchaseList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EBF4',
    borderRadius: 20,
    overflow: 'hidden'
  },
  purchaseRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7'
  },
  purchaseRowLast: {
    borderBottomWidth: 0
  },
  purchaseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  purchaseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12
  },
  purchaseInfo: {
    flex: 1
  },
  purchaseDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#89A6FF'
  },
  purchaseTitle: {
    color: '#141A2E',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3
  },
  purchaseMeta: {
    color: '#778095',
    fontSize: 12
  },
  purchaseAmount: {
    color: '#141A2E',
    fontSize: 14,
    fontWeight: '900'
  },
  detailBox: {
    marginTop: 12,
    gap: 10
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 8
  },
  detailPill: {
    flex: 1,
    backgroundColor: '#F9FAFD',
    borderRadius: 14,
    padding: 10
  },
  detailLabel: {
    color: '#7A839A',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3
  },
  detailValue: {
    color: '#141A2E',
    fontWeight: '800',
    fontSize: 13
  },
  removeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  removeButtonText: {
    color: '#D9544D',
    fontWeight: '700'
  }
});
