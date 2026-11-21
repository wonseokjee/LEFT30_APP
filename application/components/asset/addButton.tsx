
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { makeStyles } from '@/theme/theme';

type Props = {
  setAddModalVisible: (visible: boolean) => void;
};

const AddButton: React.FC<Props> = ({ setAddModalVisible }) => {
  const styles = useStyles();
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

const useStyles = makeStyles((t) => StyleSheet.create({
  addButton: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: t.cell, 
    width: 45,
    height: 45,
    borderRadius: 30,
    justifyContent: 'center', // 수직 가운데 정렬
    alignItems: 'center', // 수평 가운데 정렬
    // opacity: 0.9,
  },
  addButtonText: {
    color: t.text,
    fontSize: 30,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    lineHeight: 30, // 텍스트가 버튼 중앙에 오도록 조정
  },
}));

export default AddButton;
