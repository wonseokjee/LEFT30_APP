import { TouchableOpacity, View, Text } from 'react-native';
import DB from '@/firebaseConfig';
import { collection, getDocs } from '@firebase/firestore';
export default function GetButton() {
  const onPress = async () => {
    try {
      console.log('inner');
      const data = await getDocs(collection(DB, 'test'));
      data.forEach((result) => console.log(result.data()));
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View>
        <Text>이거는 나올라나</Text>
      </View>
    </TouchableOpacity>
  );
}
