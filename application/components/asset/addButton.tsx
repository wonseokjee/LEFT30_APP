import { GRAY_1, GRAY_8 } from '@/assets/palette';
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

type Props = {
  setAddModalVisible: (visible: boolean) => void;
};

const AddButton: React.FC<Props> = ({ setAddModalVisible }) => {
  return (
    <>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setAddModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  addButton: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: GRAY_8, 
    width: 45,
    height: 45,
    borderRadius: 30,
    justifyContent: 'center', // 수직 가운데 정렬
    alignItems: 'center', // 수평 가운데 정렬
    // opacity: 0.9,
  },
  addButtonText: {
    color: GRAY_1,
    fontSize: 30,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    lineHeight: 30, // 텍스트가 버튼 중앙에 오도록 조정
  },
});

export default AddButton;
