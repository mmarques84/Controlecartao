import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppBottomNavProps = {
  navigation: any;
  current: 'Home' | 'Controle' | 'Historico' | 'Relatorios' | 'Perfil';
};

const tabs = [
  { key: 'Home', label: 'Home', route: 'Home' },
  { key: 'Controle', label: 'Controle', route: 'Cartao' },
  { key: 'Historico', label: 'Historico', route: 'HistoricoCompras' },
  { key: 'Relatorios', label: 'Relatorios', route: 'HistoricoFatura' },
  { key: 'Perfil', label: 'Perfil', route: 'Perfil' }
];

export default function AppBottomNav({ navigation, current }: AppBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.wrapper}>
        {tabs.map((tab) => {
          const active = tab.key === current;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => {
                if (!active) {
                  navigation.navigate(tab.route);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 12,
    paddingTop: 8
  },
  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 4,
    gap: 4
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 14
  },
  tabActive: {
    backgroundColor: '#111827'
  },
  tabText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800'
  },
  tabTextActive: {
    color: '#FFFFFF'
  }
});
