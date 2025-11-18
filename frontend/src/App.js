import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import '@/App.css';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import CompletarDatos from '@/pages/CompletarDatos';
import SorteoLanding from '@/pages/SorteoLanding';
import UsuarioDashboard from '@/pages/UsuarioDashboard';
import VendedorDashboard from '@/pages/VendedorDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/sorteo/:slug" element={<SorteoLanding />} />
            <Route path="/usuario" element={<UsuarioDashboard />} />
            <Route path="/vendedor" element={<VendedorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
