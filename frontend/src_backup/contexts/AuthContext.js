import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      
      try {
        setCurrentUser(user);
        if (user) {
          try {
            const role = await authService.getUserRole(user.uid);
            if (mounted) setUserRole(role);
          } catch (error) {
            console.error("Erreur lors de la récupération du rôle:", error);
            if (mounted) setUserRole(null);
          }
        } else {
          if (mounted) setUserRole(null);
        }
      } catch (error) {
        console.error("Erreur d'authentification:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    return await authService.login(email, password);
  };

  const register = async (email, password, role, userData) => {
    return await authService.register(email, password, role, userData);
  };

  const logout = async () => {
    return await authService.logout();
  };

  const resetPassword = async (email) => {
    return await authService.resetPassword(email);
  };

  const value = {
    currentUser,
    userRole,
    login,
    register,
    logout,
    resetPassword,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
