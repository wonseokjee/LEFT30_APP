import { View, Text, StyleSheet } from 'react-native';

export default function Plan() {
  //plan에서는 일정을 짤 수 있게
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tab [Home|Settings|graph]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  text: { color: 'white' },
});
