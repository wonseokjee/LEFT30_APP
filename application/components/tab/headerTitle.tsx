import Entypo from '@expo/vector-icons/build/Entypo';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { makeStyles, useTheme } from '@/theme/theme';

export default function TabHeaderTitle() {
  const t = useTheme();
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => {
        /* 원하는 동작 */
        router.replace('/(tabs)');
      }}
    >
      <Entypo name='home' size={24} color={t.text} />
    </TouchableOpacity>
  );
}
const useStyles = makeStyles((t) => StyleSheet.create({}));
