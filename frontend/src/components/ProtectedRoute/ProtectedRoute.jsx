import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedTypes }) => {
  const { currentUser, userType, loading } = useAuth();

  console.log('ProtectedRoute - Current User:', currentUser);
  console.log('ProtectedRoute - User Type:', userType);
  console.log('ProtectedRoute - Allowed Types:', allowedTypes);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!currentUser) {
    console.log('ProtectedRoute - No user, redirecting to login');
    return <Navigate to="/login" />;
  }

  if (allowedTypes && !allowedTypes.includes(userType)) {
    console.log('ProtectedRoute - Unauthorized user type, redirecting to appropriate dashboard');
    // Rediriger vers le dashboard approprié en fonction du type d'utilisateur
    switch (userType) {
      case 'admin':
        return <Navigate to="/dashboard/admin" />;
      case 'professionnel':
        return <Navigate to="/dashboard/pro" />;
      case 'particulier':
        return <Navigate to="/dashboard" />;
      default:
        return <Navigate to="/login" />;
    }
  }

  return children;
};

export default ProtectedRoute;
