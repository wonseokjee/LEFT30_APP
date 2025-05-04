import api from './api';

export const getTodoLIstFromDB = async () => {
  const user_id = 'cddba932-7fb4-41b6-b8ba-ab17d4bcf0cf';
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
  const user_id = 'cddba932-7fb4-41b6-b8ba-ab17d4bcf0cf';
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
