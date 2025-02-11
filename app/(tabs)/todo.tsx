import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import TaskItem from '../../components/todo/todoItem';

export default function Todo() {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [task, setTask] = useState<string>('');
  const [editTask, setEditTask] = useState<string>('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(
    null
  );

  const addTask = () => {
    if (task.trim() === '') return;
    setTasks((prevTasks) => [...prevTasks, task]);
    setCheckedItems((prevCheckedItems) => [...prevCheckedItems, false]);
    setTask('');
    setModalVisible(false);
  };

  const editTaskHandler = () => {
    if (editTask.trim() === '' || selectedTaskIndex === null) return;
    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks];
      updatedTasks[selectedTaskIndex] = editTask;
      return updatedTasks;
    });
    setEditTask('');
    setEditModalVisible(false);
    setSelectedTaskIndex(null);
  };

  const toggleCheckbox = (index: number) => {
    setCheckedItems((prevCheckedItems) => {
      const updatedCheckedItems = [...prevCheckedItems];
      updatedCheckedItems[index] = !updatedCheckedItems[index];
      return updatedCheckedItems;
    });
  };

  const getFormattedDate = () => {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${month}월 ${day}일 ${weekDay}요일`;
  };

  return (
    <TouchableWithoutFeedback onPress={() => setSelectedTaskIndex(null)}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Today</Text>
          <Text style={styles.date}>{getFormattedDate()}</Text>
        </View>
        <FlatList
          data={tasks}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (
            <TaskItem
              item={item}
              index={index}
              checked={checkedItems[index]}
              onToggleCheckbox={() => toggleCheckbox(index)}
              onLongPress={() => setSelectedTaskIndex(index)}
              selectedTaskIndex={selectedTaskIndex}
              setEditTask={setEditTask}
              setEditModalVisible={setEditModalVisible}
            />
          )}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        <Modal visible={modalVisible} animationType='slide' transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder='할 일을 입력하세요'
                placeholderTextColor='#888'
                value={task}
                onChangeText={setTask}
              />
              <View style={styles.buttonContainer}>
                <Button title='추가하기' onPress={addTask} />
                <Button
                  title='취소'
                  color='red'
                  onPress={() => setModalVisible(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={editModalVisible} animationType='slide' transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TextInput
                style={styles.input}
                placeholder='할 일을 수정하세요'
                placeholderTextColor='#888'
                value={editTask}
                onChangeText={setEditTask}
              />
              <View style={styles.buttonContainer}>
                <Button title='수정하기' onPress={editTaskHandler} />
                <Button
                  title='취소'
                  color='red'
                  onPress={() => setEditModalVisible(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', padding: 20 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    fontSize: 20,
    color: 'white',
  },
  date: {
    fontSize: 16,
    color: 'white',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#0048FF', // Blue 색상으로 변경
    width: 50,
    height: 50,
    borderRadius: 30,
    justifyContent: 'center', // 수직 가운데 정렬
    alignItems: 'center', // 수평 가운데 정렬
  },
  addButtonText: {
    color: 'white',
    fontSize: 30,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#555',
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
