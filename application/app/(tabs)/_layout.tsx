import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Entypo from '@expo/vector-icons/Entypo';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

const Stack = createStackNavigator();

export default function TabLayout() {
  return (
    // <NavigationContainer> UI 디자인중.
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'white',
        tabBarStyle: styles.tabBar,
        headerShown: false,
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'black',
    borderColor: '#c2c2c2',
    borderTopWidth: 0.2,
    borderEndWidth: 0.2,
    borderStartWidth: 0.2,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },

  header: {
    backgroundColor: 'black',
  },
});
