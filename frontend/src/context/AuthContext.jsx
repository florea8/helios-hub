/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const decodeToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.id,
        role: payload.role
      };
    } catch {
      return null;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/api/auth/profile');
      return res.data;
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      return null;
    }
  };

  // A 401 on a request that carried a token means the session is over (expired, or the account is gone).
  // Signing out sends the person to the login page instead of leaving them on pages that all fail.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 && err.config?.headers?.Authorization) {
          localStorage.removeItem('token');
          setUser(null);
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = decodeToken(token);
        if (decoded) {
          const profile = await fetchUserProfile();
          // Gone means the server rejected the token and the interceptor signed out.
          if (localStorage.getItem('token')) setUser({ token, ...decoded, ...profile });
        } else {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (token) => {
    localStorage.setItem('token', token);
    const decoded = decodeToken(token);
    const profile = await fetchUserProfile();
    if (profile) {
      setUser({ token, ...decoded, ...profile });
    } else {
      setUser(decoded ? { token, ...decoded } : { token });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    login,
    logout,
    loading,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};