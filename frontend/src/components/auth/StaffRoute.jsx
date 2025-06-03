import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../../services/authService';

const StaffRoute = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  if (!authService.isStaff()) {
    return <Navigate to="/tournaments" />;
  }

  return children;
};

export default StaffRoute; 