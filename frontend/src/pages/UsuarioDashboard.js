import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Ticket, Trophy, LogOut, Home, Key, Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, Eye, Layers } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UsuarioDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Summary view state
  const [resumen, setResumen] = useState([]);
  const [loadingResumen, setLoadingResumen] = useState(true);

  // Detail view state (per-sorteo paginated)
  const [sorteoDetalle, setSorteoDetalle] = useState(null); // which sorteo is expanded
  const [boletosDetalle, setBoletosDetalle] = useState([]);
  const [detalleInfo, setDetalleInfo] = useState({ total: 0, page: 1, total_pages: 1, sorteo: null });
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Premios state
  const [premiosGanados, setPremiosGanados] = useState([]);
  const [loadingPremios, setLoadingPremios] = useState(false);

  // Password change
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const tabInicial = searchParams.get('tab') === 'boletos' ? 'sorteos' : 'sorteos';
  const [activeTab, setActiveTab] = useState(tabInicial);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchResumen();
    fetchMisPremios();
  }, [user]);

  const fetchResumen = async () => {
    setLoadingResumen(true);
    try {
      const response = await axios.get(`${API}/boletos/mis-boletos/resumen`, { withCredentials: true });
      setResumen(response.data);
    } catch (error) {
      console.error('Error al cargar resumen:', error);
      toast.error('Error al cargar resumen de boletos');
    } finally {
      setLoadingResumen(false);
    }
  };

  const fetchBoletosDetalle = useCallback(async (sorteoId, page = 1, estado = 'todos') => {
    setLoadingDetalle(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, estado });
      const response = await axios.get(
        `${API}/boletos/mis-boletos/sorteo/${sorteoId}?${params}`,
        { withCredentials: true }
      );
      setBoletosDetalle(response.data.boletos);
      setDetalleInfo({
        total: response.data.total,
        page: response.data.page,
        total_pages: response.data.total_pages,
        sorteo: response.data.sorteo
      });
    } catch (error) {
      console.error('Error al cargar boletos:', error);
      toast.error('Error al cargar boletos del sorteo');
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  const fetchMisPremios = async () => {
    setLoadingPremios(true);
    try {
      const response = await axios.get(`${API}/usuario/mis-premios`, { withCredentials: true });
      setPremiosGanados(response.data);
    } catch (error) {
      console.error('Error al cargar premios ganados:', error);
    } finally {
      setLoadingPremios(false);
    }
  };

  const handleVerBoletos = (sorteoId) => {
    setSorteoDetalle(sorteoId);
    setFiltroEstado('todos');
    fetchBoletosDetalle(sorteoId, 1, 'todos');
  };

  const handleVolverResumen = () => {
    setSorteoDetalle(null);
    setBoletosDetalle([]);
    setDetalleInfo({ total: 0, page: 1, total_pages: 1, sorteo: null });
  };

  const handlePageChange = (newPage) => {
    fetchBoletosDetalle(sorteoDetalle, newPage, filtroEstado);
  };

  const handleEstadoChange = (nuevoEstado) => {
    setFiltroEstado(nuevoEstado);
    fetchBoletosDetalle(sorteoDetalle, 1, nuevoEstado);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordNueva !== passwordConfirm) {
      toast.error('Las contrasenas no coinciden');
      return;
    }
    if (passwordNueva.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.put(
        `${API}/auth/cambiar-password?password_actual=${passwordActual}&password_nueva=${passwordNueva}`,
        {},
        { withCredentials: true }
      );
      toast.success('Contrasena cambiada exitosamente');
      setShowChangePassword(false);
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contrasena');
    } finally {
      setChangingPassword(false);
    }
  };

  // Calculate totals from resumen
  const totalBoletos = resumen.reduce((sum, r) => sum + r.total, 0);
  const totalActivos = resumen.reduce((sum, r) => sum + r.activos, 0);
  const totalPendientes = resumen.reduce((sum, r) => sum + r.pendientes, 0);

  return (
    <div className="min-h-screen gradient-background">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Mi Panel</h1>
                <p className="text-sm text-gray-600 truncate max-w-[200px] md:max-w-none">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="change-password-btn" className="flex-1 md:flex-none">
                    <Key className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Cambiar Contrasena</span>
                    <span className="sm:hidden">Contrasena</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cambiar Contrasena</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <Label htmlFor="password-actual">Contrasena Actual</Label>
                      <Input id="password-actual" type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="password-nueva">Nueva Contrasena</Label>
                      <Input id="password-nueva" type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="password-confirm">Confirmar Nueva Contrasena</Label>
                      <Input id="password-confirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>Cancelar</Button>
                      <Button type="submit" disabled={changingPassword}>{changingPassword ? 'Guardando...' : 'Cambiar Contrasena'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate('/usuario/perfil')} data-testid="perfil-btn" className="flex-1 md:flex-none">
                <User className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Mi Perfil</span>
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} data-testid="home-btn" className="flex-1 md:flex-none">
                <Home className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Inicio</span>
              </Button>
              <Button variant="outline" onClick={handleLogout} data-testid="logout-btn" className="flex-1 md:flex-none">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Winner banner */}
        {!loadingPremios && premiosGanados.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400" data-testid="winner-banner">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Trophy className="w-16 h-16 text-yellow-600 flex-shrink-0" />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Felicidades! {premiosGanados.length === 1 ? 'Has ganado un premio' : 'Tienes premios ganados'}
                  </h2>
                  <p className="text-base sm:text-lg text-gray-700">
                    Has ganado {premiosGanados.length} premio{premiosGanados.length !== 1 ? 's' : ''}. Revisa la seccion "Premios Ganados" para mas detalles.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card data-testid="stat-total-boletos">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Boletos</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBoletos}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-activos">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Boletos Activos</CardTitle>
              <Ticket className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActivos}</div>
            </CardContent>
          </Card>
          <Card data-testid="stat-premios">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="sorteos" data-testid="tab-sorteos" className="text-xs sm:text-sm py-2">
              <Layers className="w-4 h-4 mr-1" />
              Mis Sorteos
            </TabsTrigger>
            <TabsTrigger value="premios" data-testid="tab-premios" className="text-xs sm:text-sm py-2">
              <Trophy className="w-4 h-4 mr-1" />
              Premios Ganados
            </TabsTrigger>
          </TabsList>

          {/* TAB: MIS SORTEOS */}
          <TabsContent value="sorteos" className="space-y-4">
            {loadingResumen ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-600">Cargando tus sorteos...</p>
              </div>
            ) : sorteoDetalle ? (
              /* DETAIL VIEW - Paginated tickets for a specific sorteo */
              <DetailView
                detalleInfo={detalleInfo}
                boletosDetalle={boletosDetalle}
                loadingDetalle={loadingDetalle}
                filtroEstado={filtroEstado}
                onVolverResumen={handleVolverResumen}
                onPageChange={handlePageChange}
                onEstadoChange={handleEstadoChange}
              />
            ) : resumen.length === 0 ? (
              <Card className="p-12 text-center" data-testid="no-sorteos-message">
                <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No tienes boletos aun</h3>
                <p className="text-gray-600 mb-4">Participa en los sorteos disponibles</p>
                <Button onClick={() => navigate('/')} data-testid="ver-sorteos-btn">Ver Sorteos</Button>
              </Card>
            ) : (
              /* SUMMARY VIEW - Cards grouped by raffle */
              <div className="grid gap-4" data-testid="resumen-sorteos">
                {resumen.map((item) => (
                  <Card key={item.sorteo_id} className="hover:shadow-md transition-shadow" data-testid={`sorteo-card-${item.sorteo_id}`}>
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">{item.sorteo_titulo}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="outline" data-testid={`badge-estado-${item.sorteo_id}`}>
                              {item.sorteo_estado === 'published' ? 'Publicado' :
                               item.sorteo_estado === 'waiting' ? 'En espera' :
                               item.sorteo_estado === 'live' ? 'EN VIVO' :
                               item.sorteo_estado === 'completed' ? 'Completado' :
                               item.sorteo_estado}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800" data-testid={`badge-total-${item.sorteo_id}`}>
                              {item.total} boleto{item.total !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                              Activos: {item.activos}
                            </span>
                            {item.pendientes > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                                Pendientes: {item.pendientes}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleVerBoletos(item.sorteo_id)}
                          data-testid={`ver-boletos-btn-${item.sorteo_id}`}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver boletos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: PREMIOS GANADOS */}
          <TabsContent value="premios" className="space-y-4">
            {loadingPremios ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-600">Cargando premios ganados...</p>
              </div>
            ) : premiosGanados.length === 0 ? (
              <Card className="p-12 text-center" data-testid="no-premios-message">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Aun no has ganado premios</h3>
                <p className="text-gray-600">Sigue participando y buena suerte!</p>
              </Card>
            ) : (
              <div className="grid gap-4" data-testid="premios-list">
                {premiosGanados.map((premio, index) => (
                  <Card key={premio.id || index} className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
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
                          <Badge className="mb-2 bg-yellow-600">Ganador!</Badge>
                          <h3 className="font-bold text-lg mb-1">{premio.sorteo?.titulo || 'Sorteo'}</h3>
                          <div className="mb-2">
                            <p className="text-sm font-semibold text-yellow-700">Premio:</p>
                            <p className="font-bold">{premio.premio?.nombre || 'Premio Principal'}</p>
                            {premio.premio?.etapa_numero && (
                              <Badge variant="outline" className="mt-1">Etapa {premio.premio.etapa_numero}</Badge>
                            )}
                          </div>
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
                          {premio.sorteo?.landing_slug && (
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(`/sorteo/${premio.sorteo.landing_slug}`)}>
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
        </Tabs>
      </div>
    </div>
  );
};

/* ---- Detail View Component ---- */
const DetailView = ({ detalleInfo, boletosDetalle, loadingDetalle, filtroEstado, onVolverResumen, onPageChange, onEstadoChange }) => {
  return (
    <div className="space-y-4" data-testid="detalle-view">
      {/* Back button + Title */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onVolverResumen} data-testid="volver-resumen-btn">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver
        </Button>
        <div>
          <h2 className="text-lg font-bold">{detalleInfo.sorteo?.titulo || 'Sorteo'}</h2>
          <p className="text-sm text-gray-500">{detalleInfo.total} boleto{detalleInfo.total !== 1 ? 's' : ''} en total</p>
        </div>
      </div>

      {/* Estado filter */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'activos', 'pendientes'].map((estado) => (
          <Button
            key={estado}
            variant={filtroEstado === estado ? 'default' : 'outline'}
            size="sm"
            onClick={() => onEstadoChange(estado)}
            data-testid={`filtro-${estado}-btn`}
          >
            {estado === 'todos' ? 'Todos' : estado === 'activos' ? 'Activos' : 'Pendientes'}
          </Button>
        ))}
      </div>

      {/* Tickets list */}
      {loadingDetalle ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : boletosDetalle.length === 0 ? (
        <Card className="p-8 text-center" data-testid="no-boletos-detalle">
          <Ticket className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">No hay boletos con este filtro</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3" data-testid="boletos-list">
            {boletosDetalle.map((boleto) => (
              <Card key={boleto.id} className={`${boleto.pago_confirmado ? '' : 'border-yellow-300 bg-yellow-50/50'}`} data-testid={`boleto-card-${boleto.numero_boleto}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge data-testid={`boleto-numero-${boleto.numero_boleto}`}>#{boleto.numero_boleto}</Badge>
                      <Badge variant={boleto.pago_confirmado ? 'default' : 'secondary'} className={boleto.pago_confirmado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {boleto.pago_confirmado ? 'Activo' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p className="font-semibold">{formatCurrency(boleto.precio_pagado)}</p>
                      <p className="text-xs">{formatDateTime(boleto.fecha_compra)}</p>
                    </div>
                  </div>
                  {boleto.numero_comprobante && (
                    <p className="text-xs text-green-700 mt-2">Comprobante: {boleto.numero_comprobante}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {detalleInfo.total_pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6" data-testid="pagination-controls">
              <Button
                variant="outline"
                size="sm"
                disabled={detalleInfo.page <= 1}
                onClick={() => onPageChange(detalleInfo.page - 1)}
                data-testid="prev-page-btn"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600" data-testid="page-indicator">
                Pagina {detalleInfo.page} de {detalleInfo.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={detalleInfo.page >= detalleInfo.total_pages}
                onClick={() => onPageChange(detalleInfo.page + 1)}
                data-testid="next-page-btn"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsuarioDashboard;
