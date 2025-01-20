import { setCollection_Test } from '@/@types/firebase/collections';
import DB from '@/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import {
  collection,
  getDocs,
  where,
  orderBy,
  query,
} from '@firebase/firestore';
import { useState } from 'react';
import {
  useTimeSlotStore_today,
  useTimeSlotStore_yesterday,
} from '@/store/timeTableStore';

export const setFirebaseCollection_Test = async (
  document: string,
  value: setCollection_Test
) => {
  // console.log('입력된 값:', inputValue);
  //action이 null 값인 경우 경고 or 버튼 안눌리게
  // const date = new Date().toString();

  //firebase 수정의 경우 아래 가능
  const ID = `${value.userId}_${value.date}`;

  const insID = `${value.userId}_${Date.now().toString()}`;
  await setDoc(doc(DB, document, insID), value);
};

export const getFirebaseCollection_Test_Today = async () => {
  const { setTimeSlot } = useTimeSlotStore_today.getState();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  // console.log(today);
  try {
    console.log('inner getFirebaseCollection_Test_Today');
    const testRef = collection(DB, 'test');

    const q = query(
      testRef,
      where('userId', '==', '1'),
      where('date', 'in', [today])
    );

    const querySnapShot = await getDocs(q);
    const timeSlot = querySnapShot.docs.map((doc) => ({ ...doc.data() }));
    // console.log(timeSlot);
    setTimeSlot(timeSlot);
  } catch (error) {
    console.log('error', error);
  }
};
export const getFirebaseCollection_Test_Yesterday = async () => {
  const { setTimeSlot } = useTimeSlotStore_yesterday.getState();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  // console.log(yesterdayStr);
  try {
    console.log('inner getFirebaseCollection_Test_Yesterday');
    const testRef = collection(DB, 'test');

    const q = query(
      testRef,
      where('userId', '==', '1'),
      where('date', 'in', [yesterdayStr])
    );

    const querySnapShot = await getDocs(q);
    const timeSlot = querySnapShot.docs.map((doc) => ({ ...doc.data() }));
    // console.log(timeSlot);
    setTimeSlot(timeSlot);
  } catch (error) {
    console.log('error', error);
  }
};

export const getFirebaseCollection_Test = async () => {
  const [doc, setDoc] = useState<{ [x: string]: any }[]>();
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
