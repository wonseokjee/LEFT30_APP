import GetButton from '@/components/firebase/getTimeTable';
import TimeTableSlot from '@/components/timetable/timeTableSlot';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
} from 'react-native';

export default function Calendar() {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [task, setTask] = useState<string>('');
  const [tasks, setTasks] = useState<Record<string, string[]>>({});

  const handleSlotPress = (time: string) => {
    if (!time) return;
    setSelectedTime(time);
    setModalVisible(true);
  };

  const addTask = () => {
    if (task.trim() === '') return;
    setTasks((prevTasks) => ({
      ...prevTasks,
      [selectedTime as string]: [
        ...(prevTasks[selectedTime as string] || []),
        task,
      ],
    }));
    setTask('');
    setModalVisible(false);
  };

  const removeTask = (time: string, index: number) => {
    setTasks((prevTasks: any) => {
      const updatedTasks = [...prevTasks[time]];
      updatedTasks.splice(index, 1);
      return updatedTasks.length
        ? { ...prevTasks, [time]: updatedTasks }
        : { ...prevTasks, [time]: undefined };
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>To-Do TimeTable</Text>
      <TouchableOpacity
        style={styles.slotButton}
        onPress={() => handleSlotPress('12:00')}
      >
        <Text style={styles.slotButtonText}>시간 슬롯 선택</Text>
      </TouchableOpacity>
      <FlatList
        data={Object.entries(tasks)}
        keyExtractor={(item) => item[0]}
        renderItem={({ item }) => (
          <View style={styles.taskContainer}>
            <Text style={styles.taskTime}>{item[0]}</Text>
            {item[1].map((t, index) => (
              <View key={index} style={styles.taskItem}>
                <Text style={styles.taskText}>{t}</Text>
                <TouchableOpacity onPress={() => removeTask(item[0], index)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />
      <Modal visible={modalVisible} animationType='slide' transparent>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>할 일 추가 ({selectedTime})</Text>
          <TextInput
            style={styles.input}
            placeholder='할 일을 입력하세요'
            value={task}
            onChangeText={setTask}
          />
          <Button title='추가하기' onPress={addTask} />
          <Button
            title='취소'
            color='red'
            onPress={() => setModalVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222', padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  slotButton: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  slotButtonText: { color: 'white', fontSize: 16 },
  taskContainer: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  taskTime: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  taskText: { color: '#fff' },
  removeText: { color: 'red', fontSize: 18 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalTitle: { color: 'white', fontSize: 20, marginBottom: 10 },
  input: {
    backgroundColor: 'white',
    width: '80%',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
});
