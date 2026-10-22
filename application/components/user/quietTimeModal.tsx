import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import TimeRangePicker from '../timetable/timeRangePicker';
import { GRAY_4, GRAY_8, GRAY_9 } from '@/assets/palette';
import { setSetting } from '@/db/records';
import { QUIET_KEY } from '@/scheduler/scheduler';
import type { Quiet } from '@/scheduler/plan';
import { getRuntime, rescheduleNow } from '@/runtime/appRuntime';

type SetQuietTimeModalProps = {
  initial: Quiet;
  setModalVisible: (visible: boolean) => void;
};

function toDate(minuteOfDay: number): Date {
  return new Date(new Date().setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0));
}

function toMinute(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

// 방해금지 시간은 앱 로컬에만 저장한다(구현 D1). 시작과 끝이 같으면 방해금지 없음.
const QuietTimeModal: React.FC<SetQuietTimeModalProps> = ({ initial, setModalVisible }) => {
  const [startTime, setStartTime] = useState<Date>(toDate(initial?.startMin ?? 23 * 60));
  const [endTime, setEndTime] = useState<Date>(toDate(initial?.endMin ?? 7 * 60));

  //확인
  const handleConfirm = async () => {
    const quiet: Quiet = { startMin: toMinute(startTime), endMin: toMinute(endTime) };
    await setSetting(getRuntime().db, QUIET_KEY, quiet);
    // 바뀐 칸만 취소·추가한다.
    void rescheduleNow();
    setModalVisible(false);
  };

  //취소
  const handleCancel = () => {
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Modal
        transparent={true}
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
                  time: startTime,
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
                  time: endTime,
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
