import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import '@/App.css';
import referralService from '@/services/referralService';
import websocketService from '@/services/websocket';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/LoginNew';
import Register from '@/pages/Register';
import RegistroVendedor from '@/pages/RegistroVendedor';
import CompletarDatos from '@/pages/CompletarDatos';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import SorteoLanding from '@/pages/SorteoLanding';
import UsuarioDashboard from '@/pages/UsuarioDashboard';
import VendedorDashboard from '@/pages/VendedorDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import PerfilUsuario from '@/pages/PerfilUsuario';
import PerfilAdmin from '@/pages/PerfilAdmin';

function App() {
  // Inicializar WebSocket y detectar vendedor desde URL al cargar la aplicación
  useEffect(() => {
    referralService.checkAndSaveFromURL();
    
    // Conectar WebSocket globalmente al iniciar la app
    websocketService.connect();
    
    return () => {
      websocketService.disconnect();
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/registro-vendedor" element={<RegistroVendedor />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/completar-datos" element={<CompletarDatos />} />
            <Route path="/sorteo/:slug" element={<SorteoLanding />} />
            <Route path="/usuario" element={<UsuarioDashboard />} />
            <Route path="/usuario/perfil" element={<PerfilUsuario />} />
            <Route path="/vendedor" element={<VendedorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/perfil" element={<PerfilAdmin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
