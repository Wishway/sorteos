import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RegistroVendedor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cedula: '',
    celular: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    
    try {
      // Registrar como vendedor
      const response = await axios.post(`${API}/auth/registro-vendedor`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        cedula: formData.cedula,
        celular: formData.celular
      }, { withCredentials: true });

      toast.success('¡Registro exitoso! Bienvenido como vendedor');
      
      // Redirigir al dashboard de vendedor
      setTimeout(() => {
        navigate('/vendedor-dashboard');
      }, 1000);
      
    } catch (error) {
      console.error('Error en registro:', error);
      toast.error(error.response?.data?.detail || 'Error al registrarse como vendedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Button 
          onClick={() => navigate('/')} 
          variant="outline" 
          className="mb-6 bg-white/10 text-white hover:bg-white/20 border-white/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Inicio
        </Button>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-center text-white text-3xl flex items-center justify-center gap-2">
              <UserPlus className="w-8 h-8" />
              Conviértete en Vendedor
            </CardTitle>
            <p className="text-center text-purple-200 mt-2">
              Gana comisiones vendiendo sorteos de WishWay
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-white">Nombre Completo</Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <Label className="text-white">Cédula</Label>
                <Input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChange}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Ej: 1234567890"
                />
              </div>

              <div>
                <Label className="text-white">Celular</Label>
                <Input
                  type="tel"
                  name="celular"
                  value={formData.celular}
                  onChange={handleChange}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Ej: 0999999999"
                />
              </div>

              <div>
                <Label className="text-white">Correo Electrónico</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <Label className="text-white">Contraseña</Label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <Label className="text-white">Confirmar Contraseña</Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  placeholder="Confirma tu contraseña"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
              >
                {loading ? 'Registrando...' : 'Registrarme como Vendedor'}
              </Button>

              <p className="text-center text-purple-200 text-sm mt-4">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-white font-semibold hover:underline">
                  Inicia Sesión
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
        
        <Card className="mt-6 bg-white/5 backdrop-blur-lg border-white/20">
          <CardContent className="p-6">
            <h3 className="text-white font-bold text-lg mb-3">Beneficios de ser vendedor:</h3>
            <ul className="text-purple-200 space-y-2">
              <li>✅ Gana comisiones por cada venta realizada</li>
              <li>✅ Link único personalizado para compartir</li>
              <li>✅ Panel de control con estadísticas</li>
              <li>✅ Retiros automáticos a tu cuenta bancaria</li>
              <li>✅ Sin límite de ganancias</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegistroVendedor;
