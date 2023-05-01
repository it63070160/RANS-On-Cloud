import { StyleSheet, View, Text, ActivityIndicator , ScrollView, TouchableOpacity} from 'react-native';
import db from '../database/firebaseDB';
import { collection, addDoc, getDocs, onSnapshot, where, query, deleteDoc } from "firebase/firestore";
import { Dimensions } from "react-native";
import { useEffect, useState } from 'react';
// https://npm.io/package/react-native-animated-charts
import BarChart from '../components/BarChart';
import { graphColor } from '../constants/colors'
import { groupBy } from "lodash";

import axios from 'axios'; // ดึง API

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export default function StatisticView() {

    let data = []

    let data2 = []

    let [listData, setListData] = useState([])

    let [listDataGroup, setListDataGroup] = useState([])

    let [listDataGroupSort, setListDataGroupSort] = useState([])

    // show {n} elements first
    const showTop = 5

    // async function getList(){
    //     try{
    //         // await axios.get('https://data.bangkok.go.th/api/3/action/datastore_search?resource_id=db468db2-8450-4867-80fb-5844b5fbd0b4')
    //         //         .then(response=>{
    //         //           data = response.data.result.records
    //         //         })
    //         //         .catch(error=>{
    //         //           console.error(error)
    //         //         })
    //         // ดึงข้อมูลจากไฟล์ json หากเว็บ api ล่ม
    //         const customData = require('../assets/RiskArea.json')
    //         const customData2 = require('../assets/RiskArea2.json')
    //         data = customData.result.records
    //         data2 = customData2.result.records
    //         data = data.concat(data2)
    //         // เอาข้อมูลจาก api ใส่ firebase
    //         let docRef;
    //         for (let i=0; i<data.length;i++){
    //           docRef = await addDoc(collection(db, "rans-database"), {
    //             _id: data[i]._id,
    //             รายละเอียด: data[i].รายละเอียด,
    //             สำนักงานเขต: data[i].สำนักงานเขต,
    //             พิกัด: data[i].พิกัด,
    //             like: 1,
    //             dislike: 0,
    //             owner: '-'
    //           });
    //         console.log("Document written with ID: ", docRef.id);
    //         }
    //     }catch(err){
    //         console.error(err)
    //     }
    // }

    // ดึงข้อมูล row จาก db -> collection
    function getData(querySnapshot) {

        let dataFromFirebase = []
        querySnapshot.forEach((res) => {
          dataFromFirebase.push(res.data());
        })

        setListData(dataFromFirebase)

        formatGraph(groupData(dataFromFirebase, 'สำนักงานเขต'))

    }

    async function getAllData(){
      try{
        await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
          .then(response=>{
            setListData(response.data.datas)
            formatGraph(groupData(response.data.datas, 'area'))
          })
          .catch(error=>{
            console.error(error)
          })
      }catch(err){
        console.error(err)
      }
    }

    function groupData(array, key){
      let group = groupBy(array, key)
      let g = Object.entries(group);

      let resGroup = []

      for (let j=0; j<g.length; j++){
          resGroup.push({label: g[j][0], dataY: g[j][1].length})
      }

      setListDataGroup(resGroup)

      return resGroup
    }

    function formatGraph(dt){

      function sortName(a, b){
        if (a.label > b.label){ return 1; }
        if (b.label > a.label){ return -1; }
        return 0;
      }
      
      let sortedData = dt.sort(sortName).sort(
        (p, n) => (p.dataY < n.dataY) ? 1 : (p.dataY > n.dataY) ? -1 : 0);

        let resGroupSec = []

        for (let j=0; j<sortedData.length; j++){
          resGroupSec.push({label: sortedData[j].label, dataY: sortedData[j].dataY})
        }

        setListDataGroupSort(resGroupSec)
    }

    function generateList(value, index){
      if (index >= showTop){
        return <View style={styles.listBox} key={index+6}>
          <Text style={{width: '10%', textAlign: 'center'}}>{index + 1}</Text>
          <View style={{width: '1%', borderRightColor: 'black', borderRightWidth: 1, height: '100%'}}></View>
          <Text style={{width: '60%', paddingLeft: '5%'}}>{value.label}</Text>
          <Text style={{width: '20%', textAlign: 'center'}}>{value.dataY} จุด</Text>
        </View>
      }
    }

    async function test(){
      // try {
      //  for (let i=0; i<=9; i++){

      //   let docRef = await addDoc(collection(db, "rans-database"), {
      //     _id: 500,
      //     รายละเอียด: 'test',
      //     สำนักงานเขต: 'บึงกุ่ม',
      //     พิกัด: '13.644037, 100.413331',
      //     like: 0,
      //     dislike: 0
      //   });
      //   console.log(docRef.id)}
      
      // } catch(er){
      //   console.log(er)
      // }

      // let q = query(collection(db, "rans-database"), where("_id", "==", 500))
      // let u = await getDocs(q)

      // u.docs.forEach((t) => {
      //   deleteDoc(t.ref)
      // })
    }

    useEffect(()=>{
      // getData();
      getAllData();
      // const unsub = onSnapshot(collection(db, 'rans-database'), getData, (error) => {
      //   console.log(error)
      // });
    }, [])

    return (
        <View style={styles.container}>
          {(listDataGroup.length != 0)?
          <View style={{width: '100%', height: '100%'}}>
            <View style={styles.graphContainer}>
              <Text style={styles.graphHeader}>{showTop} อันดับเขตที่มีจำนวนจุดเสี่ยงสูงที่สุดในกรุงเทพมหานคร</Text>
              <BarChart
                labels={listDataGroupSort.map((value, index) => value.label + "\n (" + value.dataY + " จุด)").slice(0, showTop)}
                dataY={listDataGroupSort.map((value, index) =>  value.dataY).slice(0, showTop)}
                color={graphColor}
                height={screenHeight * .28}
                containerStyles={styles.barChart}
              />
            </View>
            <ScrollView style={styles.bgScroll}>
              {listDataGroupSort.map(generateList)}
            </ScrollView>
            {/* <View style={{backgroundColor: '#233212'}}>
              <TouchableOpacity onPress={() => getList()} style={styles.button}>
                  <Text style={styles.buttonText}>Test</Text>
              </TouchableOpacity>
            </View> */}
            </View>
            :<ActivityIndicator color={'green'} size={'large'}></ActivityIndicator>
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    graphContainer: {
      backgroundColor: '#D7CCC8',
      width: '100%',
      height: screenHeight*0.4,
    },
    graphStyle: {
      position: 'absolute',
      bottom: 0,
    },
    graphHeader: {
      marginTop: 20,
      fontSize: 25,
      textAlign: 'center',
    },
    bgScroll: {
      width: "100%",
      height: "100%",
      backgroundColor: "#D7CCC8"
    },
    button: {
      backgroundColor:"#7CB342",
      width:screenWidth*.3,
      // height:40,
      borderRadius:30,
      alignItems:"center",
      justifyContent:"center",
      alignSelf: 'flex-end',
      marginBottom: 30,
      marginTop: 30,
      marginRight: 30,
      padding: 20
    },
    buttonText: {
        color:"white",
        fontSize: 25
    },
    barChart: {
        backgroundColor:"transparent",
        height:screenHeight*.28,
        width: '100%',
        position: 'absolute',
        bottom: '3%',
        borderBottomColor: 'black',
        borderBottomWidth: 2,
        alignItems: 'center',
        alignSelf: 'center',
    },
    listBox: {
      width: '90%',
      alignItems: 'center',
      alignSelf: 'center',
      margin: '1%',
      padding: '2%',
      flexDirection: 'row',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      borderRadius: 50,
      backgroundColor: "#fff"
    },
});
