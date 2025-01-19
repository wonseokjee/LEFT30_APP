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
import { getFirebaseCollection_Test_Today } from '@/api/firebase';
import { useTimeSlotStore_today } from '@/store/timeTableStore';
export default function GetButton() {
  const [doc, setDoc] = useState<{ [x: string]: any }[]>();
  const { data } = useTimeSlotStore_today();
  const onPress = async () => {
    // console.log('nothing');
    try {
      await getFirebaseCollection_Test_Today();
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={onPress}>
        <View style={{}}>
          <Text style={{ color: 'white' }}>여기는 firestore 확인</Text>
          {data?.map((x) => (
            <Text key={x['event']['newDate']} style={{ color: 'white' }}>
              {x['date']} {x['event']['action']}
              {x['event']['detail']}
            </Text>
            // <Text></Text>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
}
