import { StyleSheet } from 'react-native';

const gStyles= StyleSheet.create({
   container: {
      flex:1,
     
      //alignItems:'center',
      //justifyContent:'center',
      padding:20,
      
      backgroundColor:'#8192b1ff'
   },
    containersign: {
      flex:1,
     
      alignItems:'center',
      //justifyContent:'center',
      padding:20,
      
      backgroundColor:'#02200fff'
   },
   previewContainer:{
        marginBottom:20,
        alignItems:'center'
    },
   placeholderImage:{width:200,
    height:200,
    backgroundColor:'#eee',
    borderRadius:10,
    justifyContent:'center',
    alignItems:'center'
   },
 
   disabledbox:{
    backgroundColor:'#eee',
    borderColor:'#eee'
   },
   placeHoldertext:{color:'#888'},
   image:{width:200,
    height:200,
    borderRadius:10
},
    container3: {
      flex:1,
      position:'absolute',
      height:'78%',
      bottom:0,
      width:'100%',
      //alignItems:'center',
      //justifyContent:'center',
      padding:20,
      //margin:20,
      borderTopEndRadius:14,
      borderTopStartRadius:14,
      
      backgroundColor:'white',
     
   },
   header:{
      textAlign:'center',
      fontSize:24

   },
   container1: {
      flex:1,
      
      alignItems:'center',
      justifyContent:'center',
      //height:30,
      //width:500,
      //marginTop:4,
      backgroundColor:'#495E57'
   },
   box1:{
      //flexDirection:'row',
      //width:100,
      //height:60,
      fontSize:30,
      fontWeight:'500',
      //marginBottom:20,
      marginTop:20

   },
   box3:{
      //flexDirection:'row',
      //width:100,
      //height:60,
      fontSize:30,
      fontWeight:'500',
      marginBottom:20,
      //marginTop:20,
      margin:20,
      marginStart:20,
      //padding:40

   },
   box2:{
      //flexDirection:'row',
      //width:50,
      //height:60,
      //marginTop:20,
      fontSize:17,
      fontWeight:500
   

   },
   card:{
      backgroundColor:'white',
      padding:20,
      margin:10,
      borderRadius:8,
      //shadowColor:'#000',
      //shadowOffset:{width:0, height:2},
      //shadowOpacity:0.25,
      //shadowRadius:3.84,
      elevation:5
   },
     title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
     },
       subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
    inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 15,
  },




   text:{
      textAlign:'left',
      color:'red',
      fontSize:16,
      

   },
    button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
 
   textInput:{
    borderWidth:0.5,
    borderColor:'grey',
    borderRadius:12,
    padding:8,
    fontSize:16,
    margin:8
   },
     input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 5,
    fontSize: 16,
  },

     buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  linkText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 10,
  },

});

export default gStyles