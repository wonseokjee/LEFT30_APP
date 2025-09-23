import Entypo from '@expo/vector-icons/build/Entypo';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function TabHeaderTitle() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => {
        /* 원하는 동작 */
        router.replace('/(tabs)');
      }}
    >
      <Entypo name='home' size={24} color='white' />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({});
