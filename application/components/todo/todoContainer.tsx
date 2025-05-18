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
import TodoFormattedDate from '../../components/todo/todoFormattedDate';
import { getTodoLIstFromDB } from '@/api/todoApi';

const TodoContainer = () => {
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [togle, setTogle] = useState<boolean>(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [remove, setRemove] = useState<boolean>(false);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    const fetchTasks = async () => {
      const fetchedTask_be = await getTodoLIstFromDB();
      setTasks(fetchedTask_be);
    };

    fetchTasks();
  }, [togle, addModalVisible, editModalVisible, remove, selectedTaskIndex]);

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
              setTogle={setTogle}
              togle={togle}
              onLongPress={() => setSelectedTaskIndex(index)}
              selectedTaskIndex={selectedTaskIndex}
              setSelectedTaskIndex={setSelectedTaskIndex}
              setEditModalVisible={setEditModalVisible}
              editModalVisible={editModalVisible}
              setRemove={setRemove}
              remove={remove}
            />
          )}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        <AddTaskModal
          addModalVisible={addModalVisible}
          setAddModalVisible={setAddModalVisible}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

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

export default TodoContainer;
