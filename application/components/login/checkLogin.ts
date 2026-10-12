import api from '@/api/api';
import loginApi from '@/api/Loginapi';
import * as SecureStore from 'expo-secure-store';

const checkLogin = async () => {
  const user_id = await SecureStore.getItemAsync('user_id');
  if (!user_id) {
    console.error('User ID not found in secure storage.');
    return;
  }
  try {
    const checkResponse = await loginApi.get(
      '/user/findOneById/' + `${user_id}`
    );
    if (checkResponse.status === 200) {
      console.log('Login check successful:', checkResponse.data);
      // Handle successful login check, e.g., redirect to home page or show user info
    }
  } catch (error) {
    console.error('Login check failed:', error);
    // Handle the error, e.g., redirect to login page or show an error message
  }
};

export default checkLogin;
