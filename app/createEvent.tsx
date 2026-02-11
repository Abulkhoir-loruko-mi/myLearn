import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { decode } from 'base64-arraybuffer';
import Checkbox from 'expo-checkbox';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// FORCE the use of the legacy Expo FileSystem to avoid warnings/errors
// This allows us to use readAsStringAsync in Expo SDK 52+
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';


type Bank = {
  label: string;
  value: string;
};


if(Platform.OS==='android' && UIManager.setLayoutAnimationEnabledExperimental){UIManager.setLayoutAnimationEnabledExperimental(true);}

const DATA=[{id:1, title:'Appearance', description:'upload image , event name and description'},
    {id:2, title:'Schedule', description:'set how and when this event is happening'},
    {id:3, title:'Ticket', description:'set the Ticket policy'}
]


const platforms=[
{label:'Whatsapp', value:'Whatsapp',icon:'whatsapp'},
{label:'Telegram', value:'Telegram',icon:'telegram'},
{label:'Youtube', value:'Youtube',icon:'youtube'},
{label:'Twitter', value:'Twiter',icon:'twitter'}
]

const language=[
{label:'English', value:'english'},
{label:'Yoruba', value:'yoruba'},
{label:'Hausa', value:'hausa'},
{label:'Arabic', value:'arabic'}
]

export default function CreateEvent({navigation,route}:any) {
    const[activeid, setActiveid]=useState(null)
    const[eventName, setEventName]=useState('')
    const[description, setDescription]=useState('')
    const[customUrl, setCustomUrl]=useState('')
    const[photo, setPhoto]=useState<string | null>(null)
    const[uploading, setUploading]= useState(false)
     const[uploadingd, setUploadingd]= useState(false)
    const [online, setOnline]=useState(false)
    const [physical, setPhysical]= useState(false)
    const[address, setAddress]=useState('')
    const[PlatformLink, setPlatformlink]=useState('')
    const[selectedPlatform, setselectedPlat]=useState(null);
    const[selectedLanguage, setselectedLanguage]=useState('')
    const[isFocus, setIsFocus] =useState(false)
    const[single, setSingleEvent]=useState(true)
    const[recurring, setRecurring]=useState(false)
    const[selectedDays, setSelectedDays]=useState<Array<string>>([])
  const [startDate, setStartDate] = useState<Date | null>(null);
const [startTime, setStartTime] = useState<Date | null>(null);

const [endDate, setEndDate] = useState<Date | null>(null);
const [endTime, setEndTime] = useState<Date | null>(null);
    const[isStartDatePickerVisible, setStartDatePickerV]=useState(false)
    const[isStartTimePickerVisible, setStartTimePickerVi]=useState(false)
    const[isEndDatePickerVisible, setEndDatePickerV]=useState(false)
    const[isEndTimePickerVisible, setEndTimePickerVi]=useState(false)
    const[ispaid, setIsPaid]= useState(false)
    const [tickets, setTickets]=useState([
        {id:Date.now(), name:'', price:'', quantity:''}
    ]);
    const [businessName, setBusinessName] = useState('');
    const [bankList, setBankList] = useState([]);
   const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [isManualBank, setIsManualBank] = useState(false); 
    const [manualBankName, setManualBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState(''); 
    const [isVerifying, setIsVerifying] = useState(false);
    const[isDraft, setIsDraft]=useState(true);
      const [errors, setErrors] = useState<Record<string, string>>({});





    const ErrorText = ({ error }:any) => {
    if (!error) return null;
    return <Text style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{error}</Text>;
    }

  const eventToEdit = route.params?.event; 
  const isEditing = !!eventToEdit;


 


  useEffect(() => {
  // Check if an event was passed via navigation
  const eventToEdit = route.params?.event;
  
  if (eventToEdit) {
    // 1. Basic Info
    setEventName(eventToEdit.title);
    setDescription(eventToEdit.description);
    setPhoto(eventToEdit.image_url); // Store existing URL
    setCustomUrl(eventToEdit.custom_url);



    // 2. Dates (Convert strings back to Date objects)
    if (eventToEdit.start_date) {
        const start = new Date(eventToEdit.start_date);
        setStartDate(start);
        setStartTime(start); // Assuming separate states for date/time
    }
    if (eventToEdit.end_date) {
        const end = new Date(eventToEdit.end_date);
        setEndDate(end);
        setEndTime(end);
    }

    // 3. Toggles & Arrays
    setOnline(eventToEdit.is_online);
    setPhysical(eventToEdit.is_physical);
    setRecurring(eventToEdit.is_recurring);
    setTickets(eventToEdit.tickets || []); // Load tickets back
    setIsPaid(eventToEdit.is_paid);
    
    // 4. Location Details
    if (eventToEdit.location_details) {
        setAddress(eventToEdit.location_details.address || '');
        setPlatformlink(eventToEdit.location_details.link || '');
        setselectedPlat(eventToEdit.location_details.platform || '');
    }
  }
}, [route.params?.event]);







    const toggleExpand=(id: any)=>{
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setActiveid(id===activeid? null:id)
    }


    const pickImage = async ()=>{
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes:['images'],
            allowsEditing:true,
            aspect:[4,3],
            quality:1
        });
        if (!result.canceled){
            setPhoto(result.assets[0].uri);
        }
    };

    const uploadImageToSupabase = async (uri:any) => {
  try {
    if (!uri) return null;

    // 1. Create a unique file path
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpeg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `event-images/${fileName}`;

    // 2. Read the file as a Base64 String
    // (This avoids the "Blob" issues that cause Network Errors)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 3. Convert to ArrayBuffer (Raw Binary)
    const fileData = decode(base64);

    // 4. Upload!
    const { data, error } = await supabase.storage
      .from('events') // Make sure this bucket exists!
      .upload(filePath, fileData, {
        contentType: `image/${fileExt}`,
        upsert: false
      });

    if (error) {
      // If error is "newtwork request failed", it might be file size
      console.error("Supabase Upload Error:", error);
      throw error;
    }

    // 5. Get Public URL
    const { data: urlData } = supabase.storage
      .from('events')
      .getPublicUrl(filePath);

    return urlData.publicUrl;

  } catch (error) {
    console.error("Upload failed:", error);
    alert("Image upload failed. Please try again.");
    return null;
  }
};
 



  const saveEventToDB = async (statusOverride: any) => {
    // Check if we are in "Edit Mode"
    const eventToEdit = route.params?.event;
    const isEditing = !!eventToEdit;

    // --- 1. SMART IMAGE HANDLING ---
    // If photo starts with 'http', it's already uploaded. Don't upload again.
    let imageUrl = photo;
    
    if (photo && !photo.startsWith('http')) {
        // It's a local file, so we must upload it
        imageUrl = await uploadImageToSupabase(photo);
        if (!imageUrl) return null;
    } else if (!photo) {
        alert("Please select an event image");
        return null;
    }

    // --- 2. PREPARE DATA ---
    const prepareEventData = async () => {
        const fullStartDateTime = combineDateAndTime(startDate, startTime);
        const fullEndDateTime = combineDateAndTime(endDate, endTime);

        const settlementPayload = ispaid ? {
            business_name: businessName,
            bank_name: isManualBank ? manualBankName : selectedBank?.label,
            bank_code: isManualBank ? null : selectedBank?.value,
            account_number: accountNumber,
            account_name: accountName
        } : null;

        const { data: { user } } = await supabase.auth.getUser();

        return {
            title: eventName,
            description: description,
            image_url: imageUrl, // Use the smart URL from step 1
            custom_url: customUrl,
            is_online: online,
            is_physical: physical,
            location_details: {
                platform: selectedPlatform,
                link: PlatformLink,
                address: address
            },
            language: selectedLanguage,
            is_recurring: recurring,
            recurring_days: selectedDays,
            start_date: fullStartDateTime,
            end_date: fullEndDateTime,
            is_paid: ispaid,
            tickets: tickets,
            settlement_info: settlementPayload,
            // If editing, keep existing status, otherwise use draft/published logic
            status: statusOverride || (isDraft ? 'draft' : 'published'), 
            organizer_id: user?.id,
            creator_name: user?.user_metadata?.full_name
        };
    };

    // --- HELPER TO MERGE DATE + TIME ---
interface DateTimeObject extends Date {}

const combineDateAndTime = (dateObj: DateTimeObject | null, timeObj: DateTimeObject | null): string | null => {
    if (!dateObj || !timeObj) return null;
    
    const date = new Date(dateObj);
    const time = new Date(timeObj);
    
    // Set the hours/minutes of the Date object to match the Time object
    date.setHours(time.getHours());
    date.setMinutes(time.getMinutes());
    
    return date.toISOString(); // Returns "2025-10-25T14:30:00.000Z"
};



    const eventData = await prepareEventData();

    // --- 3. DATABASE ACTION (UPDATE OR INSERT) ---
    let resultData, error;

    if (isEditing) {
        // A. UPDATE EXISTING EVENT
        const { data, error: updateError } = await supabase
            .from('events')
            .update(eventData)
            .eq('id', eventToEdit.id) // Target the specific ID
            .select();
        
        resultData = data;
        error = updateError;
    } else {
        // B. CREATE NEW EVENT
        const { data, error: insertError } = await supabase
            .from('events')
            .insert([eventData])
            .select();
        
        resultData = data;
        error = insertError;
    }

    if (error) {
        alert(error.message);
        return null;
    }

    return resultData ? resultData[0] : null;
};

  // --- BUTTON 1: SAVE AS DRAFT ---
  const handleSaveDraft = async () => {
     if (!eventName || !startDate || !endDate) return alert("Please fill basic info:Eventname , start/end date and time");
    
    const newEvent = await saveEventToDB('draft');
     setUploadingd(true)
    if (newEvent) {
     setUploadingd(false)
      alert("Event saved to Drafts!");
      navigation.navigate('MainTabs'); 
    }
  };

  // --- BUTTON 2: SAVE & CONTINUE ---
  const handleSaveAndContinue = async () => {
   
    // Validate inputs first!

    if (!validateDraftForm()) {
      Alert.alert("Validation Error", "Please fix the errors highlighted in red.");
      return; // Stop execution if invalid
  }
    //if (!eventName || !startDate) return alert("Please fill basic info");

     setUploading(true)

     const currentStatus = route.params?.event?.status || 'draft';
    const newEvent = await saveEventToDB(currentStatus);

    setUploading(false);

    // Save as 'draft' first (or a temp status), then move to next screen
   // const newEvent = await saveEventToDB('draft'); 
    
    if (newEvent) {
        setUploading(false)
      // NAVIGATE TO PUBLISH PAGE
      // We pass the 'eventId' so the next page knows what to fetch/update
      navigation.navigate('PublishEvent', { 
        eventId: newEvent, 
        previewImage: newEvent.image_url,
        previewTitle: newEvent.title,
        startDate:newEvent.start_date,
        description:newEvent.description,
        event: newEvent,
        mode: route.params?.event ? 'edit' : 'create'
      });
    }
  };

   

    const handleConfirmStartDate=(date:any)=>{
        if(endDate && date > endDate){
            setEndDate(null);
            Alert.alert('Notice', 'reselect end date')

        }
       setStartDate(date)
        setStartDatePickerV(false)
    }

    const handleConfirmEndDate=(date:any)=>{
        if(startDate && date< startDate){
            setEndDatePickerV(false)
            Alert.alert('Notice', 'End date can not be before start date')
        }

        setEndDate(date)
        setEndDatePickerV(false)
    }

   

    const handleConfirmStartTime =(date:any)=>{
        // If called without a Date (e.g., button onPress), open the picker instead
        if(!date || typeof date?.toLocaleTimeString !== 'function'){
            setStartTimePickerVi(true);
            return;
        }
        setStartTime(date);
        setStartTimePickerVi(false)
        if(endTime && date > endTime){
            setEndTime(null);
            Alert.alert('Notice', 'SElect a new end time')
        }
       
    }

    const handleConfirmEndTime=(date:any)=>{
        // If called without a Date (e.g., button onPress), open the picker instead
        if(!date || typeof date?.toLocaleTimeString !== 'function'){
            setEndTimePickerVi(true);
            return;
        }
        setEndTime(date)
        setEndTimePickerVi(false)
        if(startTime && date < startTime){
            setEndTimePickerVi(false)
            Alert.alert("Invalid Time", "End time is erlier than start time")
            return;
        }
    }

    const formatDate=(dateobj:any)=>{
        if(!dateobj) return 'Select Date';
        
        return dateobj.toDateString();
    };

    const formatTime=(timeobj:any)=>{
        if(!timeobj || typeof timeobj?.toLocaleTimeString !== 'function') return 'Select Time';
        return timeobj.toLocaleTimeString('en-us', {
            hour:'2-digit', minute:'2-digit', hour12:true
        });
    }

    const DAYS = [
        { label: "S", full: 'Sunday' ,index:0 },
        { label: "M", full: 'Monday' ,index:1 },
        { label: "T", full: 'Tuesday' ,index:2 },
        { label: "W", full: 'Wednesday' ,index:3 },
        { label: "T", full: 'Thursday' ,index:4 },
        { label: "F", full: 'Friday' ,index:5 },
        { label: "S", full: 'Saturday' ,index:6 },

    ]

    const toggleDay = (index: number) => {
        if (selectedDays.includes(index.toString())) {
          setSelectedDays(selectedDays.filter((d) => d !== index.toString()));
        } else {
          setSelectedDays([...selectedDays, index.toString()]);
        }
      };

    const addTicketTier=()=>{
        setTickets([
            ...tickets, 
            {id:Date.now(), name:'', price:'', quantity:''}

        ])
    }

    const removeTicketTier=(id:any)=>{
        if(tickets.length===1){
            Alert.alert('Note', "you must have at least one ticket type")
            return;
        }

        setTickets(tickets.filter(t =>t.id !== id));

    }

    const updateTicket=(id:any, field:any, value:any)=>{
        const updatedTickets =tickets.map((ticket)=>{
            if(ticket.id===id){
                return {...ticket, [field]:value};
            }
            return ticket;
        })
        setTickets(updatedTickets);

    }

    useEffect(()=>{
        fetchBanks();
    },[])

    const fetchBanks= async()=>{
        setIsLoadingBanks(true)

        try {
            const response =await axios.get("https://api.paystack.co/bank") 
                    if (response.data && response.data.status) {
                        const formattedBanks = response.data.data.map((bank: { name: any; code: any; }) => ({
                            label: bank.name,
                            value: bank.code, 
                        }));
                        setBankList(formattedBanks);
                    }


            
        } catch (error) {
            Alert.alert("Error", "Could not load bank list. Please input manually.");
            
        }finally{
            setIsLoadingBanks(false);
        }

    }

    useEffect(()=>{
        if (accountNumber.length === 10 && selectedBank && !isManualBank) {
            verifyAccountDetails();

        } else if (accountNumber.length < 10) {
            setAccountName(''); 
        }

    }, [accountNumber, selectedBank])

    const verifyAccountDetails=async ()=>{
            setIsVerifying(true);
            Keyboard.dismiss(); 

            try {
                Alert.alert(`Verifying ${accountNumber} with bank code ${selectedBank}`);

                     // const res = await axios.get(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${selectedBank}`, { headers: { Authorization: 'Bearer YOUR_SECRET_KEY' }});

                    setTimeout(() => {
                        // Simulate a success
                        setAccountName("OLADEJI SOOLIU AYANTUNJI"); 
                        setIsVerifying(false);
                    }, 1500);

                
            } catch (error) {

                setAccountName('');
                Alert.alert("Verification Failed", "Could not verify account details.");
                setIsVerifying(false);
                

                
            }


    };

 
    const validateDraftForm = () => {
    let isValid = true;
    let tempErrors: Record<string, string> = {};

    

    // --- Basic Info ---
    if (!eventName.trim()) {
        tempErrors.eventName = "Event title is required";
        isValid = false;
    }
    if (!description.trim()) {
        tempErrors.description = "Description is required";
        isValid = false;
    }

    // --- Dates & Times ---
    if (!startDate || !startTime) {
        tempErrors.startDate = "Start date and time are required";
        isValid = false;
    }
    if (!endDate || !endTime) {
        tempErrors.endDate = "End date and time are required";
        isValid = false;
    }

    interface DateTimeObject extends Date {}

    const combineDateAndTime = (dateObj: DateTimeObject | null, timeObj: DateTimeObject | null): string | null => {
        if (!dateObj || !timeObj) return null;
        
        const date = new Date(dateObj);
        const time = new Date(timeObj);
        
        // Set the hours/minutes of the Date object to match the Time object
        date.setHours(time.getHours());
        date.setMinutes(time.getMinutes());
        
        return date.toISOString(); // Returns "2025-10-25T14:30:00.000Z"
    };

    

    // Check if End is after Start (Only run if dates exist)

      if (startDate && startTime && endDate && endTime) {
            const startDateTime = combineDateAndTime(startDate, startTime); // Use your helper fn
            const endDateTime = combineDateAndTime(endDate, endTime);
            
            if (!startDateTime || !endDateTime) {
                tempErrors.endDate = "Invalid start or end time";
                isValid = false;
            } else if (new Date(endDateTime) <= new Date(startDateTime)) {
                tempErrors.endDate = "End time must be after start time";
                isValid = false;
            }
        }


    // --- Location ---
    if (!online && !physical) {
        tempErrors.location = "Please select at least one location type (Online or Physical)";
        isValid = false;
    }
    if (online && !PlatformLink.trim()) {
        tempErrors.platformLink = "Online meeting link is required";
        isValid = false;
    }

    // --- Tickets & Payments ---
    if (ispaid) {
        // 1. Check Tickets Exist
        if (tickets.length === 0) {
            tempErrors.tickets = "Paid events must have at least one ticket type";
            isValid = false;
        } else {
            // 2. we Check indvidual ticket fields exist
            // We assume tickets is an array like [{name:'', price:'', quantity:''}]
            const incompleteTicket = tickets.find(t => !t.name || !t.price || !t.quantity);
            if (incompleteTicket) {
                tempErrors.tickets = "All tickets must have a Name, Price, and Quantity";
                isValid = false;
            }
        }

        // 3.we Check Settlement Info
        // Crucial: We only check if accountName exists. This proves verification passed.
        if (!accountName) {
            tempErrors.bank = "Please enter and verify bank account details";
            isValid = false;
        }
    }

    setErrors(tempErrors);
    return isValid;
    };




    const renderContent=(id:any)=>{
        switch(id){
            case 1:
                return(
                    <View style={styles.container}>
                        <TextInput
                        style={[styles.input, errors.eventName && { borderColor: 'red' }]}
                        placeholder='Event name'
                        value={eventName}
                       onChangeText={(text) => {
                        setEventName(text);
                        // Optional: Clear error as soon as they start typing again
                        if (errors.eventName) setErrors({...errors, eventName: ''});
                        }}
                        />
                        <ErrorText error={errors.eventName} />

                        <Text style={[styles.text, {color:'#666', marginBottom:10}]}>Chose a clear and descriptive name for your event</Text>
                          <TextInput
                        style={[styles.input, errors.description && { borderColor: 'red' }]}
                        placeholder='Event description'
                        value={description}
                         onChangeText={(text) => {
                        setDescription(text);
                        // Optional: Clear error as soon as they start typing again
                        if (errors.description) setErrors({...errors, description: ''});
                        }}
                        multiline={true}
                        
                        />
                        <ErrorText error={errors.description} />
                        <Text style={[styles.text, {color:'#666', paddingBottom:20}]}>Write a description of your event</Text>

                        <TextInput
                        style={styles.input}
                        placeholder='custom url'
                        value={customUrl}
                        onChangeText={setCustomUrl}
                        />
                        <Text style={[styles.text, {color:'#666', marginBottom:20}]}>Chose a custom url</Text>

                        <TouchableOpacity onPress={pickImage} style={{flexDirection:'row', alignItems:'center', marginBottom:10,borderRadius:10, padding:10, backgroundColor:'#f0f0f0'}}>
                            <Text style={styles.title}>Change Image</Text>
                            <Ionicons name='image-outline' size={24} color='#666'/>
                        </TouchableOpacity>

                        <View style={[styles.previewContainer,{backgroundColor:'#34066fff', padding:10}]}>

                            {photo? (
                          
                                 <Image source = {{uri:photo}} style={[styles.image, {backgroundColor:'blue'}]}/>
                 
                            ) : (
                                <View style={styles.placeholderImage }>
                                    
                                    <TouchableOpacity style={{alignItems:'center'}} onPress={pickImage}>
                                        <MaterialIcons name='camera' size={30} />
                                    <Text style={styles.placeHoldertext}>Select Image</Text>


                                    </TouchableOpacity>


                                </View>
                            )}
                           

                            
                            <View style={{flexDirection:'row', justifyContent:'center', alignItems:'center'}}>
                                <MaterialIcons style={{color:'white'}} name='sd-card' size={24} />
                            
                                <Text style={{color:'white', padding:10}}>2160 x 1080 recomended</Text>
                                <MaterialIcons style={{color:'white'}} name='storage' size={24} />
                                <Text style={{color:'white'}}>Max 10MB</Text>
                            </View>

                        </View>
                    


                    </View>

                )
            case 2:
                return(
                    <View >
                        <Text style={[styles.title, {fontSize:16, fontWeight:'bold',padding:10}]}>Choose type of location</Text>
                        <View style={{flexDirection:'row', padding:10,alignItems:'center'}}>

                            <Checkbox
                            value={online}
                            onValueChange={setOnline}
                            color={online? '#4630EB' :undefined}
                            />
                            <Text style={{padding:10}}>Online</Text>
                        </View>

                         <View style={{flexDirection:'row', padding:10, alignItems:'center'}}>
                            <Checkbox
                            value={physical}
                            onValueChange={setPhysical}
                            color={online? '#4630EB' :undefined}
                            />
                            <Text style={{padding:10}}>Physical</Text>
                        </View>
                         <ErrorText error={errors.location} />
                         


                         {online && (
                            <View>

                                <Text style={[styles.title,{padding:10} ]}>How do people join your event</Text>
                              <View style={{ padding:10, justifyContent:'space-between'}}>
                            
                                <Dropdown 
                                style={[styles.dropdowns,  isFocus && {borderColor: 'blue'}]}
                                data={platforms}
                                maxHeight={300}
                                labelField='label'
                                valueField='value'
                                placeholder={!isFocus ? 'Select platform': '...'}
                                onChange={item=>{
                                    setselectedPlat(item.value);
                                    setIsFocus(false)
                                }}
                                
                                />

                                

                            
                            
                                <TextInput
                                value={PlatformLink}
                                onChangeText={setPlatformlink}
                                style={[styles.input, {marginTop:10}]}
                                placeholder='Enter Platform link'
                                />
                                 <ErrorText error={errors.platformLink} />

                        </View>
                            </View>
                        )}

                        {physical && (
                            <View>
                                <Text style={[styles.title,{padding:10},errors.address && { borderColor: 'red' }]}>Add a place Description</Text>
                                <TextInput
                                style={styles.input}
                                placeholder='Venue Address' 
                                
                                    value={address}
                                onChangeText={(text) => {
                                    setAddress(text)
                                    
                                    if (errors.address) setErrors({...errors, address: ''});
                                }}/>
                            </View>
                        )}     

                        <Text style={[styles.title,{padding:10}]}>Language</Text>
                        
                                <Dropdown 
                                style={[styles.dropdowns, isFocus && {borderColor: 'blue'}]}
                                data={language}
                                maxHeight={300}
                                labelField='label'
                                valueField='value'
                                placeholder={!isFocus ? 'Choose Language': '...'}
                                onChange={item=>{
                                    setselectedLanguage(item.value);
                                    setIsFocus(false)
                                }}
                                
                                />

                                <></>
                       

                         <Text style={[styles.title,{padding:10}]}>Choose type of event</Text>
                         <View style={{flexDirection:'row'}}>

                            <View style={{flexDirection:'row', padding:10,alignItems:'center'}}>
                            <Checkbox
                            value={single}
                               onValueChange={(val) => {
                                setSingleEvent(val);
                                if (val) setRecurring(false);
                            }}
                            color={single? '#4630EB' :undefined}
                            />
                            <Text style={{padding:10}}>Single Event</Text>
                        </View>

                        <View style={{flexDirection:'row', padding:10, alignItems:'center'}}>
                            <Checkbox
                            value={recurring}
                               onValueChange={(val) => {
                                setRecurring(val);
                                if (val) setSingleEvent(false);
                            }} 
                            color={recurring? '#4630EB' :undefined}
                            />
                            <Text style={{padding:10}}>Recurring</Text>
                        </View>

                       


                         </View>

                         {single && (
                            

                            <View>
                                <Text style={{padding:10, color:'#666'}}>You can set single event details after creating the event</Text>

                                <View style={{flexDirection:'row', padding:10, flex:1,justifyContent:'space-evenly'}}>

                                    <View >
                                        <Text style={styles.title}>Start Date</Text>
                                        
                                        <TouchableOpacity style={[styles.pickerbox]} onPress={()=>setStartDatePickerV(true)} >
                                            <Text style={{fontSize:16}}>{formatDate(startDate)}</Text>
                                            <MaterialIcons name='date-range' size={12}/>

                                        </TouchableOpacity>

                                        <DateTimePickerModal
                                            isVisible={isStartDatePickerVisible}
                                            mode='date'
                                            onConfirm={handleConfirmStartDate}
                                            onCancel={()=>setStartDatePickerV(false)}
                                            minimumDate={new Date()}
                                            
                                            />

                                    </View>

                                <View >
                                   
                            <Text style={styles.title}>End Date</Text>
                           
                            
                            <TouchableOpacity style={[styles.pickerbox, ]} onPress={()=>setEndDatePickerV(true)} >
                                <Text style={{fontSize:16}}>{formatDate(endDate)}</Text>
                                <MaterialIcons name='date-range' />

                            </TouchableOpacity>
                            <DateTimePickerModal
                                isVisible={isEndDatePickerVisible}
                                mode='date'
                                onConfirm={handleConfirmEndDate}
                                onCancel={()=>setEndDatePickerV(false)}
                                minimumDate={startDate? new Date(startDate):undefined}
                                
                                />

    
                         </View>
                            
                         </View>
                         


                          <View style={{flexDirection:'row',padding:10,flex:1,justifyContent:'space-evenly'}}>

                         <View  >
                           
                            <Text style={styles.title}>Start Time</Text>
                            <TouchableOpacity style={[styles.pickerbox, ]} onPress={handleConfirmStartTime} >
                                <Text style={{fontSize:16}}>{formatTime(startTime)}</Text>
                                <MaterialIcons name='timer' />

                            </TouchableOpacity>
                            <DateTimePickerModal
                            isVisible={isStartTimePickerVisible}
                            mode='time'
                            onConfirm={handleConfirmStartTime}
                            onCancel={()=>setStartTimePickerVi(false)}
                            minimumDate={new Date()}
                            
                            />
                         </View>

                         <View>
                            
                            
                            <Text style={styles.title}>End Time</Text>
                            <TouchableOpacity style={[styles.pickerbox,]} onPress={handleConfirmEndTime} >
                                <Text style={{fontSize:16}}>{formatTime(endTime)}</Text>
                                <MaterialIcons name='timer'/>

                            </TouchableOpacity>

                            <DateTimePickerModal
                                isVisible={isEndTimePickerVisible}
                                mode='time'
                                onConfirm={handleConfirmEndTime}
                                onCancel={()=>setEndTimePickerVi(false)}
                                 minimumDate={startTime? new Date(startTime):undefined}
                               
                                
                                />


                         </View>
                            
                         </View>
                          <ErrorText error={errors.endDate} />
                          <ErrorText error={errors.endTime} />
                           <ErrorText error={errors.startTime} />
                             <ErrorText error={errors.startDate} />


                            </View>
                         )}



                         {!single && (

                           <View>
                                <Text style={{padding:10, color:'#666'}}>You can set recurring event details after creating the event</Text>

                                <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'center', marginVertical:10}}>
                                    {
                                            DAYS.map((day)=>{
                                                const isSelected= selectedDays.includes(day.index.toString());
                                                return(
                                                    <TouchableOpacity
                                                        key={day.index}
                                                        style={[styles.dayButton, isSelected && styles.selectedDayButton]}
                                                        onPress={() => toggleDay(day.index)}
                                                    >
                                                        <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day.label}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })
                                   }

                                </View>

                                <View style={{flexDirection:'row', padding:10, flex:1,justifyContent:'space-evenly'}}>
                                     <View >
                             <Text style={styles.title}>Start Date</Text>
                            
                            <TouchableOpacity style={[styles.pickerbox]} onPress={()=>setStartDatePickerV(true)} >
                                <Text style={{fontSize:16}}>{formatDate(startDate)}</Text>
                                <MaterialIcons name='date-range' size={12}/>

                            </TouchableOpacity>

                            <DateTimePickerModal
                                isVisible={isStartDatePickerVisible}
                                mode='date'
                                onConfirm={handleConfirmStartDate}
                                onCancel={()=>setStartDatePickerV(false)}
                                minimumDate={new Date()}
                                
                                />

                         </View>

                         <View >
                            <Text style={styles.title}>End Date</Text>
                           
                            
                            <TouchableOpacity style={[styles.pickerbox, ]} onPress={()=>setEndDatePickerV(true)} >
                                <Text style={{fontSize:16}}>{formatDate(endDate)}</Text>
                                <MaterialIcons name='date-range' />

                            </TouchableOpacity>
                            <DateTimePickerModal
                                isVisible={isEndDatePickerVisible}
                                mode='date'
                                onConfirm={handleConfirmEndDate}
                                onCancel={()=>setEndDatePickerV(false)}
                                minimumDate={startDate? new Date(startDate):undefined}
                                
                                />

    
                         </View>
                                </View>

                                <View style={{flexDirection:'row', justifyContent:'space-evenly'}}>

                                    <View>
                                    
                                        <Text style={styles.title}>Start Time</Text>

                                        <TouchableOpacity style={[styles.pickerbox, ]} onPress={handleConfirmStartTime} >
                                            <Text style={{fontSize:16}}>{formatTime(startTime)}</Text>
                                            <MaterialIcons name='timer' size={12}/>

                                        </TouchableOpacity>
                                        <DateTimePickerModal
                                        isVisible={isStartTimePickerVisible}
                                        mode='time'
                                        onConfirm={handleConfirmStartTime}
                                        onCancel={()=>setStartTimePickerVi(false)}
                                        minimumDate={new Date()}
                                        
                                        />
                                    </View>

                                <View>
                            
                                    <Text style={styles.title}>End Time</Text>
                                    <TouchableOpacity style={[styles.pickerbox,]} onPress={handleConfirmEndTime} >
                                        <Text style={{fontSize:16}}>{formatTime(endTime)}</Text>
                                        <MaterialIcons name='timer' size={12}/>

                                    </TouchableOpacity>

                                    <DateTimePickerModal
                                        isVisible={isEndTimePickerVisible}
                                        mode='time'
                                        onConfirm={handleConfirmEndTime}
                                        onCancel={()=>setEndTimePickerVi(false)}
                                    minimumDate={startTime? new Date(startTime):undefined}
                                        
                                        />


                                </View>
                            
                         </View>

                           </View>


                         )}

                        
                         

                          

                    </View>

                )
            case 3:
                return(
                    <View style={styles.container}>
                        <View style={styles.switchRow}>
                            <Text> Is this event paid</Text>
                            <Switch 
                            value={ispaid}
                            onValueChange={(val)=> setIsPaid(val)}
                            trackColor={{false: "#767577" , true:'#007Bff'}}
                            ></Switch>
                        </View>

                        <Text style={styles.subHeader}>{ispaid ? "Create Ticket Class(e.g. VIP, REgular)" : "Registration Details"}</Text>

                        {
                            tickets.map((ticket, index)=>(
                                <View key={ticket.id} style={styles.ticketCard}>
                                    <View style={styles.cardHeaderT}>
                                        <Text style={styles.title}>Ticket #{index+1}</Text>
                                        <TouchableOpacity onPress={()=>removeTicketTier(ticket.id)}>
                                            <Ionicons name='trash-outline' size={20} color='red'></Ionicons>
                                        </TouchableOpacity>

                                    </View>

                                    <Text>Ticket Name</Text>

                                    <TextInput
                                     style={styles.input}
                                     placeholder={ispaid? 'e.g., VIP Table' :"e.g., General Admission"}
                                     value={ticket.name}
                                     onChangeText={(text)=> updateTicket(ticket.id, 'name', text)}

                                     />
                                     <View style={{flexDirection:'row'}}>
                                        {ispaid && (
                                            <View style={{flex:1, marginRight:10}}>
                                            <Text> Price(#)</Text>
                                            <TextInput 
                                             style={styles.input}
                                             placeholder='0.00'
                                             keyboardType='numeric'
                                             value={ticket.price}
                                             onChangeText={(text)=>updateTicket(ticket.id, 'price',text)}
                                            />
                                            </View>
                                        )}
                                        <View style={{flex:1}}>
                                            <Text style={styles.label}>Quantity Available</Text>
                                            <TextInput
                                             style={styles.input}
                                             value={ticket.quantity}
                                             placeholder='e.g., 100'
                                             keyboardType='numeric'
                                             onChangeText={(text)=>updateTicket(ticket.id, 'quantity',text)}
                                            
                                            />
                                            
                                        </View>
                                     </View>

                                </View>
                                
                            ))

                        }

                          <ErrorText error={errors.tickets} />

                        {
                            ispaid &&(
                                <TouchableOpacity style={styles.addbutton} onPress={addTicketTier}>
                                    <Text>+ Add Another Ticket Type</Text>
                                </TouchableOpacity>
                            )

                           
                        }

                    { ispaid &&(

                              <View style={styles.containera}>

                        <Text style={styles.header}>Settlement Details</Text>
                        <Text style={styles.label}>Business / Display Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Abulkhoir Tech Hub"
                            value={businessName}
                            onChangeText={setBusinessName}
                        />

                        <View style={styles.rowBetween}>
                            <Text style={styles.label}>Bank Name</Text>
                            <TouchableOpacity onPress={() => setIsManualBank(!isManualBank)}>
                            <Text style={styles.linkText}>
                                {isManualBank ? "Select from list" : "Bank not listed? click here to enter manually"}
                            </Text>
                            </TouchableOpacity>
                        </View>

                        {isManualBank ? (
                       
                            <TextInput
                            style={styles.input}
                            placeholder="Enter Bank Name manually"
                            value={manualBankName}
                            onChangeText={setManualBankName}
                            />
                        ): (
                           
                            <Dropdown
                            style={styles.dropdown}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            inputSearchStyle={styles.inputSearchStyle}
                            data={bankList}
                            search
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder={isLoadingBanks ? "Loading banks..." : "Select Bank"}
                            searchPlaceholder="Search bank..."
                            value={selectedBank}
                            onChange={item => {
                            setSelectedBank(item.value);
                            setAccountName(''); // Reset verification if bank changes
                        }}
                        />
                    )}


                     <Text style={styles.label}>Account Number</Text>
                     <View style={styles.accountContainer}> 
                        <TextInput
                          style={[styles.input, { flex: 1, marginBottom: 0, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                          placeholder="0123456789"
                            keyboardType="numeric"
                            maxLength={10}
                            value={accountNumber}
                            onChangeText={setAccountNumber}

                        />

                        <View style={styles.statusBox}>
                            {isVerifying ? (

                            <ActivityIndicator size="small" color="#007BFF" />
                            
                            ) : accountName ? (
                                <Text style={{color: 'green'}}>✓</Text>
                            ) : (
                                <Text style={{color: '#ccc'}}>?</Text>
                            )}


                        </View>

                     </View>

                        {accountName ? (
                            <View style={styles.verifiedBox}>
                            <Text style={styles.verifiedLabel}>Verified Account Name:</Text>
                            <Text style={styles.verifiedName}>{accountName}</Text>
                            </View>
                        ) : null}



                        <View style={{marginTop:50}}></View>

                     










                       </View>
                                
                            )}
                              <ErrorText error={errors.bank} />


                      



                    </View>
                    
                )
        }

    }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.headerContainer}>
        <TouchableOpacity>
          
          <Text style={[{fontSize:20, fontWeight:'bold'}]}>HostEasy</Text>

        </TouchableOpacity>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.iconPlaceholder}>
          
          
          <Text style={styles.text}>+</Text>

        </TouchableOpacity>

        <TouchableOpacity style={[styles.iconPlaceholder, {backgroundColor:'red'}]}>
          
          <Text style={styles.text}>O</Text>

        </TouchableOpacity>
      </View>
        </View>

        <ScrollView style={styles.containerscr}>

            {DATA.map((item)=>{
                const isOpen=item.id===activeid;

                return(
                    <View key={item.id} style={styles.card}>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={()=>toggleExpand(item.id)}
                            style={styles.cardHeader}
                            >
                  
                            <View>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.description}>{item.description}</Text>
                               
                            </View>
                             <Text style={styles.IconSymbol}>{isOpen? '-' : '+'}</Text>
                        </TouchableOpacity>

                        {isOpen && (
                            <View>
                                {renderContent(item.id)}
                            </View>
                        )}
                    </View>
                )
            })}
        </ScrollView>

        <View style={{flexDirection:'row', justifyContent:'flex-end', alignItems:'baseline'}}>
            <Pressable style={styles.Button} onPress={handleSaveDraft}>
                      {uploadingd ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : (
            <Text style={styles.buttontext}>Save as draft</Text>
          )}
               
            </Pressable>

              <Pressable style={styles.Button} onPress={handleSaveAndContinue}>
                
                   {uploading ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : (
            <Text style={styles.buttontext}>
                {isEditing? "Update Event" : "Save and continue"}
            </Text>
          )}
               
            </Pressable>

            
       
                               
          </View>
    </SafeAreaView>
  )
}

const styles= StyleSheet.create({
    headerContainer:{
        flexDirection:'row',
        alignItems:'stretch',
        justifyContent:'space-between'
    
    },
    previewContainer:{
        marginBottom:20,
        alignItems:'center'
    },
   placeholderImage:{width:'90%',
    height:200,
    backgroundColor:'#eee',
    borderRadius:10,
    justifyContent:'center',
    alignItems:'center'
   },
   pickerbox:{
    backgroundColor:'white',
    padding:5,
    //minWidth:100,
    width:150,
    borderRadius:8,
    borderWidth:1,
    borderColor:'#ddd',
    flexDirection:'row',
    justifyContent:'space-evenly',
    alignItems:'center',
    marginBottom:10
   },
   disabledbox:{
    backgroundColor:'#eee',
    borderColor:'#eee'
   },
   placeHoldertext:{color:'#888'},
   image:{width:'90%',
    height:200,
    borderRadius:10
},
    
    containerscr:{
        padding:10,
        //backgroundColor:'red'
    },
    card:{
        marginBottom:10,
        backgroundColor:'#fff',
        borderRadius:8
    },
    dropdown:{height:40,
        alignItems:'center',
        justifyContent:'center',
        paddingHorizontal:12,
        marginEnd:20,
        borderWidth:1,
        borderColor:'#ccc'
    }
    ,
    dropdowns:{
        height:40,
        padding:10,
        borderRadius:5,
        borderWidth:1,
        marginBottom:10,
        borderColor:'#ccc'

        //borderWidth:1
    },
    cardHeader:{
        flexDirection:'row',
        padding:15,
        justifyContent:'space-between',
        alignItems:'center'

    },
    title:{
        fontSize:16,
        fontWeight:'bold'

    },
    description:{
        fontSize:16,
        color:'#666'

    },
   IconSymbol:{
        fontSize:20,
        color:'#007BFF',
        fontWeight:'bold'

    },
    input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
    fontSize: 16,
  },

    container:{
        flex:1,
      padding: 20,
      marginTop:40,
      justifyContent:'space-between'
      //alignItems:'center'
    },
     avatar: {
    //width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },

    iconPlaceholder:{
      alignItems:'center',
      justifyContent:'center',
      width:40,
      height:40,
      borderRadius:20,
      backgroundColor:'blue',
      marginRight:10
   },
   text:{
    fontSize:16,
   color:'white',
    //fontStyle:'italic'
   },

    dayButton: {
        width: 40,
        height: 40,
        padding: 10,
        margin: 5,
        borderRadius: 20,
        backgroundColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
    },
     Button: {
        width: '40%',
       // height: '40%',
        padding: 10,
        margin: 5,
        borderRadius: 8,
        backgroundColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    selectedDayButton: {
        backgroundColor: '#007BFF',
    },
    dayText: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },
    selectedDayText: {
        color: '#fff',
    },

    switchRow:{
        flexDirection:'row',
        justifyContent:'space-between',
        alignItems:'center',
        marginBottom:20,
        padding:15,
        borderRadius:8,
        borderWidth:1,
        borderColor:'#eee'
    },
    subHeader:{
        fontSize:14,
        fontWeight:'bold',
        marginBottom:15,
        color:'#666'
    },
    ticketCard:{
        backgroundColor:'white',
        padding:15,
        borderRadius:10,
        marginBottom:15,
        borderWidth:1,
        borderLeftWidth:5,
        borderLeftColor:'#007BFF'
    },

    cardHeaderT:{
        flexDirection:"row",
        justifyContent:"space-between",
        marginBottom:15,
        paddingBottom:10,
        borderBottomWidth:1,
        borderBottomColor:"#f0f0f0"

    },
    addbutton:{
        padding:15,
        borderStyle:"dashed",
        borderWidth:1,
        borderColor:'007bff',
        borderRadius:8,
        alignItems:"center",
        marginBottom:20
    },
    label:{
        fontSize:12, color:"#555",
        marginBottom:5

    },
     buttontext:{
        //color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },

      containera: { padding: 20, backgroundColor: '#f9f9f9', borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  

  
  // Header Row for "Bank not listed?"
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  linkText: { color: '#007BFF', fontSize: 12, fontWeight: '600' },

 
  placeholderStyle: { fontSize: 16, color: '#999' },
  selectedTextStyle: { fontSize: 16, color: '#333' },
  inputSearchStyle: { height: 40, fontSize: 16 },

  // Account Number Row
  accountContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  statusBox: {
    height: 52, // Match input height roughly
    width: 50,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ccc',
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Verified Name Box
  verifiedBox: {
    marginTop: 10,
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  verifiedLabel: { color: '#155724', fontSize: 12 },
  verifiedName: { color: '#155724', fontWeight: 'bold', fontSize: 16, marginTop: 2 }
});

