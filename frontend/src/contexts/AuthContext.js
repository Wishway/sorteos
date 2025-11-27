import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AuthContext = createContext();

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
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    if (isMounted.current) {
      setUser(response.data);
    }
    return response.data;
  };

  const register = async (email, password, name, cedula, celular) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, cedula, celular });
    return response.data;
  };

  const logout = async () => {
    try {
      // Hacer la llamada de logout al backend
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Solo actualizar estado si el componente sigue montado
      if (isMounted.current) {
        setUser(null);
      }
      
      // Limpiar localStorage independientemente
      try {
        localStorage.removeItem('vendedor_id');
      } catch (e) {
        // Ignorar errores de localStorage
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
