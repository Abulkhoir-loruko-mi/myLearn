import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';



import CreateEvent from './CreateEvent';


import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MenuProvider } from 'react-native-popup-menu';
import EventDetails from './EventDetails';
import HomeScreen from './HomeScreen';
import MyTicketsScreen from './MyTicketScreen';
import NotificationsScreen from './NotificationsScreen';
import Profile from './Profile';
import PublishEvent from './PublishEvent';
import SignIn from './signIn';
import SignUp from './signUp';
import TicketScannerScreen from './TicketScannerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- 1. THE BOTTOM TABS ---
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true, 
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'alert-circle'; // Default fallback

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'My Tickets') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="My Tickets" component={MyTicketsScreen} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

// --- 2. THE AUTH STACK (Logged Out) ---
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signIn" component={SignIn} />
      <Stack.Screen name="signUp" component={SignUp} />
    </Stack.Navigator>
  );
};

// --- 3. THE APP STACK (Logged In) ---
const AppStack = () => {
  return (
    <Stack.Navigator>
       <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

       {/* These screens sit ON TOP of the tabs when navigated to */}
       <Stack.Screen name="CreateEvent" component={CreateEvent} options={{ title: 'Create Event' }} />
       <Stack.Screen name="PublishEvent" component={PublishEvent} />
       <Stack.Screen name="EventDetails" component={EventDetails} options={{ headerShown: false }} />
       <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
       <Stack.Screen name="TicketScanner" component={TicketScannerScreen} options={{ headerShown: false }} />
      
    </Stack.Navigator>
  );
};

// --- 4. ROOT NAVIGATOR (The Switch) ---
export default function AppNavigation() {
  //const [session, setSession] = useState(null);
    const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // WRAP EVERYTHING HERE
  return (
    <MenuProvider>
     
        {session && session.user ? <AppStack /> : <AuthStack />}
    
    </MenuProvider>
  );
}