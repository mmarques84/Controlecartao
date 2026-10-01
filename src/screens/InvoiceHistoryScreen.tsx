import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AppBottomNav from '../components/AppBottomNav';
import {
  getInstallmentsByMonth,
  updateInstallmentPaidStatus
} from '../database/purchaseService';

type InvoiceItem = {
  id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  is_paid: number;
  description: string;
  card_name?: string;
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getMonthLabel(date: Date) {
  return date.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
}

export default function InvoiceHistoryScreen({ navigation }: any) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const month = selectedDate.getMonth() + 1;
  const year = selectedDate.getFullYear();

  const loadMonth = useCallback(() => {
    getInstallmentsByMonth(month, year).then((result) => {
      setItems((result as InvoiceItem[]) ?? []);
    });
  }, [month, year]);

  useFocusEffect(
    useCallback(() => {
      loadMonth();
    }, [loadMonth])
  );

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = items
    .filter((item) => Number(item.is_paid) === 1)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = Math.max(total - paid, 0);
  const paidPercentage = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const openItems = items.filter((item) => Number(item.is_paid) !== 1);
  const averageInstallment = items.length > 0 ? total / items.length : 0;

  const chartData = useMemo(() => {
    const grouped = items.reduce<Record<string, number>>((acc, item) => {
      const cardName = item.card_name || 'Sem cartao';
      acc[cardName] = (acc[cardName] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

    const entries = Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const maxValue = entries.reduce((max, item) => Math.max(max, item.value), 0);

    return entries.map((entry) => ({
      ...entry,
      percentage: maxValue > 0 ? Math.max((entry.value / maxValue) * 100, 8) : 0
    }));
  }, [items]);
  const visualChartData = chartData.slice(0, 4);

  const topItems = [...items].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).slice(0, 5);
  const biggestItem = topItems[0] ?? null;
  const reportStatus =
    total === 0
      ? 'Sem fatura neste mes'
      : pending === 0
        ? 'Fatura em dia'
        : paidPercentage >= 50
          ? 'Pagamento em andamento'
          : 'Acompanhe os pendentes';

  async function togglePaid(item: InvoiceItem) {
    await updateInstallmentPaidStatus(item.id, Number(item.is_paid) === 1 ? 0 : 1);
    await loadMonth();
  }

  function changeMonth(direction: -1 | 1) {
    setSelectedDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Resumo mensal</Text>
          <Text style={styles.title}>Fatura do mes</Text>
        </View>

        <View style={styles.monthSwitcher}>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)} activeOpacity={0.85}>
            <Text style={styles.monthButtonText}>Anterior</Text>
          </TouchableOpacity>

          <Text style={styles.monthText}>{getMonthLabel(selectedDate)}</Text>

          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)} activeOpacity={0.85}>
            <Text style={styles.monthButtonText}>Proximo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalPanel}>
          <View style={styles.panelTopRow}>
            <Text style={styles.panelLabel}>Total</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{reportStatus}</Text>
            </View>
          </View>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${paidPercentage}%` }]} />
          </View>

          <View style={styles.panelMeta}>
            <Text style={styles.metaText}>{formatMoney(paid)} pago</Text>
            <Text style={styles.metaText}>{formatMoney(pending)} pendente</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Parcelas</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{openItems.length}</Text>
            <Text style={styles.statLabel}>Em aberto</Text>
          </View>
        </View>

        <View style={styles.chartPanel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Grafico do mes</Text>
            <Text style={styles.chartTotal}>{formatMoney(total)}</Text>
          </View>

          {visualChartData.length === 0 ? (
            <Text style={styles.emptyText}>Cadastre compras para ver o grafico.</Text>
          ) : (
            <>
              <View style={styles.verticalChart}>
                {visualChartData.map((item) => (
                  <View key={item.label} style={styles.chartColumn}>
                    <View style={styles.columnTrack}>
                      <View style={[styles.columnFill, { height: `${item.percentage}%` }]} />
                    </View>
                    <Text style={styles.columnLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.columnValue} numberOfLines={1}>{formatMoney(item.value)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.paymentSplit}>
                <View style={[styles.paymentPaid, { flex: paid }]} />
                <View style={[styles.paymentPending, { flex: pending }]} />
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={styles.legendPaidDot} />
                  <Text style={styles.legendText}>Pago</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendPendingDot} />
                  <Text style={styles.legendText}>Pendente</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.insightGrid}>
          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Media por parcela</Text>
            <Text style={styles.insightValue}>{formatMoney(averageInstallment)}</Text>
          </View>
          <View style={styles.insightItem}>
            <Text style={styles.insightLabel}>Maior lancamento</Text>
            <Text style={styles.insightValue} numberOfLines={1}>
              {biggestItem ? formatMoney(Number(biggestItem.amount || 0)) : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Cartao')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>Controle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('HistoricoCompras')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>Historico</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por cartao</Text>

          {chartData.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma parcela encontrada neste mes.</Text>
          ) : (
            chartData.map((item) => (
              <View key={item.label} style={styles.chartRow}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <Text style={styles.chartValue}>{formatMoney(item.value)}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${item.percentage}%` }]} />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maiores valores</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HistoricoCompras')} activeOpacity={0.8}>
              <Text style={styles.linkText}>Historico</Text>
            </TouchableOpacity>
          </View>

          {topItems.length === 0 ? (
            <Text style={styles.emptyText}>Nada para mostrar ainda.</Text>
          ) : (
            topItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.description}</Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.card_name || 'Sem cartao'} . Parcela {item.installment_number}
                  </Text>
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>{formatMoney(Number(item.amount || 0))}</Text>
                  <TouchableOpacity
                    style={Number(item.is_paid) === 1 ? styles.statusPaidButton : styles.statusPendingButton}
                    onPress={() => togglePaid(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={Number(item.is_paid) === 1 ? styles.statusPaidText : styles.statusPendingText}>
                      {Number(item.is_paid) === 1 ? 'Pago' : 'Pagar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AppBottomNav navigation={navigation} current="Relatorios" />
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
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  monthButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  monthButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800'
  },
  monthText: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'capitalize'
  },
  totalPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 20,
    gap: 12
  },
  panelLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800'
  },
  panelTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  statusPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  statusPillText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800'
  },
  totalValue: {
    color: '#111827',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 999
  },
  panelMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  metaText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700'
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
    fontSize: 20,
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
    marginHorizontal: 16,
    backgroundColor: '#E5E7EB'
  },
  insightGrid: {
    flexDirection: 'row',
    gap: 12
  },
  insightItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 16,
    gap: 6
  },
  insightLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800'
  },
  insightValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900'
  },
  chartPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18,
    gap: 16
  },
  chartTotal: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  verticalChart: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 8
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6
  },
  columnTrack: {
    width: '100%',
    maxWidth: 48,
    height: 110,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  columnFill: {
    width: '100%',
    minHeight: 8,
    borderRadius: 14,
    backgroundColor: '#111827'
  },
  columnLabel: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '900',
    maxWidth: 68
  },
  columnValue: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    maxWidth: 76
  },
  paymentSplit: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#E5E7EB'
  },
  paymentPaid: {
    backgroundColor: '#111827'
  },
  paymentPending: {
    backgroundColor: '#D1D5DB'
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  legendPaidDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#111827'
  },
  legendPendingDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D1D5DB'
  },
  legendText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800'
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18,
    gap: 14
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900'
  },
  linkText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800'
  },
  chartRow: {
    gap: 8
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  chartLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    flex: 1
  },
  chartValue: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800'
  },
  barTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 999
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F4'
  },
  itemInfo: {
    flex: 1
  },
  itemTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3
  },
  itemMeta: {
    color: '#6B7280',
    fontSize: 13
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6
  },
  itemAmount: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums']
  },
  statusPaidButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  statusPendingButton: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  statusPaidText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800'
  },
  statusPendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});
