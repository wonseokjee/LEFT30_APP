import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import TaskItem from '../../components/todo/todoItem';
import AddTaskModal from '../../components/todo/AddTaskModal';
import TodoFormattedDate from '../../components/todo/todoFormattedDate';
import { getTodoLIstFromDB } from '@/api/todoApi';
import AddButton from '../asset/addButton';

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
        <AddButton setAddModalVisible={setAddModalVisible} />
        {addModalVisible && (
          <AddTaskModal setAddModalVisible={setAddModalVisible} />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', padding: 20 },
});

export default TodoContainer;
