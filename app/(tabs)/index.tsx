import Timer from '@/components/timer/timer';
// import ModalButton from '@/hooks/alarm/modal';
import useNumStore from '@/store/timerStore';
import { StyleSheet, Button, View } from 'react-native';

export default function Index() {
  const { setModalOpen } = useNumStore();
  return (
    <View style={styles.appContainer}>
      <Timer />
      <Button title='Modal 열기' onPress={() => setModalOpen()} color='grey' />
      {/* <ModalButton /> */}
    </View>
  );
}
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});
