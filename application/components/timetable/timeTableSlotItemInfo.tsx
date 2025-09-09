//modal 창 비슷하게
//구글 캘린더는 아래에 박스 있고 slot 터치하면 박스가 올라오면서 정보 보여주고 수정 가능.
import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import { timeSlotType } from '@/@types/timeSlot/timeSlotType';
import Entypo from '@expo/vector-icons/Entypo';
import { ACTION_TYPE_COLOR } from '@/@types/firebase/common/actionColorType';
import TimeRangePicker from './timeRangePicker';

type TimeTableSlotProps = {
  slotdata: timeSlotType | null;
  modalOpen: boolean;
  onClose: () => void;
};

//모든 slotitem이 한번에 열리는 오류가 생긴것 같음.
const TimeTableSlotItemInfo: React.FC<TimeTableSlotProps> = ({
  slotdata,
  modalOpen,
  onClose,
}) => {
  const [action, setAction] = useState(slotdata?.action || '');
  const [detail, setDetail] = useState(slotdata?.description || '');

  const handleSave = () => {
    // 저장 로직 추가 (ex. 서버와 통신 또는 상태 업데이트)
    console.log('Updated Action:', action);
    console.log('Updated Detail:', detail);
    console.log(slotdata);
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
        <View style={styles.modalContent}>
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
              <Entypo name='cross' size={27} color='#f1f3f5' />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Entypo name='check' size={25} color='#f1f3f5' />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalTitle}>Edit Slot Details</Text>
          <TextInput
            style={styles.input}
            placeholder='Action'
            value={action}
            onChangeText={setAction}
          />
          <TextInput
            style={styles.input}
            placeholder='Detail'
            value={detail}
            onChangeText={setDetail}
          />
          <TimeRangePicker
            slotdata={slotdata}
            onChange={(start, end) => {
              // start, end를 활용해 slotdata의 started_at 등 처리
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    // backgroundColor: 'white',
    backgroundColor: '#f1f3f5', //gray1
    // backgroundColor: '#f8f9fa', //gray0
    // backgroundColor: '#dee2e6', //gray3
    // backgroundColor: '#e9ecef', //gray2
    width: '100%',
    minHeight: '60%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    // shadowColor: '#000', //그림자 색상 ios
    // shadowOffset: { width: 0, height: 2 }, //그림자 위치 ios
    // shadowOpacity: 0.25, //그림자 투명도 ios
    // shadowRadius: 4,  //그림자 크기 ios
    // elevation: 5, //그림자 효과 안드로이드
  },
  modalTitle: {
    // backgroundColor: 'yellow',
    // paddingHorizontal: 5,
    marginHorizontal: '3%',
    marginTop: '1%',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    // borderWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    elevation: 5, //그림자 효과 안드로이드
  },
});

export default TimeTableSlotItemInfo;
