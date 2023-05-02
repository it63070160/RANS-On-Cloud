import { StyleSheet, View, Text, TouchableOpacity, Image} from "react-native";
import { Component } from 'react';
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import { Cache } from "react-native-cache";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import axios from "axios";

export default class ReportRisk extends Component{
    constructor(){
        super();
        this.state = {
          data: [],
          reportList: []
        }
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
        this.getData();
    }

    formatList(d){
        function sortName(a, b){
            if (a.area > b.area){ return 1; }
            if (b.area > a.area){ return -1; }
            return 0;
        }

        function sortLike(a, b){
            if ((a.like/(a.like + a.dislike)*100) > (b.like/(b.like + b.dislike))*100){ return -1; }
            if ((b.like/(b.like + b.dislike)*100) > (a.like/(a.like + a.dislike))*100){ return 1; }
            return 0;
        }

        d = d.sort(sortName).sort(sortLike)

        return d
    }

    async getData() {
        try{
            await axios.get('https://rakmmhsjnd.execute-api.us-east-1.amazonaws.com/RANS/datas')
                .then(response=>{
                    let filterData = response.data.datas.filter((value)=>value.like>50 && ((value.like/(value.like+value.dislike))*100)>75)
                    let sortData = this.formatList(filterData)
                    this.setState({
                        data: sortData,
                    });
                })
                .catch(error=>{
                    console.error(error)
                })
        }catch(err){
          console.error(err)
        }
    }

    addToTag = () => {
        let t = ''
        this.state.reportList.map((item)=>{
            t = t +`<li>(${item.coords}) ${item.detail}</li>`
        })
        return t;
    }

    printToFile = async () => {
        this.html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@100&display=swap" rel="stylesheet">
          </head>
          <body style="font-family: 'Sarabun', sans-serif;">
            <div style="text-align: right; margin: 10px;">
                <img src="https://imgur.com/pBL4gAc.png" style="width: 100px; height:100px"/>
                <h1 style="font-size: 2vh">Road Risk Areas Notification System</h1>
                <span style="font-size: 2vh">เลขที่ 1 ซอยฉลองกรุง 1 แขวงลาดกระบัง <br>เขตลาดกระบัง กรุงเทพฯ 10520</span>
            </div>
            <br><br>
            <div style="margin-bottom: 50px;">
                <span style="font-size: 2vh">เรื่อง ขอพิจารณาแก้ไขจุดเสี่ยงทางถนน</span><br><br>
                <span style="font-size: 2vh">เรียน ศูนย์อำนวยการความปลอดภัยทางถนนกรุงเทพมหานคร สำนักการจราจรและขนส่ง กรุงเทพมหานคร</span>
            </div>
            <div style="margin: 10px;">
                &emsp;<span>กลุ่มผู้จัดทำ Road Risk Areas Notification System (RANS) ได้จัดทำแอปพลิเคชันรวบรวมจุดเสี่ยงต่างๆ และทางผู้จัดทำได้รวบรวมจุดเสี่ยงที่เป็นจุดอันตรายและมีผู้ใช้เห็นด้วยในจุดเสี่ยงนี้หลายคน นำมาทำเป็นรายงานเพื่อแจ้งให้ทราบและทำการแก้ไขเพื่อให้มีความปลอดภัยเพิ่มมากขึ้นในสังคม จุดเสี่ยงที่รวบรวมมาจะประกอบไปด้วยรายละเอียดและพิกัด โดยจุดเสี่ยงที่อันตรายทั้งหมดมีดังนี้</span>
                <ul style="margin-left: 30px;">
                    ${this.addToTag()}
                </ul>
            </div>
            <div style="text-align: right; margin: 10px; margin-top: 100px;">
                <span>ด้วยความเคารพ</span>
                <br><br><br>
                <span>................................</span>
                <br>
                <span>คณะผู้จัดทำ RANS</span>
            </div>
        </body>
        </html>
        `;
        // On iOS/android prints the given html. On web prints the HTML from the current page.
        const { uri } = await Print.printToFileAsync({html: this.html});
        console.log('File has been saved to:', uri);
        await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    };


    addToReportList(value) {
        if(this.state.reportList.findIndex((item)=>value.riskID==item.riskID)<0){
            this.setState({
                reportList: [...this.state.reportList, value]
            })
        }else{
            let splicelist = this.state.reportList
            splicelist.splice(this.state.reportList.findIndex((item)=>value.riskID==item.riskID), 1)
            this.setState({
                reportList: splicelist
            })
        }
    }

    render(){
        return (
            <View style={styles.container}>
                <ScrollView>
                    {this.state.data.length>0?
                    this.state.data.map((value, index)=>(
                    <View style={styles.listBox} key={'risk'+index}>
                        <Text style={{width: '10%', textAlign: 'center'}}>{index + 1}</Text>
                        <View style={{width: '1%', borderRightColor: 'black', borderRightWidth: 1, height: '100%'}}></View>
                        <Text style={{width: '50%', paddingLeft: '5%'}}>{value.detail + '\n' + 'เขต: ' + value.area}</Text>
                        <View style={{width: '20%', paddingLeft: '5%'}}>
                            <Text style={{width: '100%', textAlign: 'center'}}>
                                <Text style={{fontWeight:'bold'}}>{'Risk\n'}</Text>
                                {value.like+value.dislike != 0 && !isNaN(value.like+value.dislike)?(value.like/(value.like + value.dislike)*100).toFixed(2):(0.00+0.00).toFixed(2)}{' %'}
                            </Text>
                        </View>
                        <View style={{width: '15%', paddingLeft: '5%'}}>
                            <TouchableOpacity style={this.state.reportList.findIndex((item)=>value.riskID==item.riskID)<0?styles.reportButton:styles.removeButton} onPress={() => { this.addToReportList(value) } }>
                                <Ionicons name={this.state.reportList.findIndex((item)=>value.riskID==item.riskID)<0?"document-text-outline":"ios-remove-circle-outline"} size={24} color={'black'} />
                            </TouchableOpacity>
                        </View>
                    </View>))
                    :<View>
                        <Text>No Risky Point</Text>    
                    </View>}
                </ScrollView>
                <View style={styles.report}>
                    <View style={styles.modalCloseButton}>
                        <TouchableOpacity onPress={this.printToFile}>
                            <FontAwesome name="check" size={24} color="#6BF38B" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.reportHeader}>Report Template{'\n'}<Text style={{width:'100%'}}>_____</Text></Text>
                    <ScrollView>
                        <Image source={require("../assets/R_A_N_S.png")} style={{marginRight:'2%', alignSelf:'flex-end', width:40, height:60}}/>
                        <Text style={{fontSize:10, textAlign:'right', marginRight:10}}><Text style={{fontWeight:'500'}}>Road Risk Areas Notification System</Text>{'\n'}เลขที่ 1 ซอยฉลองกรุง 1 แขวงลาดกระบัง{'\n'} เขตลาดกระบัง กรุงเทพฯ 10520</Text>
                        <Text style={{fontSize:10}}>เรื่อง ขอพิจารณาแก้ไขจุดเสี่ยงทางถนน{'\n'}</Text>
                        <Text style={{fontSize:10}}>เรียน ศูนย์อำนวยการความปลอดภัยทางถนนกรุงเทพมหานคร สำนักการจราจรและขนส่ง กรุงเทพมหานคร{'\n'}</Text>
                        <Text style={{fontSize:10}}>{'\n'}{'\t'}กลุ่มผู้จัดทำ Road Risk Areas Notification System (RANS) ได้จัดทำแอปพลิเคชันรวบรวมจุดเสี่ยงต่างๆ และทางผู้จัดทำได้รวบรวมจุดเสี่ยงที่เป็นจุดอันตรายและมีผู้ใช้เห็นด้วยในจุดเสี่ยงนี้หลายคน นำมาทำเป็นรายงานเพื่อแจ้งให้ทราบและทำการแก้ไขเพื่อให้มีความปลอดภัยเพิ่มมากขึ้นในสังคม จุดเสี่ยงที่รวบรวมมาจะประกอบไปด้วยรายละเอียดและพิกัด โดยจุดเสี่ยงที่อันตรายทั้งหมดมีดังนี้</Text>
                        {this.state.reportList.map((item)=>(
                            <Text key={item.riskID} style={{fontSize:10, width:'80%', marginLeft:'10%'}}>- ({item.coords}) {item.detail}</Text>
                        ))}
                        <Text style={{fontSize:10, textAlign:'right', margin: 10}}>ด้วยความเคารพ{'\n\n\n'}...............................{'\n'}คณะผู้จัดทำ RANS</Text>
                    </ScrollView>
                </View>
            </View>
        )
    }
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
    reportButton: {
        padding: '20%',
        backgroundColor: '#bbbefc',
        borderRadius: 20,
        alignItems: 'center',
    },
    removeButton: {
        padding: '20%',
        backgroundColor: '#FF847C',
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
    modalCloseButton: {
        flexDirection:'row',
        justifyContent:'flex-end',
        marginRight: '5%',
        marginTop: '2%',
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
    report: {
        width: '95%',
        height: '70%',
        backgroundColor: "#fff",
        borderRadius: 50,
        margin: 10,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    reportHeader: {
        textAlign:'center',
        fontSize: 20,
    },
});
