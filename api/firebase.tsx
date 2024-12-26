import { setCollection_Test } from '@/@types/firebase/collections';
import DB from '@/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export const setFirebaseCollection_Test = async (
  document: string,
  value: setCollection_Test
) => {
  // console.log('입력된 값:', inputValue);
  //action이 null 값인 경우 경고 or 버튼 안눌리게
  const date = new Date().toString();
  await setDoc(doc(DB, document, Date.now().toString()), value);
};
