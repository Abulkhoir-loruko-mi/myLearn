import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';



const EventCard = ({ event, onPress }:any) => {
  const { title, image_url, start_date, is_online,is_physical, location_details, is_paid, tickets } = event;

  const formatEventDate = (isoString: string) => {
    if (!isoString) return 'Date TBD';
    try {
      // Example output: "Sat, Oct 25 • 2:00 PM"
      return format(parseISO(isoString), "EEE, MMM d • h:mm a");
    } catch (e) {
      return 'Invalid Date';
    }
  };


  const getPriceText = () => {
    if (!is_paid || !tickets || tickets.length === 0) {
      return <Text style={[styles.priceText, { color: 'green' }]}>Free</Text>;
    }
   
    const prices = tickets.map((t: { price: any; }) => Number(t.price));
    const minPrice = Math.min(...prices);
    return <Text style={styles.priceText}>From ₦{minPrice.toLocaleString()}</Text>;
  };

  return (
    // The entire card is clickable
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.9}>
      
      {/* 1. Top Half: Image Banner */}
      <Image
        source={image_url ? { uri: image_url } : { uri: 'https://via.placeholder.com/400x200?text=No+Image' }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      {/* Optional Badge Example */}
      {is_online && (
          <View style={styles.badge}><Text style={styles.badgeText}>Online</Text></View>
      )}

       {!is_online && (
          <View style={styles.badge}><Text style={styles.badgeText}>Physical</Text></View>
      )}

      {is_online && is_physical &&(<View style={styles.badge}><Text style={styles.badgeText}>Hybrid</Text></View>)}




      {/* 2. Bottom Half: Details Area */}
      <View style={styles.detailsContainer}>
        {/* Date */}
        <Text style={styles.dateText}>{formatEventDate(start_date)}</Text>
        
        {/* Title (limited to 2 lines) */}
        <Text style={styles.titleText} numberOfLines={2}>{title}</Text>

        {/* Location */}
       
          {is_online && (
               <View style={styles.locationRow}>
          <Ionicons 
            name={is_online && 'videocam-outline' } 
            size={16} color="#666" 
            style={{marginRight: 4}}
          />
          <Text style={styles.locationText}>{location_details.platform}</Text>
          </View>
            
          
          )}
          
        

        
           {is_physical && (
             <View style={styles.locationRow}>
            <Ionicons 
              name={is_physical &&  'location-outline'} 
              size={16} color="#666" 
              style={{marginRight: 4}}
            />

            <Text style={styles.locationText}>{location_details.address}</Text>
           </View>
            
            )}
         

        {/* 3. The Action Row (New) */}
        <View style={styles.actionRow}>
           {/* Left Side: Price */}
           <View style={{ justifyContent: 'center' }}>
             {getPriceText()}
           </View>

           {/* Right Side: Attend Button (Visual only, click handled by parent touchable) */}
           <View style={styles.attendButton}>
             <Text style={styles.attendButtonText}>Attend Event</Text>
           </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden', // Keeps image rounded corners
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3, // Android shadow
    marginHorizontal: 2 // Tiny margin for shadow visibility
  },
  bannerImage: { width: '100%', height: 150 },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#6f42c1', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  detailsContainer: { padding: 15 },
  dateText: { fontSize: 13, color: '#007BFF', fontWeight: '600', marginBottom: 6 },
  titleText: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8, lineHeight: 24 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  locationText: { fontSize: 14, color: '#666' },

  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  attendButton: { backgroundColor: '#007BFF', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  attendButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

export default EventCard;