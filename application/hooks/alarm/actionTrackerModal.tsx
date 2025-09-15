import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import CheckBox from './checkbox';
import useNumStore from '@/store/timerStore';
import { createTimeSlotInfo } from '@/api/timetableApi';
import * as SecureStore from 'expo-secure-store';
import { GRAY_7, GRAY_8 } from '@/assets/palette';
import { timeSlotType } from '@/@types/timeSlot/timeSlotType';

export interface checkProps {
  checkValue: (str: string) => void;
}

const ActionTrackerModal = () => {
  const [inputValue, setInputValue] = useState<string>('');
  const { timerModalOpen, setModalClose, endTime } = useNumStore();
  const [checkboxValue, setCheckboxValue] = useState<string | null>(null);
  const checkboxHandler = (str: string) => {
    setCheckboxValue(str);
    // console.log('여기는 부모:' + str);
  };
  //USERID는 다른곳에서 관리
  const handleConfirm = async () => {
    const user_id = await SecureStore.getItemAsync('user_id');
    //checkbox가 체크되어 있지 않으면 confirm 안되게
    // console.log('입력된 값:', inputValue);
    if (checkboxValue && user_id) {
      //firebase collection 'test'에 들어갈 value
      const timeSlotInfo: timeSlotType = {
        action: checkboxValue,
        description: inputValue,
        // started_at: startTime,
        ended_at: endTime,
      };
      await createTimeSlotInfo(timeSlotInfo, user_id ? user_id : '');
      setModalClose();
    } else {
      //확인버튼 눌렀을때 checkbox 체크 안되어 있으면 '한 일을 체크해주세요' 문구가 떨리는 effect추가하기
    }
    setCheckboxValue(null);
  };

  //취소하면 이전 행동 지속하게 or 이전행동 지속 버튼 만들기??
  const handleCancel = () => {
    setModalClose();
    setCheckboxValue(null);
    setInputValue('');
    const insDate = new Date().toLocaleString();
    console.log(insDate + '에 취소를 눌렀습니다.');
  };

  return (
    <View style={styles.container}>
      <Modal
        transparent={true}
        visible={timerModalOpen}
        animationType='fade'
        onRequestClose={() => setModalClose()}
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>어떤 일을 하셨나요?</Text>
            {/* checkbox.tsx */}
            <CheckBox
              items={['수면', '휴식', '운동', '관계', '자기개발', '업무']}
              checkValue={checkboxHandler}
            />
            {checkboxValue ? <></> : <Text>한 일을 체크 해주세요!</Text>}
            <TextInput
              style={styles.input}
              placeholder='세부계획을 입력해주세요'
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
    borderRadius: 5,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: GRAY_8,
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

export default ActionTrackerModal;
