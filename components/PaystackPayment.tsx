import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface PaystackProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (res: any) => void;
  paystackKey: string;
  billingEmail: string;
  amount: number; // In Naira
}

export default function PaystackPayment({ visible, onCancel, onSuccess, paystackKey, billingEmail, amount }: PaystackProps) {
  
  // Paystack expects amount in Kobo (Naira * 100)
  const amountInKobo = amount * 100;

  const paystackHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Paystack</title>
      </head>
      <body style="background-color:#fff;height:100vh;display:flex;justify-content:center;align-items:center;">
        <script src="https://js.paystack.co/v1/inline.js"></script>
        <script>
          function payWithPaystack() {
            var handler = PaystackPop.setup({
              key: '${paystackKey}',
              email: '${billingEmail}',
              amount: ${amountInKobo},
              currency: 'NGN',
              callback: function(response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({status: 'success', data: response}));
              },
              onClose: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({status: 'cancelled'}));
              }
            });
            handler.openIframe();
          }
          // Auto-trigger payment on load
          setTimeout(payWithPaystack, 1000);
        </script>
      </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: '#fff' }}>
        {/* Header with Cancel Button */}
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Make Payment</Text>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
        </View>

        <WebView
          originWhitelist={['*']}
          source={{ html: paystackHtml }}
          onMessage={(event) => {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.status === 'success') {
              onSuccess(data.data);
            } else {
              onCancel();
            }
          }}
          startInLoadingState={true}
          renderLoading={() => <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    cancelButton: { padding: 5 },
    cancelText: { color: 'red', fontSize: 16 },
    loader: { position: 'absolute', top: '50%', left: '50%' }
});