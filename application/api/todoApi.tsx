import api from './api';

const user_id = process.env.EXPO_PUBLIC_USER_ID;
export const getTodoLIstFromDB = async () => {
  try {
    const res = await api.get('/todo/user/' + user_id);
    const todoList = res.data;
    return todoList; // 데이터를 반환
  } catch (error) {
    console.log('error', error);
    return []; // 에러 발생 시 빈 배열 반환
  }
};

export const addTodoItemFromDB = async (title: string) => {
  try {
    const res = await api.post('/todo', {
      user_id,
      title,
    });
    return res.data; // 추가된 데이터를 반환
  } catch (error) {
    console.log('error', error);
    return null; // 에러 발생 시 null 반환
  }
};

export const updateTodoItemFromDB = async (id: string, task: string) => {
  try {
    const res = await api.patch(`/todo/${id}`, {
      title: task,
    });
    return res.data; // 업데이트된 데이터를 반환
  } catch (error) {
    console.log('error', error);
    return null; // 에러 발생 시 null 반환
  }
};

export const updateTodoItemStatusFromDB = async (
  id: string,
  is_done: boolean
) => {
  try {
    const res = await api.patch(`/todo/${id}`, {
      is_done: is_done,
    });
    return res.data; // 업데이트된 데이터를 반환
  } catch (error) {
    console.error('Error updating todo status:', error);
    return null; // 에러 발생 시 null 반환
  }
};

export const deleteTodoItemFromDB = async (id: string) => {
  try {
    const res = await api.delete(`/todo/${id}`); // DELETE 요청
    return res.data; // 삭제 결과를 반환
  } catch (error) {
    console.error('Error deleting todo item:', error);
    return null; // 에러 발생 시 null 반환
  }
};
