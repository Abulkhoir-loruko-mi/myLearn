import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // Refreshes when screen appears
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profiles, setProfiles] = useState<any>(null);
  const [stats, setStats] = useState({ events: 0, ticketsSold: 0, revenue: 0 });
  const [isOrganizerMode, setIsOrganizerMode] = useState(false); // Toggle for view



  useFocusEffect(
    useCallback(() => {
      fetchProfileDatas();
    }, [])
  );

  const fetchProfileDatas = async () => {
    try {
      // 1. Get Current User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Fetch LIVE data from 'profiles' table
      // (Auth metadata is often slow to update, so we trust the table more)
      const { data, error } = await supabase
        .from('profiles')
        .select('*') // This grabs bio, avatar_url, full_name
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
      }

    } catch (error) {
      console.log("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your code

  // Fetch data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Profile Info
      
      setProfiles({
        email: user.email,
        id: user.id,
       
        full_name: user.user_metadata?.full_name || 'HostEasy User', 
        avatar_url: user.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
        bio: user.user_metadata?.bio || null
      });

      // 2. Get Organizer Stats (Count events and bookings for this user)
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', user.id);

      const eventCount = events?.length || 0;

      if (eventCount > 0) {
        // Calculate Revenue & Tickets (requires linking bookings to these events)
        const { data: bookings } = await supabase
          .from('bookings')
          .select('amount_paid')
          .in('event_id', events!.map(e => e.id)); // Get bookings for MY events

        const sold = bookings?.length || 0;
        const totalRev = bookings?.reduce((sum, b) => sum + (b.amount_paid || 0), 0) || 0;

        setStats({ events: eventCount, ticketsSold: sold, revenue: totalRev });
        setIsOrganizerMode(true); // Auto-enable organizer view if they have events
      }

    } catch (e) {
      console.log('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => await supabase.auth.signOut() }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007BFF"/></View>;

  return (
    <ScrollView style={styles.container}>
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <Image source={{ uri: profile?.avatar_url }} style={styles.avatar} />
        <Text style={styles.name}>{profile?.full_name || "User"}</Text>
        <Text style={styles.email}>{profiles?.email}</Text>
        
        // Example: Add this near your avatar in ProfileScreen

     {profile?.bio && (
        <Text style={{ color: '#666', textAlign: 'center', marginTop: 5, paddingHorizontal: 20 }}>
            {profile.bio}
        </Text>
    )}

        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* --- ORGANIZER DASHBOARD (Only shows if they have events) --- */}
      {isOrganizerMode && (
        <View style={styles.dashboardContainer}>
            <Text style={styles.sectionTitle}>Organizer Dashboard</Text>
            <View style={styles.statsRow}>
              {/* NEW: SCANNER BUTTON */}
                <TouchableOpacity 
                    style={{ 
                        marginTop: 10, 
                        backgroundColor: '#000', 
                        padding: 15, 
                        borderRadius: 10, 
                        flexDirection: 'row', 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                    }}
                    onPress={() => navigation.navigate('TicketScanner')}
                >
                <Ionicons name="scan-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Scan Tickets</Text>
                </TouchableOpacity>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.events}</Text>
                    <Text style={styles.statLabel}>Events</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.ticketsSold}</Text>
                    <Text style={styles.statLabel}>Sold</Text>
                </View>
                <View style={[styles.statCard, { borderRightWidth: 0 }]}>
                    <Text style={[styles.statValue, { color: '#28a745' }]}>
                        ₦{stats.revenue.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                </View>
            </View>
        </View>
      )}

      {/* --- MENU OPTIONS --- */}
      <View style={styles.menuContainer}>
        
        {/* General */}
        <MenuItem 
            icon="ticket-outline" 
            text="My Tickets" 
            onPress={() => navigation.navigate('My Tickets')} 
        />
        

        {isOrganizerMode && (
            <MenuItem 
                icon="calendar-outline" 
                text="Manage My Events" 
                onPress={() => navigation.navigate('ManageEvents')}
            />
        )}

        <View style={styles.divider} />

        <MenuItem 
            icon="notifications-outline" 
            text="Notification Preferences" 
            onPress={() => navigation.navigate('Notifications')} 
        />
       <MenuItem 
            icon="wallet-outline" 
            text="Wallet & Payouts" 
            onPress={() => navigation.navigate('Wallet')} 
        />
        
        <View style={styles.divider} />

        <MenuItem 
            icon="help-circle-outline" 
            text="Help & Support" 
            onPress={() => {}} 
        />
         <MenuItem 
            icon="log-out-outline" 
            text="Log Out" 
            color="red"
            onPress={handleLogout} 
        />

      </View>
      <View style={{height: 50}} />
    </ScrollView>
  );
}

// Helper Component for Menu Items
const MenuItem = ({ icon, text, onPress, color = '#333' }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuLeft}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={[styles.menuText, { color }]}>{text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15, borderWidth: 3, borderColor: '#f0f0f0' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#888', marginTop: 5 },
  editBtn: { marginTop: 15, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#007BFF', borderRadius: 20 },
  editBtnText: { color: '#fff', fontWeight: '600' },

  // Dashboard Stats
  dashboardContainer: { margin: 20, backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#eee' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#888' },

  // Menu
  menuContainer: { paddingHorizontal: 20, marginTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, backgroundColor: '#fff', marginBottom: 10, paddingHorizontal: 15, borderRadius: 12 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 35, alignItems: 'center', marginRight: 10 },
  menuText: { fontSize: 16, fontWeight: '500' },
  divider: { height: 20 },
});