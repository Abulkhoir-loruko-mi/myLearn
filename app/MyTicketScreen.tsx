import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg'; // <--- The magic part
import { supabase } from './lib/supabase';

export default function MyTicketsScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null); // For Modal

  useEffect(() => {
    fetchTickets();
  }, []);

 const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user logged in!");
        return;
      }
      console.log("Fetching tickets for User ID:", user.id);

      // 1. Fetch booking + Event details together
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          events (
            title,
            start_date,
            is_online,
            is_physical,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error.message);
        return;
      }

      //console.log("Data retrieved:", JSON.stringify(data, null, 2)); // <--- Check your terminal for this!
      
      if (data) setTickets(data);
    } catch (err) {
      console.error("Unknown Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderTicketItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.ticketCard} onPress={() => setSelectedTicket(item)}>
      <Image 
        source={{ uri: item.events?.image_url || 'https://via.placeholder.com/150' }} 
        style={styles.ticketImage} 
      />
      <View style={styles.ticketInfo}>
        <Text style={styles.eventTitle}>{item.events?.title}</Text>
        <Text style={styles.ticketType}>{item.ticket_name} Ticket • {item.quantity}x</Text>
        <Text style={styles.date}>
          {item.events?.start_date ? format(new Date(item.events.start_date), 'MMM d, yyyy • h:mm a') : 'Date TBD'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'confirmed' ? '#e6f4ea' : '#fff3cd' }]}>
            <Text style={[styles.statusText, { color: item.status === 'confirmed' ? '#1e7e34' : '#856404' }]}>
                {item.status.toUpperCase()}
            </Text>
        </View>
      </View>
      <Ionicons name="qr-code-outline" size={24} color="#333" style={{ marginRight: 10 }} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicketItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="ticket-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No tickets yet.</Text>
            </View>
          }
        />
      )}

      {/* --- QR CODE MODAL --- */}
      <Modal visible={!!selectedTicket} transparent={true} animationType="slide" onRequestClose={() => setSelectedTicket(null)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedTicket?.events?.title}</Text>
                <Text style={styles.modalSubtitle}>{selectedTicket?.ticket_name} Ticket</Text>
                
                <View style={styles.qrContainer}>
                    {selectedTicket && (
                        <QRCode
                            value={JSON.stringify({
                                bookingId: selectedTicket.id,
                                userId: selectedTicket.user_id,
                                status: 'valid'
                            })}
                            size={200}
                        />
                    )}
                </View>
                <Text style={styles.scanText}>Show this code at the entrance</Text>
                <Text style={styles.refText}>Ref: {selectedTicket?.payment_reference}</Text>

                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedTicket(null)}>
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  ticketCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, padding: 10, elevation: 2, alignItems: 'center' },
  ticketImage: { width: 60, height: 60, borderRadius: 8, marginRight: 15 },
  ticketInfo: { flex: 1 },
  eventTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  ticketType: { color: '#666', fontSize: 14, marginBottom: 4 },
  date: { color: '#999', fontSize: 12, marginBottom: 6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, color: '#888', fontSize: 16 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 10, elevation: 5, marginBottom: 20 },
  scanText: { fontSize: 14, color: '#555', marginBottom: 5 },
  refText: { fontSize: 10, color: '#aaa', marginBottom: 20 },
  closeButton: { paddingVertical: 12, paddingHorizontal: 40, backgroundColor: '#007BFF', borderRadius: 25 },
  closeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});