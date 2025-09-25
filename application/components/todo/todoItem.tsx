import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckBox } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EditTaskModal from './EditTaskModal';
import {
  deleteTodoItemFromDB,
  updateTodoItemStatusFromDB,
} from '@/api/todoApi';
import { GRAY_0, GRAY_3, GRAY_4, GRAY_8 } from '@/assets/palette';

interface TaskItemProps {
  item: { id: string; title: string; notes: string; is_done: boolean };
  index: number;
  setTogle: (togle: boolean) => void;
  onLongPress: () => void;
  togle: boolean;
  selectedTaskIndex: number | null;
  setSelectedTaskIndex: (index: number | null) => void;
  setEditModalVisible: (visible: boolean) => void;
  editModalVisible: boolean;
  remove: boolean;
  setRemove: (remove: boolean) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  item,
  index,
  setTogle,
  onLongPress,
  selectedTaskIndex,
  setSelectedTaskIndex,
  togle,
  // setEditTask,
  setEditModalVisible,
  editModalVisible,
  setRemove,
  remove,
}) => {
  // const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const handleDeleteTask = async () => {
    await deleteTodoItemFromDB(item.id);
    setRemove(!remove); // 로컬 상태 업데이트
  };
  const onToggleTodoCheckbox = async () => {
    try {
      // 서버에 is_done 상태 업데이트 요청
      const updatedTask = await updateTodoItemStatusFromDB(
        item.id,
        !item.is_done
      );
      if (updatedTask) {
        setTogle(!togle); // 로컬 상태 업데이트
      }
    } catch (error) {
      console.error('Error toggling todo checkbox:', error);
    }
  };
  return (
    <View>
      <TouchableOpacity style={styles.taskContainer} onLongPress={onLongPress}>
        <View style={styles.taskItem}>
          <CheckBox
            checked={item.is_done}
            onPress={onToggleTodoCheckbox}
            containerStyle={styles.checkBoxContainer}
            // checkedColor={GRAY_3} // 체크된 항목의 색상 변경
            checkedIcon={<View style={styles.checkedIcon} />}
            uncheckedIcon={<View style={styles.uncheckedIcon} />}
          />
          <Text
            style={[styles.taskText, item.is_done && styles.taskTextChecked]}
            numberOfLines={1}
            ellipsizeMode='tail'
          >
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
      {selectedTaskIndex === index && (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={() => {
              setEditModalVisible(true);
              // setSelectedTaskIndex(null); // 버튼 클릭 시 선택 해제
            }}
          >
            <Icon name='edit' size={24} color={GRAY_8} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await handleDeleteTask();
              setSelectedTaskIndex(null);
            }}
          >
            <Icon name='delete' size={24} color={GRAY_8} />
          </TouchableOpacity>
          {editModalVisible && (
            <EditTaskModal
              setEditModalVisible={setEditModalVisible}
              setSelectedTaskIndex={setSelectedTaskIndex}
              todoId={item.id}
              todoTitle={item.title}
              todoNotes={item.notes}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  taskContainer: {
    borderRadius: 5,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap', // 텍스트가 화면을 벗어나지 않도록 함
    flex: 1, // 추가된 부분
  },
  taskText: {
    color: GRAY_0,
    flexShrink: 1, // 텍스트가 화면을 벗어나지 않도록 함
    textAlign: 'left', // 텍스트를 왼쪽으로 정렬
    flex: 1, // 추가된 부분
  },
  taskTextChecked: {
    textDecorationLine: 'line-through', // 가운데 줄 긋기
    color: GRAY_4, // 체크된 항목의 텍스트 색상 변경
  },
  checkBoxContainer: {
    backgroundColor: 'transparent',
  },
  buttonGroup: {
    position: 'absolute', // 추가된 부분
    bottom: 10, // 추가된 부분
    left: '65%', // 추가된 부분
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '30%', // 추가된 부분
    height: '45%', // 추가된 부분
    backgroundColor: 'white', // 추가된 부분
    zIndex: 1, // 추가된 부분
    borderRadius: 5, // 추가된 부분
  },
  checkedIcon: {
    width: 20,
    height: 20,
    backgroundColor: GRAY_4,
    borderRadius: 4,
  },
  uncheckedIcon: {
    width: 20,
    height: 20,
    // backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GRAY_4,
    borderRadius: 4,
  },
});

export default TaskItem;
