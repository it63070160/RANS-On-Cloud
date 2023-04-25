import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign, FontAwesome, Feather, Ionicons, Foundation, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
// MapsView Screen
import MapsView from '../views/MapsView';
import NotificationsView from '../views/NotificationsView';
import StatisticView from '../views/StatisticView';
import ManageRisk from '../views/ManageRisk';
import RiskStatisticView from '../views/RiskStatisticView';
import ReportRisk from '../views/ReportRisk';
import DevelopeListView from '../views/DevelopeListView';
import RiskListView from '../views/RiskListView';

import * as Device from 'expo-device';
import * as Application from 'expo-application';

import db from '../database/firebaseDB';
import { collection, onSnapshot } from "firebase/firestore";

import { decrypt } from '../components/Encryption';
import { RotateInUpLeft } from 'react-native-reanimated';

const Drawer = createDrawerNavigator();
const BottomTab = createBottomTabNavigator();
const DevBottomTab = createBottomTabNavigator();

function BottomTabNavigator(){
    return (
        <BottomTab.Navigator screenOptions={{headerShown:false}}>
            <BottomTab.Screen name="Statistic" component={ StatisticView } options={{tabBarIcon: ({ color }) => {
                return <AntDesign name="areachart" size={24} color={color} />
            },}}/>
            <BottomTab.Screen name="RiskStatistic" component={ RiskStatisticView } options={{tabBarIcon: ({ color }) => {
                return <FontAwesome name="asterisk" size={24} color={color} />
            }, title: "Risk Statistic"}}/>
        </BottomTab.Navigator>
    );
}

function DevBottomTabNavigator({route}){
    return (
        <DevBottomTab.Navigator screenOptions={{headerShown: false}}>
            <DevBottomTab.Screen name="DevelopeList" component={ DevelopeListView } options={{tabBarIcon: ({ color }) => {
                return <MaterialIcons name="person-search" size={24} color={color}  />
            }}} initialParams={{params: route.params}}/>
            <DevBottomTab.Screen name="RiskList" component={ RiskListView } options={{tabBarIcon: ({ color }) => {
                return <MaterialCommunityIcons name="star-four-points" size={24} color={color} />
            }}} initialParams={{params: route.params}}/>
            <DevBottomTab.Screen name="Report" component={ ReportRisk } options={{tabBarIcon: ({ color }) => {
                return <Ionicons name="document-text-outline" size={24} color={color} />
            }}} initialParams={{params: route.params}}/>
        </DevBottomTab.Navigator>
    )
}

function DrawerNavigator(props){
    return (
        <Drawer.Navigator screenOptions={{ headerStyle: styles.header, headerTitleAlign: 'center'}}>
            <Drawer.Screen name="Maps" component={MapsView} options={{
                title:'RANS Maps',
                drawerIcon: ({ color }) => { return <Feather name="map" size={24} color={color} />; },
            }}/>
            <Drawer.Screen name="ManageRisks" component={ManageRisk} options={{
                title:'Manage Risks',
                drawerIcon: ({color}) => { return <Foundation name="clipboard-pencil" size={30} color={color} />}
            }}/>
            <Drawer.Screen name="Notifications" component={NotificationsView} options={{
                drawerIcon: ({color}) => { return <Ionicons name="notifications-outline" size={24} color={color} />}
            }}/>
            <Drawer.Screen name="StatisticDrawer" component={BottomTabNavigator} options={{
                title: 'Statistic',
                drawerIcon: ({color}) => { return <FontAwesome name="bar-chart-o" size={24} color={color} />}
            }}/>
            {props.isDev?<Drawer.Screen name="DevMode" component={DevBottomTabNavigator} options={{
                drawerIcon: ({color}) => { return <MaterialIcons name="developer-mode" size={24} color={color} />}
            }} initialParams={props.dev} />:null}
        </Drawer.Navigator>
    );
}

export default function MainNavigator(){

    let [isDev, setIsDev] = useState(false)
    let [idList, setIdList] = useState([])
    let [obj, setObj] = useState()

    const checkDevId = async () => {
        let id
        if (Device.osName == 'iPadOS' || Device.osName == 'iOS'){
            id = await Application.getIosIdForVendorAsync()
        }
        else{
            id = Application.androidId
        }
        console.log(id)
        let ob = idList.find(val => val.id == id)
        if (typeof(ob) != 'undefined'){
            setIsDev(true)
            setObj(ob)
        }
        else {
            setIsDev(false)
            setObj(ob)
        }
    }

    function getData(querySnapshot) {

        let dataFromFirebase = []
        querySnapshot.forEach((res) => {
          dataFromFirebase.push({
            'name' : res.data().name,
            'id' : decrypt(res.data().id),
            'key' : res.data().key
          });
        })

        setIdList(dataFromFirebase)
        
    }
    
    useEffect(()=>{
        checkDevId();
    }, [checkDevId, isDev, obj])
    
    

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'rans-dev-database'), getData, (error) => {
            console.log(error)
          });
    }, [])

    return(
        <NavigationContainer>
            <DrawerNavigator isDev={isDev} dev={obj}/>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      backgroundColor: '#fff',
    },
    header:{
      borderBottomWidth: 2,
      borderBottomColor: 'black'
    },
});