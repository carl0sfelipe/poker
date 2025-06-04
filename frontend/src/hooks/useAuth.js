import { useState, useEffect } from 'react';
import authService from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState(authService.getUser());

  useEffect(() => {
    const check = () => setUser(authService.getUser());
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  return { user };
};
