import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AuthContext = createContext();

// Session token storage key
const SESSION_TOKEN_KEY = 'ww_session_token';

// Configure axios interceptor to always send session token as Bearer header (fallback for mobile)
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    checkAuth();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      if (isMounted.current) {
        setUser(response.data);
      }
    } catch (error) {
      if (isMounted.current) {
        setUser(null);
        // Clear stale token if auth check fails
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    const data = response.data;
    
    // Store session token in localStorage as fallback for mobile browsers that block cookies
    if (data.session_token) {
      localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
    }
    
    if (isMounted.current) {
      setUser(data);
    }
    return data;
  };

  const register = async (email, password, name, cedula, celular) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, cedula, celular });
    return response.data;
  };

  const handleGoogleCallback = async () => {
    try {
      const hash = window.location.hash;
      const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');
      
      if (!sessionId) {
        throw new Error('No session ID found');
      }

      const response = await axios.post(
        `${API}/auth/google/callback`,
        { session_id: sessionId },
        { withCredentials: true }
      );

      const data = response.data;
      
      // Store session token as fallback
      if (data.session_token) {
        localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
      }

      if (isMounted.current) {
        setUser(data);
      }
      
      // Limpiar el hash de la URL
      window.history.replaceState(null, '', window.location.pathname);
      
      return data;
    } catch (error) {
      console.error('Error en Google callback:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
    } finally {
      // Clear session token from localStorage
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem('vendedor_id');
      
      if (isMounted.current) {
        setUser(null);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, checkAuth, handleGoogleCallback }}>
      {children}
    </AuthContext.Provider>
  );
};
