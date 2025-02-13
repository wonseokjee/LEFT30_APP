import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Text,
} from 'react-native';
import TaskItem from '../../components/todo/todoItem';
import AddTaskModal from '../../components/todo/AddTaskModal';
import EditTaskModal from '../../components/todo/EditTaskModal';
import TodoFormattedDate from '../../components/todo/todoFormattedDate';
import {
  addTaskToFirebase,
  updateTaskInFirebase,
  getTasksFromFirebase,
} from '../../api/firebase';

export default function Todo() {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [task, setTask] = useState<string>('');
  const [editTask, setEditTask] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    const fetchTasks = async () => {
      const fetchedTasks = await getTasksFromFirebase();
      setTasks(fetchedTasks);
      setCheckedItems(fetchedTasks.map(() => false));
    };

    fetchTasks();
  }, []);

  const addTask = async () => {
    if (task.trim() === '') return;
    const newTask = { id: Date.now().toString(), task };
    setTasks((prevTasks) => [...prevTasks, newTask]);
    setCheckedItems((prevCheckedItems) => [...prevCheckedItems, false]);
    await addTaskToFirebase(task); // Firebase에 할 일 추가
    setTask('');
    setModalVisible(false);
  };

  const editTaskHandler = async () => {
    if (editTask.trim() === '' || selectedTaskIndex === null) return;
    const taskId = tasks[selectedTaskIndex].id; // 할 일 ID를 적절히 설정하세요
    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks];
      updatedTasks[selectedTaskIndex].task = editTask;
      return updatedTasks;
    });
    await updateTaskInFirebase(taskId, editTask); // Firebase에 할 일 수정
    setEditTask('');
    setEditModalVisible(false);
    setSelectedTaskIndex(null);
  };

  const deleteTask = (index: number) => {
    setTasks((prevTasks) => prevTasks.filter((_, i) => i !== index));
    setCheckedItems((prevCheckedItems) =>
      prevCheckedItems.filter((_, i) => i !== index)
    );
  };

  const toggleCheckbox = (index: number) => {
    setCheckedItems((prevCheckedItems) => {
      const updatedCheckedItems = [...prevCheckedItems];
      updatedCheckedItems[index] = !updatedCheckedItems[index];
      return updatedCheckedItems;
    });
  };

  return (
    <TouchableWithoutFeedback onPress={() => setSelectedTaskIndex(null)}>
      <View style={styles.container}>
        <TodoFormattedDate />
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
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
              deleteTask={deleteTask}
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
