import React, { useCallback } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { Ionicons, AntDesign, Entypo } from '@expo/vector-icons'; // Icon
import axios from 'axios'; // ดึง API
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as TaskManager from "expo-task-manager" // จัดการ task ตอน tracking
import * as Location from 'expo-location'; // track user location
import { getPreciseDistance } from 'geolib'; // Calculate Distrance between 2 locations
import db from '../database/firebaseDB'; // Database
import { collection, getDoc, onSnapshot, updateDoc, doc } from "firebase/firestore"; // firebase
import { Cache } from 'react-native-cache'; // cache
import AsyncStorage from '@react-native-async-storage/async-storage'; // cache storage
import AddRisk from './AddRisk'; // Add Risk View
import { useFocusEffect } from "@react-navigation/native"; // check user is focus or not
import { encrypt } from '../components/Encryption'; // encrypt device id
import * as Device from 'expo-device'; // get device id
import * as Application from 'expo-application'; // get device id
import * as Notifications from 'expo-notifications'; // Notifications

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function CheckFocusScreen(props) {
  useFocusEffect(
    useCallback(() => {
      props.lightMode();
    }, [])
  );
  return <View />;
}

export default class MapsView extends React.Component {
  intervalId = null;
  firstTimeMount = true;
  constructor(){
    super();
    this.state = {
      data: [],
      apiData: [],
      fencing: [],
      fencingStartCoords: {},
      listRiskArea: [],
      alreadyNotify: [],
      notifyList: [],
      notifyCount: 0,
      delayTime: 0,
      position: {latitude: 13.736717, longitude: 100.523186},
      userCoords: {},
      deviceId: "",
      addPress: false,
      AlertMe: false,
      modalVisible: false,
      loading: true,
      dark: false,
      follow: false,
      myNotification: false,
      expoPushToken: '',
    }
    this.closeAddModal = this.closeAddModal.bind(this)
    this.handleLightMode = this.handleLightMode.bind(this)
    this.CheckLightMode = this.CheckLightMode.bind(this)
    this.getData = this.getData.bind(this)
  }
  
  componentDidMount(){
    // ตั้งค่า cache
    this.cache = new Cache({
      namespace: "RANS",
      policy: {
        maxEntries: 50000, // if unspecified, it can have unlimited entries
        stdTTL: 0 // the standard ttl as number in seconds, default: 0 (unlimited)
      },
      backend: AsyncStorage
    });

    // Define the background task for location tracking
    TaskManager.defineTask("LOCATION_BACKGROUND", async ({ data, error }) => {
      if (error) {
        console.error(error)
        return
      }
      if (data) {
        // Extract location coordinates from data
        const { locations } = data
        const location = locations[0]
        if (location) {
          this.setState({
            userCoords: location.coords
          })
          this.forceUpdate()
        }
      }
    })

    // Geofencing Task
    TaskManager.defineTask("LOCATION_GEOFENCE", ({ data: { eventType, region }, error }) => {
      if (error || region.identifier == '0') {
        // check `error.message` for more details.
        return;
      }
      if (eventType === Location.GeofencingEventType.Enter) {
        if(this.state.alreadyNotify.indexOf(region.identifier) < 0){
          console.log("You've entered region:", region.identifier);
          const location = this.state.data.filter((value)=>value.riskID==region.identifier)[0]
          const distrance = getPreciseDistance(this.state.userCoords, {latitude: region.latitude, longitude: region.longitude})
          this.notify(location.detail, distrance, region.identifier)
          this.setState(prevState => {
            const newMyArray = [...prevState.alreadyNotify, region.identifier];
            return { alreadyNotify: newMyArray };
          });
        }else{
          return false;
        }
      } else if (eventType === Location.GeofencingEventType.Exit) {
        if(this.state.alreadyNotify.indexOf(region.identifier) >= 0){
          console.log("You've left region:", region.identifier);
          var removeID
          this.state.alreadyNotify.filter((value, index)=>{
            if(value == region.identifier){
                removeID = index
            }
          })
          if(removeID >= 0){
            this.setState(prevState => {
              const newArray = [...prevState.alreadyNotify];
              newArray.splice(removeID, 1);
              const newCount = prevState.notifyCount - 1;
              return { alreadyNotify: newArray, notifyCount: newCount};
            });
          }
        }
      }
    });

    this.subscription();
    this.darkMapStyle = [
      {
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#242f3e"
          }
        ]
      },
      {
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#746855"
          }
        ]
      },
      {
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#242f3e"
          }
        ]
      },
      {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#d59563"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#38414e"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#212a37"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#9ca5b3"
          }
        ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#bababa"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#746855"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#1f2835"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#f3d19c"
          }
        ]
      },
      {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#2f3948"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#17263c"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#515c6d"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#17263c"
          }
        ]
      }
    ]
    this.defaultMapStyle = []
    // this.unsub = onSnapshot(collection(db, "rans-database"), this.getCollection);
    this.requestPermissions();
    this.GetPosition();
    this.getData();
    this.GetDeviceID();
    this.CheckLightMode();
  }

  async notify(detail, distrance, riskID){
    const noti = await Notifications.scheduleNotificationAsync({
      content: {
        title: '❗ RANS : พบจุดเสี่ยงในระยะ ' + distrance + ' เมตร',
        body: "จุดเสี่ยง " + detail + " อยู่ในระยะ " + distrance + " เมตรจากคุณ",
        autoDismiss: true
      },
      trigger: null,
    });
    this.setState(prevState => {
      const newCount = prevState.notifyCount + 1;
      return { notifyCount: newCount };
    });
    setTimeout(async ()=>{
      await Notifications.dismissNotificationAsync(noti)
      console.log(`Notification ${noti} cancelled`);
    }, (this.state.delayTime+(8000/this.state.notifyCount)))
    this.pushToNotificationPage(parseInt(riskID))
    this.forceUpdate()
  }

  async componentDidUpdate(prevProps, prevState){
    if(this.arraysEqual(prevState.fencing, this.state.fencing) == false){
      this.setState({
        fencingStartCoords: this.state.userCoords
      });
      await Location.startGeofencingAsync("LOCATION_GEOFENCE", this.state.fencing)
        .then(() => console.log('Geofencing started'))
        .catch(error => console.log(error));
    }
    if(getPreciseDistance(this.state.fencingStartCoords, this.state.userCoords) >= 150){
      console.log("Far away 150m Reload fencing")
      this.setState({
        fencingStartCoords: this.state.userCoords
      });
      var fencing_data = []
      this.state.data.forEach((res)=>{
        var pdis = getPreciseDistance(
          this.state.userCoords,
          {latitude: Number(res.coords.slice(0, res.coords.indexOf(","))), longitude: res.coords.indexOf(" ")>=0?Number(res.coords.slice(res.coords.indexOf(" "))):Number(res.coords.slice(res.coords.indexOf(",")+1))}
        );
        if(pdis<=150){
          fencing_data.push({
            identifier: res.riskID.toString(),
            latitude: Number(res.coords.slice(0, res.coords.indexOf(","))),
            longitude: res.coords.indexOf(" ")>=0?Number(res.coords.slice(res.coords.indexOf(" "))):Number(res.coords.slice(res.coords.indexOf(",")+1)),
            radius: res.like>=50?150:res.like>=25?100:50,
            notifyOnEnter: true,
            notifyOnExit: true
          })
        }
      })
      if(fencing_data.length != 0){
        this.setState({
          fencing: fencing_data
        });
      }else{
        this.setState({
          fencing: [
            {
              identifier: '0',
              latitude: 37.785834,
              longitude: -122.406417,
              radius: 10,
              notifyOnEnter: true,
              notifyOnExit: false,
            }
          ]
        })
      }
      this.forceUpdate()
    }
  }

  componentWillUnmount(){
    // this.unsub();
    clearInterval(this.intervalId);
    this.setState({
      AlertMe: false
    })
    Location.stopGeofencingAsync("LOCATION_GEOFENCE")
      .then(() => console.log('Geofencing stopped'))
      .catch(error => console.log(error));
  }

  async pushToNotificationPage(riskID) {
    let likeCache = await this.cache.get('like')==undefined?[]:await this.cache.get('like');
    let disLikeCache = await this.cache.get('dislike')==undefined?[]:await this.cache.get('dislike');
    const storage = await AsyncStorage.getItem("ignoreList")==null?"[]":await AsyncStorage.getItem("ignoreList");
    var ignoreList = JSON.parse(storage)
    if(ignoreList.length>0){
      let newlist = []
        if(ignoreList.indexOf(riskID)<0 && (likeCache.indexOf(riskID)<0 && disLikeCache.indexOf(riskID)<0)){
          newlist.unshift(riskID)
        }
      if(newlist.length>1){
        newlist.map((item)=>{
          ignoreList.unshift(item)
        })
      }else{
        newlist.map((item)=>{
          ignoreList.unshift(item)
        })
      }
    }else{
        if(likeCache.indexOf(riskID)<0 && disLikeCache.indexOf(riskID)<0){
          ignoreList.push(riskID)
        }
    }
    await AsyncStorage.setItem("ignoreList", JSON.stringify(ignoreList))
    await this.cache.set('ignoreID', ignoreList)
  }

  subscription = () => {
    const subRes = Notifications.addNotificationResponseReceivedListener(async response => {
      console.log(response)
      if(response.actionIdentifier == "LikeBtn"){
        console.log(await this.cache.getAll())
        let likeCache = await this.cache.get('like')==undefined?[]:await this.cache.get('like'); // ไม่ใช้ State เพื่อให้อัปเดตง่าย
        let disLikeCache = await this.cache.get('dislike')==undefined?[]:await this.cache.get('dislike'); // ไม่ใช้ State เพื่อให้อัปเดตง่าย
        if(likeCache.indexOf(response.notification.request.content.data.data.key)>=0 || disLikeCache.indexOf(response.notification.request.content.data.data.key)>=0){
          const cantLikeNoti_ID = Notifications.scheduleNotificationAsync({
            content: {
              categoryIdentifier: "CantDo",
              title: '❗ RANS : ไม่สามารถ Like ได้',
              body: "คุณอาจจะ Like ไปแล้วหรือกำลัง Dislike อยู่"
            },
            trigger: null,
          });
        }else{
          this.updateLike(response.notification.request.content.data.data.key)
        }
      }else if(response.actionIdentifier == "DislikeBtn"){
        this.updateDislike(response.notification.request.content.data.data.key)
      }else if(response.actionIdentifier == "DismissBtn"){
        let ignoreList = []
        let ignoreCache = await this.cache.get("ignoreID")==undefined?[]:await this.cache.get("ignoreID");
        let likeCache = await this.cache.get('like')==undefined?[]:await this.cache.get('like');
        let disLikeCache = await this.cache.get('dislike')==undefined?[]:await this.cache.get('dislike');
        if(ignoreCache.length>0){
          ignoreList = ignoreCache
          let newlist = []
          this.state.fencing.map((item)=>{
            if(ignoreCache.indexOf(item.identifier)<0 && (likeCache.indexOf(item.identifier)<0 && disLikeCache.indexOf(item.identifier)<0)){
              newlist.unshift(item.identifier)
            }
          })
          if(newlist.length>1){
            newlist.map((item)=>{
              ignoreList.unshift(item)
            })
          }else{
            newlist.map((item)=>{
              ignoreList.unshift(item)
            })
          }
        }else{
          this.state.fencing.map((item)=>{
            if(likeCache.indexOf(item.identifier)<0 && disLikeCache.indexOf(item.identifier)<0){
              ignoreList.push(item.identifier)
            }
          })
        }
        await this.cache.set('ignoreID', ignoreList)
      }
      console.log(await this.cache.getAll())
      Notifications.dismissNotificationAsync(response.notification.request.identifier)
    });

    return () => {
      Notifications.removeNotificationSubscription(subRes);
    };
  }

  async updateLike(key) {
    const q = doc(db, "rans-database", key); // หาตัวที่ ID ตรงกับ Parameter
    const querySnapshot = await getDoc(q);
    const likeData = {key: querySnapshot.id, ...querySnapshot.data()};
    likeCache.push(key)
    await updateDoc(doc(db, "rans-database", key), {
      like: likeData.like+1
    }).then(
      console.log("Like Updated")
    )
    await this.cache.set('like', likeCache) // Update Cache
  }

  async updateDislike(key) {
    const q = doc(db, "rans-database", key); // หาตัวที่ ID ตรงกับ Parameter
    const querySnapshot = await getDoc(q);
    const dislikeData = {key: querySnapshot.id, ...querySnapshot.data()};
    let likeCache = await this.cache.get('like')==undefined?[]:await this.cache.get('like');
    let disLikeCache = await this.cache.get('dislike')==undefined?[]:await this.cache.get('dislike');
    if(likeCache.indexOf(key)>=0 || disLikeCache.indexOf(key)>=0){
      alert("Already Like or Dislike")
      return false
    }else{
      disLikeCache.push(key)
      await updateDoc(doc(db, "rans-database", key), {
        dislike: dislikeData.like+1
      }).then(
        console.log("Dislike Updated")
      )
      await this.cache.set('dislike', disLikeCache)
    }
  }

  // ดึงข้อมูลแบบ Real time
  // getCollection = (querySnapshot) => {
  //   const all_data = [];
  //   const fencing_data = [];
  //   querySnapshot.forEach((res) => {
  //     const { _id, dislike, like, owner, coords, detail, area } = res.data();
  //     all_data.push({
  //       key: res.id,
  //       _id, dislike, like, owner, coords, detail, area
  //     });
  //     var pdis = getPreciseDistance(
  //       this.state.userCoords,
  //       {latitude: Number(coords.slice(0, coords.indexOf(","))), longitude: coords.indexOf(" ")>=0?Number(coords.slice(coords.indexOf(" "))):Number(coords.slice(coords.indexOf(",")+1))}
  //     );
  //     if(pdis<=150){
  //       fencing_data.push({
  //         identifier: res.id,
  //         latitude: Number(coords.slice(0, coords.indexOf(","))),
  //         longitude: coords.indexOf(" ")>=0?Number(coords.slice(coords.indexOf(" "))):Number(coords.slice(coords.indexOf(",")+1)),
  //         radius: like>=50?150:like>=25?100:50,
  //         notifyOnEnter: true,
  //         notifyOnExit: true
  //       })
  //     }
  //   });
  //   if(fencing_data.length != 0){
  //     this.setState({
  //       data: all_data,
  //       fencing: fencing_data
  //     });
  //   }else{
  //     this.setState({
  //       data: all_data,
  //       fencing: [
  //         {
  //           identifier: 'default',
  //           latitude: 37.785834,
  //           longitude: -122.406417,
  //           radius: 10,
  //           notifyOnEnter: true,
  //           notifyOnExit: false,
  //         }
  //       ]
  //     })
  //   }
  //   this.forceUpdate()
  // };

  arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
  
    for (let i = 0; i < arr1.length; i++) {
      if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
        return false;
      }
    }
  
    return true;
  }  

  async startBackgroundUpdate () {
    // Don't track position if permission is not granted
    const { granted } = await Location.getBackgroundPermissionsAsync()
    if (!granted) {
      console.log("location tracking denied")
      return
    }
  
    // Make sure the task is defined otherwise do not start tracking
    const isTaskDefined = TaskManager.isTaskDefined("LOCATION_BACKGROUND")
    if (!isTaskDefined) {
      console.log("Task is not defined")
      return
    }
  
    // Don't track if it is already running in background
    const hasStarted = await Location.hasStartedLocationUpdatesAsync("LOCATION_BACKGROUND")
    if (hasStarted) {
      console.log("Already started")
      return
    }
    await Location.startLocationUpdatesAsync("LOCATION_BACKGROUND", {
      // For better logs, we set the accuracy to the most sensitive option
      accuracy: Location.Accuracy.BestForNavigation,
      // Make sure to enable this notification if you want to consistently track in the background
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Location",
        notificationBody: "Location tracking in background",
        notificationColor: "#fff",
      },
    })
  }
  
  // Stop location tracking in background
  async stopBackgroundUpdate () {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    )
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      console.log("Location tacking stopped")
    }
  }
  
  async requestPermissions () {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status == "granted") {
      await Location.requestBackgroundPermissionsAsync();
    }
    let location = await Location.getCurrentPositionAsync({});
    this.setState({
      position: location.coords,
      userCoords: location.coords
    })
    this.startBackgroundUpdate()
  }
  
  async trackUser() {
    let location = await Location.getCurrentPositionAsync({});
    this.setState({
      position: location.coords
    })
  }

  async insertDataFromAPI() {
    try{
      this.state.data.forEach(async (res)=>{
        // console.log(res)
        await axios.post('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/data', res)
          .then(response => {
            console.log('Data items successfully inserted:', response.data);
          })
          .catch(error => {
            console.error("Put Error:", error)
          })
      })
    }catch(err){
      console.error(err)
    }
  }

  async getData() {
    const fencing_data = [];
    try{
      await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
        .then(response=>{
          response.data.datas.forEach((res) => {
            var pdis = getPreciseDistance(
              this.state.userCoords,
              {latitude: Number(res.coords.slice(0, res.coords.indexOf(","))), longitude: res.coords.indexOf(" ")>=0?Number(res.coords.slice(res.coords.indexOf(" "))):Number(res.coords.slice(res.coords.indexOf(",")+1))}
            );
            if(pdis<=150){
              fencing_data.push({
                identifier: res.riskID.toString(),
                latitude: Number(res.coords.slice(0, res.coords.indexOf(","))),
                longitude: res.coords.indexOf(" ")>=0?Number(res.coords.slice(res.coords.indexOf(" "))):Number(res.coords.slice(res.coords.indexOf(",")+1)),
                radius: res.like>=50?150:res.like>=25?100:50,
                notifyOnEnter: true,
                notifyOnExit: true
              })
            }
          })
          if(fencing_data.length != 0){
            this.setState({
              data: response.data.datas,
              fencing: fencing_data
            });
          }else{
            this.setState({
              data: response.data.datas,
              fencing: [
                {
                  identifier: '0',
                  latitude: 37.785834,
                  longitude: -122.406417,
                  radius: 10,
                  notifyOnEnter: true,
                  notifyOnExit: false,
                }
              ]
            })
          }
          if(this.intervalId == null){
            this.intervalId = setInterval(() => {
              // Code to be executed at the interval
              console.log(Date().toString()+": Data Refresh")
              this.getData()
            }, 60000);
          }
        })
        .catch(error=>{
          console.error(error)
        })
    }catch(err){
      console.error(err)
    }
  }

  async getDataFromAPI() {
    try{
      await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
        .then(response=>{
          this.setState({
            data: response.data.datas
          })
          this.setState(prevState => {
            var countID = this.state.data.length>0?this.state.data.pop().riskID-1:0;
            const newData = this.state.apiData.map(res => {
              countID++;
              return {
                riskID: countID,
                dislike: 0,
                like: 0,
                owner: '-',
                coords: res.พิกัด,
                detail: res.รายละเอียด,
                area: res.สำนักงานเขต
              };
            });
            const newMyArray = [...prevState.data, ...newData];
            return { data: newMyArray };
          });
          // this.insertDataFromAPI()
        })
        .catch(error=>{
          console.error(error)
        })
    }catch(err){
      console.error(err)
    }
  }

  async GetPosition() {
    try{
      // JSON หาก API ล่ม
      const customData = require('../assets/RiskArea2.json')
      this.setState({
        apiData: customData.result.records
      })
          
      // API
      // await axios.get('https://data.bangkok.go.th/api/3/action/datastore_search?&resource_id=6cc7a43f-52b3-4381-9a8f-2b8a35c3174a')
      //         .then(response=>{
      //           this.setState({
      //             apiData: response.data.result.records
      //           })
      //         })
      //         .catch(error=>{
      //           console.error(error)
      //         })
    }catch(err){
      console.error(err)
    }
  }

  // เก็บ Device ID ของผู้ใช้
  async GetDeviceID() {
    if (Device.osName == 'iPadOS' || Device.osName == 'iOS'){
      this.setState({
        deviceId: encrypt(await Application.getIosIdForVendorAsync())
      })
    }
    else{
      this.setState({
        deviceId: encrypt(Application.androidId)
      })
    }
  }
  
  // เมื่อผู้ใช้ปิด Notification
  closeModal() {
    this.setState({
      modalVisible: false
    })
  }

  // ปิด Add Modal ที่ผู้ใช้กดปุ่ม + บน Header
  closeAddModal() {
    this.setState({
      addPress: false
    })
  }

  // ตรวจโหมดความสว่างของผู้ใช้จาก Cache ตอนเปิดโปรแกรม
  async CheckLightMode(){
    let lightMode = await this.cache.get("lightMode")
    if(lightMode == undefined){
      this.setState({
        dark: false
      })
      await this.cache.set("lightMode", "light")
    }
    else if(lightMode == "light"){
      this.setState({
        dark: false
      })
    }
    else if(lightMode == "dark"){
      this.setState({
        dark: true
      })
    }
  }

  // เมื่อผู้ใช้กดปุ่ม เพิ่ม/ลด แสง
  async handleLightMode(){
    let lightMode = await this.cache.get("lightMode")
    if(lightMode == "light"){
      this.setState({
        dark: true
      })
      await this.cache.set("lightMode", "dark")
    }
    else if(lightMode == "dark"){
      this.setState({
        dark: false
      })
      await this.cache.set("lightMode", "light")
    }
  }

  // Component Function เมื่อมีการกดปุ่ม + บน Header
  AddNewRisk = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={this.state.addPress}
        onRequestClose={() => {
          this.closeAddModal();
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalViewWithMap}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={()=>{this.setState({addPress:false})}}>
              <AntDesign name="close" size={24} color="black" />
            </TouchableOpacity>
            <AddRisk closeAddModal={this.closeAddModal} refreshData={this.getData}/>
          </View>
        </View>
      </Modal>
    )
  }

  render(){
    return (
      <View style={styles.container}>
        {this.state.loading==false?
        <>
        <View style={styles.topRightContainer}>
          <TouchableOpacity style={styles.topRightButton} onPress={() => { this.handleLightMode(); } }>
            <Entypo name={this.state.dark ? "light-up" : "light-down"} size={24} color="black" />
          </TouchableOpacity>
          {this.state.AlertMe ? this.state.follow == false ?
            <TouchableOpacity style={styles.topRightButton} onPress={() => { this.setState({ follow: true });this.trackUser() } }>
              <Entypo name="direction" size={24} color="black" />
            </TouchableOpacity> : null : null}
         </View>
         <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.bottomButton} onPress={() => { this.setState({ addPress: true }); } }>
              <Ionicons name="add" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </>:null}
        <CheckFocusScreen lightMode={this.CheckLightMode}/>
        <this.AddNewRisk/>
        <MapView style={styles.map}
          region={{ latitude: this.state.position.latitude, longitude: this.state.position.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          followsUserLocation={true}
          loadingEnabled
          onUserLocationChange={(e)=>this.state.follow?this.setState({position:e.nativeEvent.coordinate,userCoords:e.nativeEvent.coordinate}):null}
          customMapStyle={this.state.dark?this.darkMapStyle:this.defaultMapStyle}
          onMoveShouldSetResponder={()=>{this.state.follow?this.setState({follow:false}):null}}
          onMapLoaded={()=>this.setState({loading:false})}
        >
          {this.state.data.map((item, index) => (
            <Marker key={this.state.follow?`${item.riskID}${Date.now()}`:this.state.deviceId+index} pinColor={item.like >= 50 ? "red" : item.like >= 25 ? "yellow" : "green"} title={"จุดเสี่ยง" + (item.like >= 50 ? " (อันตราย)" : item.like >= 25 ? " (โปรดระวัง)" : "")} description={item.detail} coordinate={item.coords.indexOf(" ") >= 0 ? { latitude: Number(item.coords.slice(0, item.coords.indexOf(","))), longitude: Number(item.coords.slice(item.coords.indexOf(" "))) } : { latitude: Number(item.coords.slice(0, item.coords.indexOf(","))), longitude: Number(item.coords.slice(item.coords.indexOf(",") + 1)) }} />
          ))}
        </MapView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonContainer:{
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 3
  },
  bottomButton: {
    position:'relative',
    width: 70,
    height: 70,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 40,
    borderWidth: 1,
    backgroundColor: '#FF9933',
  },
  topRightContainer: {
    position: 'absolute',
    top: 50,
    right: 6.8,
    zIndex: 3,
    opacity: 0.7
  },
  topRightButton: {
    position:'relative',
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 7,
    backgroundColor: '#fff',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalViewWithMap: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseButton: {
    position: 'absolute',
    top: '3%',
    right: '5%'
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    margin: 2
  },
  buttonClose: {
    backgroundColor: '#F36C6C',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  modalTextHeader: {
    marginBottom: 15,
    color: 'red',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
