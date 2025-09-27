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
import { GRAY_0, GRAY_1, GRAY_4, GRAY_5, GRAY_7 } from '@/assets/palette';
import CheckBox from '@/hooks/actionModal/checkbox';
import { updateTimeSlotInfo } from '@/api/timetableApi';
import { updateInfoFromZustand } from '@/store/timeTableStore';
import useTime from '@/hooks/time/useTime';
import AlertModal from '../asset/AlertModal';

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
  const [action, setAction] = useState(
    slotdata?.action || '한 일을 설정해주세요'
  );
  const [detail, setDetail] = useState(slotdata?.description || '');
  const { endTime } = useTime();
  const [selectedStart, setSelectedStart] = useState(
    slotdata?.started_at
      ? new Date(slotdata.started_at)
      : new Date(endTime().getTime() - 30 * 60 * 1000)
  );
  //range에 따라 end time이 결정되므로, end time은 range가 바뀔 때마다 재계산.
  const [selectedEnd, setSelectedEnd] = useState(
    slotdata?.started_at
      ? new Date(
          new Date(slotdata.started_at).getTime() +
            (slotdata?.range || 0) * 10 * 60 * 1000
        )
      : endTime()
  );

  const [showActionCheckBox, setShowActionCheckBox] = useState(false);
  const { isUpdated, setUpdated } = updateInfoFromZustand();
  const [startendMissAlertModalVisible, setStartendMissAlertModalVisible] =
    useState(false);
  const [checkboxAlert, setCheckboxAlert] = useState(false);

  const handleSave = async () => {
    //checkbox가 선택되어 있지 않으면 alertModal
    if (!action || action === '한 일을 설정해주세요') {
      setCheckboxAlert(true);
      return;
    }
    //시작시간이 종료시간보다 늦는 경우 처리해야함.
    if (selectedStart > selectedEnd) {
      // 종료시간이 더 빠르다는 경고 메시지 표시
      setStartendMissAlertModalVisible(true);
      return;
    } else {
      await updateTimeSlotInfo(selectedStart, selectedEnd, detail, action);
      // console.log(slotdata);
      onClose();
      setUpdated(!isUpdated); //상태 변경
    }
  };

  //여기 색상은 action에 따라 바뀌도록. action은 placeholder에 있는 걸로. 가능한가?? 다시 렌더링해야 보일듯. ver2.0에...
  const colorKey = slotdata
    ? (slotdata.action as keyof typeof ACTION_TYPE_COLOR)
    : null;

  return (
    <>
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
                backgroundColor: colorKey
                  ? ACTION_TYPE_COLOR[colorKey]
                  : 'black',
              },
            ]}
          >
            <TouchableOpacity onPress={onClose}>
              <Entypo name='cross' size={27} color={GRAY_1} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={{ flexDirection: 'row' }}
            >
              <Text style={{ color: GRAY_1, paddingRight: 2 }}>save</Text>
              <Entypo name='check' size={25} color={GRAY_1} />
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
            placeholder='설명'
            placeholderTextColor={GRAY_5}
            value={detail}
            onChangeText={setDetail}
          />
        </View>
      </Modal>
      {startendMissAlertModalVisible && (
        <AlertModal
          setAlertModalVisible={setStartendMissAlertModalVisible}
          title='종료 시간이 시작 시간보다 빠릅니다.'
        />
      )}
      {checkboxAlert && (
        <AlertModal
          setAlertModalVisible={setCheckboxAlert}
          title='한 일에 체크해주세요.'
        />
      )}
    </>
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
  action: {
    marginTop: 10,
    marginBottom: 5,
    color: GRAY_7,
    paddingHorizontal: 10,
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
    marginTop: 5,
    width: '95%',
    color: GRAY_7,
    textAlignVertical: 'top', //안드로이드에서 텍스트 위쪽부터 입력되도록
  },
});

export default TimeTableSlotItemInfo;
