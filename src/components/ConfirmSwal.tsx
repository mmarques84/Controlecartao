import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ConfirmSwalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  dangerLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmSwal({
  visible,
  title,
  message,
  confirmText = 'Remover',
  cancelText = 'Cancelar',
  dangerLabel = 'Acao permanente',
  loading = false,
  onCancel,
  onConfirm
}: ConfirmSwalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>!</Text>
          </View>

          <Text style={styles.kicker}>{dangerLabel}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.actionDisabled]}
              onPress={onCancel}
              activeOpacity={0.9}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.actionDisabled]}
              onPress={onConfirm}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <Text style={styles.confirmText}>{loading ? 'Removendo...' : confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 14, 28, 0.66)',
    justifyContent: 'center',
    padding: 22
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F7',
    boxShadow: '0 18px 42px rgba(9, 14, 28, 0.24)'
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFD4D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  iconText: {
    color: '#B42318',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32
  },
  kicker: {
    color: '#D9544D',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  title: {
    color: '#141A2E',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8
  },
  message: {
    color: '#66708A',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F4F6FB',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E7F0'
  },
  cancelText: {
    color: '#141A2E',
    fontWeight: '900'
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#D9544D',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  actionDisabled: {
    opacity: 0.7
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '900'
  }
});
