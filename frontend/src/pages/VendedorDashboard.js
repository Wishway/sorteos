import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DollarSign, ShoppingCart, Link as LinkIcon, LogOut, Home, Copy, CheckCircle, Lock, Building, CreditCard, Phone, Clock, User } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const VendedorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  
  // Estados
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Estados para modales
  const [showDatosBancarios, setShowDatosBancarios] = useState(false);
  const [showEditarPerfil, setShowEditarPerfil] = useState(false);
  const [showCambiarPassword, setShowCambiarPassword] = useState(false);
  const [showSolicitarRetiro, setShowSolicitarRetiro] = useState(false);
  
  // Estados para formularios
  const [datosBancarios, setDatosBancarios] = useState({
    nombre_banco: '',
    tipo_cuenta: 'ahorro',
    numero_cuenta: ''
  });
  
  const [perfilData, setPerfilData] = useState({
    name: '',
    cedula: '',
    celular: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    actual: '',
    nueva: '',
    confirmar_password: ''
  });
  
  const [retiroData, setRetiroData] = useState({
    monto: ''
  });
  
  // Estados para movimientos
  const [movimientos, setMovimientos] = useState([]);
  const [filtroTipoMovimiento, setFiltroTipoMovimiento] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalMovimientos, setTotalMovimientos] = useState(0);

  useEffect(() => {
    isMounted.current = true;
    const abortController = new AbortController();
    
    if (!user || user.role !== 'vendedor') {
      navigate('/login');
      return;
    }
    
    const loadPerfil = async () => {
      try {
        const response = await axios.get(`${API}/vendedor/perfil`, { 
          withCredentials: true,
          signal: abortController.signal
        });
        
        if (isMounted.current) {
          setPerfil(response.data);
          
          // Prellenar datos bancarios si existen
          if (response.data.datos_bancarios_completos) {
            setDatosBancarios({
              nombre_banco: response.data.nombre_banco || '',
              tipo_cuenta: response.data.tipo_cuenta || 'ahorro',
              numero_cuenta: response.data.numero_cuenta || ''
            });
          }
          
          // Prellenar datos de perfil
          setPerfilData({
            name: response.data.name || '',
            cedula: response.data.cedula || '',
            celular: response.data.celular || ''
          });
          
          setLoading(false);
        }
      } catch (error) {
        if (error.name !== 'CanceledError' && isMounted.current) {
          console.error('Error al cargar perfil:', error);
          toast.error('Error al cargar perfil');
          setLoading(false);
        }
      }
    };
    
    loadPerfil();
    
    return () => {
      isMounted.current = false;
      abortController.abort();
    };
  }, [user, navigate]);
  
  // NO recargar automáticamente, usar botón de búsqueda

  const fetchPerfil = async () => {
    if (!isMounted.current) return;
    
    try {
      const response = await axios.get(`${API}/vendedor/perfil`, { withCredentials: true });
      if (isMounted.current) {
        setPerfil(response.data);
        
        // Prellenar datos bancarios si existen
        if (response.data.datos_bancarios_completos) {
          setDatosBancarios({
            nombre_banco: response.data.nombre_banco || '',
            tipo_cuenta: response.data.tipo_cuenta || 'ahorro',
            numero_cuenta: response.data.numero_cuenta || ''
          });
        }
        
        // Prellenar datos de perfil
        setPerfilData({
          name: response.data.name || '',
          cedula: response.data.cedula || '',
          celular: response.data.celular || ''
        });
        
        // Cargar movimientos también
        fetchMovimientos();
      }
    } catch (error) {
      // No mostrar toast aquí para evitar errores durante el unmount
      console.error('Error al cargar perfil:', error);
    }
  };
  
  const fetchMovimientos = async (page = 1) => {
    if (!isMounted.current) return;
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      
      if (filtroTipoMovimiento !== 'todos') {
        params.append('tipo', filtroTipoMovimiento);
      }
      if (fechaDesde) {
        params.append('fecha_desde', new Date(fechaDesde).toISOString());
      }
      if (fechaHasta) {
        params.append('fecha_hasta', new Date(fechaHasta).toISOString());
      }
      
      const response = await axios.get(`${API}/vendedor/movimientos?${params}`, { withCredentials: true });
      if (isMounted.current) {
        setMovimientos(response.data.movimientos);
        setTotalMovimientos(response.data.total);
        setTotalPaginas(response.data.total_pages);
        setPaginaActual(response.data.page);
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      if (isMounted.current) {
        toast.error('Error al cargar movimientos');
      }
    }
  };
  
  const handleBuscarMovimientos = () => {
    setPaginaActual(1);
    fetchMovimientos(1);
  };
  
  const handleCambiarPagina = (nuevaPagina) => {
    fetchMovimientos(nuevaPagina);
  };

  const handleLogout = async () => {
    // Cerrar todos los modales primero
    if (isMounted.current) {
      setShowDatosBancarios(false);
      setShowEditarPerfil(false);
      setShowCambiarPassword(false);
      setShowSolicitarRetiro(false);
    }
    
    try {
      // Ejecutar logout y esperar a que complete
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Navegar solo si el componente está montado
      if (isMounted.current) {
        navigate('/', { replace: true });
      }
    }
  };

  const copyLink = () => {
    if (!user || !user.id) return;
    const link = `${window.location.origin}/?vendedor=${user.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGuardarDatosBancarios = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/vendedor/datos-bancarios`, datosBancarios, { withCredentials: true });
      toast.success('Datos bancarios actualizados');
      setShowDatosBancarios(false);
      fetchPerfil();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar datos bancarios');
    }
  };
  
  const handleEditarPerfil = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/vendedor/perfil`, perfilData, { withCredentials: true });
      toast.success('Perfil actualizado correctamente');
      setShowEditarPerfil(false);
      fetchPerfil();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar perfil');
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.nueva !== passwordData.confirmar_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    try {
      await axios.put(`${API}/vendedor/cambiar-password`, {
        password_actual: passwordData.actual,
        password_nueva: passwordData.nueva
      }, { withCredentials: true });
      
      toast.success('Contraseña actualizada correctamente');
      setShowCambiarPassword(false);
      setPasswordData({ actual: '', nueva: '', confirmar_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
    }
  };

  const handleSolicitarRetiro = async (e) => {
    e.preventDefault();
    
    const monto = parseFloat(retiroData.monto);
    
    if (!monto || monto <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    
    if (monto > (perfil?.wallet_balance || 0)) {
      toast.error('Monto supera el saldo disponible');
      return;
    }
    
    try {
      await axios.post(`${API}/vendedor/solicitar-retiro`, { monto }, { withCredentials: true });
      toast.success('Solicitud de retiro enviada');
      setShowSolicitarRetiro(false);
      setRetiroData({ monto: '' });
      fetchPerfil();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al solicitar retiro');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  const linkVendedor = user?.id ? `${window.location.origin}/?vendedor=${user.id}` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Dashboard Vendedor</h1>
            <p className="text-purple-200 text-sm md:text-base">Bienvenido, {perfil?.name || user?.name}</p>
          </div>
          
          <div className="flex gap-2 md:gap-3 w-full md:w-auto">
            <Button onClick={() => navigate('/')} variant="outline" className="bg-white/10 text-white hover:bg-white/20 flex-1 md:flex-none">
              <Home className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Inicio</span>
            </Button>
            <Button onClick={handleLogout} className="bg-white/10 text-white hover:bg-white/20 flex-1 md:flex-none">
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>

        {/* Warning si no tiene datos bancarios */}
        {!perfil?.datos_bancarios_completos && (
          <Card className="mb-6 border-yellow-400 bg-yellow-50">
            <CardContent className="p-4">
              <p className="text-yellow-800 font-semibold">
                ⚠️ Debes completar tus datos bancarios para poder solicitar retiros
              </p>
            </CardContent>
          </Card>
        )}

        {/* Botones de Acciones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <Button 
            onClick={() => setShowEditarPerfil(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-sm md:text-base"
          >
            <User className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Mi Perfil</span>
          </Button>
          
          <Button 
            onClick={() => setShowDatosBancarios(true)}
            className="bg-blue-600 hover:bg-blue-700 text-sm md:text-base"
          >
            <Building className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{perfil?.datos_bancarios_completos ? 'Datos Bancarios' : 'Completar Datos'}</span>
            <span className="md:hidden">Banco</span>
          </Button>
          
          <Button 
            onClick={() => setShowCambiarPassword(true)}
            className="bg-purple-600 hover:bg-purple-700 text-sm md:text-base"
          >
            <Lock className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Cambiar Contraseña</span>
            <span className="md:hidden">Password</span>
          </Button>
          
          <Button 
            onClick={() => setShowSolicitarRetiro(true)}
            disabled={!perfil?.datos_bancarios_completos || perfil?.wallet_balance <= 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-sm md:text-base"
          >
            <CreditCard className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Solicitar Retiro</span>
            <span className="md:hidden">Retiro</span>
          </Button>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Saldo Disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-white">
                ${perfil?.wallet_balance?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Total Comisiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-white">
                ${perfil?.total_comisiones?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Tu Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={copyLink}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {copied ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Copiado!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copiar Link</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Historial de Movimientos */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Historial de Movimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <Label className="text-white mb-2">Tipo</Label>
                <Select value={filtroTipoMovimiento} onValueChange={setFiltroTipoMovimiento}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ingreso">Ingresos</SelectItem>
                    <SelectItem value="egreso">Egresos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-white mb-2">Desde</Label>
                <Input 
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label className="text-white mb-2">Hasta</Label>
                <Input 
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={handleBuscarMovimientos}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Buscar
                </Button>
              </div>
            </div>

            {/* Información de resultados */}
            {totalMovimientos > 0 && (
              <p className="text-white text-sm mb-3">
                Mostrando {movimientos.length} de {totalMovimientos} movimientos (Página {paginaActual} de {totalPaginas})
              </p>
            )}

            {/* Lista de movimientos */}
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {movimientos.length === 0 ? (
                <p className="text-center text-gray-300 py-8">No hay movimientos para mostrar</p>
              ) : (
                movimientos.map((mov) => (
                  <div 
                    key={mov.id}
                    className={`p-4 rounded-lg ${
                      mov.tipo === 'ingreso' 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {mov.tipo === 'ingreso' ? (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">
                              {mov.tipo === 'ingreso' ? 'Ingreso - Comisión' : 'Egreso - Pago realizado'}
                            </p>
                            <p className="text-xs text-gray-300">
                              {new Date(mov.fecha).toLocaleString('es-EC', { 
                                dateStyle: 'medium', 
                                timeStyle: 'short' 
                              })}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-200 mb-2">{mov.descripcion}</p>
                        
                        {/* Detalles específicos */}
                        {mov.tipo === 'ingreso' && (
                          <div className="text-xs text-gray-300 space-y-1">
                            <p>• Sorteo: {mov.sorteo_titulo}</p>
                            <p>• Boleto: #{mov.numero_boleto}</p>
                            <p>• Comprador: {mov.comprador_nombre}</p>
                          </div>
                        )}
                        
                        {mov.tipo === 'egreso' && (
                          <div className="text-xs text-gray-300 space-y-1">
                            <p>• Banco: {mov.banco} - {mov.tipo_cuenta}</p>
                            <p>• Cuenta: {mov.numero_cuenta}</p>
                            {mov.comprobante_url && (
                              <p>
                                • <a href={mov.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                  Ver comprobante
                                </a>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          mov.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {mov.tipo === 'ingreso' ? '+' : '-'}${mov.monto.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  onClick={() => handleCambiarPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                  className="bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                  size="sm"
                >
                  Anterior
                </Button>
                
                <span className="text-white px-4">
                  Página {paginaActual} de {totalPaginas}
                </span>
                
                <Button
                  onClick={() => handleCambiarPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                  className="bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
                  size="sm"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modales */}
        
        {/* Modal Editar Perfil */}
        <Dialog open={showEditarPerfil} onOpenChange={setShowEditarPerfil}>
          <DialogContent className="bg-purple-900 text-white border-purple-700">
            <DialogHeader>
              <DialogTitle>Mi Perfil</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditarPerfil} className="space-y-4">
              <div>
                <Label className="text-white">Nombre Completo</Label>
                <Input 
                  value={perfilData.name}
                  onChange={(e) => setPerfilData({...perfilData, name: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label className="text-white">Cédula</Label>
                <Input 
                  value={perfilData.cedula}
                  onChange={(e) => setPerfilData({...perfilData, cedula: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Ej: 1234567890"
                />
              </div>
              
              <div>
                <Label className="text-white">Celular</Label>
                <Input 
                  value={perfilData.celular}
                  onChange={(e) => setPerfilData({...perfilData, celular: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Ej: 0999999999"
                />
              </div>
              
              <div className="bg-white/5 p-3 rounded">
                <p className="text-purple-200 text-sm">
                  <strong>Correo:</strong> {perfil?.email} <span className="text-yellow-300">(no editable)</span>
                </p>
              </div>
              
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Guardar Cambios
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Datos Bancarios */}
        <Dialog open={showDatosBancarios} onOpenChange={setShowDatosBancarios}>
          <DialogContent className="bg-purple-900 text-white border-purple-700">
            <DialogHeader>
              <DialogTitle>Datos Bancarios</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGuardarDatosBancarios} className="space-y-4">
              <div>
                <Label className="text-white">Nombre del Banco</Label>
                <Input 
                  value={datosBancarios.nombre_banco}
                  onChange={(e) => setDatosBancarios({...datosBancarios, nombre_banco: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Ej: Banco Pichincha"
                />
              </div>
              
              <div>
                <Label className="text-white">Tipo de Cuenta</Label>
                <Select 
                  value={datosBancarios.tipo_cuenta}
                  onValueChange={(value) => setDatosBancarios({...datosBancarios, tipo_cuenta: value})}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ahorro">Ahorros</SelectItem>
                    <SelectItem value="corriente">Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-white">Número de Cuenta</Label>
                <Input 
                  value={datosBancarios.numero_cuenta}
                  onChange={(e) => setDatosBancarios({...datosBancarios, numero_cuenta: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="Ej: 2100154343"
                />
              </div>
              
              <div className="bg-blue-500/10 border border-blue-400/30 p-3 rounded">
                <p className="text-blue-200 text-sm">
                  ℹ️ Estos datos son necesarios para procesar tus retiros de comisiones.
                </p>
              </div>
              
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Guardar Datos Bancarios
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Cambiar Contraseña */}
        <Dialog open={showCambiarPassword} onOpenChange={setShowCambiarPassword}>
          <DialogContent className="bg-purple-900 text-white border-purple-700">
            <DialogHeader>
              <DialogTitle>Cambiar Contraseña</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <Label className="text-white">Contraseña Actual</Label>
                <Input 
                  type="password"
                  value={passwordData.actual}
                  onChange={(e) => setPasswordData({...passwordData, actual: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label className="text-white">Nueva Contraseña</Label>
                <Input 
                  type="password"
                  value={passwordData.nueva}
                  onChange={(e) => setPasswordData({...passwordData, nueva: e.target.value})}
                  required
                  minLength={6}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label className="text-white">Confirmar Nueva Contraseña</Label>
                <Input 
                  type="password"
                  value={passwordData.confirmar_password}
                  onChange={(e) => setPasswordData({...passwordData, confirmar_password: e.target.value})}
                  required
                  minLength={6}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                Cambiar Contraseña
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Solicitar Retiro */}
        <Dialog open={showSolicitarRetiro} onOpenChange={setShowSolicitarRetiro}>
          <DialogContent className="bg-purple-900 text-white border-purple-700">
            <DialogHeader>
              <DialogTitle>Solicitar Retiro</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSolicitarRetiro} className="space-y-4">
              <div>
                <Label className="text-white">Monto a Retirar</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  max={perfil?.wallet_balance || 0}
                  value={retiroData.monto}
                  onChange={(e) => setRetiroData({...retiroData, monto: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="0.00"
                />
              </div>
              
              <div className="bg-white/5 p-3 rounded">
                <p className="text-purple-200 text-sm">
                  Saldo disponible: <span className="font-bold text-white">${perfil?.wallet_balance?.toFixed(2) || '0.00'}</span>
                </p>
              </div>
              
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Solicitar Retiro
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VendedorDashboard;
