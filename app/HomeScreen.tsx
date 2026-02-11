import { registerForPushNotificationsAsync } from '@/app/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import React, { SetStateAction, useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,

    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import {
    Menu,
    MenuOption,
    MenuOptions,
    MenuTrigger,
} from 'react-native-popup-menu';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../components/EventCard';
import { supabase } from './lib/supabase';

type Event={
    id:string
    event:[]
}


export default function HomeScreen({ navigation }:any) {
  // --- State ---
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Friend');
   const[creatorName, setCreatorname]= useState('loading...')

  // Filter States
  const [searchText, setSearchText] = useState('');
  const [selectedTimeTab, setSelectedTimeTab] = useState('upcoming'); // 'all', 'upcoming', 'past'
  const [selectedCategory, setSelectedCategory] = useState(null); // null = 'All'

  const categories = [
      {id: null, name: 'All Categories'},
      {id: 'tech', name: 'Tech'},
      {id: 'business', name: 'Business'},
      {id: 'islamic_history', name: 'Islamic History'},
     // {id: 'music', name: 'Music'},
  ];





  // --- Fetch User Info on Mount ---
  useEffect(() => {
    const fetchUser = async () => {
        // 1. latest user object freshly from Supabase
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.log("Error fetching user or no session:", error?.message);
            return;
        }
        let fullName = user.user_metadata?.full_name;
        // 4. Set the name if found
        if (fullName) {
             // Split by space and get the first part (the first name now my surname)
             setUserName(fullName.split(' ')[0]);
        } else {
             console.log("Could not find 'full_name' in metadata.");
            
             // setUserName(user.email?.split('@')[0] || 'Friend');
        }
    };
    fetchUser();
    registerForPushNotificationsAsync();
  }, []);



  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select('*');

    const now = new Date().toISOString();

      if (selectedTimeTab === 'upcoming') {
          //  events that end in the future
          query = query.gte('end_date', now).order('start_date', { ascending: true });
      } else if (selectedTimeTab === 'past') {
          //  events that ended already
          query = query.lt('end_date', now).order('start_date', { ascending: false }); // Most recent past first
      } else {
          // 'all' - default order
          query = query.order('start_date', { ascending: true });
      }



    if (selectedCategory) {
    query = query.eq('category', selectedCategory);
    }

   
    if (searchText) {
    query = query.ilike('title', `%${searchText}%`);
    }


    const { data, error } = await query;

        
        if (error) throw error;

        setEvents(data || []);

        } catch (error) {
        // console.error("Error fetching events:", error.message);
        } finally {
        setLoading(false);
        setRefreshing(false);
        }
    }, [selectedTimeTab, selectedCategory, searchText]); // Re-run if filters change

    // Effect to run fetch on filter changes
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchEvents();
    };

    const renderTimeTab = (label: string , value: SetStateAction<string>) => {
      const isActive = selectedTimeTab === value;
      return (
        <TouchableOpacity 
            style={[styles.timeTab, isActive && styles.timeTabActive]}
            onPress={() => setSelectedTimeTab(value)}
        >
            <Text style={[styles.timeTabText, isActive && styles.timeTabTextActive]}>{label}</Text>
        </TouchableOpacity>
      );
  };

  const renderCategoryChip = (cat:any) => {
      const isActive = selectedCategory === cat.id;
      return (
        <TouchableOpacity 
            key={cat.id || 'all'}
            style={[styles.catChip, isActive && styles.catChipActive]}
            onPress={() => setSelectedCategory(cat.id)}
        >
            <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>{cat.name}</Text>
        </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        
        {/* --- FIXED HEADER AREA --- */}
        <View style={styles.fixedHeader}>

                        {/* Greeting Row */}
            <View style={styles.greetingRow}>
                <Text style={styles.greetingText}>Hello, {userName} 👋</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* NEW: Notification Bell */}
                    <TouchableOpacity 
                        style={{ marginRight: 15, padding: 5 }} // Padding makes it easier to tap
                        onPress={() => navigation.navigate('Notifications')}
                    >
                    <Ionicons name="notifications-outline" size={24} color="#333" />
                        {/* Optional: Red Dot (Visual only for now) */}
                      <View style={styles.redDot} /> 
                    </TouchableOpacity>

    

                    {/* NEW: Dropdown Menu */}
                    <Menu>
                        <MenuTrigger>
                            <View style={{ padding: 5, marginRight: 5 }}>
                                <Ionicons name="ellipsis-vertical" size={24} color="#333" />
                            </View>
                        </MenuTrigger>
                        
                        <MenuOptions customStyles={optionsStyles}>
                            {/* Option 1: Create Event */}
                            <MenuOption onSelect={() => navigation.navigate('CreateEvent')}>
                                <View style={styles.menuOptionRow}>
                                    <Ionicons name="add-circle-outline" size={24} color="#007BFF" style={{ marginRight: 10 }} />
                                    <Text style={styles.menuOptionText}>Create Event</Text>
                                </View>
                            </MenuOption>
                            
                            {/* Option 2: Static Item (Settings) */}
                            <MenuOption onSelect={() => alert('Settings coming soon!')}>
                                <View style={styles.menuOptionRow}>
                                    <Ionicons name="settings-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                    <Text style={styles.menuOptionText}>Settings</Text>
                                </View>
                            </MenuOption>

                            {/* Option 3: Static Item (Help) */}
                            <MenuOption onSelect={() => alert('Help coming soon!')}>
                                <View style={styles.menuOptionRow}>
                                    <Ionicons name="help-circle-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                    <Text style={styles.menuOptionText}>Help & Support</Text>
                                </View>
                            </MenuOption>
                        </MenuOptions>
                    </Menu>

                </View>

            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#888" style={{marginRight: 8}} />
                <TextInput
                    placeholder="Search events..."
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={setSearchText}
                    // Optional: trigger search on submit instead of every keystroke for performance
                    onSubmitEditing={fetchEvents} 
                />
            </View>
            <View style={styles.timeTabContainer}>
                {renderTimeTab('All Events', 'all')}
                {renderTimeTab('Upcoming', 'upcoming')}
                {renderTimeTab('Past', 'past')}
            </View>

            <View style={{ height: 50 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.catScroll}>
                    {categories.map(renderCategoryChip)}
                </ScrollView>
            </View>
        </View>

        {loading && !refreshing ? (
            <View style={styles.centerContainer}><ActivityIndicator size="large" color="#007BFF"/></View>
        ) : events.length === 0 ? (
            <View style={styles.centerContainer}>
                 <Ionicons name="calendar-clear-outline" size={50} color="#ccc" />
                 <Text style={styles.emptyText}>No events found.</Text>
                 <Text style={styles.emptySubText}>Try adjusting your filters.</Text>
            </View>
        ) : (
            <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    
                    <EventCard 
                        event={item} 
                        onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                    />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007BFF"/>
                }
            />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  contentContainer: { flex: 1 },
  
  // --- Header Styles ---
  fixedHeader: { backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  greetingText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileIconPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' },

  // Add inside StyleSheet.create({...})

  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  menuOptionText: {
    fontSize: 16,
    color: '#333',
  },



  
redDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    borderWidth: 1,
    borderColor: '#fff'
},
  
  searchContainer: { flexDirection: 'row', backgroundColor: '#f0f2f5', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 15 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },

  // --- Filter Styles ---
  timeTabContainer: { flexDirection: 'row', backgroundColor: '#f0f2f5', borderRadius: 8, padding: 4, marginBottom: 15 },
  timeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  timeTabActive: { backgroundColor: '#007BFF' },
  timeTabText: { fontWeight: '600', color: '#666', fontSize: 13 },
  timeTabTextActive: { color: '#fff' },

  catScroll: { paddingRight: 20, alignItems: 'center' },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f0f2f5', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  catChipActive: { backgroundColor: '#E6F0FF', borderColor: '#007BFF' },
  catChipText: { color: '#555', fontWeight: '500' },
  catChipTextActive: { color: '#007BFF' },

  // --- List Styles ---
  listContent: { padding: 20, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#555', marginTop: 15 },
  emptySubText: { color: '#888', marginTop: 5 },
});

//  OUTSIDE the StyleSheet.create, just as a constant variable
const optionsStyles = {
  optionsContainer: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 10,
    elevation: 5, // Shadow for Android
    marginTop: 30, // Push it down a bit
    width: 200,
  },
};