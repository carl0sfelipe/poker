import axios from 'axios';

const API_URL = '/api';

// Configurar o interceptor para adicionar o token em todas as requisições
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const authService = {
  async login(email, password) {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async register(name, email, password) {
    const response = await axios.post(`${API_URL}/auth/register`, { name, email, password });
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  isStaff() {
    const user = this.getUser();
    return user && (user.role === 'staff' || user.role === 'admin');
  },

  hasRole(roles) {
    const user = this.getUser();
    return user && roles.includes(user.role);
  }
};

export default authService; 