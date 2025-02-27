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
import { firebase_type } from '@/@types/firebase/collections';

type TimeTableSlotProps = {
  slotdata: firebase_type | null;
  modalOpen: boolean;
  onClose: () => void;
};

//모든 slotitem이 한번에 열리는 오류가 생긴것 같음.
const TimeTableSlotItemInfo: React.FC<TimeTableSlotProps> = ({
  slotdata,
  modalOpen,
  onClose,
}) => {
  const [action, setAction] = useState(slotdata?.event.action || '');
  const [detail, setDetail] = useState(slotdata?.event.detail || '');

  const handleSave = () => {
    // 저장 로직 추가 (ex. 서버와 통신 또는 상태 업데이트)
    console.log('Updated Action:', action);
    console.log('Updated Detail:', detail);
    onClose()
  };
  return (
    <Modal
      animationType='slide'
      transparent={true}
      visible={modalOpen}
      onRequestClose={() => onClose()}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
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
          <View style={styles.buttonContainer}>
            <Button title='Save' onPress={handleSave} />
            <Button title='Cancel' color='red' onPress={() => onClose()} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default TimeTableSlotItemInfo;
