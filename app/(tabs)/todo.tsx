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

export default function Calendar() {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [task, setTask] = useState<string>('');
  const [tasks, setTasks] = useState<Record<string, string[]>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean[]>>(
    {}
  );

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
    setCheckedItems((prevCheckedItems) => ({
      ...prevCheckedItems,
      [selectedTime as string]: [
        ...(prevCheckedItems[selectedTime as string] || []),
        false,
      ],
    }));
    setTask('');
    setModalVisible(false);
  };

  const removeTask = (time: string, index: number) => {
    setTasks((prevTasks: any) => {
      const updatedTasks = [...prevTasks[time]];
      updatedTasks.splice(index, 1);
      const newTasks = updatedTasks.length
        ? { ...prevTasks, [time]: updatedTasks }
        : { ...prevTasks, [time]: undefined }; // undefined로 설정하여 시간 슬롯 제거
      if (!newTasks[time]) {
        delete newTasks[time]; // 시간 슬롯을 완전히 제거
        setSelectedTime(null); // 모든 작업이 삭제되면 selectedTime 초기화
      }
      return newTasks;
    });
    setCheckedItems((prevCheckedItems: any) => {
      const updatedCheckedItems = [...prevCheckedItems[time]];
      updatedCheckedItems.splice(index, 1);
      return updatedCheckedItems.length
        ? { ...prevCheckedItems, [time]: updatedCheckedItems }
        : { ...prevCheckedItems, [time]: undefined }; // undefined로 설정하여 체크박스 상태 제거
    });
  };

  const toggleCheckbox = (time: string, index: number) => {
    setCheckedItems((prevCheckedItems) => {
      const updatedCheckedItems = [...prevCheckedItems[time]];
      updatedCheckedItems[index] = !updatedCheckedItems[index];
      return { ...prevCheckedItems, [time]: updatedCheckedItems };
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>To-Do TimeTable</Text>
      <FlatList
        data={Object.entries(tasks)}
        keyExtractor={(item) => item[0]}
        renderItem={({ item }) => (
          <View style={styles.taskContainer}>
            <Text style={styles.taskTime}>{item[0]}</Text>
            {item[1] &&
              item[1].map((t, index) => (
                <View key={index} style={styles.taskItem}>
                  <CheckBox
                    checked={
                      checkedItems[item[0]]
                        ? checkedItems[item[0]][index]
                        : false
                    }
                    onPress={() => {
                      toggleCheckbox(item[0], index);
                      removeTask(item[0], index);
                    }}
                    containerStyle={styles.checkBoxContainer}
                  />
                  <Text style={styles.taskText}>{t}</Text>
                </View>
              ))}
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleSlotPress('12:00')}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} animationType='slide' transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>할 일 추가</Text>
            <TextInput
              style={styles.input}
              placeholder='시간을 입력하세요 (예: 12:00)'
              placeholderTextColor='#888'
              value={selectedTime || ''}
              onChangeText={setSelectedTime}
            />
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
  container: { flex: 1, backgroundColor: '#222', padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#4682B4', // SteelBlue 색상으로 변경
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 30,
    lineHeight: 60, // 버튼의 높이와 동일하게 설정
    textAlign: 'center',
    textAlignVertical: 'center', // 텍스트를 수직으로 가운데 정렬
  },
  taskTime: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap', // 텍스트가 화면을 벗어나지 않도록 함
  },
  taskText: {
    color: '#fff',
    flexShrink: 1, // 텍스트가 화면을 벗어나지 않도록 함
    textAlign: 'left', // 텍스트를 왼쪽으로 정렬
  },
  taskContainer: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  checkBoxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    marginRight: 10, // 체크박스와 텍스트 사이에 여백 추가
  },
  removeText: { color: 'red', fontSize: 18 },
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
