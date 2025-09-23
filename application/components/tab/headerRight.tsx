import { GRAY_0, GRAY_4, GRAY_9 } from '@/assets/palette';
import Entypo from '@expo/vector-icons/build/Entypo';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { getQuietTimeByZustand } from '@/store/useQuietTImeStore';
import { getQuietTimeByDB } from '@/api/userApi';
import QuietTimeModal from '../user/quietTimeModal';
import LogoutModal from '../user/logoutModal';
import { useRouter } from 'expo-router';

export default function TabHeaderRight() {
  const [visible, setVisible] = useState(false);
  const [quietModalVisible, setQuietModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const { setTime } = getQuietTimeByZustand();
  const router = useRouter();

  const menuItems = [
    {
      label: '설정',
      onPress: () => {
        /* 설정 동작 */
      },
    },
    {
      label: '방해금지 시간',
      onPress: async () => {
        const quietTime = await getQuietTimeByDB();
        setQuietModalVisible(true);
        setTime(quietTime);
      },
    },
    {
      label: '계정 관리',
      onPress: async () => {
        router.replace('/(user)');
      },
    },
    {
      label: '로그아웃',
      onPress: () => {
        setLogoutModalVisible(true);
      },
    },
  ];
  return (
    <>
      <TouchableOpacity
        onPress={() => {
          /* 원하는 동작 */
          setVisible(!visible);
        }}
        style={{ marginRight: 10 }}
      >
        <Entypo name='dots-three-vertical' size={20} color={GRAY_0} />
        {/* Entypo Icon munu or dots-three-vertical */}
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType='fade'
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity key={item.label} onPress={item.onPress}>
                <Text style={styles.menuItem}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
      {quietModalVisible ? (
        <QuietTimeModal setModalVisible={setQuietModalVisible} />
      ) : null}
      {logoutModalVisible ? (
        <LogoutModal setLogoutModalVisible={setLogoutModalVisible} />
      ) : null}
    </>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menu: {
    marginTop: 50, // 헤더 높이에 맞게 조정
    marginRight: 10,
    backgroundColor: GRAY_0,
    borderRadius: 2,
    padding: 8,
    minWidth: 120,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    color: GRAY_9,
  },
});
