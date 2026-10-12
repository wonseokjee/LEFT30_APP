import { updateTodoItemFromDB } from '@/api/todoApi';
import React, { useState } from 'react';
import BasicModal from '../asset/basicModal';
import AlertModal from '../asset/AlertModal';

interface EditTaskModalProps {
  setEditModalVisible: (visible: boolean) => void;
  setSelectedTaskIndex: (index: number | null) => void;
  todoId: string;
  todoTitle: string;
  todoNotes: string;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  setEditModalVisible,
  setSelectedTaskIndex,
  todoId,
  todoTitle,
  todoNotes,

  // editTaskHandler,
}) => {
  const [editTask, setEditTask] = useState<string>(todoTitle);
  const [alertModalVisible, setAlertModalVisible] = useState<boolean>(false);
  const updateTodoFromDB = async (task: string) => {
    // task가 비어있지 않은 경우에만 업데이트
    if (task.trim() === '') {
      setAlertModalVisible(true);
      return;
    } else {
      //item이 많아질 경우 form으로 따로 만들어야 할듯.
      try {
        await updateTodoItemFromDB(todoId, task); // 서버에 업데이트 요청
        // console.log(`Task updated: ${task}`);
      } catch (error) {
        console.error('Error updating task:', error);
        //다시 시도하라는 모달.
      } finally {
        setSelectedTaskIndex(null); // 선택된 작업 해제
        setEditModalVisible(false); // 모달 닫기
      }
    }
  };
  return (
    <>
      <BasicModal
        setBasicModalVisible={setEditModalVisible}
        title='Todo 수정'
        handleConfirm={() => updateTodoFromDB(editTask)}
        handleCancel={() => setEditModalVisible(false)}
        inputValuePlaceholder='Todo를 수정하세요'
        inputValue={editTask}
        setInputValue={setEditTask}
        isTextInput={true} // 텍스트 입력 모달로 설정
      ></BasicModal>
      {alertModalVisible && (
        <AlertModal
          setAlertModalVisible={setAlertModalVisible}
          title='할 일을 입력하세요.'
        />
      )}
    </>
  );
};

export default EditTaskModal;
