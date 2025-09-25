import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { GRAY_4, GRAY_8, GRAY_9 } from '@/assets/palette';

type SetBasicModalVisibleProps = {
  setBasicModalVisible: (visible: boolean) => void;
  title: string;
  handleConfirm: () => Promise<void>; // handleConfirm을 props로 받음
  handleCancel?: () => void; // handleCancel을 props로 받음 (필요시)
  isTextInput?: boolean; // textInput을 외부에서 받을 수 있도록 추가
  inputValue?: string; // textInput의 값을 관리하는 상태
  setInputValue?: (value: string) => void; // textInput의 값을 변경하는 함수
  inputValuePlaceholder?: string; // textInput의 placeholder
};

const BasicModal: React.FC<SetBasicModalVisibleProps> = ({
  setBasicModalVisible,
  title,
  handleConfirm,
  handleCancel,
  isTextInput, // props로 받음
  inputValue,
  setInputValue, // textInput의 값을 관리하는 상태와 상태 변경 함수를 props로 받음
  inputValuePlaceholder,
}) => {
  //확인 및 취소 함수를 props로 받음

  return (
    <View style={styles.container}>
      <Modal
        transparent={true}
        // visible={timerModalOpen}
        animationType='fade'
        //모달이 닫히려고 할때 호출되는 콜백함수, android에서 뒤로가기 버튼을 눌렀을 때 동작
        onRequestClose={() => setBasicModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{title}</Text>

            {isTextInput ? (
              <TextInput
                style={styles.input}
                placeholder={inputValuePlaceholder}
                value={inputValue}
                onChangeText={setInputValue}
                placeholderTextColor={GRAY_4}
              />
            ) : null}

            <View style={styles.buttonContainer}>
              {handleCancel && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.buttonText}>취소</Text>
                </TouchableOpacity>
              )}

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
    fontSize: 16,
    width: '100%',
    textAlign: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    color: GRAY_8,
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

export default BasicModal;
