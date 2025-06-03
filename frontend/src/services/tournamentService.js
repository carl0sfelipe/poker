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
      const response = await axios.get(`${API_URL}/tournaments/${id}`);
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
        bonuses: tournamentData.bonuses.map(bonus => ({
          ...bonus,
          stack: parseInt(bonus.stack)
        })),
        addon: {
          ...tournamentData.addon,
          stack: parseInt(tournamentData.addon.stack),
          price: parseInt(tournamentData.addon.price)
        },
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

  async checkIn(tournamentId, userId) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/checkin`, { userId });
      return response.data;
    } catch (error) {
      console.error('CheckIn error:', error);
      throw this._handleError(error);
    }
  },

  async eliminate(tournamentId, userId) {
    try {
      const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/eliminate`, { userId });
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
      console.error('Export error:', error);
      throw this._handleError(error);
    }
  },

  async delete(tournamentId, forceDelete = false, password = null) {
    try {
      // Log da URL que será chamada
      const deleteUrl = `${API_URL}/tournaments/${tournamentId}/delete`;
      console.log('Delete URL:', deleteUrl);

      // Primeiro verifica se o torneio existe
      try {
        const tournament = await this.getById(tournamentId);
        console.log('Tournament found:', tournament);
      } catch (error) {
        console.error('Pre-delete check error:', error);
        if (error.response?.status === 404) {
          throw new Error('Tournament not found or already deleted');
        }
        throw error;
      }

      // Se existe, tenta deletar
      console.log('Attempting to delete tournament:', tournamentId);
      const response = await axios.post(deleteUrl, {
        forceDelete,
        password
      });
      console.log('Delete response:', response);
      
      // Se a resposta for 204 ou 200, considera sucesso
      if (response.status === 204 || response.status === 200) {
        return { success: true, message: 'Tournament successfully deleted' };
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (error) {
      console.error('Delete error:', {
        error,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });

      // Se o erro for 404, significa que o endpoint está errado
      if (error.response?.status === 404) {
        throw new Error('Delete endpoint not found. Please contact the administrator.');
      }
      // Se o erro for 403, significa que não tem permissão
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to delete this tournament');
      }
      // Se o erro for 401, senha inválida
      if (error.response?.status === 401) {
        throw new Error('Invalid password. Please try again.');
      }
      // Se o erro for 409, significa que precisa de force delete
      if (error.response?.status === 409) {
        if (error.response.data?.requiresForceDelete) {
          throw new Error('FORCE_DELETE_REQUIRED');
        }
        throw new Error('Cannot delete tournament that has already started or has registered players');
      }
      // Se o erro for de rede
      if (error.code === 'ECONNABORTED' || !error.response) {
        throw new Error('Network error while trying to delete tournament. Please try again.');
      }
      // Se for um erro da API com mensagem
      if (error.response?.data?.message) {
        throw new Error(`API Error: ${error.response.data.message}`);
      }
      // Para outros erros, usa o handler padrão
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