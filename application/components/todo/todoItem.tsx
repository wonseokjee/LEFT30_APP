import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckBox } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deleteTaskFromFirebase } from '../../api/firebase';
import EditTaskModal from './EditTaskModal';

interface TaskItemProps {
  item: { id: string; title: string; notes: string; is_done: boolean };
  index: number;
  checked: boolean; //나중에 isdone으로 바꿔야함.
  onToggleCheckbox: () => void;
  onLongPress: () => void;
  selectedTaskIndex: number | null;
  // setEditTask: (task: string) => void;
  setEditModalVisible: (visible: boolean) => void;
  editModalVisible: boolean;
  deleteTask: (index: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  item,
  index,
  checked,
  onToggleCheckbox,
  onLongPress,
  selectedTaskIndex,
  // setEditTask,
  setEditModalVisible,
  editModalVisible,
  deleteTask,
}) => {
  // const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const handleDeleteTask = async () => {
    await deleteTaskFromFirebase(item.id);
    deleteTask(index);
  };
  const onToggleTodoCheckbox = () => {
    onToggleCheckbox(); // 체크박스 상태 변경 함수 호출
    //checkbox 변경시 계속 db에서 다시 받아와야 하나... 너무 비효율적일듯.
  };
  return (
    <View>
      <TouchableOpacity style={styles.taskContainer} onLongPress={onLongPress}>
        <View style={styles.taskItem}>
          <CheckBox
            checked={item.is_done}
            onPress={onToggleTodoCheckbox}
            containerStyle={styles.checkBoxContainer}
            checkedColor='#fff' // 체크된 항목의 색상 변경
          />
          <Text
            style={[styles.taskText, checked && styles.taskTextChecked]}
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
            }}
          >
            <Icon name='edit' size={24} color='black' />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteTask}>
            <Icon name='delete' size={24} color='black' />
          </TouchableOpacity>
          <EditTaskModal
            editModalVisible={editModalVisible}
            setEditModalVisible={setEditModalVisible}
            todoId={item.id}
            todoTitle={item.title}
            todoNotes={item.notes}
          />
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
    color: '#fff',
    flexShrink: 1, // 텍스트가 화면을 벗어나지 않도록 함
    textAlign: 'left', // 텍스트를 왼쪽으로 정렬
    flex: 1, // 추가된 부분
  },
  taskTextChecked: {
    textDecorationLine: 'line-through', // 가운데 줄 긋기
    color: '#888', // 체크된 항목의 텍스트 색상 변경
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
});

export default TaskItem;
