import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable, TextInput} from "react-native";
import { useEffect, useState, useRef } from 'react';
import db from "../database/firebaseDB";
import { AntDesign } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import { collection, addDoc, getDocs, onSnapshot, where, query, deleteDoc, getDoc, doc } from "firebase/firestore";
import axios from "axios";
import { encrypt, decrypt } from "../components/Encryption";

export default function RiskListView({route}){

    let [listData, setListData] = useState([])
    let [listDataSort, setListDataSort] = useState([])
    let [modalVisible, setModalVisible] = useState(false);

    function getData(querySnapshot) {

        let dataFromFirebase = []
        querySnapshot.forEach((res) => {
            dataFromFirebase.push({key: res.id, ...res.data()});
        })

        setListData(dataFromFirebase)

        formatList(dataFromFirebase)

    }

    function formatList(d){
        function sortName(a, b){
            if (a.สำนักงานเขต > b.สำนักงานเขต){ return 1; }
            if (b.สำนักงานเขต > a.สำนักงานเขต){ return -1; }
            return 0;
        }

        function sortLike(a, b){
            if ((a.dislike/(a.like + a.dislike)*100) > (b.dislike/(b.like + b.dislike))*100){ return -1; }
            if ((b.dislike/(b.like + b.dislike)*100) > (a.dislike/(a.like + a.dislike))*100){ return 1; }
            return 0;
        }

        d = d.sort(sortName).sort(sortLike)

        setListDataSort(d)
    }

    function generateRiskList(value, index){
        return (<View style={styles.listBox} key={'risk'+index}>
                    <Text style={{width: '10%', textAlign: 'center'}}>{index + 1}</Text>
                    <View style={{width: '1%', borderRightColor: 'black', borderRightWidth: 1, height: '100%'}}></View>
                    <Text style={{width: '50%', paddingLeft: '5%'}}>{value.รายละเอียด + '\n' + 'เขต: ' + value.สำนักงานเขต}</Text>
                    <View style={{width: '20%', paddingLeft: '5%'}}>
                        <Text style={{width: '100%', textAlign: 'center'}}>
                        {'Fake rate\n'}{value.like+value.dislike != 0 && !isNaN(value.like+value.dislike)?(value.dislike/(value.like + value.dislike)*100).toFixed(2):(0.00+0.00).toFixed(2)}{' %'}
                        </Text>
                    </View>
                    <View style={{width: '15%', paddingLeft: '5%'}}>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => { deleteRisk(value, index) } }>
                            <AntDesign name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>)
    }

    async function addRiskFromAPI(){
        let data
        let data2
        let q = query(collection(db, "rans-database"), where("_id", "<=", 126))
        let u = await getDocs(q)

        if (u.docs.length != 0){
            setModalVisible(true)
        }
        else{
            try{
                // ดึงข้อมูลจาก API
                let nextLink
                await axios.get('https://data.bangkok.go.th/api/3/action/datastore_search?resource_id=6cc7a43f-52b3-4381-9a8f-2b8a35c3174a')
                        .then(response=>{
                          data = response.data.result.records
                          nextLink = 'https://data.bangkok.go.th' + response.data.result._links.next
                        })
                        .catch(error=>{
                          console.error(error)
                        })
                await axios.get(nextLink)
                        .then(response => {
                            data2 = response.data.result.records
                        })
                        .catch(error=>{
                            console.error(error)
                        })
                data = data.concat(data2)

                // // ดึงข้อมูลจากไฟล์ json หากเว็บ api ล่ม
                // const customData = require('../assets/RiskArea.json')
                // const customData2 = require('../assets/RiskArea2.json')
                // data = customData.result.records
                // data2 = customData2.result.records
                // data = data.concat(data2)

                // เอาข้อมูลจาก api ใส่ firebase
                let docRef;
                for (let i=0; i<data.length;i++){
                  docRef = await addDoc(collection(db, "rans-database"), {
                    _id: data[i]._id,
                    รายละเอียด: data[i].รายละเอียด,
                    สำนักงานเขต: data[i].สำนักงานเขต,
                    พิกัด: data[i].พิกัด,
                    like: 1,
                    dislike: 0,
                    owner: '-'
                  });
                console.log("Document written with ID: ", docRef.id);
                }
            }catch(err){
                console.error(err)
            }
        }

    }

    async function removeAPIRisk(){
        let q = query(collection(db, "rans-database"), where("_id", "<=", 126))
        let u = await getDocs(q)

        u.docs.forEach((t) => {
            deleteDoc(t.ref)
        })
        console.log('deleted')
        try{
            getData();
        }
        catch(error){
        }
    }

    async function deleteRisk(select, index){
        const q = doc(db, "rans-database", select.key);
        const querySnapshot = await getDoc(q);
        if(querySnapshot.exists){
            await deleteDoc(doc(db, "rans-database", select.key))
            .then(()=>{
                console.log('Delete Risk ID: ' + select._id + " | " + select.key);
                let splicelist = listDataSort;
                splicelist.splice(index, 1);
                setListDataSort(splicelist);
            })
        }else{
            alert("ไม่พบข้อมูล (อาจถูกลบไปแล้ว)")
        }
    }

    function ModalRisk(){
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(false)
            }}
          >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Please delete risks from API{'\n'}Before add risk from API.</Text>
                    <Pressable
                    style={[styles.button, styles.buttonClose]}
                    onPress={() => {setModalVisible(!modalVisible)}}
                    >
                    <Text style={styles.textStyle}>Close</Text>
                    </Pressable>
                </View>
            </View>
          </Modal>
        )
    }

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'rans-database'), getData, (error) => {
            console.log(error)
          });
    }, [])

    return (
        <View style={styles.container}>
            <Text style={styles.heading1}>Welcome Developer {route.params.params.name}{' (devID : ' + route.params.params.key + ')'}</Text>
            <View style={styles.riskList}>
                <Text style={styles.heading2}>Risk List</Text>
                <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity style={styles.addRiskButton} onPress={() => { addRiskFromAPI() } }>
                        <Text>Add risk from API</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteAPIRiskButton} onPress={() => { removeAPIRisk() } }>
                        <Text>Remove risk from API</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{paddingBottom: '90%'}}>
                    {listDataSort.length!=0?listDataSort.map(generateRiskList):<ActivityIndicator color={'green'} size={'large'}></ActivityIndicator>}
                </ScrollView>

            </View>
            <ModalRisk />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
    },
    heading1: {
        fontSize: 30,
        textAlign: 'center',
        marginTop: '1%'
    },
    heading2: {
        marginTop: '2%',
        fontSize: 25,
    },
    riskList: {
        width: '100%',
        height: '100%',
        alignItems: 'center'
    },
    listBox: {
        width: '95%',
        alignItems: 'center',
        alignSelf: 'center',
        margin: '0.2%',
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
        backgroundColor: "#fff",
    },
    deleteButton: {
        width: '100%',
        backgroundColor: '#E97777',
        borderRadius: 20,
        alignItems: 'center',
    },
    addRiskButton: {
        width: '40%',
        height: '30%',
        backgroundColor: '#82CD47',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        marginTop: '1%',
        marginLeft: '1%',
    },
    deleteAPIRiskButton: {
        width: '40%',
        height: '30%',
        backgroundColor: '#FF847C',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        marginTop: '1%',
        marginLeft: '1%',
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22
      },
      modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
      },
      button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2
      },
      buttonClose: {
        backgroundColor: "#FF847C",
      },
      buttonSubmit: {
        backgroundColor: "#ABE6CE",
      },
      modalText: {
        marginBottom: 15,
        textAlign: "center"
      },
});