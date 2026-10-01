import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

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

export default function PurchaseHistoryScreen() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState('Todos');
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  function handleRemovePurchase(purchaseId: number) {
    Alert.alert('Remover compra', 'Deseja remover esta compra do historico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await deletePurchase(purchaseId);
          if (expandedId === purchaseId) {
            setExpandedId(null);
          }
          await loadData();
        }
      }
    ]);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Historico real</Text>
        <Text style={styles.title}>Busca, filtros e detalhes das compras</Text>
        <Text style={styles.subtitle}>
          Aqui voce encontra tudo com mais calma, sem pesar a home.
        </Text>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.label}>Pesquisar</Text>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Ex: mercado, nubank, 2026-04"
        />

        <Text style={styles.label}>Filtrar por cartao</Text>
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

        <Text style={styles.helperText}>{filteredPurchases.length} compra(s) encontrada(s)</Text>
      </View>

      {filteredPurchases.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhuma compra encontrada</Text>
          <Text style={styles.emptyDescription}>
            Tente buscar outro termo ou trocar o filtro do cartao.
          </Text>
        </View>
      ) : (
        filteredPurchases.map((item) => {
          const expanded = expandedId === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.purchaseCard}
              activeOpacity={0.95}
              onPress={() => setExpandedId((current) => (current === item.id ? null : item.id))}
            >
              <View style={styles.purchaseTop}>
                <View style={styles.purchaseLeft}>
                  <View style={styles.purchaseDot} />
                  <View>
                    <Text style={styles.purchaseTitle}>{item.description}</Text>
                    <Text style={styles.purchaseMeta}>
                      {item.payment_method === 'pix' ? 'Pix' : item.card_name || 'Sem cartao'} . {item.category || 'Outros'} . {item.purchase_date}
                    </Text>
                    {Number(item.is_recurring) === 1 ? (
                      <Text style={styles.recurringMeta}>
                        Recorrente{item.recurring_label ? ` . ${item.recurring_label}` : ''}
                      </Text>
                    ) : null}
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
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Forma</Text>
                    <Text style={styles.detailValue}>
                      {item.payment_method === 'pix' ? 'Pix' : item.card_name || 'Sem cartao'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Categoria</Text>
                    <Text style={styles.detailValue}>{item.category || 'Outros'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Data</Text>
                    <Text style={styles.detailValue}>{item.purchase_date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Parcelas</Text>
                    <Text style={styles.detailValue}>
                      {item.payment_method === 'pix' ? 'A vista' : `${item.installments}x`}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Recorrente</Text>
                    <Text style={styles.detailValue}>
                      {Number(item.is_recurring) === 1 ? item.recurring_label || 'Sim' : 'Nao'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemovePurchase(item.id)}
                    style={styles.removeButton}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.removeButtonText}>Remover compra</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.expandHint}>Toque para ver detalhes</Text>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB'
  },
  content: {
    padding: 20,
    paddingBottom: 32
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 18
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
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 18
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
    color: '#141A2E',
    marginBottom: 14
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
    paddingHorizontal: 14,
    paddingVertical: 10
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
  helperText: {
    marginTop: 14,
    color: '#7A839A',
    fontSize: 13
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
  purchaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 12
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
  purchaseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#89A6FF'
  },
  purchaseTitle: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  purchaseMeta: {
    color: '#778095',
    fontSize: 13
  },
  recurringMeta: {
    color: '#2F5BFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  purchaseAmount: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '800'
  },
  expandHint: {
    color: '#2F5BFF',
    fontWeight: '700',
    marginTop: 14,
    fontSize: 13
  },
  detailBox: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F7',
    paddingTop: 14,
    gap: 10
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    color: '#7A839A',
    fontSize: 13
  },
  detailValue: {
    color: '#141A2E',
    fontWeight: '700'
  },
  removeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6
  },
  removeButtonText: {
    color: '#D9544D',
    fontWeight: '700'
  }
});
