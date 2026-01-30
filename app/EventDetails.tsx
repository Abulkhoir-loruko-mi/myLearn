import { supabase } from '@/app/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';


import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PaystackPayment from '../components/PaystackPayment';


// --- INTERFACES ---
interface LocationDetails {
  address?: string;
  platform?: string;
  link?: string;
}

interface TicketItem {
  name: string;
  price: number | string;
  quantity: number | string;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  start_date: string;
  end_date: string;
   is_online:boolean;
  is_physical:boolean;
  location_type: 'physical' | 'online' | 'hybrid';
  location_details: LocationDetails | null;
  is_paid: boolean;
  tickets: TicketItem[] | null;
 organizer_id: string; // Needed to check if current user is organizer
  category?: string;
  tags?: string;
  creator_name:string
}

interface AnnouncementData {
    id: string;
    content: string;
    created_at: string;
}

export default function EventDetails({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { eventId } = route.params || {};

  // --- REFS ---
  const paystackWebViewRef = useRef<any>(null); // Reference to trigger Paystack

  // --- STATE ---
  const [loading, setLoading] = useState<boolean>(true);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('customer@example.com'); // Needed for Paystack
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'announcements'>('overview');

  // Announcement States
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [newAnnouncementText, setNewAnnouncementText] = useState<string>('');
  const [postingLoading, setPostingLoading] = useState<boolean>(false);

  // Ticket & Payment States
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [showPaystack, setShowPaystack] = useState(false);

  // --- DATA FETCHING ---
  const fetchEventDetails = useCallback(async () => {
    try {
        if(!eventId) throw new Error("No event ID provided");

        // 1. Fetch Event
        const { data: eventFetcherData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError) throw eventError;
        setEventData(eventFetcherData as EventData);

        // 2. Fetch Announcements
        fetchAnnouncements();

        // 3. Get User Info (ID and Email for Payment)
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
        if (user?.email) setUserEmail(user.email);

    } catch (error: any) {
        Alert.alert("Error", error.message || "Could not load event details.");
        navigation.goBack();
    } finally {
        setLoading(false);
    }
  }, [eventId, navigation]);


  const fetchAnnouncements = async () => {
      const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

      if (!error && data) setAnnouncements(data as AnnouncementData[]);
  };

  useEffect(() => { fetchEventDetails(); }, [fetchEventDetails]);

     const handlePostAnnouncement = async () => {
      if (!newAnnouncementText.trim()) {
          Alert.alert("Validation", "Please enter text first.");
          return;
      }
      setPostingLoading(true);
      try {
        const { error } = await supabase
            .from('announcements')
            .insert({
                event_id: eventId,
                content: newAnnouncementText.trim(),
               
            });
        if (error) throw error;

        setNewAnnouncementText(''); // Clear input
        fetchAnnouncements(); // Refresh list
        Alert.alert("Success", "Announcement posted!");

      } catch (error: any) {
          Alert.alert("Error", error.message);
      } finally {
          setPostingLoading(false);
      }
  };


  // --- PAYMENT HANDLERS ---

  const handleBuyPress = () => {
      // 1. If Free, just register immediately (Simple flow)
      if (!eventData?.is_paid) {
          Alert.alert("Success", "You have registered for this free event!");
          return;
      }

      // 2. If Paid, show ticket selection modal
      // If there's only 1 ticket type, select it automatically
        if (eventData.tickets && eventData.tickets.length === 1) {
            setSelectedTicket(eventData.tickets[0]);
            setTimeout(() => setShowPaystack(true), 100);
      } else {
          setShowTicketModal(true);
      }
  };

const onTicketSelect = (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setShowTicketModal(false);
    // Trigger Paystack
    setTimeout(() => setShowPaystack(true), 500);
};

  const handlePaymentSuccess = async (res: any) => {
      // res contains transaction reference
      console.log("Payment Success:", res);

      if (!selectedTicket || !currentUserId) return;

      try {
          // Save to Database
          const { error } = await supabase.from('bookings').insert({
              event_id: eventId,
              user_id: currentUserId,
              ticket_name: selectedTicket.name,
              amount_paid: selectedTicket.price, // Save what they actually paid
              payment_reference: res.reference,
              status: 'confirmed'
          });

          if (error) throw error;

          Alert.alert("Success! 🎉", "Your ticket has been booked. Check your email.");
          // Ideally navigate to a "My Tickets" screen here

      } catch (e: any) {
          Alert.alert("Booking Error", "Payment successful but failed to save ticket. Contact support with ref: " + res.reference);
      }
  };


  // --- FORMATTING HELPERS ---
  const formatRangeDate = (startStr: string, endStr: string) => {
    try {
      const start = parseISO(startStr);
      const end = parseISO(endStr);
      return `${format(start, "EEE, MMM d")} • ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
    } catch (e) { return 'Date TBD'; }
  };

  const formatAnnouncementDate = (dateStr: string) => {
       try { return format(parseISO(dateStr), "MMM d, h:mm a"); } catch (e) { return ''; }
  }

  const getPriceRangeText = () => {
    if (!eventData?.is_paid || !eventData?.tickets || eventData.tickets.length === 0) return "Free";
    const prices = eventData.tickets.map(t => Number(t.price)).filter(p => !isNaN(p));
    if (prices.length === 0) return "Free";
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return `₦${minPrice.toLocaleString()}`;
    return `₦${minPrice.toLocaleString()} - ₦${maxPrice.toLocaleString()}`;
  };

 // const isOrganizer = currentUserId === eventData?.creator_id;
  const isOrganizer = currentUserId === eventData?.organizer_id;


  if (loading || !eventData) {
      return (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007BFF" />
          </View>
      );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
    <View style={styles.container}>

      {/* --- PAYSTACK INVISIBLE COMPONENT --- */}
    

      {/* Header Image */}
      <View style={styles.headerImageContainer}>
          <Image
            source={eventData.image_url ? { uri: eventData.image_url } : { uri: 'https://via.placeholder.com/800x600' }}
            style={styles.headerImage}
            resizeMode="cover"
          />
          <TouchableOpacity style={[styles.backButtonTop, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
               <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
      </View>

      {/* Tab Controller */}
      <View style={styles.tabContainerOuter}>
        <View style={styles.tabContainerInner}>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]} onPress={() => setActiveTab('overview')}>
                <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'announcements' && styles.tabButtonActive]} onPress={() => setActiveTab('announcements')}>
                <Text style={[styles.tabText, activeTab === 'announcements' && styles.tabTextActive]}>Announcements</Text>
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'overview' && (
           <View style={styles.sectionCard}>
             <Text style={styles.eventTitle}>{eventData.title}</Text>
             
             {/* Info Rows */}
             <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#007BFF" style={styles.infoIcon}/>
                <Text style={styles.infoText}>{formatRangeDate(eventData.start_date, eventData.end_date)}</Text>
             </View>
             
                 {/* Location Details (Hybrid handling) */}
             {(eventData.is_physical || eventData.location_type === 'hybrid') && (
                 <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={20} color="#d9534f" style={styles.infoIcon}/>
                    <Text style={[styles.infoText, { color: '#007BFF' }]}>
                        {eventData.location_details?.address || "Address View Map"}
                    </Text>
                 </View>
             )}
             {(eventData.is_online || eventData.location_type === 'hybrid') && (
                 <View style={styles.infoRow}>
                    <Ionicons name="videocam-outline" size={20} color="#6f42c1" style={styles.infoIcon}/>
                     <View>
                        <Text style={styles.infoText}>
                            {eventData.location_details?.platform || "Online Platform"}
                        </Text>
                        <Text style={styles.subInfoText}>(Link provided after booking)</Text>
                     </View>
                 </View>
             )}

              <View style={styles.creatorBox}>
                           <Text style={styles.creatorLabel}>Created by</Text>
                           <Text style={styles.creatorName}>{eventData.creator_name}</Text>
                       </View>

             <View style={styles.divider} />

             <Text style={styles.sectionHeader}>About</Text>
             <Text style={styles.descriptionText}>{eventData.description}</Text>

               {/* Tags (Optional) */}
             {eventData.tags && (
                 <View style={styles.tagRow}>
                     {eventData.tags.split(',').map((tag, index) => (
                         <View key={index} style={styles.tagPill}>
                             <Text style={styles.tagText}>#{tag.trim()}</Text>
                         </View>
                     ))}
                 </View>
             )}
           </View>
        )}

          {/* === VIEW 2: ANNOUNCEMENTS TAB === */}
        {activeTab === 'announcements' && (
            <View style={styles.sectionCard}>

                {/* SCENARIO A: Organizer View */}
                {isOrganizer ? (
                    <View>
                        <Text style={styles.sectionHeader}>Send an Update</Text>
                        <TextInput
                            style={styles.announcementInput}
                            placeholder="Write important venue changes, timings, etc..."
                            multiline
                            numberOfLines={4}
                            value={newAnnouncementText}
                            onChangeText={setNewAnnouncementText}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={[styles.postButton, postingLoading && { opacity: 0.7 }]}
                            onPress={handlePostAnnouncement}
                            disabled={postingLoading}
                        >
                            {postingLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.postButtonText}>Post Announcement</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider} />
                        <Text style={styles.subHeader}>Previous Announcements</Text>
                        {/* We use map instead of FlatList here because it's inside a ScrollView already */}
                        {announcements.map((item) => (
                            <View key={item.id} style={styles.announcementCard}>
                                <Text style={styles.announcementContent}>{item.content}</Text>
                                <Text style={styles.announcementDate}>Posted {formatAnnouncementDate(item.created_at)}</Text>
                            </View>
                        ))}
                         {announcements.length === 0 && (
                            <Text style={styles.emptyStateText}>You haven't posted anything yet.</Text>
                        )}

                    </View>
                ) : (
                // SCENARIO B: Attendee View
                    <View>
                        <Text style={styles.sectionHeader}>Updates from Organizer</Text>
                        {announcements.length === 0 ? (
                             <View style={styles.emptyStateContainer}>
                                 <Ionicons name="megaphone-outline" size={40} color="#ccc" />
                                 <Text style={styles.emptyStateText}>No announcements yet.</Text>
                                 <Text style={styles.subInfoText}>Stay tuned for updates!</Text>
                             </View>
                        ) : (
                            announcements.map((item) => (
                                <View key={item.id} style={styles.announcementCardAttendee}>
                                    <Text style={styles.announcementContent}>{item.content}</Text>
                                     <View style={styles.announcementFooterRow}>
                                         <Ionicons name="time-outline" size={12} color="#888" style={{marginRight:4}} />
                                         <Text style={styles.announcementDate}>{formatAnnouncementDate(item.created_at)}</Text>
                                     </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 15 }]}>
          <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price:</Text>
              <Text style={styles.priceValue}>{getPriceRangeText()}</Text>
          </View>
          <TouchableOpacity style={styles.ticketButton} onPress={handleBuyPress}>
              <Text style={styles.ticketButtonText}>
                  {eventData.is_paid ? 'Get Tickets' : 'Register Free'}
              </Text>
          </TouchableOpacity>
      </View>

      {/* --- TICKET SELECTION MODAL --- */}
      <Modal
        visible={showTicketModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTicketModal(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Ticket Type</Text>
                {eventData.tickets?.map((ticket, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.ticketOption}
                        onPress={() => onTicketSelect(ticket)}
                    >
                        <Text style={styles.ticketName}>{ticket.name}</Text>
                        <Text style={styles.ticketPrice}>₦{Number(ticket.price).toLocaleString()}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowTicketModal(false)}>
                    <Text style={styles.closeModalText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

                {/* CUSTOM PAYSTACK COMPONENT */}
            <PaystackPayment
            visible={showPaystack}
            paystackKey="pk_test_d1f11e6049002b4b2569f8458247007d016d2651"
            amount={selectedTicket ? Number(selectedTicket.price) : 0}
            billingEmail={userEmail}
            onCancel={() => {
                setShowPaystack(false);
                Alert.alert("Cancelled", "Payment was cancelled.");
            }}
            onSuccess={(res) => {
                setShowPaystack(false);
                handlePaymentSuccess(res);
            }}
            />

    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerImageContainer: { height: '35%', width: '100%' },
  headerImage: { width: '100%', height: '100%' },
  backButtonTop: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  tabContainerOuter: { marginTop: -25, paddingHorizontal: 20, zIndex: 5 },
  tabContainerInner: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 25, padding: 4, elevation: 3 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  tabButtonActive: { backgroundColor: '#007BFF' },
  tabText: { fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },
  scrollContent: { paddingTop: 15 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginHorizontal: 15, marginBottom: 15, elevation: 2 },
  eventTitle: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoIcon: { marginRight: 12 },
  infoText: { fontSize: 16, color: '#333', flex: 1 },
    subInfoText: { fontSize: 13, color: '#888', marginTop: 2 },

    creatorBox: {  },
  creatorLabel: { fontSize: 12, color: '#888' },
  creatorName: { fontSize: 16, fontWeight: '500', color: '#333' },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    subHeader: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 12 },
  descriptionText: { fontSize: 15, color: '#444', lineHeight: 24 },
   tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 15 },
  tagPill: { backgroundColor: '#f0f2f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  tagText: { color: '#666', fontSize: 13 },

  emptyStateText: { color: '#888', textAlign: 'center', marginVertical: 20 },

    // Announcement Styles
  announcementInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa', height: 100, marginBottom: 15 },
  postButton: { backgroundColor: '#007BFF', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  postButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  announcementCard: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007BFF' },
  announcementCardAttendee: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  announcementContent: { fontSize: 15, color: '#333', marginBottom: 8 },
  announcementFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  announcementDate: { fontSize: 12, color: '#888' },
  emptyStateContainer: { alignItems: 'center', paddingVertical: 30 },
 

  
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', paddingTop: 15, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#eee', elevation: 10 },
  priceContainer: { flex: 1, justifyContent: 'center' },
  priceLabel: { fontSize: 12, color: '#666' },
  priceValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  ticketButton: { flex: 1.5, backgroundColor: '#007BFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 50 },
  ticketButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  ticketOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 },
  ticketName: { fontSize: 16, fontWeight: '600' },
  ticketPrice: { fontSize: 16, color: '#007BFF', fontWeight: 'bold' },
  closeModalButton: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeModalText: { color: 'red', fontSize: 16 },
});