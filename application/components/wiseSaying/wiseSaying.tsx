import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { WiseSayingKOR } from './wiseSayingItemsKOR';

export default function WiseSaying() {
  const day = new Date().getDate();
  //expo-localization으로 국가 판단 후 한국어일 때만 KOR 출력
  //추후 다국어 지원 시 변경 필요
  const country = 'KR';
  const items = country === 'KR' ? WiseSayingKOR : [];
  return (
    <View>
      <Text style={styles.menuItem}>{items[day - 1].saying}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  menuItem: {
    color: 'white',
    // borderWidth: 1,
    // borderColor: 'white',
    alignItems: 'center',
    textAlign: 'center',
    padding: 10,
    minWidth: 100,
  },
});
