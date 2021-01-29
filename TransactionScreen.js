import React from 'react';
import {Text,View,TouchableOpacity,StyleSheet,Image,TextInput,KeyboardAvoidingView,Alert}  from 'react-native';
import * as Permissions from 'expo-permissions';
import {BarCodeScanner} from 'expo-barcode-scanner';
import  firebase from 'firebase';
import db from '../config';


export default class TransactionScreen extends React.Component
{
    constructor(){
        super();
        this.state={
            hasCameraPermission:null,
            scanned:false,
            scannedData:'',
            buttonState:'normal',
            scannedBookId:'',
            scannedStudentId:'',
            transactionMessage:''
        }
        
    }

    checkStudentEligibilityForBookIssue= async()=>{
        const studentRef= await db.collection("students").where("studentId","==",this.state.scannedStudentId).get();
        var isStudentEligible="";

        if(studentRef.docs.length==0)
        {
                isStudentEligible=false;
                Alert.alert("This student doesn't exist");
                console.log("This student doesn't exist");

                this.setState({
                    scannedStudentId:'',
                    scannedbookId:'',
                })
        }
        else{
            studentRef.docs.map((doc)=>{
                var student =doc.data();
                console.log(student);
                if(student.numberOfBooksIssued<2)
                {
                    isStudentEligible=true;
                }
                 else{
                     isStudentEligible=false;
                     Alert.alert("The student has 2 books issued already")
                    console.log("The student has 2 books issued already")
                    
                this.setState({
                    scannedStudentId:'',
                    scannedbookId:'',
                })
               }
            })
        }
        return isStudentEligible;
    }
  checkStudentEligibilityForBookReturn=async()=>{
      const transactionRef= await db.collection("transaction").where("bookId","==",this.state.scannedBookId).limit(1).get();

      var isStudentEligible="";
      
      transactionRef.docs.map((doc)=>{
          var lastBookTransaction=doc.data();
          if(lastBookTransaction.studentId===this.state.scannedStudentId){
            isStudentEligible=true;

          }
          else{
              isStudentEligible=false;
              Alert.alert("This book wasn't issued by the student");
              console.log("This book wasn't issued by the student");

              
              this.setState({
                scannedStudentId:'',
                scannedbookId:'',
            })
          }
        
      })
 return isStudentEligible
  }
        checkBookEligibility=async()=>{
            const bookRef= await db.collection("books").where("bookId","==",this.state.scannedBookId).get();

            var transactionType="";
            if(bookRef.docs.length==0){
                transactionType=false;
                console.log("Book doesn't exist");
                Alert.alert("Book doesn't exist");
            }
            else{
                bookRef.docs.map((doc)=>{
                    var book =doc.data();
                    console.log(book);
                    if(book.bookAvailability){
                        transactionType="Issue";
                    }
                    else{
                        transactionType="Return"
                    }
                })
            }
            return transactionType
}

    handleTransaction =async ()=>{
        var transactionType=await this.checkBookEligibility();
        if(! transactionType){
            Alert.alert("this book deoesn't exist");
            this.setState({
                scannedStudentId:'',
                scannedbookId:'',
            })
        }
        else if(transactionType==="Issue"){
            var isStudentEligible= await this.checkStudentEligibilityForBookIssue();
            if(isStudentEligible){
                this.initiateBookIssue();
                Alert.alert("Book Issued");
            }

        }
         else{
            var isStudentEligible= await this.checkStudentEligibilityForBookReturn();
            if(isStudentEligible){
                this.initiateBookReturn();
                Alert.alert("Book Returned");
            } 
         }

        
    }

    initiateBookIssue = async()=>{
        //add a transaction
        db.collection("transaction").add({
          'studentId': this.state.scannedStudentId,
          'bookId' : this.state.scannedBookId,
          'date' : firebase.firestore.Timestamp.now().toDate(),
          'transactionType': "Issue"
        })
        //change book status
        db.collection("books").doc(this.state.scannedBookId).update({
          'bookAvailability': false
        })
        //change number  of issued books for student
        db.collection("students").doc(this.state.scannedStudentId).update({
          'numberOfBooksIssued': firebase.firestore.FieldValue.increment(1)
        })
      }

      initiateBookReturn = async () => {
        //add a transaction
        db.collection("transaction").add({
          studentId: this.state.scannedStudentId,
          bookId: this.state.scannedBookId,
          date: firebase.firestore.Timestamp.now().toDate(),
          transactionType: "Return"
        });
        //change book status
        db.collection("books")
          .doc(this.state.scannedBookId)
          .update({
            bookAvailability: true
          });
        //change number  of issued books for student
        db.collection("students")
          .doc(this.state.scannedStudentId)
          .update({
            numberOfBooksIssued: firebase.firestore.FieldValue.increment(-1)
          });
    
        this.setState({
          scannedStudentId: "",
          scannedBookId: ""
        });
      };

    getCameraPermission=async (id)=>{
        const { status}=await Permissions.askAsync(Permissions.CAMERA)  ;
        this.setState({
            hasCameraPermission:status==="granted",
            buttonState:id,
            sacnned:false,

        })
    }
    handleBarCodeScanned=async({type,data })=>{
        const{buttonState}=this.state
        if(buttonState==="bookId")
        {
            this.setState({
                scanned:true,
                scannedbookId:data,
                buttonState:'normal',
            })
        }
         else if(buttonState==="studentId")
        {
            this.setState({
                scanned:true,
                scannedstudentId:data,
                buttonState:'normal',
            })
        }
        
      
    }
   
    render(){
        const hasCameraPermission=this.state.hasCameraPermission;
        const scanned  =this.state.scanned;
        const buttonState= this.state.buttonState;
        if(buttonState!=="normal" && hasCameraPermission){
            return(
            <BarCodeScanner onBarCodeScanned={scanned?undefined:this.handleBarCodeScanned} style={StyleSheet.absoluteFill}/>
            )
        }
        else if(buttonState==="normal"){
        return(
           <KeyboardAvoidingView style = {styles.container}>
            <View style ={styles.inputView}>
            <TextInput  style= {styles.inputBox} placeholder= "book ID" onChangeText={text=>this.setState({scannedBookId:text})} value={this.state.scannedBookId}/>
            <TouchableOpacity  style={styles.scanButton} onPress={()=>{
                this.getCameraPermission("bookId")
            }}>
            <Text style= {styles.buttonText}> Scan </Text>
            </TouchableOpacity>
            </View>

            <View style ={styles.inputView}>
            <TextInput  style= {styles.inputBox} placeholder= "student ID"  onChangeText={text=>this.setState({scannedStudentId:text})} value = {this.state.scannedStudentId} />
            <TouchableOpacity  style={styles.scanButton}onPress={()=>{
                this.getCameraPermission("studentId")
            }}>
            <Text style= {styles.buttonText}> Scan </Text>
            </TouchableOpacity>
            </View>
            <TouchableOpacity  style={styles.submitButton} onPress={async()=>{
                var transactionMessage=await this.handleTransaction();
            }}>
                <Text style={styles.submitButtonText}> Submit</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )

    }
}
}
const styles = StyleSheet.create({
displayText:{
    fontSize:15,
    textDecorationLine:'underline',

},
scanButton:{ 
    backgroundColor:'#7A4B4c',
    padding:10,
    margin:10,
},
buttonText:{
    fontSize:15,
    textAlign:'center',
    marginTop:10,
    
},
inputView:
{
flexDirection:'row',
margin:20,

},
inputBox:{
    width:200,
    height:40,
    borderWidth:1.5,
    borderRightWidth:0,
    fontSize:20,
    
},
scanButton:{
    backgroundColor:"#66BB6a",
    width:50,
    borderWidth:1.5,
    borderLeftWidth:0,

},
submitButton:{
backgroundColor:"#fbc02d",
width:100,
height:50,
},
submitButtonText:{
    padding:10,
    textAlign:'center',
    fontSize:20,
    fontWeight:'bold',
    color:"white",
}
})