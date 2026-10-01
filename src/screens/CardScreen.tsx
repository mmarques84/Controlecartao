import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { createCard, deleteCard, getCards } from '../database/cardService';

type CardItem = {
  id: number;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  best_purchase_day: number;
};

const CARD_BRANDS = ['Itau', 'Nubank', 'Caixa', 'Inter', 'Bradesco', 'Santander'];

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  const numberValue = Number(digits || '0') / 100;

  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return Number(digits || '0') / 100;
}

function getCardTheme(cardName: string) {
  const normalized = cardName.trim().toLowerCase();

  if (normalized.includes('itau')) {
    return {
      backgroundColor: '#FFF1E8',
      borderColor: '#F7B58A',
      accentColor: '#EC7000',
      accentSoft: '#FFE2CF'
    };
  }

  if (normalized.includes('nubank') || normalized.includes('nu ') || normalized === 'nu') {
    return {
      backgroundColor: '#F5EEFF',
      borderColor: '#D4B8FF',
      accentColor: '#8A05BE',
      accentSoft: '#ECDDFF'
    };
  }

  return {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EBF4',
    accentColor: '#2F5BFF',
    accentSoft: '#EEF2FF'
  };
}

export default function CardScreen() {
  const [selectedBrand, setSelectedBrand] = useState('Itau');
  const [cardVariant, setCardVariant] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [bestPurchaseDay, setBestPurchaseDay] = useState('');
  const [cards, setCards] = useState<CardItem[]>([]);

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
    const finalCardName = [selectedBrand, cardVariant.trim()].filter(Boolean).join(' ');
    const parsedLimit = parseCurrencyInput(limitAmount);
    const parsedClosingDay = Number(closingDay);
    const parsedDueDay = Number(dueDay);
    const parsedBestPurchaseDay = Number(bestPurchaseDay);

    if (!finalCardName || !limitAmount || !closingDay || !dueDay || !bestPurchaseDay) {
      Alert.alert('Campos obrigatorios', 'Preencha todos os dados do cartao.');
      return;
    }

    if (
      Number.isNaN(parsedLimit) ||
      Number.isNaN(parsedClosingDay) ||
      Number.isNaN(parsedDueDay) ||
      Number.isNaN(parsedBestPurchaseDay)
    ) {
      Alert.alert('Dados invalidos', 'Confira os numeros informados.');
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
      Alert.alert('Dia invalido', 'Use dias entre 1 e 31.');
      return;
    }

    try {
      await createCard({
        name: finalCardName,
        limitAmount: parsedLimit,
        closingDay: parsedClosingDay,
        dueDay: parsedDueDay,
        bestPurchaseDay: parsedBestPurchaseDay
      });

      setSelectedBrand('Itau');
      setCardVariant('');
      setLimitAmount('');
      setClosingDay('');
      setDueDay('');
      setBestPurchaseDay('');

      await loadCards();
      Alert.alert('Cartao salvo', 'Seu cartao foi cadastrado com sucesso.');
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Nao foi possivel salvar o cartao.');
    }
  }

  function handleRemove(cardId: number) {
    Alert.alert('Remover cartao', 'Deseja remover esse cartao e as compras ligadas a ele?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(cardId);
          await loadCards();
        }
      }
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Cadastro do cartao</Text>
        <Text style={styles.title}>Guarde limite e a melhor data de compra</Text>
        <Text style={styles.subtitle}>
          Cadastre seu cartao para acompanhar melhor quando comprar e quanto ainda pode usar.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Novo cartao</Text>

        <Text style={styles.label}>Banco do cartao</Text>
        <View style={styles.brandRow}>
          {CARD_BRANDS.map((brand) => {
            const active = selectedBrand === brand;
            const theme = getCardTheme(brand);

            return (
              <TouchableOpacity
                key={brand}
                style={[
                  styles.brandChip,
                  active && {
                    backgroundColor: theme.accentColor,
                    borderColor: theme.accentColor
                  }
                ]}
                onPress={() => setSelectedBrand(brand)}
                activeOpacity={0.9}
              >
                <Text style={[styles.brandChipText, active && styles.brandChipTextActive]}>{brand}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Nome complementar</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Azul, Platinum, Black"
          value={cardVariant}
          onChangeText={setCardVariant}
        />

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Nome que sera salvo</Text>
          <Text style={styles.previewValue}>
            {[selectedBrand, cardVariant.trim()].filter(Boolean).join(' ')}
          </Text>
        </View>

        <Text style={styles.label}>Limite</Text>
        <TextInput
          style={styles.input}
          placeholder="R$ 0,00"
          keyboardType="numeric"
          value={limitAmount}
          onChangeText={(text) => setLimitAmount(formatCurrencyInput(text))}
        />

        <View style={styles.doubleRow}>
          <View style={styles.doubleField}>
            <Text style={styles.label}>Fechamento</Text>
            <TextInput
              style={styles.input}
              placeholder="Dia"
              keyboardType="numeric"
              value={closingDay}
              onChangeText={setClosingDay}
            />
          </View>

          <View style={styles.doubleField}>
            <Text style={styles.label}>Vencimento</Text>
            <TextInput
              style={styles.input}
              placeholder="Dia"
              keyboardType="numeric"
              value={dueDay}
              onChangeText={setDueDay}
            />
          </View>
        </View>

        <Text style={styles.label}>Melhor data de compra</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 16"
          keyboardType="numeric"
          value={bestPurchaseDay}
          onChangeText={setBestPurchaseDay}
        />

        <TouchableOpacity style={styles.button} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.buttonText}>Salvar cartao</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Cartoes cadastrados</Text>
        <Text style={styles.helperText}>{cards.length} item(ns)</Text>
      </View>

      {cards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhum cartao cadastrado ainda</Text>
          <Text style={styles.emptyDescription}>
            Assim que voce salvar um cartao, ele aparece aqui com limite e datas principais.
          </Text>
        </View>
      ) : (
        cards.map((card) => {
          const theme = getCardTheme(card.name);

          return (
            <View
              key={card.id}
              style={[
                styles.cardItem,
                {
                  backgroundColor: theme.backgroundColor,
                  borderColor: theme.borderColor
                }
              ]}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={[styles.cardLimit, { color: theme.accentColor }]}>
                  {Number(card.limit_amount).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </Text>
              </View>

              <View style={styles.tagsRow}>
                <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                  <Text style={styles.tagText}>Fecha dia {card.closing_day}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                  <Text style={styles.tagText}>Vence dia {card.due_day}</Text>
                </View>
                <View style={styles.tagHighlight}>
                  <Text style={styles.tagHighlightText}>Melhor dia {card.best_purchase_day}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => handleRemove(card.id)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Remover cartao</Text>
              </TouchableOpacity>
            </View>
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 18
  },
  sectionTitle: {
    color: '#141A2E',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14
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
    fontSize: 15,
    color: '#141A2E',
    marginBottom: 14
  },
  brandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14
  },
  brandChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  brandChipText: {
    color: '#4F5A73',
    fontWeight: '700'
  },
  brandChipTextActive: {
    color: '#FFFFFF'
  },
  previewCard: {
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14
  },
  previewLabel: {
    color: '#7B8499',
    fontSize: 12,
    marginBottom: 6
  },
  previewValue: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '800'
  },
  doubleRow: {
    flexDirection: 'row',
    gap: 12
  },
  doubleField: {
    flex: 1
  },
  button: {
    backgroundColor: '#141A2E',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  helperText: {
    color: '#7A839A',
    fontSize: 13
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  emptyTitle: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8
  },
  emptyDescription: {
    color: '#707A90',
    lineHeight: 20
  },
  cardItem: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    marginBottom: 12
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  cardName: {
    color: '#141A2E',
    fontSize: 18,
    fontWeight: '800'
  },
  cardLimit: {
    fontSize: 16,
    fontWeight: '800'
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tagText: {
    color: '#576179',
    fontSize: 12,
    fontWeight: '600'
  },
  tagHighlight: {
    backgroundColor: '#E9F8EF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tagHighlightText: {
    color: '#1E8E5A',
    fontSize: 12,
    fontWeight: '700'
  },
  removeButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: '#FFF1F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  removeButtonText: {
    color: '#D9544D',
    fontWeight: '700'
  }
});
