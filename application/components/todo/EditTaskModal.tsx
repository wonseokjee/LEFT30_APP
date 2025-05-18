import { updateTodoItemFromDB } from '@/api/todoApi';
import React, { useState } from 'react';
import { View, Modal, TextInput, Button, StyleSheet } from 'react-native';

interface EditTaskModalProps {
  editModalVisible: boolean;
  setEditModalVisible: (visible: boolean) => void;
  setSelectedTaskIndex: (index: number | null) => void;
  // editTask: string;
  // setEditTask: (task: string) => void;
  // editTaskHandler: () => void;
  todoId: string;
  todoTitle: string;
  todoNotes: string;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  editModalVisible,
  setEditModalVisible,
  setSelectedTaskIndex,
  todoId,
  todoTitle,
  todoNotes,

  // editTaskHandler,
}) => {
  const [editTask, setEditTask] = useState<string>(todoTitle);
  const updateTodoFromDB = async (task: string) => {
    // task가 비어있지 않은 경우에만 업데이트
    if (task.trim() === '') return;
    //item이 많아질 경우 form으로 따로 만들어야 할듯.
    try {
      await updateTodoItemFromDB(todoId, task); // 서버에 업데이트 요청
      console.log(`Task updated: ${task}`);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setSelectedTaskIndex(null); // 선택된 작업 해제
      setEditModalVisible(false); // 모달 닫기
    }
  };
  return (
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
            <Button
              title='수정하기'
              onPress={() => {
                updateTodoFromDB(editTask);
              }}
            />
            <Button
              title='취소'
              color='red'
              onPress={() => {
                setSelectedTaskIndex(null);
                setEditModalVisible(false);
              }}
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

export default EditTaskModal;
