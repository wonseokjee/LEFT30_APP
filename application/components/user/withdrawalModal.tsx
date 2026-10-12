import * as SecureStore from 'expo-secure-store';
import { logout, unlink } from '@react-native-kakao/user';
import { router, useRouter } from 'expo-router';
import BasicModal from '../asset/basicModal';
import React from 'react';
import { withdrawUser } from '@/api/userApi';

type SetWithdrawalModalVisibleProps = {
  setWithdrawalModalVisible: (visible: boolean) => void;
};

const WithdrawalModal: React.FC<SetWithdrawalModalVisibleProps> = ({
  setWithdrawalModalVisible,
}) => {
  const [inputValue, setInputValue] = React.useState('');
  const [
    finalCheckWithdrawalModalVisible,
    setFinalCheckWithdrawalModalVisible,
  ] = React.useState(false);
  //확인
  const handleConfirm = async () => {
    if (inputValue === '시간은 가장 공정한 재판관이다') {
      setFinalCheckWithdrawalModalVisible(true);
    }
    // setWithdrawalModalVisible(false);
  };
  const handleCancel = () => {
    setWithdrawalModalVisible(false);
    console.log('setWithdrawalModalVisible을 취소를 눌렀습니다.');
  };
  const [exit, setExit] = React.useState(false);
  //확인
  const handleFinalCheckConfirm = async () => {
    await withdrawUser();
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user_id');
    //카카오 unlink
    await unlink();
    //회원탈퇴 로직
    setExit(true);
  };
  const handleFinalCheckCancel = () => {
    setFinalCheckWithdrawalModalVisible(false);
    setWithdrawalModalVisible(false);
    console.log('setFinalCheckWithdrawalModalVisible을 취소를 눌렀습니다.');
  };

  const handleExitConfirm = async () => {
    setFinalCheckWithdrawalModalVisible(false);
    setExit(false);
    setWithdrawalModalVisible(false);
    router.replace('/(login)');
  };

  return (
    <>
      <BasicModal
        setBasicModalVisible={setWithdrawalModalVisible}
        title='회원 탈퇴'
        subtitle='"시간은 가장 공정한 재판관이다"를 입력해주세요.'
        isTextInput={true}
        inputValue={inputValue}
        inputValuePlaceholder='여기에 입력해주세요'
        setInputValue={setInputValue}
        handleConfirm={handleConfirm}
        handleCancel={handleCancel}
      />
      {finalCheckWithdrawalModalVisible && (
        <BasicModal
          setBasicModalVisible={setFinalCheckWithdrawalModalVisible}
          title='회원 탈퇴'
          subtitle='회원 탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까?'
          handleConfirm={handleFinalCheckConfirm}
          handleCancel={handleFinalCheckCancel}
        />
      )}
      {exit && (
        <BasicModal
          setBasicModalVisible={() => setExit(false)}
          title='회원 탈퇴되었습니다.'
          handleConfirm={handleExitConfirm}
        />
      )}
    </>
  );
};

export default WithdrawalModal;
