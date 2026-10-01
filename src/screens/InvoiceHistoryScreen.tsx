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
  const chartColors = ['#2F5BFF', '#13B886', '#EC7000', '#8A05BE', '#F04438'];

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
  const pending = total - paid;

  const chartData = useMemo(() => {
    const grouped = items.reduce<Record<string, number>>((acc, item) => {
      const cardName = item.card_name || 'Sem cartao';
      acc[cardName] = (acc[cardName] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

    const entries = Object.entries(grouped).map(([label, value]) => ({
      label,
      value
    }));

    const maxValue = entries.reduce((max, item) => Math.max(max, item.value), 0);

    return entries.map((entry) => ({
      ...entry,
      percentage: maxValue > 0 ? Math.max((entry.value / maxValue) * 100, 8) : 0
    }));
  }, [items]);

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
        <View style={styles.hero}>
        <Text style={styles.eyebrow}>Historico da fatura</Text>
        <Text style={styles.title}>Resumo visual do mes</Text>
        <Text style={styles.subtitle}>
          Veja quanto entrou na fatura de {getMonthLabel(selectedDate)} e como os gastos se distribuem.
        </Text>
      </View>

        <View style={styles.monthSwitcher}>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
            <Text style={styles.monthArrow}>‹</Text>
            <Text style={styles.monthButtonText}>Anterior</Text>
          </TouchableOpacity>

          <View style={styles.monthCenter}>
            <Text style={styles.monthCenterLabel}>Fatura</Text>
            <Text style={styles.monthCenterValue}>{getMonthLabel(selectedDate)}</Text>
          </View>

          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
            <Text style={styles.monthButtonText}>Proximo</Text>
            <Text style={styles.monthArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total do mes</Text>
          <Text style={styles.statValue}>
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pago</Text>
          <Text style={styles.statValue}>
            {paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pendente</Text>
          <Text style={styles.statValue}>
            {pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Grafico por cartao</Text>

          {chartData.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma parcela encontrada neste mes.</Text>
          ) : (
            chartData.map((item, index) => (
              <View key={item.label} style={styles.chartRow}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <Text style={styles.chartValue}>
                    {item.value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
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
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>Lancamentos da fatura</Text>

          {items.length === 0 ? (
            <Text style={styles.emptyText}>Nada para mostrar ainda.</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle}>{item.description}</Text>
                  <Text style={styles.itemMeta}>
                    {item.card_name || 'Sem cartao'} . Parcela {item.installment_number} .{' '}
                    {item.due_date}
                  </Text>
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.itemAmount}>
                    {Number(item.amount).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </Text>
                  <TouchableOpacity
                    style={Number(item.is_paid) === 1 ? styles.statusButtonPaid : styles.statusButtonPending}
                    onPress={() => togglePaid(item)}
                  >
                    <Text style={Number(item.is_paid) === 1 ? styles.statusPaid : styles.statusPending}>
                      {Number(item.is_paid) === 1 ? 'Pago' : 'Marcar pago'}
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
  statsRow: {
    gap: 12,
    marginBottom: 18
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18
  },
  monthButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  monthArrow: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18
  },
  monthButtonText: {
    color: '#141A2E',
    fontWeight: '700',
    fontSize: 11
  },
  monthCenter: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    alignItems: 'center'
  },
  monthCenterLabel: {
    color: '#7A839A',
    fontSize: 11,
    marginBottom: 3
  },
  monthCenterValue: {
    color: '#141A2E',
    fontWeight: '800',
    fontSize: 15,
    textTransform: 'capitalize'
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  statLabel: {
    color: '#7A839A',
    fontSize: 13,
    marginBottom: 6
  },
  statValue: {
    color: '#141A2E',
    fontSize: 22,
    fontWeight: '800'
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
  chartRow: {
    marginBottom: 14
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  chartLabel: {
    color: '#141A2E',
    fontWeight: '700'
  },
  chartValue: {
    color: '#4C5670',
    fontSize: 13
  },
  barTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2F5BFF'
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF4'
  },
  emptyText: {
    color: '#6F7990',
    lineHeight: 20
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7'
  },
  itemLeft: {
    flex: 1,
    paddingRight: 12
  },
  itemTitle: {
    color: '#141A2E',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  itemMeta: {
    color: '#778095',
    fontSize: 13
  },
  itemRight: {
    alignItems: 'flex-end'
  },
  itemAmount: {
    color: '#141A2E',
    fontWeight: '800',
    marginBottom: 4
  },
  statusButtonPaid: {
    backgroundColor: '#E9F8EF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusButtonPending: {
    backgroundColor: '#FFF3E8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusPaid: {
    color: '#1E8E5A',
    fontWeight: '700',
    fontSize: 13
  },
  statusPending: {
    color: '#D06B2D',
    fontWeight: '700',
    fontSize: 13
  }
});
