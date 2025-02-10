import React, { useState } from 'react';
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
import { CheckBox } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function Todo() {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [task, setTask] = useState<string>('');
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
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Today</Text>
        <Text style={styles.date}>{getFormattedDate()}</Text>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View>
            <TouchableOpacity
              style={styles.taskContainer}
              onLongPress={() => setSelectedTaskIndex(index)}
            >
              <View style={styles.taskItem}>
                <CheckBox
                  checked={checkedItems[index]}
                  onPress={() => toggleCheckbox(index)}
                  containerStyle={styles.checkBoxContainer}
                  checkedColor='#fff' // 체크된 항목의 색상 변경
                />
                <Text
                  style={[
                    styles.taskText,
                    checkedItems[index] && styles.taskTextChecked,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode='tail'
                >
                  {item}
                </Text>
              </View>
            </TouchableOpacity>
            {selectedTaskIndex === index && (
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  onPress={() => {
                    /* Edit task logic */
                  }}
                >
                  <Icon name='edit' size={24} color='black' />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    /* Delete task logic */
                  }}
                >
                  <Icon name='delete' size={24} color='black' />
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    </View>
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
  taskTime: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap', // 텍스트가 화면을 벗어나지 않도록 함
    flex: 1, // 추가된 부분
  },
  taskText: {
    color: '#fff',
    flexShrink: 1, // 텍스트가 화면을 벗어나지 않도록 함
    textAlign: 'left', // 텍스트를 왼쪽으로 정렬
    flex: 1, // 추가된 부분
  },
  taskTextChecked: {
    textDecorationLine: 'line-through', // 가운데 줄 긋기
    color: '#888', // 체크된 항목의 텍스트 색상 변경
  },
  taskContainer: {
    backgroundColor: '#333', //여기가 todo list의 배경색
    //                                 padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  checkBoxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    marginRight: 10, // 체크박스와 텍스트 사이에 여백 추가
  },
  buttonGroup: {
    position: 'absolute', // 추가된 부분
    bottom: 0, // 추가된 부분
    left: '65%', // 추가된 부분
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '30%', // 추가된 부분
    height: '65%', // 추가된 부분
    backgroundColor: 'white', // 추가된 부분
    zIndex: 1, // 추가된 부분
    borderRadius: 5, // 추가된 부분
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
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 20,
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
