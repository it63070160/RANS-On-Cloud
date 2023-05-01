import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Modal, Pressable} from "react-native";
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AntDesign } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import axios from "axios";

export default function RiskListView({route}){

    let [listData, setListData] = useState([])
    let [listDataSort, setListDataSort] = useState([])
    let [modalVisible, setModalVisible] = useState(false);

    async function getAllData(){
        try{
          await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
            .then(response=>{
              setListData(response.data.datas)
              formatList(response.data.datas)
            })
            .catch(error=>{
              console.error(error)
            })
        }catch(err){
          console.error(err)
        }
    }

    function formatList(d){
        function sortName(a, b){
            if (a.area > b.area){ return 1; }
            if (b.area > a.area){ return -1; }
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
                    <Text style={{width: '50%', paddingLeft: '5%'}}>{value.detail + '\n' + 'เขต: ' + value.area}</Text>
                    <View style={{width: '20%', paddingLeft: '5%'}}>
                        <Text style={{width: '100%', textAlign: 'center'}}>
                        {'Fake rate\n'}{value.like+value.dislike != 0 && !isNaN(value.like+value.dislike)?(value.dislike/(value.like + value.dislike)*100).toFixed(2):(0.00+0.00).toFixed(2)}{' %'}
                        </Text>
                    </View>
                    <View style={{width: '15%', paddingLeft: '5%'}}>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => { deleteRisk(value) } }>
                            <AntDesign name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>)
    }

    async function addRiskFromAPI(){
        let data
        let data2
        try{
            await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
                .then(async response=>{
                    if(response.data.datas.filter((value)=>value.riskID<=126).length != 0){
                        setModalVisible(true)
                    }
                    else{
                        try{
                            // ดึงข้อมูลจาก API
                            // let nextLink
                            // await axios.get('https://data.bangkok.go.th/api/3/action/datastore_search?resource_id=6cc7a43f-52b3-4381-9a8f-2b8a35c3174a')
                            //         .then(response=>{
                            //           data = response.data.result.records
                            //           nextLink = 'https://data.bangkok.go.th' + response.data.result._links.next
                            //         })
                            //         .catch(error=>{
                            //           console.error(error)
                            //         })
                            // await axios.get(nextLink)
                            //         .then(response => {
                            //             data2 = response.data.result.records
                            //         })
                            //         .catch(error=>{
                            //             console.error(error)
                            //         })
                            // data = data.concat(data2)
            
                            // // ดึงข้อมูลจากไฟล์ json หากเว็บ api ล่ม
                            const customData = require('../assets/RiskArea.json')
                            const customData2 = require('../assets/RiskArea2.json')
                            data = customData.result.records
                            data2 = customData2.result.records
                            data = data.concat(data2)
                            for (let i=0; i<data.length;i++){
                                const payload = {
                                    riskID: data[i]._id,
                                    dislike: 0,
                                    like: 1,
                                    owner: '-',
                                    coords: data[i].พิกัด,
                                    detail: data[i].รายละเอียด,
                                    area: data[i].สำนักงานเขต
                                }
                                try{
                                    await axios.post('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/data', payload)
                                        .then(response => {
                                            console.log('Data items successfully inserted:', response.data);
                                        })
                                        .catch(error => {
                                            console.error("Insert Error:", error)
                                        })
                                }catch(err){
                                    console.error(err)
                                }
                            }
                        }catch(err){
                            console.error(err)
                        }
                        try{
                            getAllData();
                        }
                        catch(error){
                        }
                    }
                })
                .catch(error=>{
                    console.error(error)
                })
        }catch(err){
            console.error(err)
        }
    }

    async function removeAPIRisk(){
        try{
            await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas/apiRisk')
                .then(response=>{
                    response.data.datas.forEach(async (res)=>{
                        const payload = {
                            riskID: res.riskID
                        }
                        await axios.delete('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/data', { data: payload })
                            .then(response => {
                                console.log('Data items successfully delete:', response.data);
                            })
                            .catch(error => {
                                console.error("Delete Error:", error)
                            })
                    })
                })
                .catch(error=>{
                    console.error(error)
                })
            console.log('deleted')
        }catch(err){
            console.error(err)
        }
        try{
            getAllData();
        }
        catch(error){
        }
    }

    async function deleteRisk(select){
        var d = {};
        const params = {
            "riskID": select.riskID
        }
        await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/data', {params})
            .then(response => {
                d = response.data
            })
            .catch(error=>{
                console.error(error)
            })
        if(d){
            await axios.delete('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/data', { data: {riskID: d.riskID} })
                .then(response => {
                    console.log('Data items successfully delete:', response.data);
                    getAllData()
                })
                .catch(error => {
                    console.error("Delete Error:", error)
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
        getAllData()
    }, [])

    useFocusEffect(
        useCallback(() => {
            getAllData()
            return () => {
            };
        }, [])
    );

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