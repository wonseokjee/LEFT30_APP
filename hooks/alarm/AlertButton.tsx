import { TouchableOpacity, View, Text, Alert } from 'react-native';

export default function AlertButton() {
  const onPress = async () => {
    try {
      Alert.alert('Alert Title', 'My Alert Msg', [
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel Pressed'),
          style: 'cancel',
        },
        { text: 'OK', onPress: () => console.log('OK Pressed') },
      ]);
    } catch (error) {
      console.log('error', error);
    }
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View>
        <Text>이것 가지고 firestore에 저장</Text>
      </View>
    </TouchableOpacity>
  );
}
