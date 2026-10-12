import { addTodoItemFromDB } from '@/api/todoApi';
import React, { useState } from 'react';
import BasicModal from '../asset/basicModal';
import AlertModal from '../asset/AlertModal';

interface AddTaskModalProps {
  setAddModalVisible: (visible: boolean) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ setAddModalVisible }) => {
  const [task, setTask] = useState<string>('');
  const [alertModalVisible, setAlertModalVisible] = useState<boolean>(false);

  const addTodoFromDB = async (task: string) => {
    if (task.trim() === '') {
      setAlertModalVisible(true);
      return;
    } else {
      addTodoItemFromDB(task);
      setAddModalVisible(false);
      setTask(''); // 추가 후 입력 필드 초기화
    }
  };

  return (
    <>
      <BasicModal
        setBasicModalVisible={setAddModalVisible}
        title='새로운 Todo 추가'
        handleConfirm={() => addTodoFromDB(task)}
        handleCancel={() => setAddModalVisible(false)}
        inputValuePlaceholder='할 일을 입력하세요'
        inputValue={task}
        setInputValue={setTask}
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

export default AddTaskModal;
