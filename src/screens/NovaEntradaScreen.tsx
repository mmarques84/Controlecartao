import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRef } from 'react';

import { getCards } from '../database/cardService';
import { createPurchase } from '../database/purchaseService';
import { PaymentMethod, transcribeTransaction } from '../services/transactionTranscription';

const RECURRING_OPTIONS = ['Vivo', 'Claro', 'Luz', 'Academia', 'Seguro'];

type CardItem = {
  id: number;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  best_purchase_day: number;
};

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
      accentColor: '#EC7000'
    };
  }

  if (normalized.includes('nubank') || normalized.includes('nu ') || normalized === 'nu') {
    return {
      backgroundColor: '#F5EEFF',
      borderColor: '#D4B8FF',
      accentColor: '#8A05BE'
    };
  }

  return {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2F0',
    accentColor: '#2F5BFF'
  };
}

export default function NovaEntradaScreen({ navigation }: any) {
  const scrollRef = useRef<ScrollView>(null);
  const [transcricao, setTranscricao] = useState('');
  const [transcriptionNotice, setTranscriptionNotice] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState('1');
  const [recorrente, setRecorrente] = useState(false);
  const [recorrenteTipo, setRecorrenteTipo] = useState('');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  async function loadCards() {
    try {
      const result = await getCards();
      const cardList = result as CardItem[];
      setCards(cardList);

      if (cardList.length > 0 && !selectedCardId) {
        setSelectedCardId(cardList[0].id);
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  function formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function handleDateChange(_: any, date?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (!date) {
      return;
    }

    setSelectedDate(date);
    setPurchaseDate(formatDate(date));
  }

  function handleWebDateChange(value: string) {
    setPurchaseDate(value);

    const [year, month, day] = value.split('-').map(Number);
    if (year && month && day) {
      setSelectedDate(new Date(year, month - 1, day));
    }
  }

  function selectPaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);

    if (method === 'pix') {
      setParcelado(false);
      setParcelas('1');
      setShowCards(false);
    }
  }

  function aplicarTranscricao(text: string) {
    if (!text.trim()) {
      Alert.alert('Digite uma frase', 'Ex: comprei roupa de 200 em duas vezes no cartao itau.');
      return;
    }

    const result = transcribeTransaction(text, cards);

    selectPaymentMethod(result.paymentMethod);

    if (result.description) {
      setDescricao(result.description);
    }

    if (result.amount) {
      setValor(formatCurrencyInput(String(Math.round(result.amount * 100))));
    } else {
      setValor('');
    }

    if (result.purchaseDate) {
      const [year, month, day] = result.purchaseDate.split('-').map(Number);
      setSelectedDate(new Date(year, month - 1, day));
      setPurchaseDate(result.purchaseDate);
    }

    if (result.paymentMethod === 'card' && result.cardId) {
      setSelectedCardId(result.cardId);
    }

    const nextInstallments = result.installments ?? 1;
    setParcelas(String(nextInstallments));
    setParcelado(result.paymentMethod === 'card' && nextInstallments > 1);
    setTranscriptionNotice(result.notes.length > 0 ? result.notes.join(' ') : 'Campos preenchidos pela frase.');
  }

  function preencherComIa() {
    aplicarTranscricao(transcricao);
  }

  function falarCompra() {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Fala no celular',
        'No Expo Go, reconhecimento de fala nativo precisa de uma build propria. Por enquanto, teste falando pelo navegador.'
      );
      return;
    }

    const SpeechRecognition =
      (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Alert.alert('Microfone indisponivel', 'Seu navegador nao oferece reconhecimento de fala.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscriptionNotice('Ouvindo... fale a compra agora.');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      setTranscricao(transcript);
      setIsListening(false);

      if (transcript) {
        aplicarTranscricao(transcript);
      } else {
        setTranscriptionNotice('Nao consegui ouvir a frase.');
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscriptionNotice('Nao consegui acessar ou entender o microfone.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

  function salvar() {
    const parsedValue = parseCurrencyInput(valor);
    const parsedInstallments = parcelado ? Number(parcelas || '1') : 1;

    if (paymentMethod === 'card' && !selectedCardId) {
      Alert.alert('Escolha um cartao', 'Selecione o cartao da compra antes de salvar.');
      return;
    }

    if (!descricao.trim() || !purchaseDate || !parsedValue) {
      Alert.alert('Campos obrigatorios', 'Preencha data, descricao e valor.');
      return;
    }

    createPurchase({
      cardId: paymentMethod === 'card' ? selectedCardId : null,
      paymentMethod,
      description: descricao.trim(),
      totalAmount: parsedValue,
      installments: paymentMethod === 'pix' ? 1 : parsedInstallments,
      isRecurring: recorrente,
      recurringLabel: recorrente ? recorrenteTipo : null,
      purchaseDate
    }).then((result: any) => {
      if (result?.error) {
        Alert.alert('Erro', 'Nao foi possivel salvar a compra.');
        return;
      }

      setDescricao('');
      setValor('');
      setPurchaseDate('');
      setTranscricao('');
      setTranscriptionNotice('');
      setPaymentMethod('card');
      setParcelado(false);
      setParcelas('1');
      setRecorrente(false);
      setRecorrenteTipo('');
      Alert.alert('Compra salva', 'Sua compra foi cadastrada com sucesso.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home')
        }
      ]);
    });
  }

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Nova compra</Text>
          <Text style={styles.heroTitle}>Escolha o cartao e registre sua despesa</Text>
          <Text style={styles.heroSubtitle}>
            Agora a compra ja fica vinculada ao cartao certo, sem precisar digitar.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Transcricao IA</Text>
          <TextInput
            style={[styles.input, styles.aiInput]}
            value={transcricao}
            onChangeText={setTranscricao}
            multiline
            placeholder="Ex: comprei uma roupa de 200 em duas vezes no cartao itau"
            onFocus={() => {
              setShowDatePicker(false);
              setShowCards(false);
            }}
          />

          <View style={styles.aiActions}>
            <TouchableOpacity
              style={[styles.aiButton, styles.aiActionButton, isListening && styles.voiceButtonActive]}
              onPress={falarCompra}
              activeOpacity={0.9}
            >
              <Text style={[styles.aiButtonText, isListening && styles.voiceButtonTextActive]}>
                {isListening ? 'Ouvindo...' : 'Falar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.aiButton, styles.aiActionButton]}
              onPress={preencherComIa}
              activeOpacity={0.9}
            >
              <Text style={styles.aiButtonText}>Preencher com IA</Text>
            </TouchableOpacity>
          </View>

          {transcriptionNotice ? (
            <Text style={styles.aiNotice}>{transcriptionNotice}</Text>
          ) : null}

          <Text style={styles.label}>Forma de pagamento</Text>
          <View style={styles.paymentTabs}>
            <TouchableOpacity
              style={[styles.paymentTab, paymentMethod === 'card' && styles.paymentTabActive]}
              onPress={() => selectPaymentMethod('card')}
              activeOpacity={0.9}
            >
              <Text style={[styles.paymentTabText, paymentMethod === 'card' && styles.paymentTabTextActive]}>
                Cartao
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentTab, paymentMethod === 'pix' && styles.paymentTabActive]}
              onPress={() => selectPaymentMethod('pix')}
              activeOpacity={0.9}
            >
              <Text style={[styles.paymentTabText, paymentMethod === 'pix' && styles.paymentTabTextActive]}>
                Pix
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === 'card' ? (
            <>
              <Text style={styles.label}>Cartao</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowCards((current) => !current);
                }}
                activeOpacity={0.9}
              >
                <View>
                  <Text style={styles.selectorLabel}>Selecionado</Text>
                  <Text style={styles.selectorValue}>
                    {selectedCard ? selectedCard.name : 'Escolher cartao'}
                  </Text>
                </View>
                <Text style={styles.selectorAction}>{showCards ? 'Fechar' : 'Trocar'}</Text>
              </TouchableOpacity>

              {showCards && (
                <View style={styles.dropdown}>
                  {cards.length === 0 ? (
                    <Text style={styles.emptyText}>Cadastre um cartao primeiro.</Text>
                  ) : (
                    cards.map((card) => {
                      const theme = getCardTheme(card.name);

                      return (
                        <TouchableOpacity
                          key={card.id}
                          style={[
                            styles.cardOption,
                            {
                              backgroundColor: theme.backgroundColor,
                              borderColor: selectedCardId === card.id ? theme.accentColor : theme.borderColor
                            }
                          ]}
                          onPress={() => {
                            setSelectedCardId(card.id);
                            setShowCards(false);
                          }}
                          activeOpacity={0.9}
                        >
                          <View>
                            <Text style={styles.cardOptionTitle}>{card.name}</Text>
                            <Text style={styles.cardOptionMeta}>
                              Melhor dia {card.best_purchase_day} . Limite{' '}
                              {Number(card.limit_amount).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.cardOptionBadge, { color: theme.accentColor }]}>
                            {selectedCardId === card.id ? 'Selecionado' : 'Escolher'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.pixNotice}>Compra por Pix sera salva no historico e nao entra na fatura.</Text>
          )}

          <Text style={styles.label}>O que foi</Text>
          <TextInput
            style={styles.input}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: Mercado, farmacia, curso"
            onFocus={() => {
              setShowDatePicker(false);
              setShowCards(false);
            }}
          />

          <Text style={styles.label}>Data da compra</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setShowCards(false);
              setShowDatePicker((current) => !current);
            }}
            activeOpacity={0.9}
          >
            <View>
              <Text style={styles.selectorLabel}>Selecionada</Text>
              <Text style={styles.selectorValue}>{purchaseDate || 'Escolher no calendario'}</Text>
            </View>
            <Text style={styles.selectorAction}>{showDatePicker ? 'Fechar' : 'Abrir'}</Text>
          </TouchableOpacity>

          {showDatePicker ? (
            <View style={styles.datePickerCard}>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.webDateInput}
                  value={purchaseDate}
                  onChangeText={handleWebDateChange}
                  autoFocus
                  {...({ type: 'date' } as any)}
                />
              ) : (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                />
              )}
              {Platform.OS === 'ios' || Platform.OS === 'web' ? (
                <TouchableOpacity
                  style={styles.closeDateButton}
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.closeDateButtonText}>Fechar calendario</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.label}>Valor</Text>
          <TextInput
            style={styles.input}
            value={valor}
            onChangeText={(text) => setValor(formatCurrencyInput(text))}
            keyboardType="numeric"
            placeholder="R$ 0,00"
            onFocus={() => {
              setShowDatePicker(false);
              setShowCards(false);
              setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              }, 120);
            }}
          />

          {paymentMethod === 'card' ? (
            <View style={styles.row}>
              <Text style={styles.labelInline}>Parcelado?</Text>
              <Switch value={parcelado} onValueChange={setParcelado} />
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.labelInline}>Pagamento recorrente?</Text>
            <Switch
              value={recorrente}
              onValueChange={(value) => {
                setRecorrente(value);
                if (!value) {
                  setRecorrenteTipo('');
                }
              }}
            />
          </View>

          {recorrente ? (
            <>
              <Text style={styles.label}>Tipo recorrente</Text>
              <View style={styles.chipsRow}>
                {RECURRING_OPTIONS.map((option) => {
                  const active = recorrenteTipo === option;

                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setRecorrenteTipo(option)}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          {paymentMethod === 'card' && parcelado && (
            <>
              <Text style={styles.label}>Numero de parcelas</Text>
              <TextInput
                style={styles.input}
                value={parcelas}
                onChangeText={(text) => setParcelas(text.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="Ex: 3"
                onFocus={() => {
                  setShowDatePicker(false);
                  setShowCards(false);
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
              />
            </>
          )}

          <TouchableOpacity style={styles.button} onPress={salvar} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Salvar compra</Text>
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
  container: {
    padding: 20,
    paddingBottom: 140
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 18
  },
  heroEyebrow: {
    color: '#5E6A85',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10
  },
  heroTitle: {
    color: '#141A2E',
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    marginBottom: 10
  },
  heroSubtitle: {
    color: '#6F7990',
    fontSize: 15,
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
  labelInline: {
    color: '#141A2E',
    fontSize: 15,
    fontWeight: '700'
  },
  input: {
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    color: '#141A2E',
    fontSize: 15,
    marginBottom: 14
  },
  aiInput: {
    minHeight: 86,
    textAlignVertical: 'top'
  },
  aiButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#CAD6FF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  aiActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  aiActionButton: {
    flex: 1,
    marginBottom: 0
  },
  voiceButtonActive: {
    backgroundColor: '#141A2E',
    borderColor: '#141A2E'
  },
  aiButtonText: {
    color: '#2F5BFF',
    fontWeight: '800'
  },
  voiceButtonTextActive: {
    color: '#FFFFFF'
  },
  aiNotice: {
    color: '#63708A',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14
  },
  paymentTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  paymentTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center'
  },
  paymentTabActive: {
    backgroundColor: '#141A2E',
    borderColor: '#141A2E'
  },
  paymentTabText: {
    color: '#5E6A85',
    fontWeight: '800'
  },
  paymentTabTextActive: {
    color: '#FFFFFF'
  },
  pixNotice: {
    backgroundColor: '#E9F8EF',
    borderWidth: 1,
    borderColor: '#BCE9CE',
    borderRadius: 16,
    color: '#1E7F52',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    padding: 14,
    marginBottom: 14
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14
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
  selector: {
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateButton: {
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectorLabel: {
    color: '#7B8499',
    fontSize: 12,
    marginBottom: 4
  },
  selectorValue: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '700'
  },
  selectorAction: {
    color: '#2F5BFF',
    fontWeight: '700'
  },
  dropdown: {
    marginBottom: 14,
    gap: 10
  },
  datePickerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 18,
    padding: 10,
    marginBottom: 14
  },
  webDateInput: {
    backgroundColor: '#F9FAFD',
    borderWidth: 1,
    borderColor: '#E3E7F0',
    borderRadius: 14,
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  closeDateButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6
  },
  closeDateButtonText: {
    color: '#2F5BFF',
    fontWeight: '700'
  },
  emptyText: {
    color: '#6F7990',
    fontSize: 14,
    paddingVertical: 8
  },
  cardOption: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  cardOptionTitle: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  cardOptionMeta: {
    color: '#63708A',
    fontSize: 13,
    maxWidth: 220
  },
  cardOptionBadge: {
    fontWeight: '700',
    fontSize: 13
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
  }
});
