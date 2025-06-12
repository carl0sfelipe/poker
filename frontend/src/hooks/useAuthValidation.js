import { useEffect, useRef } from 'react';
import authService from '../services/authService';

// Hook para validar token periodicamente
export const useAuthValidation = (intervalMinutes = 5) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    // Só executar se o usuário estiver logado
    if (!authService.isAuthenticated()) {
      return;
    }

    // Função para validar token
    const validateAuth = async () => {
      if (!authService.isAuthenticated()) {
        return;
      }

      // Verificar se token está próximo do vencimento
      if (authService.isTokenExpiringSoon(10)) { // 10 minutos antes de expirar
        console.warn('Token expirando em breve, fazendo logout preventivo');
        authService.forceLogout('Sua sessão está expirando. Por favor, faça login novamente.');
        return;
      }

      // Validar token no servidor
      await authService.validateToken();
    };

    // Validar token imediatamente
    validateAuth();

    // Configurar validação periódica
    intervalRef.current = setInterval(() => {
      validateAuth();
    }, intervalMinutes * 60 * 1000); // Converter minutos para milissegundos

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes]);

  // Limpar interval quando componente desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};

export default useAuthValidation;
