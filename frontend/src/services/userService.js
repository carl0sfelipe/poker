import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const userService = {
  registerManual: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/users/register-manual`, userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  list: async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      return response.data;
    } catch (error) {
      console.error('Get users error:', error.response?.data || error.message);
      throw error;
    }
  }
};

export default userService; 