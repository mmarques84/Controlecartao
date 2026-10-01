import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import AppBottomNav from '../components/AppBottomNav';
import ConfirmSwal from '../components/ConfirmSwal';
import { createCard, deleteCard, getCards, updateCard } from '../database/cardService';

type CardItem = {
  id: number;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  best_purchase_day: number;
};

const CARD_BRANDS = ['Itau', 'Nubank', 'Caixa', 'Inter', 'Bradesco', 'Santander'];

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  const numberValue = Number(digits || '0') / 100;

  return formatMoney(numberValue);
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return Number(digits || '0') / 100;
}

export default function CardScreen({ navigation }: any) {
  const [selectedBrand, setSelectedBrand] = useState('Itau');
  const [cardVariant, setCardVariant] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [bestPurchaseDay, setBestPurchaseDay] = useState('');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CardItem | null>(null);
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);

  const totalLimit = useMemo(
    () => cards.reduce((sum, card) => sum + Number(card.limit_amount || 0), 0),
    [cards]
  );

  const nextDueCard = useMemo(() => {
    if (cards.length === 0) {
      return null;
    }

    const today = new Date().getDate();
    return [...cards].sort((a, b) => {
      const daysA = a.due_day >= today ? a.due_day - today : a.due_day + 31 - today;
      const daysB = b.due_day >= today ? b.due_day - today : b.due_day + 31 - today;
      return daysA - daysB;
    })[0];
  }, [cards]);

  async function loadCards() {
    try {
      const result = await getCards();
      setCards(result as CardItem[]);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadCards();
  }, []);

  async function handleSave() {
    const finalCardName = editingCard
      ? cardVariant.trim()
      : [selectedBrand, cardVariant.trim()].filter(Boolean).join(' ');
    const parsedLimit = parseCurrencyInput(limitAmount);
    const parsedClosingDay = Number(closingDay);
    const parsedDueDay = Number(dueDay);
    const parsedBestPurchaseDay = Number(bestPurchaseDay);

    if (!finalCardName || !limitAmount || !closingDay || !dueDay || !bestPurchaseDay) {
      setNotice({ type: 'error', text: 'Preencha todos os dados do cartao antes de salvar.' });
      return;
    }

    if (
      Number.isNaN(parsedLimit) ||
      Number.isNaN(parsedClosingDay) ||
      Number.isNaN(parsedDueDay) ||
      Number.isNaN(parsedBestPurchaseDay)
    ) {
      setNotice({ type: 'error', text: 'Confira os numeros informados no limite e nos dias.' });
      return;
    }

    if (
      parsedClosingDay < 1 ||
      parsedClosingDay > 31 ||
      parsedDueDay < 1 ||
      parsedDueDay > 31 ||
      parsedBestPurchaseDay < 1 ||
      parsedBestPurchaseDay > 31
    ) {
      setNotice({ type: 'error', text: 'Use dias entre 1 e 31 para fechamento, vencimento e melhor compra.' });
      return;
    }

    try {
      if (editingCard) {
        await updateCard({
          cardId: editingCard.id,
          name: finalCardName,
          limitAmount: parsedLimit,
          closingDay: parsedClosingDay,
          dueDay: parsedDueDay,
          bestPurchaseDay: parsedBestPurchaseDay
        });
      } else {
        await createCard({
          name: finalCardName,
          limitAmount: parsedLimit,
          closingDay: parsedClosingDay,
          dueDay: parsedDueDay,
          bestPurchaseDay: parsedBestPurchaseDay
        });
      }

      setSelectedBrand('Itau');
      setCardVariant('');
      setLimitAmount('');
      setClosingDay('');
      setDueDay('');
      setBestPurchaseDay('');
      setEditingCard(null);

      await loadCards();
      setNotice({ type: 'success', text: `${finalCardName} foi ${editingCard ? 'atualizado' : 'cadastrado'}.` });
    } catch (error) {
      console.log(error);
      setNotice({ type: 'error', text: 'Nao foi possivel salvar o cartao.' });
    }
  }

  function startEditing(card: CardItem) {
    setEditingCard(card);
    setCardVariant(card.name);
    setLimitAmount(formatCurrencyInput(String(Math.round(Number(card.limit_amount || 0) * 100))));
    setClosingDay(String(card.closing_day));
    setDueDay(String(card.due_day));
    setBestPurchaseDay(String(card.best_purchase_day));
    setNotice(null);
  }

  function cancelEditing() {
    setEditingCard(null);
    setSelectedBrand('Itau');
    setCardVariant('');
    setLimitAmount('');
    setClosingDay('');
    setDueDay('');
    setBestPurchaseDay('');
  }

  async function confirmRemove() {
    if (!pendingDelete?.id) {
      return;
    }

    try {
      await deleteCard(pendingDelete.id);
      setNotice({ type: 'success', text: `${pendingDelete.name} foi removido.` });
      setPendingDelete(null);
      await loadCards();
    } catch (error) {
      console.log(error);
      setNotice({ type: 'error', text: 'Nao foi possivel remover o cartao.' });
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>Cartoes</Text>
          <Text style={styles.title}>Cartoes e limites</Text>
        </View>

        {notice ? (
          <View style={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}>
            <Text style={notice.type === 'success' ? styles.noticeSuccessText : styles.noticeErrorText}>
              {notice.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryPanel}>
          <Text style={styles.summaryLabel}>Limite cadastrado</Text>
          <Text style={styles.summaryValue}>{formatMoney(totalLimit)}</Text>

          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.miniValue}>{cards.length}</Text>
              <Text style={styles.miniLabel}>Cartoes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.miniBlock}>
              <Text style={styles.miniValue}>{nextDueCard ? `Dia ${nextDueCard.due_day}` : '-'}</Text>
              <Text style={styles.miniLabel}>Proximo vencimento</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.importButton}
          onPress={() => navigation.navigate('ImportarFatura')}
          activeOpacity={0.9}
        >
          <View style={styles.importTextBlock}>
            <Text style={styles.importTitle}>Importar fatura PDF</Text>
            <Text style={styles.importDescription}>Leia a fatura, revise os lancamentos e salve no relatorio.</Text>
          </View>
          <Text style={styles.importAction}>Abrir</Text>
        </TouchableOpacity>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.sectionTitle}>{editingCard ? 'Editar cartao' : 'Novo cartao'}</Text>
            {editingCard ? (
              <TouchableOpacity onPress={cancelEditing} activeOpacity={0.85}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {editingCard ? null : (
            <>
              <Text style={styles.label}>Banco</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRow}>
                {CARD_BRANDS.map((brand) => {
                  const active = selectedBrand === brand;

                  return (
                    <TouchableOpacity
                      key={brand}
                      style={[styles.brandChip, active && styles.brandChipActive]}
                      onPress={() => setSelectedBrand(brand)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.brandChipText, active && styles.brandChipTextActive]}>{brand}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>{editingCard ? 'Nome do cartao' : 'Complemento'}</Text>
          <TextInput
            style={styles.input}
            placeholder={editingCard ? 'Ex: Itau meu' : 'Ex: Platinum, Black'}
            value={cardVariant}
            onChangeText={setCardVariant}
          />

          <Text style={styles.label}>Limite</Text>
          <TextInput
            style={styles.input}
            placeholder="R$ 0,00"
            keyboardType="numeric"
            value={limitAmount}
            onChangeText={(text) => setLimitAmount(formatCurrencyInput(text))}
          />

          <View style={styles.tripleRow}>
            <View style={styles.compactField}>
              <Text style={styles.label}>Fecha</Text>
              <TextInput
                style={styles.input}
                placeholder="Dia"
                keyboardType="numeric"
                value={closingDay}
                onChangeText={setClosingDay}
              />
            </View>

            <View style={styles.compactField}>
              <Text style={styles.label}>Vence</Text>
              <TextInput
                style={styles.input}
                placeholder="Dia"
                keyboardType="numeric"
                value={dueDay}
                onChangeText={setDueDay}
              />
            </View>

            <View style={styles.compactField}>
              <Text style={styles.label}>Melhor</Text>
              <TextInput
                style={styles.input}
                placeholder="Dia"
                keyboardType="numeric"
                value={bestPurchaseDay}
                onChangeText={setBestPurchaseDay}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSave} activeOpacity={0.9}>
            <Text style={styles.buttonText}>{editingCard ? 'Salvar alteracoes' : 'Salvar cartao'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cadastrados</Text>
          <Text style={styles.helperText}>{cards.length} item(ns)</Text>
        </View>

        {cards.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum cartao ainda</Text>
            <Text style={styles.emptyDescription}>Cadastre um cartao para liberar os calculos da Home e Relatorios.</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {cards.map((card) => (
              <View key={card.id} style={styles.cardItem}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
                    <Text style={styles.cardMeta}>
                      Fecha {card.closing_day} . Vence {card.due_day} . Melhor {card.best_purchase_day}
                    </Text>
                  </View>
                  <Text style={styles.cardLimit}>{formatMoney(Number(card.limit_amount || 0))}</Text>
                </View>

                <TouchableOpacity onPress={() => setPendingDelete(card)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Remover</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => startEditing(card)} style={styles.editButton}>
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <ConfirmSwal
          visible={Boolean(pendingDelete)}
          title="Remover cartao?"
          message={pendingDelete ? `Isso tambem remove compras ligadas ao ${pendingDelete.name}.` : ''}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      </ScrollView>

      <AppBottomNav navigation={navigation} current="Controle" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F8FA'
  },
  screen: {
    flex: 1,
    backgroundColor: '#F7F8FA'
  },
  content: {
    padding: 24,
    paddingBottom: 116,
    gap: 18
  },
  header: {
    gap: 4
  },
  kicker: {
    color: '#6B7280',
    fontSize: 14
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800'
  },
  noticeSuccess: {
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 14
  },
  noticeError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14
  },
  noticeSuccessText: {
    color: '#166534',
    fontWeight: '800'
  },
  noticeErrorText: {
    color: '#B91C1C',
    fontWeight: '800'
  },
  summaryPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 20,
    gap: 14
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800'
  },
  summaryValue: {
    color: '#111827',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  summaryDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 16,
    backgroundColor: '#E5E7EB'
  },
  miniBlock: {
    flex: 1
  },
  miniValue: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900'
  },
  miniLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3
  },
  importButton: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  importTextBlock: {
    flex: 1
  },
  importTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4
  },
  importDescription: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18
  },
  importAction: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900'
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18,
    gap: 2
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900'
  },
  cancelEditText: {
    color: '#2F5BFF',
    fontSize: 13,
    fontWeight: '900'
  },
  label: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#111827',
    fontSize: 15
  },
  brandRow: {
    gap: 8,
    paddingRight: 6
  },
  brandChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  brandChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827'
  },
  brandChipText: {
    color: '#4B5563',
    fontWeight: '800'
  },
  brandChipTextActive: {
    color: '#FFFFFF'
  },
  tripleRow: {
    flexDirection: 'row',
    gap: 10
  },
  compactField: {
    flex: 1
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  helperText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700'
  },
  emptyCard: {
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
  emptyDescription: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20
  },
  cardList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    overflow: 'hidden'
  },
  cardItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F4',
    gap: 12
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  cardInfo: {
    flex: 1
  },
  cardName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4
  },
  cardMeta: {
    color: '#6B7280',
    fontSize: 13
  },
  cardLimit: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  removeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  removeButtonText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800'
  },
  editButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  editButtonText: {
    color: '#2F5BFF',
    fontSize: 12,
    fontWeight: '800'
  }
});
