import { addTodoItemFromDB } from '@/api/todoApi';
import { GRAY_0, GRAY_1, GRAY_7 } from '@/assets/palette';
import React, { useState } from 'react';
import { View, Modal, TextInput, Button, StyleSheet } from 'react-native';

interface AddTaskModalProps {
  addModalVisible: boolean;
  setAddModalVisible: (visible: boolean) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  addModalVisible,
  setAddModalVisible,
}) => {
  const [task, setTask] = useState<string>('');
  const addTodoFromDB = (task: string) => {
    if (task.trim() === '') return;
    addTodoItemFromDB(task);
    setAddModalVisible(false);
    setTask(''); // 추가 후 입력 필드 초기화
  };

  return (
    <Modal visible={addModalVisible} animationType='slide' transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TextInput
            style={styles.input}
            placeholder='할 일을 입력하세요'
            placeholderTextColor={GRAY_7}
            value={task}
            onChangeText={setTask}
          />
          <View style={styles.buttonContainer}>
            <Button title='추가하기' onPress={() => addTodoFromDB(task)} />
            <Button
              title='취소'
              color='red'
              onPress={() => setAddModalVisible(false)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: GRAY_0,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: GRAY_1,
    color: GRAY_7,
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

export default AddTaskModal;
