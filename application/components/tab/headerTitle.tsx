import Entypo from '@expo/vector-icons/build/Entypo';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function TabHeaderTitle() {
  return (
    <TouchableOpacity
      onPress={() => {
        /* 원하는 동작 */
        console.log('Pressed');
      }}
    >
      <Entypo name='plus' size={24} color='white' />
      {/* <Text style={{ color: 'white' }}>Plan</Text> */}
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({});
