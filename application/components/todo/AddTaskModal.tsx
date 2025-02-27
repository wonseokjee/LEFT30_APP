import React from 'react';
import { View, Modal, TextInput, Button, StyleSheet } from 'react-native';

interface AddTaskModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  task: string;
  setTask: (task: string) => void;
  addTask: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  modalVisible,
  setModalVisible,
  task,
  setTask,
  addTask,
}) => {
  return (
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

export default AddTaskModal;
