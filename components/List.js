import * as React from "react";
import { Text, View, StyleSheet, Animated, Dimensions } from "react-native";
import { AntDesign } from "@expo/vector-icons";

const height = Dimensions.get("window").height;

export default function List(props) {
  
  let data = props.data

  let scrollY = React.useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.container}>
      <Animated.FlatList
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        data={data}
        keyExtractor={(item) => 'id'+item._id}
        renderItem={({ item, index }) => {
          const inputRange = [
            -1,
            0,
            ((height * 0.1) + 15) * index,
            ((height * 0.1) + 15) * (index + 3),
          ];
          const scale = 1;
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [1, 1, 1, 0.1],
          });
          const Offset = scrollY.interpolate({
            inputRange,
            outputRange: [0, 0, 0, -500],
          });

          return (
            <Animated.View
              style={[{
                transform: [{ scale: scale }, { translateY: Offset }],
                opacity: opacity,
              }, styles.listBox]}
            >
                <Text style={{width: '7%', textAlign: 'center'}}>{index + 1}</Text>
                <View style={{width: '1%', borderRightColor: 'black', borderRightWidth: 1, height: '65%'}}></View>
                <Text style={{width: '50%', paddingLeft: '5%'}}>{item.รายละเอียด}</Text>
                <Text style={{width: '20%', textAlign: 'center'}}>{item.สำนักงานเขต}</Text>
                <Text style={{width: '10%', textAlign: 'center'}}><AntDesign name="like2" size={24} color="black" />  {item.like}</Text>
                <Text style={{width: '10%', textAlign: 'center'}}><AntDesign name="dislike2" size={24} color="black" />  {item.dislike}</Text>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  listBox: {
    height: height * 0.1,
    marginTop: 15,
    padding: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: 'center',
    alignSelf: 'center',
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
