import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppBottomNavProps = {
  navigation: any;
  current: 'Relatorios' | 'Gastos' | 'Perfil';
};

const tabs = [
  { key: 'Relatorios', label: 'Relatorios', route: 'HistoricoFatura' },
  { key: 'Gastos', label: 'Gastos', route: 'Home' },
  { key: 'Perfil', label: 'Perfil', route: 'Perfil' }
];

function TabIcon({ tabKey, active }: { tabKey: string; active: boolean }) {
  const iconColor = active ? '#FFFFFF' : '#5B657E';
  const softColor = active ? '#2B3650' : '#D6DCEB';

  if (tabKey === 'Relatorios') {
    return (
      <View style={styles.iconRow}>
        <View style={[styles.bar, styles.barShort, { backgroundColor: softColor }]} />
        <View style={[styles.bar, styles.barMedium, { backgroundColor: softColor }]} />
        <View style={[styles.bar, styles.barTall, { backgroundColor: iconColor }]} />
      </View>
    );
  }

  if (tabKey === 'Perfil') {
    return (
      <View style={styles.profileIcon}>
        <View style={[styles.profileHead, { backgroundColor: iconColor }]} />
        <View style={[styles.profileBody, { backgroundColor: softColor, borderColor: iconColor }]} />
      </View>
    );
  }

  return (
    <View style={styles.walletIcon}>
      <View style={[styles.walletBody, { backgroundColor: softColor, borderColor: iconColor }]} />
      <View style={[styles.walletFlap, { backgroundColor: iconColor }]} />
      <View style={[styles.walletDot, { backgroundColor: active ? '#141A2E' : '#FFFFFF' }]} />
    </View>
  );
}

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
              activeOpacity={0.9}
            >
              <TabIcon tabKey={tab.key} active={active} />
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
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 14,
    paddingTop: 8
  },
  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8EBF4',
    gap: 6,
    boxShadow: '0 8px 22px rgba(20, 26, 46, 0.10)'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6
  },
  tabActive: {
    backgroundColor: '#141A2E'
  },
  tabText: {
    color: '#6F7990',
    fontWeight: '700',
    fontSize: 12
  },
  tabTextActive: {
    color: '#FFFFFF'
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 15,
    gap: 2
  },
  bar: {
    width: 4,
    borderRadius: 999
  },
  barShort: {
    height: 7
  },
  barMedium: {
    height: 10
  },
  barTall: {
    height: 13
  },
  walletIcon: {
    width: 20,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },
  walletBody: {
    width: 18,
    height: 12,
    borderRadius: 4,
    borderWidth: 1.5
  },
  walletFlap: {
    position: 'absolute',
    width: 8,
    height: 3,
    borderRadius: 999,
    top: 2,
    right: 1
  },
  walletDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 999,
    right: 5
  },
  profileIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 15
  },
  profileHead: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginBottom: 2
  },
  profileBody: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1.5
  }
});
