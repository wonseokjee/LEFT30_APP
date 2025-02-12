import { setCollection_Test } from '@/@types/firebase/collections';
import DB from '@/firebaseConfig';
import {
  doc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  deleteDoc,
} from 'firebase/firestore';
import { query, where, orderBy } from '@firebase/firestore';
import { useState } from 'react';
import {
  useTimeSlotStore_today,
  useTimeSlotStore_yesterday,
} from '@/store/timeTableStore';

export const setFirebaseCollection_Test = async (
  document: string,
  value: setCollection_Test
) => {
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

// 새로운 함수 추가
export const addTaskToFirebase = async (task: string) => {
  const taskData = {
    userId: '1', // 사용자 ID를 적절히 설정하세요
    task,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  };

  try {
    const taskRef = collection(DB, 'tasks');
    await setDoc(doc(taskRef), taskData);
    console.log('Task added to Firebase');
  } catch (error) {
    console.error('Error adding task to Firebase:', error);
  }
};

// 새로운 함수 추가
export const updateTaskInFirebase = async (taskId: string, task: string) => {
  try {
    const taskRef = doc(DB, 'tasks', taskId);
    await updateDoc(taskRef, { task });
    console.log('Task updated in Firebase');
  } catch (error) {
    console.error('Error updating task in Firebase:', error);
  }
};

// 새로운 함수 추가
export const getTasksFromFirebase = async () => {
  try {
    const tasksRef = collection(DB, 'tasks');
    const querySnapshot = await getDocs(tasksRef);
    const tasks = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return tasks;
  } catch (error) {
    console.error('Error getting tasks from Firebase:', error);
    return [];
  }
};

// 새로운 함수 추가
export const deleteTaskFromFirebase = async (taskId: string) => {
  try {
    const taskRef = doc(DB, 'tasks', taskId);
    await deleteDoc(taskRef);
    console.log('Task deleted from Firebase');
  } catch (error) {
    console.error('Error deleting task from Firebase:', error);
  }
};
