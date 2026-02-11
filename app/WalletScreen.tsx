import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';

export default function WalletScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [payouts, setPayouts] = useState<any[]>([]);
  
  // Payout Modal State
  const [showModal, setShowModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [requesting, setRequesting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
    }, [])
  );

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Calculating TOTAL REVENUE (Sum of confirmed bookings for MY events)
      // We use !inner to join events and filter by organizer_id
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select(`
            amount_paid,
            events!inner(organizer_id)
        `)
        .eq('events.organizer_id', user.id)
        .eq('status', 'confirmed'); // Only count paid/confirmed tickets

      if (bookingError) throw bookingError;

      const revenue = bookings?.reduce((sum, item) => sum + (item.amount_paid || 0), 0) || 0;
      setTotalRevenue(revenue);

      // 2. Calculate TOTAL WITHDRAWN
      const { data: payoutData, error: payoutError } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (payoutError) throw payoutError;

      // Sum up only 'paid' or 'pending' requests (to deduct from available balance)
      const withdrawn = payoutData?.reduce((sum, item) => {
          return item.status !== 'rejected' ? sum + Number(item.amount) : sum;
      }, 0) || 0;

      setTotalWithdrawn(withdrawn);
      setPayouts(payoutData || []);

    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = Number(withdrawAmount);
    const available = totalRevenue - totalWithdrawn;

    if (!amount || amount <= 0) return Alert.alert("Invalid Amount", "Enter a valid amount.");
    if (amount > available) return Alert.alert("Insufficient Funds", "You cannot withdraw more than your available balance.");
    if (!bankName || !accNumber) return Alert.alert("Missing Info", "Please provide bank details.");

    setRequesting(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('payouts').insert({
            user_id: user?.id,
            amount: amount,
            bank_name: bankName,
            account_number: accNumber,
            status: 'pending'
        });

        if (error) throw error;

        Alert.alert("Success", "Payout request sent! We will process it shortly.");
        setShowModal(false);
        setWithdrawAmount('');
        fetchWalletData(); // Refresh numbers

    } catch (e: any) {
        Alert.alert("Error", e.message);
    } finally {
        setRequesting(false);
    }
  };

  const availableBalance = totalRevenue - totalWithdrawn;

  const renderPayoutItem = ({ item }: { item: any }) => (
    <View style={styles.payoutItem}>
        <View>
            <Text style={styles.payoutDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            <Text style={styles.payoutBank}>{item.bank_name} • {item.account_number}</Text>
        </View>
        <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.payoutAmount}>-₦{item.amount.toLocaleString()}</Text>
            <Text style={[
                styles.statusBadge, 
                { color: item.status === 'paid' ? 'green' : (item.status === 'rejected' ? 'red' : 'orange') }
            ]}>
                {item.status.toUpperCase()}
            </Text>
        </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER CARD */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Available Balance</Text>
        <Text style={styles.balanceText}>₦{availableBalance.toLocaleString()}</Text>
        
        <View style={styles.row}>
            <View>
                <Text style={styles.subLabel}>Total Revenue</Text>
                <Text style={styles.subValue}>₦{totalRevenue.toLocaleString()}</Text>
            </View>
            <View>
                <Text style={styles.subLabel}>Withdrawn</Text>
                <Text style={styles.subValue}>₦{totalWithdrawn.toLocaleString()}</Text>
            </View>
        </View>

        <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.withdrawText}>Request Payout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.historyTitle}>Payout History</Text>
      
      <FlatList
        data={payouts}
        renderItem={renderPayoutItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No payout history yet.</Text>}
      />

      {/* WITHDRAW MODAL */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Request Payout</Text>
                <Text style={styles.modalSub}>Available: ₦{availableBalance.toLocaleString()}</Text>
                
                <TextInput 
                    placeholder="Amount (₦)" 
                    keyboardType="numeric"
                    style={styles.input}
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                />
                <TextInput 
                    placeholder="Bank Name" 
                    style={styles.input}
                    value={bankName}
                    onChangeText={setBankName}
                />
                <TextInput 
                    placeholder="Account Number" 
                    keyboardType="numeric"
                    style={styles.input}
                    value={accNumber}
                    onChangeText={setAccNumber}
                />

                <TouchableOpacity 
                    style={styles.confirmBtn} 
                    onPress={handleRequestPayout}
                    disabled={requesting}
                >
                    {requesting ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Submit Request</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                    <Text style={{color: 'red'}}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  card: { backgroundColor: '#000', padding: 25, borderRadius: 20, marginBottom: 25, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  cardLabel: { color: '#ccc', fontSize: 14 },
  balanceText: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15 },
  subLabel: { color: '#888', fontSize: 12 },
  subValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  withdrawBtn: { backgroundColor: '#fff', marginTop: 20, padding: 12, borderRadius: 10, alignItems: 'center' },
  withdrawText: { color: '#000', fontWeight: 'bold' },
  
  historyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  payoutItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  payoutDate: { color: '#666', fontSize: 12 },
  payoutBank: { fontWeight: '600', marginTop: 2 },
  payoutAmount: { fontWeight: 'bold', fontSize: 16 },
  statusBadge: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { textAlign: 'center', color: '#666', marginBottom: 20 },
  input: { backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, marginBottom: 15 },
  confirmBtn: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { alignItems: 'center', marginTop: 15 }
});