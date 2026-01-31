import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';

export default function TicketScannerScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermissions();
  }, []);

  const playSound = async (success: boolean) => {
    // Optional: I can play a beep sound here for feedback
    // distinct sounds for success/failure 
  };

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      // 1. Parse the QR Data
      // We expect data to be: {"bookingId":"...", "userId":"..."}
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        Alert.alert("Invalid QR", "This is not a HostEasy ticket.");
        return;
      }

      if (!qrData.bookingId) {
        Alert.alert("Invalid QR", "Missing ticket information.");
        return;
      }

      // 2. Fetch Booking from Database
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, events(title, organizer_id)')
        .eq('id', qrData.bookingId)
        .single();

      if (error || !booking) {
        Alert.alert("Error", "Ticket not found in database.");
        return;
      }

      // 3. Security Check: Is this YOUR event?
      const { data: { user } } = await supabase.auth.getUser();
      if (booking.events.creator_id !== user?.id) {
        Alert.alert("Access Denied", "You are not the organizer of this event.");
        return;
      }

      // 4. Status Check
      if (booking.status === 'checked_in') {
        Alert.alert("⚠️ ALREADY USED", `Ticket for ${booking.ticket_name} has already been scanned.`);
        return;
      }

      // 5. Success! Mark as Used
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'checked_in' }) // We change status to prevent reuse
        .eq('id', booking.id);

      if (updateError) throw updateError;

      Alert.alert("✅ VALID TICKET", `${booking.ticket_name}\nGuest: ${qrData.userId}\n\nChecked in successfully!`);

    } catch (err: any) {
      console.log(err);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      // Wait a bit before allowing next scan to prevent double-scanning
      setTimeout(() => setScanned(false), 2000); 
    }
  };

  if (hasPermission === null) return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
  if (hasPermission === false) return <View style={styles.center}><Text>No access to camera</Text></View>;

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Overlay UI */}
      <View style={styles.overlay}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Scan Ticket</Text>
        </View>

        <View style={styles.scannerFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
        </View>
        
        <Text style={styles.instruction}>Align QR code within the frame</Text>

        {loading && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{color:'#fff', marginTop:10}}>Verifying...</Text>
            </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center' },
  closeBtn: { padding: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 20 },

  scannerFrame: { width: 250, height: 250, position: 'relative' },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#007BFF' },
  cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#007BFF' },
  cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#007BFF' },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#007BFF' },

  instruction: { color: '#fff', marginTop: 20, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 5 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }
});