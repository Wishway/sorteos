import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Ticket, Trophy, LogOut, Home, Key, Calendar as CalendarIcon, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UsuarioDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState('todos');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchMisBoletos();
  }, [user]);

  const fetchMisBoletos = async () => {
    try {
      const response = await axios.get(`${API}/boletos/mis-boletos`, { withCredentials: true });
      setBoletos(response.data);
    } catch (error) {
      console.error('Error al cargar boletos:', error);
      toast.error('Error al cargar tus boletos');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const boletosActivos = boletos.filter(b => b.estado === 'activo' || b.estado === 'ganador');
  const boletosGanadores = boletos.filter(b => b.estado === 'ganador' || b.etapa_ganada !== null);
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordNueva !== passwordConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (passwordNueva.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      await axios.put(
        `${API}/auth/cambiar-password?password_actual=${passwordActual}&password_nueva=${passwordNueva}`,
        {},
        { withCredentials: true }
      );
      toast.success('Contraseña cambiada exitosamente');
      setShowChangePassword(false);
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };
  
  const filtrarBoletosPorFecha = (boletosList) => {
    if (filtroFecha === 'todos') return boletosList;
    
    const ahora = new Date();
    const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
    const hace90Dias = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    return boletosList.filter(b => {
      const fecha = new Date(b.fecha_compra);
      if (filtroFecha === '30dias') return fecha >= hace30Dias;
      if (filtroFecha === '90dias') return fecha >= hace90Dias;
      return true;
    });
  };

  return (
    <div className="min-h-screen gradient-background">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mi Panel</h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="change-password-btn">
                    <Key className="w-4 h-4 mr-2" />
                    Cambiar Contraseña
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cambiar Contraseña</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <Label htmlFor="password-actual">Contraseña Actual</Label>
                      <Input
                        id="password-actual"
                        type="password"
                        value={passwordActual}
                        onChange={(e) => setPasswordActual(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password-nueva">Nueva Contraseña</Label>
                      <Input
                        id="password-nueva"
                        type="password"
                        value={passwordNueva}
                        onChange={(e) => setPasswordNueva(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password-confirm">Confirmar Nueva Contraseña</Label>
                      <Input
                        id="password-confirm"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={changingPassword}>
                        {changingPassword ? 'Guardando...' : 'Cambiar Contraseña'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate('/usuario/perfil')} data-testid="perfil-btn">
                <User className="w-4 h-4 mr-2" />
                Mi Perfil
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} data-testid="home-btn">
                <Home className="w-4 h-4 mr-2" />
                Inicio
              </Button>
              <Button variant="outline" onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mensaje especial si ganó */}
        {boletosGanadores.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Trophy className="w-16 h-16 text-yellow-600 flex-shrink-0" />
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    🎉 ¡Felicidades! Tu boleto fue ganador
                  </h2>
                  <p className="text-lg text-gray-700">
                    Has ganado {boletosGanadores.length} premio(s). Revisa la sección "Premios Ganados" para más detalles.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Boletos</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boletos.length}</div>
            </CardContent>
          </Card>

          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boletos Activos</CardTitle>
              <Ticket className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boletosActivos.length}</div>
            </CardContent>
          </Card>

          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premios Ganados</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boletosGanadores.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="activos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activos" data-testid="tab-activos">Boletos Activos</TabsTrigger>
            <TabsTrigger value="ganadores" data-testid="tab-ganadores">Premios Ganados</TabsTrigger>
            <TabsTrigger value="historial" data-testid="tab-historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="activos" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : boletosActivos.length === 0 ? (
              <Card className="p-12 text-center">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No tienes boletos activos</h3>
                <p className="text-gray-600 mb-4">Comienza a participar en los sorteos disponibles</p>
                <Button onClick={() => navigate('/')}>Ver Sorteos</Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {boletosActivos.map((boleto) => (
                  <Card key={boleto.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge>Boleto #{boleto.numero_boleto}</Badge>
                            <Badge variant={boleto.pago_confirmado ? 'default' : 'secondary'}>
                              {boleto.pago_confirmado ? 'Confirmado' : 'Pendiente'}
                            </Badge>
                          </div>
                          
                          {boleto.sorteo && (
                            <div className="mb-2">
                              <p className="font-semibold text-lg">{boleto.sorteo.titulo}</p>
                              <p className="text-xs text-gray-500">Código: {boleto.sorteo.landing_slug}</p>
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-600 mb-1">
                            Método: {boleto.metodo_pago}
                          </p>
                          <p className="text-sm text-gray-600">
                            Comprado: {formatDateTime(boleto.fecha_compra)}
                          </p>
                          
                          {boleto.numero_comprobante && (
                            <p className="text-sm text-green-700 mt-2 font-semibold">
                              Comprobante: {boleto.numero_comprobante}
                            </p>
                          )}
                          
                          {boleto.etapas_participantes.length > 0 && (
                            <p className="text-sm text-gray-600 mt-2">
                              Participa en {boleto.etapas_participantes.length} etapa(s)
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(boleto.precio_pagado)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ganadores" className="space-y-4">
            {boletosGanadores.length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Aún no has ganado premios</h3>
                <p className="text-gray-600">¡Sigue participando y buena suerte!</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {boletosGanadores.map((boleto) => (
                  <Card key={boleto.id} className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Trophy className="w-12 h-12 text-yellow-600 flex-shrink-0" />
                        <div className="flex-1">
                          <Badge className="mb-2 bg-yellow-600">¡Ganador!</Badge>
                          <p className="font-bold text-lg mb-1">Boleto #{boleto.numero_boleto}</p>
                          {boleto.etapa_ganada && (
                            <p className="text-sm text-gray-700">Premio de Etapa {boleto.etapa_ganada}</p>
                          )}
                          <p className="text-sm text-gray-600 mt-2">
                            {formatCurrency(boleto.precio_pagado)} - {formatDate(boleto.fecha_compra)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historial" className="space-y-4">
            {/* Filtro por fechas */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={filtroFecha === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroFecha('todos')}
              >
                Todos
              </Button>
              <Button
                variant={filtroFecha === '30dias' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroFecha('30dias')}
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Últimos 30 días
              </Button>
              <Button
                variant={filtroFecha === '90dias' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroFecha('90dias')}
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Últimos 90 días
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : boletos.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">No tienes historial de participaciones</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filtrarBoletosPorFecha(boletos).map((boleto) => (
                  <Card key={boleto.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>Boleto #{boleto.numero_boleto}</Badge>
                            <Badge variant={
                              boleto.estado === 'ganador' ? 'default' : 
                              boleto.estado === 'activo' ? 'secondary' : 
                              'outline'
                            }>
                              {boleto.estado}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(boleto.fecha_compra)} - {boleto.metodo_pago}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatCurrency(boleto.precio_pagado)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UsuarioDashboard;
