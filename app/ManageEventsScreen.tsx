import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';

export default function ManageEventsScreen({ navigation }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload data every time the screen appears
  useFocusEffect(
    useCallback(() => {
      fetchMyEvents();
    }, [])
  );

  const fetchMyEvents = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Fetching events created by this user
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id) 
      .order('start_date', { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (event: any) => {
    // 1. Check if tickets have been sold
    const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true }) // 'head' means don't return data, just count
        .eq('event_id', event.id);

    if (count && count > 0) {
        Alert.alert("Cannot Delete", "You have already sold tickets for this event. You must cancel it instead.");
        return;
    }

    // 2. Confirm Deletion
    Alert.alert(
      "Delete Event?",
      `Are you sure you want to remove "${event.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);
            
            if (error) Alert.alert("Error", error.message);
            else fetchMyEvents(); // Refresh list
          }
        }
      ]
    );
  };

 const renderEventItem = ({ item }: { item: any }) => {
    // Check if it is a draft
    const isDraft = item.status === 'draft';

    return (
      <View style={[styles.card, isDraft && styles.draftCard]}> 
        {/* ^ Optional: Dim the whole card if it's a draft */}
        
        <View>
            <Image source={{ uri: item.image_url }} style={styles.image} />
            {/* DRAFT BADGE OVERLAY */}
            {isDraft && (
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>DRAFT</Text>
                </View>
            )}
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          
          <Text style={styles.date}>
              {new Date(item.start_date).toLocaleDateString()}
          </Text>
          
          <View style={styles.actions}>
              {/* Edit Button */}
              <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#007BFF', marginRight: 10 }]}
                  onPress={() => navigation.navigate('CreateEvent', { event: item })} 
                 // onPress={() => Alert.alert("Coming Soon", "Edit functionality")}
              >
                  <Ionicons name="create-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>Edit</Text>
              </TouchableOpacity>
  
              {/* Delete Button */}
              <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#dc3545' }]}
                  onPress={() => handleDelete(item)}
              >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
                <Text style={{color: '#888'}}>You haven't created any events yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  card: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 15, borderRadius: 10, overflow: 'hidden', elevation: 2 },
  image: { width: 100, height: 100 },
  content: { flex: 1, padding: 10, justifyContent: 'space-between' },
  title: { fontWeight: 'bold', fontSize: 16 },
  date: { color: '#666', fontSize: 12 },
  actions: { flexDirection: 'row', marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  emptyCenter: { alignItems: 'center', marginTop: 50 },
  // Add these to your existing styles
  draftCard: {
    opacity: 0.8, // Slightly fade draft cards
    backgroundColor: '#f8f9fa',
  },
  badgeContainer: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FFC107', // Amber/Yellow color for Draft
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
});