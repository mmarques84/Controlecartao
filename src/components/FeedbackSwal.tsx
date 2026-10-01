import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FeedbackSwalProps = {
  visible: boolean;
  type?: 'success' | 'error';
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
};

export default function FeedbackSwal({
  visible,
  type = 'success',
  title,
  message,
  buttonText = 'Ok',
  onClose
}: FeedbackSwalProps) {
  const success = type === 'success';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, success ? styles.iconSuccess : styles.iconError]}>
            <Text style={[styles.iconText, success ? styles.iconSuccessText : styles.iconErrorText]}>
              {success ? 'OK' : '!'}
            </Text>
          </View>

          <Text style={[styles.kicker, success ? styles.kickerSuccess : styles.kickerError]}>
            {success ? 'Tudo certo' : 'Atencao'}
          </Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={[styles.button, success ? styles.buttonSuccess : styles.buttonError]}
            onPress={onClose}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 14, 28, 0.58)',
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  iconSuccess: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0'
  },
  iconError: {
    backgroundColor: '#FFF1F0',
    borderColor: '#FFD4D0'
  },
  iconText: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 32
  },
  iconSuccessText: {
    color: '#166534'
  },
  iconErrorText: {
    color: '#B42318'
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  kickerSuccess: {
    color: '#166534'
  },
  kickerError: {
    color: '#D9544D'
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
  button: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonSuccess: {
    backgroundColor: '#111827'
  },
  buttonError: {
    backgroundColor: '#D9544D'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900'
  }
});
