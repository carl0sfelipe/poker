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
    try {
      const response = await axios.get(`${API_URL}/tournaments`);
      return response.data;
    } catch (error) {
      console.error('List error:', error);
      throw this._handleError(error);
    }
  },

  async getById(id) {
    try {
      const response = await axios.get(`${API_URL}/tournaments/${id}?include=registrations,rebuys`);
      return response.data;
    } catch (error) {
      console.error('GetById error:', error);
      if (error.response?.status === 404) {
        throw new Error('Tournament not found. It may have been deleted.');
      }
      throw this._handleError(error);
    }
  },

  async create(tournamentData) {
    try {
      console.log('Creating tournament with data:', JSON.stringify(tournamentData, null, 2));
      
      // Ensure all numeric fields are properly parsed
      const formattedData = {
        ...tournamentData,
        starting_stack: parseInt(tournamentData.starting_stack),
        rebuy_max_level: tournamentData.rebuy.allowed ? parseInt(tournamentData.rebuy.max_level) : null,
        max_stack_for_single_rebuy: tournamentData.rebuy.allowed ? parseInt(tournamentData.rebuy.max_stack_for_single) : null,
        addon_break_level: tournamentData.addon.allowed ? parseInt(tournamentData.addon.break_level) : null,
        rebuy: {
          ...tournamentData.rebuy,
          single: {
            ...tournamentData.rebuy.single,
            stack: parseInt(tournamentData.rebuy.single.stack),
            price: parseInt(tournamentData.rebuy.single.price)
          },
          double: {
            ...tournamentData.rebuy.double,
            stack: parseInt(tournamentData.rebuy.double.stack),
            price: parseInt(tournamentData.rebuy.double.price)
          }
        },
        addon: {
          ...tournamentData.addon,
          stack: parseInt(tournamentData.addon.stack),
          price: parseInt(tournamentData.addon.price)
        }
      };

      console.log('Formatted tournament data:', JSON.stringify(formattedData, null, 2));
      
      const response = await axios.post(`${API_URL}/tournaments`, formattedData);
      console.log('Tournament creation response:', response);
      
      return response.data;
    } catch (error) {
      console.error('Create tournament error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        data: error.response?.data
      });
      throw this._handleError(error);
    }
  },

  async register(tournamentId) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/register`);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw this._handleError(error);
    }
  },

  async manualRegister(tournamentId, name, email, selectedBonuses = []) {
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/manual-register`,
        {
          name,
          email,
          selectedBonuses
        }
      );
      return response.data;
    } catch (error) {
      console.error('Manual register error:', error);
      throw this._handleError(error);
    }
  },

  async performRebuy(tournamentId, userId, isDouble) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/rebuy`, {
        userId,
        isDouble: Boolean(isDouble)  // Ensure it's a boolean
      });
      return response.data;
    } catch (error) {
      console.error('Rebuy error:', error);
      throw this._handleError(error);
    }
  },

  async checkIn(tournamentId, userId) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/checkin`, {
        userId
      });
      return response.data;
    } catch (error) {
      console.error('Check-in error:', error);
      throw this._handleError(error);
    }
  },

  async performAddon(tournamentId, userId) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/addon`, {
        userId
      });
      return response.data;
    } catch (error) {
      console.error('Addon error:', error);
      throw this._handleError(error);
    }
  },

  async settlePayment(tournamentId, userId, { confirmPayment, includeAddon }) {
    try {
      const response = await axios.post(
        `${API_URL}/tournaments/${tournamentId}/settle`,
        {
          userId,
          confirmPayment,
          includeAddon
        }
      );
      return response.data;
    } catch (error) {
      console.error('Settle payment error:', error);
      throw this._handleError(error);
    }
  },

    async eliminatePlayer(tournamentId, userId) {
      try {
        const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/eliminate`, {
          userId
        });
        return response.data;
      } catch (error) {
        console.error('Eliminate error:', error);
        throw this._handleError(error);
      }
    },

    async exportResults(tournamentId) {
      try {
        const response = await axios.get(`${API_URL}/tournaments/${tournamentId}/export`, {
          responseType: 'blob'
        });
        return response.data;
      } catch (error) {
        console.error('Export results error:', error);
        throw this._handleError(error);
      }
    },

  async updateTournamentLevel(tournamentId, level, blindIndex, isBreak) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/level`, {
        level,
        blindIndex,
        isBreak
      });
      return response.data;
    } catch (error) {
      console.error('Update level error:', error);
      throw this._handleError(error);
    }
  },

  async delete(tournamentId, forceDelete = false, password = null) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/delete`, {
        forceDelete,
        password
      });
      
      if (response.status === 204) {
        return { success: true };
      }
      
      return response.data;
    } catch (error) {
      console.error('Delete tournament error:', error);
      if (error.response?.status === 409) {
        throw new Error('FORCE_DELETE_REQUIRED');
      }
      throw this._handleError(error);
    }
  },

  _handleError(error) {
    console.error('API Error:', {
      error,
      response: error.response,
      data: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });

    if (error.response) {
      // O servidor respondeu com um status de erro
      const message = error.response.data?.message || 
                     error.response.data?.error || 
                     error.response.statusText || 
                     'An error occurred';
      const customError = new Error(message);
      customError.status = error.response.status;
      customError.data = error.response.data;
      return customError;
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      return new Error('Network error. Please check your connection.');
    } else {
      // Algo aconteceu na configuração da requisição
      return new Error(error.message || 'An unexpected error occurred.');
    }
  }
};

export default tournamentService; 