import GetButton from '@/components/firebase/getTimeTable';
import Timer from '@/components/timer/timer';
import WiseSaying from '@/components/wiseSaying/wiseSaying';
// import ModalButton from '@/hooks/alarm/modal';
import useNumStore from '@/store/timerStore';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { setModalOpen } = useNumStore();
  return (
    <View style={styles.appContainer}>
      <Timer />
      <WiseSaying />
      {/* <ModalButton /> */}
      {/* <Button title='Modal 열기' onPress={() => setModalOpen()} color='grey' /> */}
      {/* <GetButton /> */}
    </View>
  );
}
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    // borderWidth: 1,
    // borderColor: 'white',
  },
});
