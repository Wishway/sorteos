import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    setUser(response.data);
    return response.data;
  };

  const register = async (email, password, name, cedula, celular) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, cedula, celular });
    return response.data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    setUser(null);
  };

  const handleGoogleCallback = async () => {
    const hash = window.location.hash;
    if (hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1].split('&')[0];
      
      try {
        const response = await axios.get(`${API}/auth/session-data`, {
          headers: { 'X-Session-ID': sessionId },
          withCredentials: true
        });
        
        setUser(response.data);
        window.history.replaceState(null, '', window.location.pathname);
        return response.data;
      } catch (error) {
        console.error('Error en callback de Google:', error);
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, handleGoogleCallback }}>
      {children}
    </AuthContext.Provider>
  );
};
