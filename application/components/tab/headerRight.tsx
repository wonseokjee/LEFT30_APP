
import Entypo from '@expo/vector-icons/build/Entypo';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import LogoutModal from '../user/logoutModal';
import { useRouter } from 'expo-router';
import { makeStyles, useTheme } from '@/theme/theme';

export default function TabHeaderRight() {
  const styles = useStyles();
  const t = useTheme();
  const [visible, setVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();

  const menuItems = [
    // {
    //   label: '설정',
    //   onPress: () => {
    //     /* 설정 동작 */
    //   },
    // },
    // {
    //   label: '방해금지 시간',
    //   onPress: async () => {
    //     const quietTime = await getQuietTimeByDB();
    //     setQuietModalVisible(true);
    //     setTime(quietTime);
    //   },
    // },
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
        <Entypo name='dots-three-vertical' size={20} color={t.text} />
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
      {logoutModalVisible ? (
        <LogoutModal setLogoutModalVisible={setLogoutModalVisible} />
      ) : null}
    </>
  );
}
const useStyles = makeStyles((t) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: t.overlay,
  },
  menu: {
    marginTop: 50, // 헤더 높이에 맞게 조정
    marginRight: 10,
    backgroundColor: t.sheet,
    borderRadius: 2,
    padding: 8,
    minWidth: 120,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    color: t.text,
  },
}));
