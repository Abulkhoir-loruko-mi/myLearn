import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';

export default function EditProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<any>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarFile, setNewAvatarFile] = useState<string | null>(null); // To track if image changed

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (!session) return;

      // 1. Get data from Profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
         throw error;
      }

      // If profile exists, load it. If not, fallback to Auth Metadata
      if (data) {
        setFullName(data.full_name || '');
        setBio(data.bio || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url);
      } else {
        // Fallback
        setFullName(session.user.user_metadata.full_name || '');
        setAvatarUrl(session.user.user_metadata.avatar_url);
      }

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reuse your Image Picker Logic here
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setNewAvatarFile(result.assets[0].uri); // Mark for upload
      setAvatarUrl(result.assets[0].uri); // Show preview
    }
  };

  // Helper: Upload Image (Simplified version of what you have)
  const uploadImage = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });

    const fileExt = uri.split('.').pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('event-images') // OR create a new bucket 'avatars'
        .upload(filePath, arrayBuffer as ArrayBuffer, { contentType: 'image/jpeg' });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const user = session.user;
      let finalAvatarUrl = avatarUrl;

      // 1. Upload new image if selected
      if (newAvatarFile) {
        finalAvatarUrl = await uploadImage(newAvatarFile);
      }

      const updates = {
        //id: user.id,
        full_name: fullName,
        bio,
        website,
        avatar_url: finalAvatarUrl,
        updated_at: new Date(),
      };

      // 2. Update 'profiles' table (Public Data)
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // 3. Sync with Auth Metadata (So app header updates instantly)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: finalAvatarUrl }
      });

      if (authError) throw authError;

      Alert.alert("Success", "Profile updated!", [
          { text: "OK", onPress: () => navigation.goBack() }
      ]);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
       // onPress={pickImage}
         style={styles.avatarContainer}>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.placeholder]}>
                    <Ionicons name="person" size={40} color="#ccc" />
                </View>
            )}
            <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={18} color="#fff" />
            </View>
        </TouchableOpacity>
        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        <Text style={styles.label}>Change Profile Photo not yet available</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput 
            style={styles.input} 
            value={fullName} 
            onChangeText={setFullName}
            placeholder="John Doe" 
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput 
            style={[styles.input, styles.textArea]} 
            value={bio} 
            onChangeText={setBio}
            placeholder="Tell us about yourself..." 
            multiline
            numberOfLines={4}
        />

        <Text style={styles.label}>Website (Optional)</Text>
        <TextInput 
            style={styles.input} 
            value={website} 
            onChangeText={setWebsite}
            placeholder="https://yourwebsite.com" 
            autoCapitalize="none"
        />

        <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={updateProfile}
            disabled={saving}
        >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  placeholder: { backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007BFF', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#fff' },
  changePhotoText: { marginTop: 10, color: '#007BFF', fontWeight: '500' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#000', padding: 16, borderRadius: 8, marginTop: 30, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});