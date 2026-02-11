

import Styles from '@/constants/styles';
import { useNavigation } from "expo-router";
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/app/lib/supabase';


interface FormErrors{
  name?:string;
  email?:string;
  password?:string;
}


interface UserData{
  name:string;
  email:string;
  signupDate:string
}



export default function SignUp() {
    const [errors, setErrors] = useState<FormErrors>({});
    //const [formData, setFormData] = useState<FormData>({name:'',email:'',password:''});
  const[isSubmitting, setIsSubmitting]= useState(false)
 
    const[name, setName]= useState('');
    const[email, setEmail]= useState('');
    const[phone, setPhone]= useState('');
    const[password, setPassword]= useState('');
    const[loading, setLoading]=useState(false);
   

    const navigation = useNavigation<any>();

          const validate = () => {
            let valid = true;
            let newErrors: FormErrors = {};

            // 1. Full Name Check
            if (!name) {
              newErrors.name = "Full Name is required";
              valid = false;
            } else if (name.trim().split(' ').length < 2) {
              newErrors.name = "Please enter both First and Last name";
              valid = false;
            }

            // 2. Email Check (Regex)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
              newErrors.email = "Email is required";
              valid = false;
            } else if (!emailRegex.test(email)) {
              newErrors.email = "Please enter a valid email address";
              valid = false;
            }

           
            const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            
            if (!password) {
              newErrors.password = "Password is required";
              valid = false;
            } else if (password.length < 6) {
              newErrors.password = "Password must be at least 6 characters";
              valid = false;
            }
            

            setErrors(newErrors);
            return valid;
          };

     


            const handleSignUp = async () => {
                // 1. Basic Validation
                if (!validate()) return;

                setLoading(true);

                try {
                // 2. Call Supabase Auth
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                    // 'data' adds extra fields to the 'raw_user_meta_data' column in Supabase
                    data: {
                        full_name: name,
                        phone_number: phone, 
                       
                    },
                    },
                });

                
                if (error) {
                    Alert.alert('Sign Up Failed', error.message);
                    return;
                }

                
                // If data.session is null, it means email confirmation is required
                if (data.user && !data.session) {
                    Alert.alert(
                    'Verification Sent',
                    'Please check your email inbox to verify your account before logging in.'
                    );
                     navigation.navigate('signIn');
                } else {
                    // Auto-confirm is enabled, user is logged in
                    Alert.alert('Success', 'Account created successfully!');
                   
                    // Clear form
                    setName('');
                    setEmail('');
                    setPassword('');
                    setErrors({});
                        }

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
        <Text style={Styles.title}>SignUp</Text>
        <Text style={Styles.subtitle}>SignUp with your email and password</Text>
      <View>
        <Text>Name</Text>
        <TextInput style={[Styles.textInput,errors.name && Styles.inputError]}
            value={name}
            onChangeText={(text)=>{
              setName(text);
              if(errors.name) setErrors({...errors, name:undefined});
            }}
            placeholder='Enter your FullName'
            maxLength={40}
        />
        {errors.name && <Text style={Styles.errorText}>{errors.name}</Text>}


        <Text>Email</Text>
        <TextInput style={Styles.textInput}
             value={email}
            onChangeText={(text)=>{
              setEmail(text);
              if(errors.email) setErrors({...errors, email:undefined});
            }}
            placeholder='Enter your Mail'
            keyboardType='email-address'
            autoCapitalize="none"

        />


        <Text>Phone Number</Text>
        <TextInput style={Styles.textInput}
            value={phone}
            onChangeText={setPhone}
            placeholder='Phone Number'
            keyboardType='phone-pad'
        />
        <Text>Password</Text>
        <TextInput style={[Styles.textInput, errors.password && Styles.inputError]}
            value={password}
            onChangeText={(text)=>{
              setPassword(text)
              if(errors.password) setErrors({...errors, password:undefined})
            }}
            placeholder='Password'
            secureTextEntry={true}
            autoCorrect={false}
            autoCapitalize="none"
        />
        {errors.password && <Text style={Styles.errorText}> {errors.password}</Text>}


      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (

        <Pressable style={Styles.button} onPress={handleSignUp}>
        <Text style={Styles.buttonText}>Sign Up</Text>
      </Pressable>
      )}

     

      <Pressable onPress={() => navigation.navigate('signIn')}>
        <Text style={Styles.linkText}>Already have an account? Login</Text>
      </Pressable>


      
     

      </View>

      
    </View>
  )
}