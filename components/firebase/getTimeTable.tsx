import { TouchableOpacity, View, Text } from 'react-native';
import DB from '@/firebaseConfig';
import { collection, getDocs, orderBy, query } from '@firebase/firestore';
import { useState } from 'react';
export default function GetButton() {
  const [doc, setDoc] = useState<{ [x: string]: any }[]>();
  const onPress = async () => {
    try {
      console.log('inner');
      const testRef = collection(DB, 'test');
      // const data = await getDocs(testRef);
      // data.forEach((result) => console.log(result.data()));
      // const datas = data.docs.map((doc) => ({ ...doc.data() }));
      // console.log(datas);
      const q = query(testRef, orderBy('date'));
      const qData = await getDocs(q);
      const qDatas = qData.docs.map((doc) => ({ ...doc.data() }));
      console.log(qDatas);
      //new Date().toISOString().split('T')[0]
      setDoc(qDatas);
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={onPress}>
        <View style={{}}>
          <Text style={{ color: 'white' }}>여기는 firestore 확인</Text>
          {doc?.map((x) => (
            <Text key={x['date']} style={{ color: 'white' }}>
              {x['action']}:{x['detail']} [{x['date']}]
            </Text>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}
