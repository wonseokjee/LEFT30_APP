import { TouchableOpacity, View, Text } from 'react-native';
import DB from '@/firebaseConfig';
import { collection, getDocs } from '@firebase/firestore';
import { useState } from 'react';
export default function GetButton() {
  const [doc, setDoc] = useState<{ [x: string]: any }[]>();
  const onPress = async () => {
    try {
      console.log('inner');
      const data = await getDocs(collection(DB, 'test'));
      // data.forEach((result) => console.log(result.data()));
      const datas = data.docs.map((doc) => ({ ...doc.data() }));
      console.log(datas);
      setDoc(datas);
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={onPress}>
        <View>
          <Text>여기는 firestore 확인</Text>
          {doc?.map((x) => (
            <Text>{x['action']}</Text>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}
