import React, { useEffect, useState } from 'react';
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
import { GRAY_4, GRAY_6, GRAY_8, GRAY_9 } from '@/assets/palette';
import { timeSlotType } from '@/@types/timeSlot/timeSlotType';
import { updateInfoFromZustand } from '@/store/timeTableStore';
import AlertModal from '@/components/asset/AlertModal';

export interface checkProps {
  checkValue: (str: string) => void;
}

const ActionTrackerModal = () => {
  const [checkboxValue, setCheckboxValue] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const { timerModalOpen, setModalClose, endTime } = useNumStore();
  const checkboxHandler = (str: string) => {
    setCheckboxValue(str);
  };
  const [checkboxAlert, setCheckboxAlert] = useState(false);
  const { setUpdated, isUpdated } = updateInfoFromZustand();

  //확인 버튼 누르면 실행
  const handleConfirm = async () => {
    const user_id = await SecureStore.getItemAsync('user_id');
    //checkbox가 체크되어 있지 않으면 confirm 안되게
    if (checkboxValue && user_id) {
      const timeSlotInfo: timeSlotType = {
        action: checkboxValue,
        description: inputValue,
        ended_at: endTime,
      };

      //secureStore에 action, description 저장.
      await SecureStore.setItemAsync('lastAction', checkboxValue);
      await SecureStore.setItemAsync('lastDescription', inputValue);

      await createTimeSlotInfo(timeSlotInfo, user_id);

      //모달 닫으면 updateTimeSlot변경으로 탭화면 리렌더링.
      setUpdated(!isUpdated); //상태 변경
      setModalClose();
    } else {
      //확인버튼 눌렀을때 checkbox 체크 안되어 있으면 '한 일을 체크해주세요' 문구가 떨리는 effect추가하기
      setCheckboxAlert(true);
      return;
    }
    setCheckboxValue(null);
  };

  //취소버튼
  const handleCancel = () => {
    setModalClose();
    setCheckboxValue(null);
    setInputValue('');
    const insDate = new Date().toLocaleString();
    console.log(insDate + '에 취소를 눌렀습니다.');
  };

  //마지막으로 체크한 action, description 불러오기
  useEffect(() => {
    const fetchLastValues = async () => {
      const LastAction = await SecureStore.getItemAsync('lastAction');
      const LastDescription = await SecureStore.getItemAsync('lastDescription');
      // setCheckboxValue(LastAction);
      setInputValue(LastDescription ?? '');
    };
    fetchLastValues();
  }, []);

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
            {checkboxValue ? (
              <></>
            ) : (
              <Text style={{ color: GRAY_6 }}>한 일을 눌러주세요!</Text>
            )}
            <TextInput
              style={styles.input}
              placeholder='세부계획을 입력해주세요'
              value={inputValue}
              onChangeText={setInputValue}
              placeholderTextColor={GRAY_4}
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
      {checkboxAlert && (
        <AlertModal
          setAlertModalVisible={setCheckboxAlert}
          title='한 일에 체크해주세요.'
        />
      )}
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
    marginBottom: 10,
    color: GRAY_8,
    width: '100%',
    textAlign: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: GRAY_4,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    marginTop: 10,
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
    backgroundColor: GRAY_4,
  },
  confirmButton: {
    backgroundColor: GRAY_9,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ActionTrackerModal;
