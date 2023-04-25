import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable, TextInput} from "react-native";
import { useEffect, useState, useRef } from 'react';
import db from "../database/firebaseDB";
import { AntDesign } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import { collection, addDoc, getDocs, onSnapshot, where, query, deleteDoc } from "firebase/firestore";
import axios from "axios";
import { encrypt, decrypt } from "../components/Encryption";

export default function DevView({route}){

    let [devs, setDevs] = useState([])
    let [listData, setListData] = useState([])
    let [listDataSort, setListDataSort] = useState([])
    let [modalVisible, setModalVisible] = useState(false);
    let [modalAddDevVisible, setModalAddDevVisible] =useState(false)
    let [inputName, setInputName] = useState('')
    let [inputId, setInputId] = useState('')
    let [validateDetailFail, setValidateDetailFail] = useState(false)

    function getDev(querySnapshot) {

        let dataFromFirebase = []
        querySnapshot.forEach((res) => {
          dataFromFirebase.push({'name' : res.data().name, 'id' : res.data().id, 'key': res.data().key});
        })

        formatDevs(dataFromFirebase)
    }

    function formatDevs(d){
        function sortName(a, b){
            if (a.name > b.name){
                return 1;
            }
            else if(b.name > a.name){
                return -1;
            }
            else{
                return 0;
            }
        }

        d.sort(sortName)

        setDevs(d)
    }

    function getData(querySnapshot) {

        let dataFromFirebase = []
        querySnapshot.forEach((res) => {
          dataFromFirebase.push(res.data());
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

    function generateDevList(value, index){
        return (<View style={styles.listBox} key={'dev'+index}>
                    <Text style={{width: '10%', textAlign: 'center'}}>{index + 1}</Text>
                    <View style={{width: '1%', borderRightColor: 'black', borderRightWidth: 1, height: '100%'}}></View>
                    <Text style={{width: '69%', paddingLeft: '5%'}}>{value.name} {value.key==route.params.params.key?'(you)':''} {'\nID : ' + value.key}</Text>
                    <View style={{width: '20%', paddingRight: '5%'}}>
                        <TouchableOpacity style={[styles.deleteButton, {opacity:value.key==route.params.params.key?0.3:1}]} 
                            onPress={() => { deleteDev(value, index) }} 
                            disabled={value.key==route.params.params.key}
                            >
                            <AntDesign name="deleteuser" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>)
    }

    function generateRiskList(value, index){
        return (<View style={[styles.listBox, {width: '85%'}]} key={'risk'+index}>
                    <Text style={{width: '7%', textAlign: 'center'}}>{index + 1}</Text>
                    <View style={{width: '1%', borderRightColor: 'black', borderRightWidth: 1, height: '100%'}}></View>
                    <Text style={{width: '50%', paddingLeft: '5%'}}>{value.รายละเอียด + '\n' + 'เขต: ' + value.สำนักงานเขต}</Text>
                    <View style={{width: '20%', paddingLeft: '5%'}}>
                        <Text style={{width: '100%', textAlign: 'center'}}>
                            {'Fake rate\n'}{value.like+value.dislike != 0?(value.dislike/(value.like + value.dislike)*100).toFixed(2):0}{' %'}
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

    function addDev(){
        setModalAddDevVisible(true)
    }

    async function addDevToDb(name, id){
        if (name == '' || id == ''){
            setValidateDetailFail(true)
        }
        else{
            try{
                let docRef
                docRef = await addDoc(collection(db, "rans-dev-database"), {
                    id: encrypt(id),
                    key: Math.max(...devs.map(o => o.key)) + 1,
                    name: name 
                });
                setInputId('')
                setInputName('')
                setValidateDetailFail(false)
                setModalAddDevVisible(false)
                // getDev();
            }
            catch(error){
                console.error(error)
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

    async function deleteDev(select, index){
        let q = query(collection(db, "rans-dev-database"), where("key", "==", select.key))
        let u = await getDocs(q)

        u.docs.forEach((t) => {
            deleteDoc(t.ref)
        })

        console.log('Delete Dev: ' + select.name)
        try{
            getDev();
        }
        catch(error){}
    }

    async function deleteRisk(select, index){
        let q = query(collection(db, "rans-database"), where("_id", "==", select._id))
        let u = await getDocs(q)

        u.docs.forEach((t) => {
            deleteDoc(t.ref)
        })

        console.log('Delete Risk ID: ' + select._id)
        try{
            getData();
        }
        catch(error){}
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

    function ModalAddDev(){
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalAddDevVisible}
            onRequestClose={() => {
              setModalAddDevVisible(false)
            }}
          >
            <View style={styles.centeredView}>
                <View style={[styles.modalView]}>
                    <Text>Name</Text>
                    <TextInput placeholder='ชื่อ' style={{borderBottomWidth: 1, borderRadius: 10, width: '100%', marginTop: '5%', borderBottomColor:validateDetailFail?"red":"black" }} defaultValue={inputName} onEndEditing={e=>setInputName(e.nativeEvent.text)} />
                    <Text style={{marginTop: '5%'}}>Device id</Text>
                    <TextInput placeholder='id' style={{borderBottomWidth: 1, borderRadius: 10, width: '100%', marginTop: '5%', borderBottomColor:validateDetailFail?"red":"black" }} defaultValue={inputId} onEndEditing={e=>setInputId(e.nativeEvent.text)} />
                    <View style={{flexDirection: 'row'}}>
                        <Pressable
                        style={[styles.button, styles.buttonSubmit, {margin :'5%'}]}
                        onPress={() => addDevToDb(inputName, inputId)}
                        >
                        <Text style={styles.textStyle}>Submit</Text>
                        </Pressable>
                        <Pressable
                        style={[styles.button, styles.buttonClose, {margin :'5%'}]}
                        onPress={() => {setModalAddDevVisible(false)}}
                        >
                        <Text style={styles.textStyle}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
          </Modal>
        )
    }

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'rans-dev-database'), getDev, (error) => {
            console.log(error)
          });
        const unsub2 = onSnapshot(collection(db, 'rans-database'), getData, (error) => {
            console.log(error)
          });
    }, [])

    return (
        <View style={styles.container}>
            <Text style={styles.heading1}>Welcome Developer {route.params.params.name}{' (devID : ' + route.params.params.key + ')'}</Text>
            <View style={styles.devList}>
                <Text style={styles.heading2}>Developer List</Text>
                <ScrollView >
                    {devs.length!=0?devs.map(generateDevList):<ActivityIndicator color={'green'} size={'large'}></ActivityIndicator>}
                </ScrollView>
                <TouchableOpacity style={styles.addDevButton} onPress={() => { addDev() } }>
                    <Text>Add Developer</Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.riskList, {flex: 1}]}>
                <Text style={styles.heading2}>Risk List</Text>
                <ScrollView>
                    {listDataSort.length!=0?listDataSort.map(generateRiskList):<ActivityIndicator color={'green'} size={'large'}></ActivityIndicator>}
                </ScrollView>
                <View style={{flexDirection: 'row'}}>
                <TouchableOpacity style={styles.addRiskButton} onPress={() => { addRiskFromAPI() } }>
                    <Text>Add risk from API</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteAPIRiskButton} onPress={() => { removeAPIRisk() } }>
                    <Text>Remove risk from API</Text>
                </TouchableOpacity>
                </View>
            </View>
            <ModalRisk />
            <ModalAddDev />
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
    devList: {
        marginTop: '5%',
        marginBottom: '5%',
        alignItems: 'center',
        height: '25%',
    },
    heading2: {
        fontSize: 25
    },
    riskList: {
        width: '100%',
        height: '65%',
        alignItems: 'center'
    },
    listBox: {
        width: '70%',
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
    addDevButton: {
        // width: '25%',
        // height: '15%',
        padding: 10,
        backgroundColor: '#82CD47',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        marginTop: '1%',
    },
    addRiskButton: {
        width: '25%',
        height: '28%',
        backgroundColor: '#82CD47',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        marginTop: '1%',
        marginLeft: '1%',
    },
    deleteAPIRiskButton: {
        width: '25%',
        height: '28%',
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