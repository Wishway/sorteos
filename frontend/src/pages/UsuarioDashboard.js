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
  const [filtroSorteo, setFiltroSorteo] = useState('todos');
  const [filtroNumeroBoleto, setFiltroNumeroBoleto] = useState('');
  const [sorteos, setSorteos] = useState([]);
  const [premiosGanados, setPremiosGanados] = useState([]);
  const [loadingPremios, setLoadingPremios] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchMisBoletos();
    fetchMisPremios();
  }, [user]);

  const fetchMisBoletos = async () => {
    try {
      const response = await axios.get(`${API}/boletos/mis-boletos`, { withCredentials: true });
      // Ordenar por fecha de compra descendente (más recientes primero)
      const boletosOrdenados = response.data.sort((a, b) => 
        new Date(b.fecha_compra) - new Date(a.fecha_compra)
      );
      setBoletos(boletosOrdenados);
      
      // Extraer sorteos únicos
      const sorteosUnicos = [...new Set(boletosOrdenados.map(b => b.sorteo_titulo))];
      setSorteos(sorteosUnicos);
    } catch (error) {
      console.error('Error al cargar boletos:', error);
      toast.error('Error al cargar tus boletos');
    } finally {
      setLoading(false);
    }
  };

  const fetchMisPremios = async () => {
    setLoadingPremios(true);
    try {
      const response = await axios.get(`${API}/usuario/mis-premios`, { withCredentials: true });
      setPremiosGanados(response.data);
    } catch (error) {
      console.error('Error al cargar premios ganados:', error);
      // No mostrar toast error si no hay premios
    } finally {
      setLoadingPremios(false);
    }
  };
  
  const boletosFiltrados = () => {
    let resultado = [...boletos];
    
    // Filtrar por sorteo
    if (filtroSorteo !== 'todos') {
      resultado = resultado.filter(b => b.sorteo_titulo === filtroSorteo);
    }
    
    // Filtrar por número de boleto
    if (filtroNumeroBoleto) {
      const numero = parseInt(filtroNumeroBoleto);
      resultado = resultado.filter(b => b.numero_boleto === numero);
    }
    
    // Filtrar por fecha (ya existe en el código original)
    const ahora = new Date();
    if (filtroFecha === '7dias') {
      const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      resultado = resultado.filter(b => new Date(b.fecha_compra) >= hace7Dias);
    } else if (filtroFecha === '30dias') {
      const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
      resultado = resultado.filter(b => new Date(b.fecha_compra) >= hace30Dias);
    }
    
    return resultado;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const boletosFiltradosData = boletosFiltrados();
  const boletosActivos = boletosFiltradosData.filter(b => b.estado === 'activo' || b.estado === 'ganador');
  const boletosGanadores = boletosFiltradosData.filter(b => b.estado === 'ganador' || b.etapa_ganada !== null);
  
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
              <div className="text-2xl font-bold">{loadingPremios ? '...' : premiosGanados.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {/* Filtros */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por sorteo */}
              <div>
                <Label htmlFor="filtro-sorteo">Sorteo</Label>
                <select
                  id="filtro-sorteo"
                  value={filtroSorteo}
                  onChange={(e) => setFiltroSorteo(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="todos">Todos los sorteos</option>
                  {sorteos.map((sorteo, idx) => (
                    <option key={idx} value={sorteo}>{sorteo}</option>
                  ))}
                </select>
              </div>
              
              {/* Filtro por número de boleto */}
              <div>
                <Label htmlFor="filtro-numero">Número de Boleto</Label>
                <Input
                  id="filtro-numero"
                  type="number"
                  placeholder="Ej: 123"
                  value={filtroNumeroBoleto}
                  onChange={(e) => setFiltroNumeroBoleto(e.target.value)}
                />
              </div>
              
              {/* Filtro por fecha */}
              <div>
                <Label htmlFor="filtro-fecha">Fecha</Label>
                <select
                  id="filtro-fecha"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="todos">Todas las fechas</option>
                  <option value="7dias">Últimos 7 días</option>
                  <option value="30dias">Últimos 30 días</option>
                </select>
              </div>
            </div>
            
            {/* Botón para limpiar filtros */}
            {(filtroSorteo !== 'todos' || filtroNumeroBoleto || filtroFecha !== 'todos') && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setFiltroSorteo('todos');
                  setFiltroNumeroBoleto('');
                  setFiltroFecha('todos');
                }}
              >
                Limpiar Filtros
              </Button>
            )}
          </CardContent>
        </Card>

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
            {loadingPremios ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-600">Cargando premios ganados...</p>
              </div>
            ) : premiosGanados.length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Aún no has ganado premios</h3>
                <p className="text-gray-600">¡Sigue participando y buena suerte!</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {premiosGanados.map((premio, index) => (
                  <Card key={premio.id || index} className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Imagen del premio o sorteo */}
                        {(premio.premio?.imagen || premio.sorteo?.imagenes?.[0]) ? (
                          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <img 
                              src={premio.premio?.imagen || premio.sorteo.imagenes[0]} 
                              alt={premio.premio?.nombre || 'Premio'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <Trophy className="w-24 h-24 text-yellow-600 flex-shrink-0 p-4 bg-white rounded-lg" />
                        )}
                        
                        <div className="flex-1">
                          <Badge className="mb-2 bg-yellow-600">¡Ganador!</Badge>
                          
                          {/* Nombre del sorteo */}
                          <h3 className="font-bold text-lg mb-1">{premio.sorteo?.titulo || 'Sorteo'}</h3>
                          
                          {/* Premio ganado */}
                          <div className="mb-2">
                            <p className="text-sm font-semibold text-yellow-700">Premio:</p>
                            <p className="font-bold text-md">{premio.premio?.nombre || 'Premio Principal'}</p>
                            {premio.premio?.etapa_numero && (
                              <Badge variant="outline" className="mt-1">Etapa {premio.premio.etapa_numero}</Badge>
                            )}
                          </div>
                          
                          {/* Información del boleto */}
                          <div className="flex items-center gap-3 text-sm text-gray-700 mt-3">
                            <div className="flex items-center gap-1">
                              <Ticket className="w-4 h-4" />
                              <span>Boleto #{premio.numero_boleto}</span>
                            </div>
                            {premio.fecha_sorteo && (
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>{formatDate(premio.fecha_sorteo)}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Botón para ver sorteo */}
                          {premio.sorteo?.landing_slug && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3"
                              onClick={() => navigate(`/sorteo/${premio.sorteo.landing_slug}`)}
                            >
                              Ver Sorteo
                            </Button>
                          )}
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
                          
                          {boleto.sorteo && (
                            <p className="font-semibold text-gray-900 mb-1">{boleto.sorteo.titulo}</p>
                          )}
                          
                          <p className="text-sm text-gray-600">
                            {formatDateTime(boleto.fecha_compra)} - {boleto.metodo_pago}
                          </p>
                          
                          {boleto.numero_comprobante && (
                            <p className="text-xs text-green-700 mt-1">
                              Comp: {boleto.numero_comprobante}
                            </p>
                          )}
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
