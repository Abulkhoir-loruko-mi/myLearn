import Styles from '@/constants/styles'
import { useNavigation } from '@react-navigation/native'
import React, { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from './lib/supabase'

const SignIn = () => {

    const[password, setPassword]= useState('');
     const[email, setEmail]= useState('');
     const [loading, setLoading] = useState(false);
     const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
     

     const navigation = useNavigation<any>();

     const validate = () => {
    let valid = true;
    let tempErrors: { [key: string]: string } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
              tempErrors.email = "Email is required";
              valid = false;
            } else if (!emailRegex.test(email)) {
              tempErrors.email = "Please enter a valid email address";
              valid = false;
            }

    
    if (!password) {
      tempErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 8 characters";
      valid = false;
    } 

    setErrors(tempErrors);
    return valid;
  };


     const handleSignIn = async () => {
    // 1. Basic Input Validation
   
    if (!validate()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      // Errors (e.g., Wrong password, User not found)
      if (error) {
        Alert.alert('Login Failed', error.message);
        return;
      }

      // 4. Success!
      // save tokens. Supabase/AsyncStorage does it.
      //console.log('User ID:', data.user.id);
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

     



  return (
   <View style ={Styles.containersign}>
      <View style={Styles.container3}>
        <Text style={Styles.title}>Signin</Text>
        <Text style={Styles.subtitle}>SignIn with your email and password</Text>
      <View>
       
        <Text>Email</Text>
        <TextInput style={[ styles.textInput, errors.email && styles.inputError]}
            value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors({...errors, email: null});
          }}
           placeholder='Enter your Mail'
          autoCapitalize="none"
          keyboardType="email-address"
         
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      
        
        
        <Text>Password</Text>
        <TextInput style={[ styles.textInput, errors.password && styles.inputError]}
            value={password}
         onChangeText={(text) => {
            setPassword(text);
            if (errors.password) setErrors({...errors, password: null});
          }}
          placeholder='Password'
          secureTextEntry
        
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}


        <Text
         style = {Styles.text}
          onPress={()=>console.log('pressed')}>
         Forgot password
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" />
      ) : (

        <Pressable style={Styles.button} onPress={handleSignIn}>
        <Text style={Styles.buttonText}>Login</Text>
      </Pressable>
      )}

            

      
      <Pressable onPress={() => navigation.navigate('signUp')}>
        <Text style={Styles.linkText}>Don't have an account? Sign Up</Text>
      </Pressable>
    




      
     

      </View>

      
    </View>
  )
}

export default SignIn

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333' },
  
  inputGroup: { marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
   // backgroundColor: '#fafafa'
  },
   textInput:{
    borderWidth:0.5,
    borderColor:'grey',
    borderRadius:12,
    padding:8,
    fontSize:16,
    margin:8
   },
  inputError: {
    borderColor: 'red', // Highlight border red on error
    backgroundColor: '#fff0f0'
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5
  },
  
 
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#007BFF', textAlign: 'center' }
});