import Entypo from '@expo/vector-icons/Entypo';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'white',
        tabBarStyle: { backgroundColor: '#101010', borderColor: 'black' },

        headerStyle: { backgroundColor: 'black' },
        headerTintColor: 'white',
      }}
    >
      <Tabs.Screen
        name='todo'
        options={{
          title: 'todo',
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
          title: 'plan',
          tabBarIcon: ({ color }) => (
            <Entypo size={28} name='pie-chart' color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
