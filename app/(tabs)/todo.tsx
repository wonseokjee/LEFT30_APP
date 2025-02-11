import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import TaskItem from '../../components/todo/todoItem';
import AddTaskModal from '../../components/todo/AddTaskModal';
import EditTaskModal from '../../components/todo/EditTaskModal';

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
        <AddTaskModal
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          task={task}
          setTask={setTask}
          addTask={addTask}
        />
        <EditTaskModal
          editModalVisible={editModalVisible}
          setEditModalVisible={setEditModalVisible}
          editTask={editTask}
          setEditTask={setEditTask}
          editTaskHandler={editTaskHandler}
        />
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
});
