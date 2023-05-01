import { StyleSheet, View, Text, ActivityIndicator , ScrollView, TouchableOpacity, Animated, Easing } from "react-native";
import { useEffect, useState, useRef } from 'react';
import { Dimensions } from "react-native";
import { collection, addDoc, getDocs, onSnapshot, where, query, deleteDoc } from "firebase/firestore";
import db from "../database/firebaseDB";
import { AntDesign } from "@expo/vector-icons";
import List from '../components/List';
import axios from "axios";

export default function RiskStatisticView(){

    let [listData, setListData] = useState([])

    let [listDataSort, setListDataSort] = useState([])

    // ดึงข้อมูล row จาก db -> collection
    function getData(querySnapshot) {

      let dataFromFirebase = []
      querySnapshot.forEach((res) => {
        dataFromFirebase.push(res.data());
      })

      setListData(dataFromFirebase)

      formatData(dataFromFirebase)

    }

    async function getAllData(){
      try{
        await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
          .then(response=>{
            setListData(response.data.datas)
            formatData(response.data.datas)
          })
          .catch(error=>{
            console.error(error)
          })
      }catch(err){
        console.error(err)
      }
    }

    function formatData(d){

      function sortName(a, b){
        if (a.area > b.area){ return 1; }
        if (b.area > a.area){ return -1; }
        return 0;
      }

      function sortLike(a, b){
        if (a.like > b.like){ return -1; }
        if (b.like > a.like){ return 1; }
        return 0;
      }

      d = d.sort(sortName).sort(sortLike)

      setListDataSort(d)
    }

    function generateList(value, index){

        return <View style={[styles.listBox]} key={index}>
        <Text style={{width: '7%', textAlign: 'center'}}>{index + 1}</Text>
        <View style={{width: '1%', borderRightColor: 'black', borderRightWidth: 1, height: '100%'}}></View>
        <Text style={{width: '50%', paddingLeft: '5%'}}>{value.detail}</Text>
        <Text style={{width: '20%', textAlign: 'center'}}>{value.area}</Text>
        <Text style={{width: '10%', textAlign: 'center'}}><AntDesign name="like2" size={24} color="black" />  {value.like}</Text>
        <Text style={{width: '10%', textAlign: 'center'}}><AntDesign name="dislike2" size={24} color="black" />  {value.dislike}</Text>
      </View>
    }

    useEffect(()=>{
        // getList()
        // getData();
        getAllData()
        // const unsub = onSnapshot(collection(db, 'rans-database'), getData, (error) => {
        //   console.log(error)
        // });
      }, [])

    return (
        <View style={styles.container}>
          {(listDataSort.length != 0)?
          // <ScrollView>
          //   {listDataSort.map(generateList)}
          // </ScrollView>
          <List data={listDataSort} />
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
    bgScroll: {
      width: "100%",
      height: "100%",
      backgroundColor: "#D7CCC8"
    },
    listBox: {
      width: '95%',
      alignItems: 'center',
      alignSelf: 'center',
      margin: '1%',
      paddingVertical: '2%',
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