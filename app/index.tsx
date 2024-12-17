import GetButton from '@/components/firebase/getbutton';
import Timer from '@/components/timer/timer';
import { Button, Text, View } from 'react-native';

export default function Index() {
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
      <GetButton />
    </View>
  );
}
