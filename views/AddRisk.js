import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { encrypt } from '../components/Encryption';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Cache } from "react-native-cache";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { district } from '../constants/district';

export default function AddRisk(props) {
  const [marker, setMarker] = useState(null) // กำหนด Marker เมื่อผู้ใช้กดบริเวณแผนที่
  const [focusPos, setfocusPos] = useState({latitude: 13.736717, longitude: 100.523186}) // ตำแหน่งของผู้ใช้
  const [userCoords, setUserCoords] = useState(); // จับตำแหน่งเมื่อผู้ใช้ขยับ
  const [data, setData] = useState([]); // เก็บข้อมูลจุดเสี่ยง
  const [detail, setDetail] = useState(""); // เก็บข้อมูลdetailจุดเสี่ยง
  const [latitude, setlatitude] = useState(0); // เก็บข้อมูลdetailจุดเสี่ยง
  const [longitude, setlongitude] = useState(0); // เก็บข้อมูลdetailจุดเสี่ยง
  const [validateDetailFail, setvalidateDetailFail] = useState(false); // ตรวจสอบช่องที่detailผู้ใช้ต้องกรอก
  const [validatePosFail, setvalidatePosFail] = useState(false); // ตรวจสอบช่องที่coordsผู้ใช้ต้องกรอก
  const [deviceId, setDeviceId] = useState("") // Device ID ของผู้ใช้

  // เก็บ Device ID ของผู้ใช้
  async function GetDeviceID() {
    if (Device.osName == 'iPadOS' || Device.osName == 'iOS'){
      setDeviceId(encrypt(await Application.getIosIdForVendorAsync()))
    }
    else{
      setDeviceId(encrypt(Application.androidId))
    }
  }

  // หากมีการพิมพ์ในช่องจะ setstate
  const onChangeDetail = query => setDetail(query);
  const onChangeLati = query => setlatitude(Number(query));
  const onChangeLongi = query => setlongitude(Number(query));

  // ตั้งค่า cache
  const cache = new Cache({
    namespace: "RANS",
    policy: {
        maxEntries: 50000, // if unspecified, it can have unlimited entries
        stdTTL: 0 // the standard ttl as number in seconds, default: 0 (unlimited)
    },
    backend: AsyncStorage
  });

  // ดึงข้อมูล
  async function getAllData(){
    try{
      await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
        .then(response=>{
          setData(response.data.datas)
        })
        .catch(error=>{
          console.error(error)
        })
    }catch(err){
      console.error(err)
    }
  }

  function findMaxID(){
    return Math.max(...data.map(o => o.riskID));
  }

  // เมื่อผู้ใช้กดเพิ่ม
  async function handleAddPress(){
    // let likeCache = await cache.get('like');
    if(props.handleAdd){
      props.handleAdd()
    }
    if(detail == ""){ // Validate
      setvalidateDetailFail(true)
    }
    if(!marker){
      setvalidatePosFail(true)
    }
    if(detail && !marker){
      setvalidateDetailFail(false)
    }else if(detail == "" && marker){
      setvalidatePosFail(false)
    }
    if(detail != "" && marker){ // Add
      props.closeAddModal()
      setvalidateDetailFail(false)
      setvalidatePosFail(false)

      const options = { language: 'th' };
      Location.reverseGeocodeAsync({ latitude: parseFloat((Math.round(marker.latitude*1000000)/1000000).toFixed(6)), longitude: parseFloat((Math.round(marker.longitude*1000000)/1000000).toFixed(6)) }, options)
        .then((result) => {
          let district_en = result[0].subregion
          let district_th = district[district_en]

          const payload = {
            riskID: findMaxID()+1,
            dislike: 0,
            like: 1,
            owner: deviceId,
            coords: (Math.round(marker.latitude*1000000)/1000000).toFixed(6)+", "+(Math.round(marker.longitude*1000000)/1000000).toFixed(6),
            detail: detail,
            area: typeof district_th === 'undefined'? district_en : district_th
          }

          try{
            axios.post('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/data', payload)
              .then(async response => {
                console.log('Data items successfully inserted:', response.data);
                props.refreshData()
                let likeCache = await cache.get('like')==undefined?[]:await cache.get('like');
                likeCache.push(payload.riskID)
                await cache.set('like', likeCache)
              })
              .catch(error => {
                console.error("Insert Error:", error)
              })
          }catch(err){
            console.error(err)
          }

        })
        .catch((error) => {
          console.log(error);
        }
      );
      
      // let maxData = data.reduce((prev, cur)=>prev._id > cur._id ? prev:cur)
      // const docRef = await addDoc(collection(db, 'rans-database'), {
      //   _id: maxData._id + 1,
      //   detail: detail,
      //   area: "-",
      //   coords: (Math.round(marker.latitude*1000000)/1000000).toFixed(6)+", "+(Math.round(marker.longitude*1000000)/1000000).toFixed(6),
      //   like: 1,
      //   dislike: 0,
      //   owner: deviceId
      // });
      // console.log("Document written with ID: ", docRef.id);
      // if(likeCache==undefined){
      //   likeCache = []
      // }
      // likeCache.push(payload.riskID)
      // await cache.set('like', likeCache) // Update Cache
    }
  }

  // สร้าง Marker หากผู้ใช้พิมพ์coordsเอง
  function createMarkerwithInput(){
    if(latitude && longitude){
      setMarker({latitude: latitude, longitude: longitude})
      setfocusPos({latitude: latitude, longitude: longitude})
    }
  }

  useEffect(()=>{
    const getStartLocation = async () => { // จับตำแหน่งของผู้ใช้
        let location = await Location.getCurrentPositionAsync({});
        setfocusPos(location.coords)
    }
    getStartLocation();
    getAllData();
    GetDeviceID();
  }, [])

  return (
    <View>
      <View>
          <Text style={styles.InputHeader}>รายละเอียด <Text style={{color:"red", fontSize:validateDetailFail?12:0}}>* กรุณากรอกรายละเอียด</Text></Text>
          <TextInput style={[styles.Input, {borderColor:validateDetailFail?"red":"black"}]} placeholder='รายละเอียด' multiline={true} onChangeText={onChangeDetail} value={detail}/>
          <Text style={styles.InputHeader}>ระบุตำแหน่ง <Text style={{color:"red", fontSize:validatePosFail?12:0}}>* กรุณาระบุcoords</Text></Text>
          <View style={styles.posContainer}>
            <TextInput style={[styles.posInput, {borderColor:validatePosFail?"red":"black"}]} placeholder='ละติจูด' keyboardType='numeric' value={latitude} onChangeText={onChangeLati} onChange={createMarkerwithInput}/>
            <TextInput style={[styles.posInput, {borderColor:validatePosFail?"red":"black"}]} placeholder='ลองจิจูด' keyboardType='numeric' value={longitude} onChangeText={onChangeLongi} onChange={createMarkerwithInput}/>
          </View>
      </View>
      <MapView 
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        region={{latitude: focusPos.latitude, longitude: focusPos.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
        onPress={(e)=>{setMarker(e.nativeEvent.coordinate);setlatitude((Math.round(e.nativeEvent.coordinate.latitude*1000000)/1000000).toFixed(6).toString());setlongitude((Math.round(e.nativeEvent.coordinate.longitude*1000000)/1000000).toFixed(6).toString())}}
        onUserLocationChange={(e)=>setUserCoords(e.nativeEvent.coordinate)}
      >
        {marker && <Marker coordinate={marker} pinColor={"aqua"}/>}
        { data.map((item, index) => (
          <Marker key={index} pinColor={item.like>=50?"red":item.like>=25?"yellow":"green"} title={"จุดเสี่ยง"+(item.like>=50?" (อันตราย)":item.like>=25?" (โปรดระวัง)":"")} description={item.detail} coordinate = {item.coords.indexOf(" ")>=0?{latitude: Number(item.coords.slice(0, item.coords.indexOf(","))), longitude: Number(item.coords.slice(item.coords.indexOf(" ")))}:{latitude: Number(item.coords.slice(0, item.coords.indexOf(","))), longitude: Number(item.coords.slice(item.coords.indexOf(",")+1))}}/>
        ))}
      </MapView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={()=>{setMarker(userCoords);setfocusPos(userCoords);setlatitude((Math.round(userCoords.latitude*1000000)/1000000).toFixed(6).toString());setlongitude((Math.round(userCoords.longitude*1000000)/1000000).toFixed(6).toString())}}>
          <MaterialIcons name="my-location" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.redButton]} onPress={()=>{setMarker(null);setDetail("");setlatitude("");setlongitude("")}}>
          <FontAwesome name="trash-o" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.greenButton]} onPress={handleAddPress}>
          <FontAwesome name="check" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  posContainer: {
    flexDirection:'row',
    justifyContent:'space-between'
  },
  posInput: {
    width: '45%',
    padding: 10,
    margin: 10,
    borderBottomWidth: 1
  },
  InputHeader:{
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginLeft: 10
  },
  Input: {
    borderBottomWidth: 1,
    borderRadius: 10,
    padding: 10,
    margin: 10
  },
  map: {
    width: '95%',
    height: '55%',
    margin: 10
  },
  buttonContainer: {
    flexDirection:'row',
    justifyContent: 'flex-end'
  },
  button: {
    padding: 12,
    marginRight: 10,
    borderRadius: 30,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  redButton: {
    backgroundColor: '#F36C6C'
  },
  greenButton: {
    backgroundColor: "#6BF38B"
  }
});
