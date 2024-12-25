import GetButton from '@/components/firebase/getbutton';
import { View, Text, StyleSheet } from 'react-native';

export default function Graph() {
  return (
    <View style={styles.container}>
      <Text>Tab [Home|Settings]</Text>
      <GetButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
