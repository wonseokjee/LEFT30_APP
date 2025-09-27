import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TimeRangePicker from '../timetable/timeRangePicker';
import { getQuietTimeByZustand } from '@/store/useQuietTImeStore';
import { GRAY_4, GRAY_8, GRAY_9 } from '@/assets/palette';
import { updateQuietTimeByDB } from '@/api/userApi';

type SetQuietTimeModalProps = {
  setModalVisible: (visible: boolean) => void;
};

const QuietTimeModal: React.FC<SetQuietTimeModalProps> = ({
  setModalVisible,
}) => {
  const { quietStartHour, quietStartMinute, quietEndHour, quietEndMinute } =
    getQuietTimeByZustand();
  const [startTime, setStartTime] = useState<Date | null>(
    new Date(
      new Date().setHours(quietStartHour ?? 0, quietStartMinute ?? 0, 0, 0)
    )
  );
  const [endTime, setEndTime] = useState<Date | null>(
    new Date(new Date().setHours(quietEndHour ?? 0, quietEndMinute ?? 0, 0, 0))
  );

  //확인
  const handleConfirm = async () => {
    updateQuietTimeByDB({
      quietStartHour: startTime?.getHours() ?? 0,
      quietStartMinute: startTime?.getMinutes() ?? 0,
      quietEndHour: endTime?.getHours() ?? 0,
      quietEndMinute: endTime?.getMinutes() ?? 0,
    });
    //모달로 한번 더 체크한 다음에 서버로 전송.
    //확인 모달은 컴포넌트화 시켜서 재활용 가능하게
    //값을 구체적으로 넘기지 않아도, 이대로 저장하시겠습니까? 정도로
    setModalVisible(false);
  };

  //취소
  const handleCancel = () => {
    setModalVisible(false);
    console.log('setDisturbModal을 취소를 눌렀습니다.');
  };

  return (
    <View style={styles.container}>
      <Modal
        transparent={true}
        // visible={timerModalOpen}
        animationType='fade'
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>방해 금지 시간 설정</Text>
            <View style={styles.pickerSection}>
              <TimeRangePicker
                onChange={(changedTime) => {
                  setStartTime(changedTime);
                }}
                slotData={{
                  time: startTime || new Date(),
                  label: '시작 시간',
                }}
                timeFormatOptions={{ hour: '2-digit', minute: '2-digit' }}
              />
            </View>
            <View style={styles.pickerSection}>
              <TimeRangePicker
                onChange={(changedTime) => {
                  setEndTime(changedTime);
                }}
                slotData={{
                  time: endTime || new Date(),
                  label: '종료 시간',
                }}
                timeFormatOptions={{ hour: '2-digit', minute: '2-digit' }}
              />
            </View>

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
  modalBox: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  modalTitle: {
    fontSize: 18,
    // fontWeight: 'bold',
    width: '100%',
    textAlign: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: GRAY_4,
    color: GRAY_8,
  },

  pickerSection: {
    width: '100%',
    marginVertical: 5,
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
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

export default QuietTimeModal;
