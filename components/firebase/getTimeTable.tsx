import { TouchableOpacity, View, Text } from 'react-native';
import DB from '@/firebaseConfig';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from '@firebase/firestore';
import { useState } from 'react';
import { getFirebaseCollection_Test_TodayAndLastday } from '@/api/firebase';
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
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const qe = query(
        testRef,
        where('userId', '==', 1),
        where('date', 'in', [today, yesterdayStr])
      );

      const querySnapShot = await getDocs(qe);
      const timeSlot = querySnapShot.docs.map((doc) => ({ ...doc.data() }));
      console.log(timeSlot);

      const q = query(testRef, orderBy('date'));
      const qData = await getDocs(q);
      const qDatas = qData.docs.map((doc) => ({ ...doc.data() }));
      // console.log(qDatas);
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
            <Text key={x['event']['startTime']} style={{ color: 'white' }}>
              {x['date']} {x['event']['action']}
              {x['event']['detail']}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}
