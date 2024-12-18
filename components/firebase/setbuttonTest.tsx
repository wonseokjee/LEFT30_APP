import { TouchableOpacity, View, Text } from 'react-native';
import DB from '@/firebaseConfig';
import { doc, setDoc } from '@firebase/firestore';
export default function SetButton() {
  const onPress = async () => {
    try {
      console.log('inner');
      const date = new Date().toString();
      await setDoc(doc(DB, 'test', 'user2'), {
        user: 2,
        todo: 'work',
        date: date,
      });
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View>
        <Text>여기는 firestore set기능 확인</Text>
      </View>
    </TouchableOpacity>
  );
}
