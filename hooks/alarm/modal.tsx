import DB from '@/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import CheckBox from './checkbox';

export interface checkProps {
  checkValue: (str: string) => void;
}

const ModalButton = () => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [checkboxValue, setCheckboxValue] = useState<string | null>(null);

  const checkboxHandler = (str: string) => {
    setCheckboxValue(str);
    // console.log('여기는 부모:' + str);
  };

  const handleConfirm = async () => {
    // console.log('입력된 값:', inputValue);
    //action이 null 값인 경우 경고 or 버튼 안눌리게
    const date = new Date().toString();
    await setDoc(doc(DB, 'test', date), {
      action: checkboxValue,
      detail: inputValue,
      date: date,
    });
    setModalVisible(false);
    setCheckboxValue(null);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Button title='Modal 열기' onPress={() => setModalVisible(true)} />
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType='fade'
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>입력 요청</Text>
            <CheckBox checkValue={checkboxHandler} />
            <TextInput
              style={styles.input}
              placeholder='여기에 입력하세요'
              value={inputValue}
              onChangeText={setInputValue}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.buttonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.buttonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertBox: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ModalButton;
