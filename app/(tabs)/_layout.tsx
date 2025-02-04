import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Entypo from '@expo/vector-icons/Entypo';
import { Tabs, useNavigation } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import TodoScreen from './todo';
import TodoDetailScreen from '@/components/todo/todoDetail';

const Stack = createStackNavigator();

// function TodoStack() {
//   const navigation = useNavigation();

//   return (
//     <Stack.Navigator>
//       <Stack.Screen
//         name='Todo'
//         component={TodoScreen}
//         options={{
//           headerLeft: () => (
//             <TouchableOpacity onPress={() => navigation.navigate('home')}>
//               <Entypo
//                 name='home'
//                 size={24}
//                 color='white'
//                 style={{ marginLeft: 15 }}
//               />
//             </TouchableOpacity>
//           ),
//         }}
//       />
//       <Stack.Screen name='TodoDetail' component={TodoDetailScreen} />
//     </Stack.Navigator>
//   );
// }

export default function TabLayout() {
  return (
    // <NavigationContainer>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'white',
        tabBarStyle: {
          backgroundColor: 'black',
          borderColor: '#c2c2c2',
          borderTopWidth: 0.5,
          borderEndWidth: 0.5,
          borderStartWidth: 0.5,
          borderTopLeftRadius: 15,
          borderTopRightRadius: 15,
        },
        headerStyle: { backgroundColor: 'black' },
        headerTintColor: 'white',
      }}
    >
      <Tabs.Screen
        name='todo'
        options={{
          title: 'Todo',
          tabBarIcon: ({ color }) => (
            <Entypo size={28} name='check' color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Entypo size={28} name='home' color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='plan'
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => (
            <Entypo size={28} name='pie-chart' color={color} />
          ),
        }}
      />
    </Tabs>
    // </NavigationContainer>
  );
}
