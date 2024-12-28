import Timer from '@/components/timer/timer';
import ModalButton from '@/hooks/alarm/modal';
import useNumStore from '@/store/timerStore';
import { Alert, Button, Text, View } from 'react-native';

export default function Index() {
  const { setModalOpen } = useNumStore();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Timer />
      <Button title='Modal 열기' onPress={() => setModalOpen()} />
      <ModalButton />
    </View>
  );
}
