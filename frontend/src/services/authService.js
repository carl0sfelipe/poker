import axios from 'axios';

const API_URL = '/api';

// Configurar o interceptor para adicionar o token em todas as requisições
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding token to request:', token.substring(0, 20) + '...');
    } else {
      console.warn('No token found for request to:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com respostas de erro de autenticação
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.error || 'Token inválido';
      console.warn('401 Unauthorized:', errorMessage);
      
      // Limpar dados de autenticação
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Determinar mensagem baseada no tipo de erro
      let userMessage = 'Sua sessão expirou. Você será redirecionado para a página de login.';
      if (errorMessage.includes('Invalid token') || errorMessage.includes('expired')) {
        userMessage = 'Seu token expirou. Faça login novamente.';
      } else if (errorMessage.includes('Authentication required')) {
        userMessage = 'Autenticação necessária. Você será redirecionado para o login.';
      }
      
      // Mostrar notificação ao usuário apenas se não estiver nas páginas de auth
      if (window.location.pathname !== '/login' && 
          window.location.pathname !== '/register' && 
          window.location.pathname !== '/') {
        alert(userMessage);
      }
      
      // Redirecionar para login
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
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
    
    // Redirecionar para login após logout
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  },

  // Método para fazer logout automático quando token expira
  forceLogout(message = 'Sua sessão expirou') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Mostrar mensagem se não estivermos já na página de login
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      alert(message);
    }
    
    window.location.href = '/login';
  },

  // Método para verificar se o token ainda é válido
  async validateToken() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      // Fazer uma requisição simples para verificar se o token ainda é válido
      await axios.get(`${API_URL}/auth/validate`);
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        this.forceLogout('Token expirado. Faça login novamente.');
        return false;
      }
      // Para outros erros, assumir que o token ainda é válido
      return true;
    }
  },

  // Método para decodificar o JWT e verificar se está próximo do vencimento
  isTokenExpiringSoon(minutesThreshold = 5) {
    const token = this.getToken();
    if (!token) return false;

    try {
      // Decodificar a parte do payload do JWT (sem verificar assinatura)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // exp está em segundos, converter para ms
      const currentTime = Date.now();
      const thresholdTime = minutesThreshold * 60 * 1000; // converter minutos para ms

      return (expirationTime - currentTime) < thresholdTime;
    } catch (error) {
      console.warn('Erro ao decodificar token:', error);
      return false;
    }
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