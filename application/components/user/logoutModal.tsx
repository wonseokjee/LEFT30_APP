import * as SecureStore from 'expo-secure-store';
import { logout } from '@react-native-kakao/user';
import { useRouter } from 'expo-router';
import BasicModal from '../asset/basicModal';

type SetLogoutModalVisibleProps = {
  setLogoutModalVisible: (visible: boolean) => void;
};

const LogoutModal: React.FC<SetLogoutModalVisibleProps> = ({
  setLogoutModalVisible,
}) => {
  const router = useRouter();
  //확인
  const handleConfirm = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await logout();
    router.replace('/(login)');
    setLogoutModalVisible(false);
  };
  const handleCancel = () => {
    setLogoutModalVisible(false);
    console.log('setLogoutModalVisible을 취소를 눌렀습니다.');
  };

  return (
    <>
      <BasicModal
        setBasicModalVisible={setLogoutModalVisible}
        title='로그아웃 하시겠습니까?'
        handleConfirm={handleConfirm}
        handleCancel={handleCancel}
      />
    </>
  );
};

export default LogoutModal;
