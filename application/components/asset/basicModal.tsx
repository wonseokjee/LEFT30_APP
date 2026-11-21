import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from '@/components/ui/Text';

import { makeStyles, useTheme } from '@/theme/theme';

type SetBasicModalVisibleProps = {
  setBasicModalVisible: (visible: boolean) => void;
  title: string;
  subtitle?: string;
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
  subtitle,
  handleConfirm,
  handleCancel,
  isTextInput,
  inputValue,
  setInputValue, // textInput의 값을 관리하는 상태와 상태 변경 함수를 props로 받음
  inputValuePlaceholder,
}) => {
  const t = useTheme();
  const styles = useStyles();
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
            {subtitle ? (
              <Text style={styles.modalSubtitle}>{subtitle}</Text>
            ) : null}
            {isTextInput ? (
              <TextInput
                style={styles.input}
                placeholder={inputValuePlaceholder}
                value={inputValue}
                onChangeText={setInputValue}
                placeholderTextColor={t.line}
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

const useStyles = makeStyles((t) => StyleSheet.create({
  container: {
    // flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.overlay,
  },
  modalBox: {
    width: 300,
    padding: 20,
    backgroundColor: t.sheet,
    borderRadius: 5,
  },
  modalTitle: {
    fontSize: 16,
    width: '100%',
    textAlign: 'center',
    // marginBottom: 10,
    paddingBottom: 10,
    color: t.text,
  },
  modalSubtitle: {
    fontSize: 14,
    width: '100%',
    textAlign: 'center',
    paddingBottom: 10,
    color: t.text,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: t.line,
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
    backgroundColor: t.line,
  },
  confirmButton: {
    backgroundColor: t.cell,
  },
  buttonText: {
    color: t.text,
  },
}));

export default BasicModal;
