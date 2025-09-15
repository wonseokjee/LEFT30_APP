import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
} from 'react-native';
import { timeSlotType } from '@/@types/timeSlot/timeSlotType';
import Entypo from '@expo/vector-icons/Entypo';
import { ACTION_TYPE_COLOR } from '@/@types/firebase/common/actionColorType';
import TimeRangePicker from './timeRangePicker';
import { GRAY_0, GRAY_4, GRAY_7 } from '@/assets/palette';
import CheckBox from '@/hooks/alarm/checkbox';
import { updateTimeSlotInfo } from '@/api/timetableApi';

type TimeTableSlotProps = {
  slotdata: timeSlotType | null;
  modalOpen: boolean;
  onClose: () => void;
};

const TimeTableSlotItemInfo: React.FC<TimeTableSlotProps> = ({
  slotdata,
  modalOpen,
  onClose,
}) => {
  const [action, setAction] = useState(slotdata?.action || '');
  const [detail, setDetail] = useState(slotdata?.description || '');
  const [selectedStart, setSelectedStart] = useState(
    slotdata?.started_at ? new Date(slotdata.started_at) : new Date()
  );
  //range에 따라 end time이 결정되므로, end time은 range가 바뀔 때마다 재계산.
  const [selectedEnd, setSelectedEnd] = useState(
    slotdata?.started_at
      ? new Date(
          new Date(slotdata.started_at).getTime() +
            (slotdata?.range || 0) * 10 * 60 * 1000
        )
      : new Date()
  );

  const [showActionCheckBox, setShowActionCheckBox] = useState(false);

  const handleSave = async () => {
    // 저장 로직 추가 (ex. 서버와 통신 또는 상태 업데이트)
    console.log('Updated Action:', action);
    console.log('Updated Detail:', detail);
    console.log('Selected Start Time:', selectedStart, selectedEnd);
    await updateTimeSlotInfo(selectedStart, selectedEnd, detail, action);
    // console.log(slotdata);
    onClose();
  };

  //여기 색상은 action에 따라 바뀌도록. action은 placeholder에 있는 걸로. 가능한가?? 다시 렌더링해야 보일듯. ver2.0에...
  const colorKey = slotdata
    ? (slotdata.action as keyof typeof ACTION_TYPE_COLOR)
    : null;

  return (
    <Modal
      animationType='slide'
      transparent={true}
      visible={modalOpen}
      onRequestClose={() => onClose()}
    >
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.buttonContainer,
            {
              backgroundColor: colorKey ? ACTION_TYPE_COLOR[colorKey] : 'black',
            },
          ]}
        >
          <TouchableOpacity onPress={onClose}>
            <Entypo name='cross' size={27} color='#f1f3f5' />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={{ flexDirection: 'row' }}
          >
            <Text style={{ color: '#f1f3f5', paddingRight: 2 }}>save</Text>
            <Entypo name='check' size={25} color='#f1f3f5' />
          </TouchableOpacity>
        </View>
        {/* <Text style={styles.modalTitle}>액션 수정하기</Text> */}

        <TouchableOpacity
          style={styles.action}
          onPress={() => setShowActionCheckBox((prev) => !prev)}
          // activeOpacity={0.8}
        >
          <Text style={styles.actionTitle}>한 일</Text>
          <Text style={styles.actionValue}>
            {action || slotdata?.action || ''}
          </Text>
        </TouchableOpacity>

        {showActionCheckBox && (
          <CheckBox
            items={['수면', '휴식', '운동', '관계', '자기개발', '업무']}
            checkValue={(str: string) => {
              setAction(str);
              setShowActionCheckBox(false);
            }}
          />
        )}
        <TimeRangePicker
          slotData={{ time: selectedStart, label: '시작' }}
          onChange={(time) => {
            // start, end를 활용해 slotdata의 started_at 등 처리
            setSelectedStart(time);
          }}
          timeFormatOptions={{
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }}
        />
        <TimeRangePicker
          slotData={{ time: selectedEnd, label: '종료' }}
          onChange={(time) => {
            // start, end를 활용해 slotdata의 started_at 등 처리
            setSelectedEnd(time);
          }}
          timeFormatOptions={{
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }}
        />
        <TextInput
          style={styles.inputDetail}
          placeholder='Detail'
          value={detail}
          onChangeText={setDetail}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    height: 350,
    width: '100%',
    backgroundColor: GRAY_0,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    elevation: 5, //그림자 효과 안드로이드
  },
  modalTitle: {
    paddingHorizontal: 8,
    marginTop: '1%',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: GRAY_7,
  },
  action: {
    marginTop: 10,
    marginBottom: 5,
    color: GRAY_7,
    paddingHorizontal: 8,
  },
  actionTitle: {
    fontSize: 11,
    color: GRAY_7,
    // marginBottom: 8,
  },
  actionValue: {
    fontSize: 17,
    color: GRAY_7,
  },
  inputDetail: {
    borderWidth: 1,
    borderRadius: 4,
    borderColor: GRAY_4,
    backgroundColor: 'white',
    marginHorizontal: '2.5%',
    width: '95%',
    color: GRAY_7,
    textAlignVertical: 'top', //안드로이드에서 텍스트 위쪽부터 입력되도록
  },
});

export default TimeTableSlotItemInfo;
