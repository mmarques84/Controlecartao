import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppBottomNav from '../components/AppBottomNav';

import { clearSession, getCurrentUser } from '../database/authService';
import { getCards } from '../database/cardService';
import {
  deletePurchase,
  getInstallmentsByMonth,
  getRecentPurchases
} from '../database/purchaseService';

type HomeScreenProps = {
  navigation: any;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [userEmail, setUserEmail] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const chartColors = ['#2F5BFF', '#13B886', '#EC7000', '#8A05BE', '#F04438'];
  const monthPurchases = purchases.filter((item) => {
    const purchaseDate = String(item.purchase_date || '');
    return (
      Number(purchaseDate.slice(5, 7)) === currentMonth &&
      Number(purchaseDate.slice(0, 4)) === currentYear
    );
  });
  const total = monthPurchases.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const invoiceTotal = installments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingCount = installments.filter((item) => !item.is_paid).length;
  const paidCount = installments.filter((item) => Number(item.is_paid) === 1).length;
  const plannedLimit = cards.reduce((sum, item) => sum + Number(item.limit_amount || 0), 0);
  const availableLimit = plannedLimit - total;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = Math.max(daysInMonth - dayOfMonth, 0);
  const dailyAverage = dayOfMonth > 0 ? total / dayOfMonth : total;
  const limitUsage = plannedLimit > 0 ? Math.min((total / plannedLimit) * 100, 100) : 0;
  const spendingByCard = useMemo(() => {
    const grouped = monthPurchases.reduce<Record<string, number>>((acc, item) => {
      const label = item.payment_method === 'pix' ? 'Pix' : item.card_name || 'Sem cartao';
      acc[label] = (acc[label] || 0) + Number(item.total_amount || 0);
      return acc;
    }, {});

    const entries = Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const maxValue = entries.reduce((max, item) => Math.max(max, item.value), 0);

    return entries.map((item) => ({
      ...item,
      percentage: maxValue > 0 ? Math.max((item.value / maxValue) * 100, 7) : 0
    }));
  }, [monthPurchases]);
  const spendingByCategory = useMemo(() => {
    const grouped = monthPurchases.reduce<Record<string, number>>((acc, item) => {
      const label = item.category || 'Outros';
      acc[label] = (acc[label] || 0) + Number(item.total_amount || 0);
      return acc;
    }, {});

    const entries = Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const maxValue = entries.reduce((max, item) => Math.max(max, item.value), 0);

    return entries.map((item) => ({
      ...item,
      percentage: maxValue > 0 ? Math.max((item.value / maxValue) * 100, 7) : 0
    }));
  }, [monthPurchases]);
  const topCard = spendingByCard[0];
  const topCategory = spendingByCategory[0];
  const healthTone =
    plannedLimit === 0 ? 'neutral' : limitUsage >= 85 ? 'danger' : limitUsage >= 60 ? 'warning' : 'good';
  const healthLabel =
    plannedLimit === 0
      ? 'Configure seu limite'
      : limitUsage >= 85
        ? 'Atencao ao limite'
        : limitUsage >= 60
          ? 'Ritmo moderado'
          : 'Fatura saudavel';
  const smartInsight =
    cards.length === 0
      ? 'Cadastre seu primeiro cartao para o app calcular limite livre e melhor dia de compra.'
      : monthPurchases.length === 0
        ? 'Lance a primeira compra do mes e o painel comeca a aprender seu padrao.'
        : topCategory
          ? `${topCategory.label} lidera seus gastos do mes. Vale conferir se esta dentro do planejado.`
          : 'Seu resumo esta pronto para acompanhar o mes.';
  const nextBestAction =
    cards.length === 0
      ? { title: 'Cadastrar cartao', route: 'Cartao' }
      : { title: 'Registrar compra', route: 'NovaEntrada' };

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

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

  async function confirmRemovePurchase() {
    if (!pendingDelete?.id) {
      return;
    }

    try {
      await deletePurchase(pendingDelete.id);
      setPendingDelete(null);
      setNotice({ type: 'success', text: 'Compra removida do historico.' });
      await loadData();
    } catch (error) {
      console.log(error);
      setNotice({ type: 'error', text: 'Nao foi possivel remover a compra.' });
    }
  }

  async function handleLogout() {
    await clearSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {notice ? (
          <View style={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}>
            <Text style={notice.type === 'success' ? styles.noticeSuccessText : styles.noticeErrorText}>
              {notice.text}
            </Text>
          </View>
        ) : null}

        {pendingDelete ? (
          <View style={styles.confirmCard}>
            <View style={styles.confirmCopy}>
              <Text style={styles.confirmTitle}>Remover compra?</Text>
              <Text style={styles.confirmText}>
                {pendingDelete.description} .{' '}
                {Number(pendingDelete.total_amount).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
            </View>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setPendingDelete(null)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmRemove} onPress={confirmRemovePurchase}>
                <Text style={styles.confirmRemoveText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.hero}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <View style={styles.heroTopRow}>
          <Text style={styles.brand}>ControleCartao</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Ao vivo</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Seu cockpit financeiro</Text>
        <Text style={styles.heroSubtitle}>
          {userEmail ? `Sessao ativa: ${userEmail}` : 'Organize seus gastos em um fluxo simples.'}
        </Text>

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Fatura atual</Text>
            <Text style={styles.amountValue}>
              {formatMoney(total)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate(nextBestAction.route)}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>{nextBestAction.title}</Text>
          </TouchableOpacity>
        </View>

      </View>

        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View>
              <Text style={styles.aiKicker}>Assistente</Text>
              <Text style={styles.aiTitle}>Leitura rapida do mes</Text>
            </View>
            <View
              style={[
                styles.healthPill,
                healthTone === 'good' && styles.healthGood,
                healthTone === 'warning' && styles.healthWarning,
                healthTone === 'danger' && styles.healthDanger
              ]}
            >
              <Text
                style={[
                  styles.healthText,
                  healthTone === 'good' && styles.healthGoodText,
                  healthTone === 'warning' && styles.healthWarningText,
                  healthTone === 'danger' && styles.healthDangerText
                ]}
              >
                {healthLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.aiInsight}>{smartInsight}</Text>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Uso do limite</Text>
              <Text style={styles.progressValue}>{Math.round(limitUsage)}%</Text>
            </View>
            <View style={styles.limitTrack}>
              <View
                style={[
                  styles.limitFill,
                  {
                    width: `${limitUsage}%`,
                    backgroundColor:
                      healthTone === 'danger' ? '#D9544D' : healthTone === 'warning' ? '#D06B2D' : '#13B886'
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.signalGrid}>
            <View style={styles.signalItem}>
              <Text style={styles.signalValue}>{formatMoney(dailyAverage)}</Text>
              <Text style={styles.signalLabel}>Media por dia</Text>
            </View>
            <View style={styles.signalItem}>
              <Text style={styles.signalValue}>{daysLeft}</Text>
              <Text style={styles.signalLabel}>Dias restantes</Text>
            </View>
            <View style={styles.signalItem}>
              <Text style={styles.signalValue} numberOfLines={1}>{topCard?.label || 'Sem dados'}</Text>
              <Text style={styles.signalLabel}>Mais usado</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricMoney}>
            {formatMoney(total)}
          </Text>
          <Text style={styles.metricLabel}>Gasto do mes</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricMoney}>
            {formatMoney(plannedLimit)}
          </Text>
          <Text style={styles.metricLabel}>Limite planejado</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricMoney}>
            {formatMoney(availableLimit)}
          </Text>
          <Text style={styles.metricLabel}>Limite livre</Text>
        </View>
      </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryKicker}>Resumo por cartao</Text>
              <Text style={styles.summaryTitle}>Gastos do mes</Text>
            </View>
            <Text style={styles.summaryTotal}>
              {formatMoney(total)}
            </Text>
          </View>

          {spendingByCard.length === 0 ? (
            <Text style={styles.emptyDescription}>Cadastre uma compra para ver o grafico.</Text>
          ) : (
            spendingByCard.map((item, index) => (
              <View key={item.label} style={styles.chartRow}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <Text style={styles.chartValue}>
                    {formatMoney(item.value)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: chartColors[index % chartColors.length]
                      }
                    ]}
                  />
                </View>
              </View>
            ))
          )}

          <View style={styles.categoryDivider}>
            <Text style={styles.summaryKicker}>Para onde foi</Text>
            <Text style={styles.summaryTitle}>Gastos por categoria</Text>
          </View>

          {spendingByCategory.length === 0 ? (
            <Text style={styles.emptyDescription}>Sem categorias ainda.</Text>
          ) : (
            spendingByCategory.map((item, index) => (
              <View key={item.label} style={styles.chartRow}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <Text style={styles.chartValue}>
                    {formatMoney(item.value)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: chartColors[(index + 2) % chartColors.length]
                      }
                    ]}
                  />
                </View>
              </View>
            ))
          )}

          <View style={styles.invoiceMiniRow}>
            <Text style={styles.invoiceMiniText}>
              Fatura atual: {formatMoney(invoiceTotal)}
            </Text>
            <Text style={styles.invoiceMiniText}>
              {paidCount} pagas . {pendingCount} pendentes
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Acessos rapidos</Text>

        <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.voiceCard}
          onPress={() => navigation.navigate('NovaEntrada')}
          activeOpacity={0.9}
        >
          <View style={styles.voiceIcon}>
            <Text style={styles.voiceIconText}>IA</Text>
          </View>
          <View style={styles.voiceCopy}>
            <Text style={styles.voiceTitle}>Lancar falando</Text>
            <Text style={styles.voiceDescription}>
              Diga algo como: mercado 100 reais no Itau ontem.
            </Text>
          </View>
          <Text style={styles.voiceArrow}>Abrir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardLarge]}
          onPress={() => navigation.navigate('NovaEntrada')}
          activeOpacity={0.9}
        >
          <Text style={styles.actionKicker}>Cadastro</Text>
          <Text style={styles.actionTitle}>Compra no cartao</Text>
          <Text style={styles.actionDescription}>
            Registre uma compra com poucos campos e sem complicacao.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Cartao')}
          activeOpacity={0.9}
        >
          <Text style={styles.actionKicker}>Cartao pessoal</Text>
          <Text style={styles.actionTitle}>Dados do cartao</Text>
          <Text style={styles.actionDescription}>
            Limite, vencimento e fechamento em uma area simples.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('HistoricoFatura')}
          activeOpacity={0.9}
        >
          <Text style={styles.actionKicker}>Fatura do mes</Text>
          <Text style={styles.actionTitle}>Historico e grafico</Text>
          <Text style={styles.actionDescription}>
            Veja o resumo da fatura atual com grafico por cartao e lista detalhada.
          </Text>
        </TouchableOpacity>
      </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Historico real</Text>
          <TouchableOpacity onPress={() => navigation.navigate('HistoricoCompras')}>
            <Text style={styles.linkText}>Ver tudo</Text>
          </TouchableOpacity>
        </View>

        {purchases.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Comece com uma compra real</Text>
            <Text style={styles.emptyDescription}>
              O app fica mais inteligente quando tem historico. Cadastre mercado, farmacia ou uma conta fixa.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate('NovaEntrada')}
              activeOpacity={0.9}
            >
              <Text style={styles.emptyActionText}>Registrar primeira compra</Text>
            </TouchableOpacity>
          </View>
        ) : (
          purchases.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.purchaseCard}>
              <View style={styles.purchaseLeft}>
                <View style={styles.purchaseDot} />
                <View>
                  <Text style={styles.purchaseTitle}>{item.description}</Text>
                  <Text style={styles.purchaseCategory}>
                    {item.payment_method === 'pix' ? 'Pix' : item.card_name || 'Sem cartao'} .{' '}
                    {item.category || 'Outros'} . {item.payment_method === 'pix' ? 'A vista' : `${item.installments}x`} . {item.purchase_date}
                  </Text>
                  {Number(item.is_recurring) === 1 ? (
                    <Text style={styles.purchaseRecurring}>
                      Recorrente{item.recurring_label ? ` . ${item.recurring_label}` : ''}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.purchaseRight}>
                <Text style={styles.purchaseAmount}>
                  {Number(item.total_amount).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </Text>
                <TouchableOpacity onPress={() => setPendingDelete(item)}>
                  <Text style={styles.removeText}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {purchases.length > 5 ? (
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('HistoricoCompras')}
            activeOpacity={0.9}
          >
            <Text style={styles.historyButtonText}>Abrir historico completo</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <AppBottomNav navigation={navigation} current="Gastos" />
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
    padding: 16,
    paddingBottom: 18
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
  confirmCard: {
    backgroundColor: '#141A2E',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    gap: 14
  },
  confirmCopy: {
    gap: 4
  },
  confirmTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800'
  },
  confirmText: {
    color: '#CBD2E3',
    lineHeight: 20
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10
  },
  confirmCancel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  confirmCancelText: {
    color: '#141A2E',
    fontWeight: '800'
  },
  confirmRemove: {
    flex: 1,
    backgroundColor: '#FFE3E0',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  confirmRemoveText: {
    color: '#B42318',
    fontWeight: '800'
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  heroGlowOne: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#DDE7FF'
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E8F7F0'
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  brand: {
    color: '#5E6A85',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1FBF6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BCE9CE'
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#13B886'
  },
  liveText: {
    color: '#1E7F52',
    fontSize: 12,
    fontWeight: '800'
  },
  heroTitle: {
    color: '#141A2E',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    marginBottom: 10,
    maxWidth: '94%'
  },
  heroSubtitle: {
    color: '#66708A',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: '96%'
  },
  amountRow: {
    gap: 14
  },
  amountLabel: {
    color: '#7A839A',
    fontSize: 13,
    marginBottom: 6
  },
  amountValue: {
    color: '#141A2E',
    fontSize: 28,
    fontWeight: '800'
  },
  primaryButton: {
    backgroundColor: '#141A2E',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  aiCard: {
    backgroundColor: '#101727',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#25304A',
    boxShadow: '0 10px 28px rgba(16, 23, 39, 0.16)'
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14
  },
  aiKicker: {
    color: '#9AA7C2',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800'
  },
  healthPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#EEF2FF'
  },
  healthGood: {
    backgroundColor: '#DDF8EA'
  },
  healthWarning: {
    backgroundColor: '#FFF3E8'
  },
  healthDanger: {
    backgroundColor: '#FFE3E0'
  },
  healthText: {
    color: '#2F5BFF',
    fontSize: 12,
    fontWeight: '800'
  },
  healthGoodText: {
    color: '#1E7F52'
  },
  healthWarningText: {
    color: '#B85B1D'
  },
  healthDangerText: {
    color: '#B42318'
  },
  aiInsight: {
    color: '#D8DEEC',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16
  },
  progressBlock: {
    gap: 8,
    marginBottom: 14
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressLabel: {
    color: '#9AA7C2',
    fontSize: 13,
    fontWeight: '700'
  },
  progressValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  limitTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#26324A',
    overflow: 'hidden'
  },
  limitFill: {
    height: '100%',
    borderRadius: 999
  },
  signalGrid: {
    flexDirection: 'row',
    gap: 8
  },
  signalItem: {
    flex: 1,
    backgroundColor: '#182136',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A3550'
  },
  signalValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5
  },
  signalLabel: {
    color: '#9AA7C2',
    fontSize: 11,
    fontWeight: '700'
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22
  },
  metricCard: {
    flex: 1,
    minWidth: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  metricValue: {
    color: '#141A2E',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4
  },
  metricMoney: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  metricLabel: {
    color: '#737C92',
    fontSize: 13
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginBottom: 22
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 18
  },
  summaryKicker: {
    color: '#7080A0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6
  },
  summaryTitle: {
    color: '#141A2E',
    fontSize: 20,
    fontWeight: '800'
  },
  summaryTotal: {
    color: '#141A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right'
  },
  chartRow: {
    marginBottom: 14
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  chartLabel: {
    color: '#141A2E',
    fontSize: 15,
    fontWeight: '700',
    flex: 1
  },
  chartValue: {
    color: '#4C5670',
    fontSize: 13,
    fontWeight: '700'
  },
  barTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    borderRadius: 999
  },
  invoiceMiniRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1F7',
    paddingTop: 14,
    marginTop: 2,
    gap: 4
  },
  categoryDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EEF1F7',
    paddingTop: 16,
    marginTop: 4,
    marginBottom: 14
  },
  invoiceMiniText: {
    color: '#66708A',
    fontSize: 13,
    fontWeight: '700'
  },
  sectionTitle: {
    color: '#141A2E',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14
  },
  quickActions: {
    gap: 12,
    marginBottom: 24
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141A2E',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#25304A'
  },
  voiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDE7FF'
  },
  voiceIconText: {
    color: '#2F5BFF',
    fontWeight: '900'
  },
  voiceCopy: {
    flex: 1
  },
  voiceTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4
  },
  voiceDescription: {
    color: '#CBD2E3',
    fontSize: 13,
    lineHeight: 18
  },
  voiceArrow: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  actionCardLarge: {
    backgroundColor: '#EEF2FF'
  },
  actionKicker: {
    color: '#7080A0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  actionTitle: {
    color: '#141A2E',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 8
  },
  actionDescription: {
    color: '#697389',
    fontSize: 14,
    lineHeight: 20
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  linkText: {
    color: '#2F5BFF',
    fontWeight: '700'
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
  emptyAction: {
    alignSelf: 'flex-start',
    backgroundColor: '#141A2E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  purchaseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EBF4'
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
  purchaseCategory: {
    color: '#778095',
    fontSize: 13
  },
  purchaseRecurring: {
    color: '#2F5BFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  purchaseRight: {
    alignItems: 'flex-end',
    minWidth: 86
  },
  purchaseAmount: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  removeText: {
    color: '#D9544D',
    fontWeight: '700',
    fontSize: 13
  },
  historyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EBF4',
    marginTop: 4
  },
  historyButtonText: {
    color: '#2F5BFF',
    fontWeight: '700'
  }
});
