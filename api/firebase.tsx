import { setCollection_Test } from '@/@types/firebase/collections';
import DB from '@/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { collection, getDocs, orderBy, query } from '@firebase/firestore';
import { useState } from 'react';

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

export const getFirebaseCollection_Test_TodayAndLastday = async () => {
  const [doc, setDoc] = useState<{ [x: string]: any }[]>();
  try {
    console.log('inner getFirebaseCollection_Test_TodayAndLastday');
    const today = new Date().getFullYear();
    const testRef = collection(DB, 'test');
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
