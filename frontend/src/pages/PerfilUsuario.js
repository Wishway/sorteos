import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Home, ArrowLeft, User, Mail, CreditCard, Phone } from 'lucide-react';

const PerfilUsuario = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen gradient-background">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Mi Perfil</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/usuario')} data-testid="back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                <Home className="w-4 h-4 mr-2" />
                Inicio
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="sorteo-card">
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Nombre Completo</p>
                  <p className="text-lg font-semibold">{user.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Correo Electrónico</p>
                  <p className="text-lg font-semibold">{user.email}</p>
                </div>
              </div>

              {user.cedula && (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-100">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Número de Cédula</p>
                    <p className="text-lg font-semibold">{user.cedula}</p>
                  </div>
                </div>
              )}

              {user.celular && (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <Phone className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Número de Celular</p>
                    <p className="text-lg font-semibold">{user.celular}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Rol</p>
                  <p className="text-lg font-semibold capitalize">{user.role}</p>
                </div>
              </div>

              {!user.datos_completos && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Tu perfil está incompleto. Por favor completa tus datos para poder comprar boletos.
                  </p>
                  <Button 
                    className="mt-2" 
                    size="sm"
                    onClick={() => navigate('/completar-datos')}
                  >
                    Completar Datos
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerfilUsuario;
