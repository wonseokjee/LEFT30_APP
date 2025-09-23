import * as SecureStore from 'expo-secure-store';
import { logout } from '@react-native-kakao/user';
import { useRouter } from 'expo-router';
import BasicModal from '../asset/basicModal';
import { useLoginExpiredModalStore } from '@/store/useModalStore';

const LoginExpiredAlertModal = () => {
  const { loginExpiredModalVisible, setLoginExpiredModalVisible } =
    useLoginExpiredModalStore() as {
      loginExpiredModalVisible: boolean;
      setLoginExpiredModalVisible: (value: boolean) => void;
    };
  const router = useRouter();
  //확인
  const handleConfirm = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await logout();
    router.replace('/(login)');
    setLoginExpiredModalVisible(false);
  };

  return (
    <>
      {loginExpiredModalVisible && (
        <BasicModal
          setBasicModalVisible={setLoginExpiredModalVisible}
          title='로그인 정보가 만료되었습니다. 다시 로그인 해주세요.'
          handleConfirm={handleConfirm}
        />
      )}
    </>
  );
};

export default LoginExpiredAlertModal;
