import { useState, useEffect } from 'react';
import authService from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState(authService.getUser());

  useEffect(() => {
    const update = () => setUser(authService.getUser());
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  return { user };
};
