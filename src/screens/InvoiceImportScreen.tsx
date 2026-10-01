import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import AppBottomNav from '../components/AppBottomNav';
import { getCards } from '../database/cardService';
import { createPurchase } from '../database/purchaseService';
import { extractInvoiceItemsFromPdf, InvoiceImportItem } from '../services/invoicePdfImport';

type CardItem = {
  id: number;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  best_purchase_day: number;
};

const CATEGORY_OPTIONS = [
  'Mercado',
  'Farmacia',
  'Transporte',
  'Alimentacao',
  'Casa',
  'Saude',
  'Educacao',
  'Compras',
  'Assinaturas',
  'Outros'
];

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return formatMoney(Number(digits || '0') / 100);
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return Number(digits || '0') / 100;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthYear(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { month, year };
}

export default function InvoiceImportScreen({ navigation }: any) {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [invoiceMonth, setInvoiceMonth] = useState(currentMonthValue());
  const [items, setItems] = useState<InvoiceImportItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedItems = useMemo(() => items.filter((item) => item.selected), [items]);
  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [selectedItems]
  );

  async function loadCards() {
    const result = await getCards();
    const cardList = result as CardItem[];
    setCards(cardList);

    if (cardList.length > 0 && !selectedCardId) {
      setSelectedCardId(cardList[0].id);
    }
  }

  useEffect(() => {
    loadCards().catch((error) => {
      console.log(error);
      setNotice({ type: 'error', text: 'Nao consegui carregar seus cartoes.' });
    });
  }, []);

  function updateItem(id: string, patch: Partial<InvoiceImportItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function parsePdf(file: File) {
    if (Platform.OS !== 'web') {
      setNotice({ type: 'error', text: 'A importacao de PDF esta disponivel primeiro na versao web.' });
      return;
    }

    const { year } = monthYear(invoiceMonth);

    setFileName(file.name);
    setItems([]);
    setIsReading(true);
    setNotice({ type: 'info', text: 'Lendo PDF e procurando lancamentos...' });

    try {
      const result = await extractInvoiceItemsFromPdf(file, year || new Date().getFullYear());
      setItems(result.items);

      if (result.items.length === 0) {
        setNotice({ type: 'error', text: 'Nao encontrei lancamentos nesse PDF. Tente outra fatura ou revise o arquivo.' });
        return;
      }

      setNotice({
        type: 'success',
        text: `${result.items.length} lancamento(s) encontrados. Revise antes de importar.`
      });
    } catch (error) {
      console.log(error);
      setNotice({ type: 'error', text: 'Nao consegui ler esse PDF. Se ele for protegido, exporte uma copia simples.' });
    } finally {
      setIsReading(false);
    }
  }

  function choosePdf() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setNotice({ type: 'error', text: 'Importacao disponivel primeiro no navegador.' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        parsePdf(file);
      }
    };
    input.click();
  }

  async function importSelected() {
    if (!selectedCardId) {
      setNotice({ type: 'error', text: 'Escolha o cartao da fatura antes de importar.' });
      return;
    }

    if (selectedItems.length === 0) {
      setNotice({ type: 'error', text: 'Selecione pelo menos um lancamento para salvar.' });
      return;
    }

    setIsSaving(true);
    setNotice({ type: 'info', text: 'Salvando lancamentos no banco...' });

    try {
      for (const item of selectedItems) {
        await createPurchase({
          cardId: selectedCardId,
          paymentMethod: 'card',
          description: item.installmentLabel
            ? `${item.description} (${item.installmentLabel})`
            : item.description,
          category: item.category || 'Outros',
          totalAmount: Number(item.amount || 0),
          installments: 1,
          isRecurring: false,
          recurringLabel: null,
          purchaseDate: item.purchaseDate
        });
      }

      setItems([]);
      setFileName('');
      setNotice({
        type: 'success',
        text: `${selectedItems.length} lancamento(s) importados. O relatorio do mes ja foi atualizado.`
      });
    } catch (error) {
      console.log(error);
      setNotice({ type: 'error', text: 'Nao consegui salvar tudo. Confira sua conexao e tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>Importar fatura</Text>
          <Text style={styles.title}>PDF para custo do mes</Text>
          <Text style={styles.subtitle}>Importe, revise e confirme antes de salvar no banco.</Text>
        </View>

        {notice ? (
          <View
            style={[
              styles.notice,
              notice.type === 'success' && styles.noticeSuccess,
              notice.type === 'error' && styles.noticeError
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                notice.type === 'success' && styles.noticeSuccessText,
                notice.type === 'error' && styles.noticeErrorText
              ]}
            >
              {notice.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Configurar importacao</Text>

          <Text style={styles.label}>Cartao da fatura</Text>
          <View style={styles.cardPicker}>
            {cards.length === 0 ? (
              <Text style={styles.emptyText}>Cadastre um cartao antes de importar fatura.</Text>
            ) : (
              cards.map((card) => {
                const active = selectedCardId === card.id;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.cardChip, active && styles.cardChipActive]}
                    onPress={() => setSelectedCardId(card.id)}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.cardChipText, active && styles.cardChipTextActive]}>{card.name}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <Text style={styles.label}>Mes da fatura</Text>
          <TextInput
            style={styles.input}
            value={invoiceMonth}
            onChangeText={setInvoiceMonth}
            placeholder="2026-10"
            {...(Platform.OS === 'web' ? ({ type: 'month' } as any) : {})}
          />

          <TouchableOpacity
            style={[styles.primaryButton, isReading && styles.buttonDisabled]}
            onPress={choosePdf}
            disabled={isReading}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>{isReading ? 'Lendo PDF...' : 'Escolher PDF'}</Text>
          </TouchableOpacity>

          {fileName ? <Text style={styles.fileName}>{fileName}</Text> : null}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{selectedItems.length}</Text>
            <Text style={styles.summaryLabel}>Selecionados</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{formatMoney(selectedTotal)}</Text>
            <Text style={styles.summaryLabel}>Total do mes</Text>
          </View>
        </View>

        {items.length > 0 ? (
          <View style={styles.previewPanel}>
            <View style={styles.previewHeader}>
              <Text style={styles.sectionTitle}>Previa dos lancamentos</Text>
              <TouchableOpacity
                onPress={() => {
                  const shouldSelect = selectedItems.length !== items.length;
                  setItems((current) => current.map((item) => ({ ...item, selected: shouldSelect })));
                }}
              >
                <Text style={styles.linkText}>{selectedItems.length === items.length ? 'Limpar' : 'Selecionar todos'}</Text>
              </TouchableOpacity>
            </View>

            {items.map((item) => (
              <View key={item.id} style={[styles.itemRow, !item.selected && styles.itemRowMuted]}>
                <TouchableOpacity
                  style={[styles.checkbox, item.selected && styles.checkboxActive]}
                  onPress={() => updateItem(item.id, { selected: !item.selected })}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.checkboxText, item.selected && styles.checkboxTextActive]}>
                    {item.selected ? '✓' : ''}
                  </Text>
                </TouchableOpacity>

                <View style={styles.itemBody}>
                  <TextInput
                    style={styles.itemDescription}
                    value={item.description}
                    onChangeText={(text) => updateItem(item.id, { description: text })}
                  />

                  <View style={styles.itemMetaRow}>
                    <TextInput
                      style={styles.itemDate}
                      value={item.purchaseDate}
                      onChangeText={(text) => updateItem(item.id, { purchaseDate: text })}
                      {...(Platform.OS === 'web' ? ({ type: 'date' } as any) : {})}
                    />
                    <TextInput
                      style={styles.itemAmount}
                      value={formatMoney(item.amount)}
                      keyboardType="numeric"
                      onChangeText={(text) => updateItem(item.id, { amount: parseCurrencyInput(formatCurrencyInput(text)) })}
                    />
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                    {CATEGORY_OPTIONS.map((category) => {
                      const active = item.category === category;
                      return (
                        <TouchableOpacity
                          key={category}
                          style={[styles.categoryChip, active && styles.categoryChipActive]}
                          onPress={() => updateItem(item.id, { category })}
                          activeOpacity={0.9}
                        >
                          <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{category}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {item.installmentLabel ? (
                    <Text style={styles.installmentText}>Parcela detectada: {item.installmentLabel}</Text>
                  ) : null}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={importSelected}
              disabled={isSaving}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>{isSaving ? 'Importando...' : 'Confirmar importacao'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
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
    paddingBottom: 120,
    gap: 16
  },
  header: {
    gap: 6
  },
  kicker: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900'
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 21
  },
  notice: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#CAD6FF',
    borderRadius: 16,
    padding: 14
  },
  noticeSuccess: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0'
  },
  noticeError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  noticeText: {
    color: '#2F5BFF',
    fontWeight: '800',
    lineHeight: 20
  },
  noticeSuccessText: {
    color: '#166534'
  },
  noticeErrorText: {
    color: '#B91C1C'
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900'
  },
  label: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 14
  },
  cardPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  cardChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10
  },
  cardChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827'
  },
  cardChipText: {
    color: '#4B5563',
    fontWeight: '800'
  },
  cardChipTextActive: {
    color: '#FFFFFF'
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#111827',
    fontSize: 15,
    marginBottom: 14
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.65
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900'
  },
  fileName: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 16
  },
  summaryValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6
  },
  previewPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 14,
    gap: 12
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  linkText: {
    color: '#2F5BFF',
    fontSize: 13,
    fontWeight: '900'
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F4',
    paddingTop: 14
  },
  itemRowMuted: {
    opacity: 0.58
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  checkboxActive: {
    backgroundColor: '#111827',
    borderColor: '#111827'
  },
  checkboxText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '900'
  },
  checkboxTextActive: {
    color: '#FFFFFF'
  },
  itemBody: {
    flex: 1,
    gap: 8
  },
  itemDescription: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: 8
  },
  itemDate: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  itemAmount: {
    width: 126,
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    textAlign: 'right'
  },
  categoryRow: {
    gap: 8,
    paddingRight: 8
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  categoryChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827'
  },
  categoryChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800'
  },
  categoryChipTextActive: {
    color: '#FFFFFF'
  },
  installmentText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700'
  }
});
