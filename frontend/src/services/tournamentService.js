import axios from 'axios';
import authService from './authService';

const API_URL = '/api';

// Configurar o interceptor para adicionar o token em todas as requisições
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const tournamentService = {
  async list() {
    const response = await axios.get(`${API_URL}/tournaments`);
    return response.data;
  },

  async getById(id) {
    const response = await axios.get(`${API_URL}/tournaments/${id}`);
    return response.data;
  },

  async create(tournamentData) {
    const response = await axios.post(`${API_URL}/tournaments`, tournamentData);
    return response.data;
  },

  async register(tournamentId) {
    const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/register`);
    return response.data;
  },

  async checkIn(tournamentId, userId) {
    const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/checkin`, { userId });
    return response.data;
  },

  async eliminate(tournamentId, userId) {
    const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/eliminate`, { userId });
    return response.data;
  },

  async exportResults(tournamentId) {
    const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/export`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default tournamentService; 