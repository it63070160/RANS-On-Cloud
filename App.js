import { StyleSheet } from 'react-native';
// import { NavigationContainer } from '@react-navigation/native';
// import { createDrawerNavigator } from '@react-navigation/drawer';
// // MapsView Screen
// import MapsView from './views/MapsView';
// import NotificationsView from './views/NotificationsView';
// import StatisticView from './views/StatisticView';
// import ManageRisk from './views/ManageRisk';

import MainNavigator from "./navigation/MainNavigator"

// const Drawer = createDrawerNavigator();

export default function App() {
  return (
    // <NavigationContainer>
    //   <Drawer.Navigator screenOptions={{ headerStyle: styles.header, headerTitleAlign: 'center'}}>
    //     <Drawer.Screen name="Maps" component={MapsView} options={{title:'RANS Maps'}}/>
    //     <Drawer.Screen name="ManageRisks" component={ManageRisk} options={{title:'Manage Risks'}}/>
    //     <Drawer.Screen name="Notifications" component={NotificationsView}/>
    //     <Drawer.Screen name="Statistic" component={StatisticView}/>
    //   </Drawer.Navigator>
    // </NavigationContainer>
    <MainNavigator/>
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