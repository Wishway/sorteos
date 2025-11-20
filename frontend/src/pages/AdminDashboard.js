import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Trophy, Users, DollarSign, LogOut, Home, Plus, Play, Key, CheckCircle, XCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sorteos, setSorteos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [boletosPendientes, setBoletosPendientes] = useState([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [boletosAprobados, setBoletosAprobados] = useState([]);
  const [loadingAprobados, setLoadingAprobados] = useState(false);
  const [sorteoFiltroAprobados, setSorteoFiltroAprobados] = useState('');
  const [numeroBoletoFiltro, setNumeroBoletoFiltro] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [boletoAprobar, setBoletoAprobar] = useState(null);

  const [formData, setFormData] = useState({
    titulo: '', descripcion: '', precio_boleto: '', cantidad_minima_boletos: '',
    cantidad_total_boletos: '', tipo: 'unico', porcentaje_comision: '10',
    fecha_inicio: '', fecha_cierre: '', color_primario: '#4F46E5',
    color_secundario: '#06B6D4', reglas: '', imagenes: [], videos: [], etapas: []
  });
  
  const [imagenUrl, setImagenUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [etapaForm, setEtapaForm] = useState({ 
    numero: 1, 
    porcentaje: '', 
    premio: '', 
    nombre: '',
    imagen_urls: [],
    video_urls: []
  });
  const [etapaImagenUrl, setEtapaImagenUrl] = useState('');
  const [etapaVideoUrl, setEtapaVideoUrl] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchData();
    fetchBoletosPendientes();
  }, [user]);

  const fetchData = async () => {
    try {
      const [sorteosRes, usuariosRes] = await Promise.all([
        axios.get(`${API}/sorteos?incluir_draft=true`, { withCredentials: true }), // Admin ve todos incluyendo borradores
        axios.get(`${API}/admin/usuarios`, { withCredentials: true })
      ]);
      setSorteos(sorteosRes.data);
      setUsuarios(usuariosRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const agregarEtapa = () => {
    if (!etapaForm.porcentaje || !etapaForm.premio) {
      toast.error('Completa al menos porcentaje y premio de la etapa');
      return;
    }
    const nuevaEtapa = {
      numero: formData.etapas.length + 1,
      porcentaje: parseFloat(etapaForm.porcentaje),
      premio: etapaForm.premio,
      nombre: etapaForm.nombre || `Etapa ${formData.etapas.length + 1}`,
      imagen_urls: etapaForm.imagen_urls || [],
      video_urls: etapaForm.video_urls || [],
      completado: false
    };
    setFormData(prev => ({ ...prev, etapas: [...prev.etapas, nuevaEtapa] }));
    setEtapaForm({ 
      numero: formData.etapas.length + 2, 
      porcentaje: '', 
      premio: '', 
      nombre: '',
      imagen_urls: [],
      video_urls: []
    });
    setEtapaImagenUrl('');
    setEtapaVideoUrl('');
    toast.success('Etapa agregada');
  };

  const eliminarEtapa = (index) => {
    setFormData(prev => ({ ...prev, etapas: prev.etapas.filter((_, i) => i !== index) }));
    toast.success('Etapa eliminada');
  };

  const handleCrearSorteo = async (e) => {
    e.preventDefault();
    try {
      const sorteoData = {
        ...formData,
        precio_boleto: parseFloat(formData.precio_boleto),
        cantidad_minima_boletos: parseInt(formData.cantidad_minima_boletos),
        cantidad_total_boletos: parseInt(formData.cantidad_total_boletos),
        porcentaje_comision: parseFloat(formData.porcentaje_comision),
        fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
        fecha_cierre: new Date(formData.fecha_cierre).toISOString()
      };
      await axios.post(`${API}/sorteos`, sorteoData, { withCredentials: true });
      toast.success('¡Sorteo creado exitosamente!');
      setShowCreateModal(false);
      fetchData();
      setFormData({
        titulo: '', descripcion: '', precio_boleto: '', cantidad_minima_boletos: '',
        cantidad_total_boletos: '', tipo: 'unico', porcentaje_comision: '10',
        fecha_inicio: '', fecha_cierre: '', color_primario: '#4F46E5',
        color_secundario: '#06B6D4', reglas: '', imagenes: [], videos: [], etapas: []
      });
      setImagenUrl('');
      setVideoUrl('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear sorteo');
    }
  };

  const ejecutarSorteo = async (sorteoId, etapaNumero = null) => {
    if (!window.confirm('¿Estás seguro de ejecutar este sorteo?')) return;
    try {
      await axios.post(`${API}/admin/ejecutar-sorteo`, 
        { sorteo_id: sorteoId, etapa_numero: etapaNumero },
        { withCredentials: true }
      );
      toast.success('¡Sorteo ejecutado exitosamente!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al ejecutar sorteo');
    }
  };

  const editarSorteo = (sorteoId) => {
    toast.info('Redirigiendo a editar sorteo...');
    navigate(`/admin/sorteo/${sorteoId}/editar`);
  };

  const eliminarSorteo = async (sorteoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este sorteo? Esta acción no se puede deshacer.')) return;
    
    try {
      await axios.delete(`${API}/admin/sorteo/${sorteoId}`, { withCredentials: true });
      toast.success('Sorteo eliminado exitosamente');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar sorteo');
    }
  };

  const publicarSorteo = async (sorteoId) => {
    if (!window.confirm('¿Deseas publicar este sorteo? Una vez publicado, no podrá ser editado.')) return;
    
    try {
      await axios.put(`${API}/admin/sorteo/${sorteoId}/publicar`, {}, { withCredentials: true });
      toast.success('¡Sorteo publicado exitosamente!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al publicar sorteo');
    }
  };

  const pausarSorteo = async (sorteoId) => {
    try {
      await axios.put(`${API}/admin/sorteo/${sorteoId}/pausar`, {}, { withCredentials: true });
      toast.success('Estado actualizado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  const iniciarSorteo = async (sorteoId) => {
    if (!window.confirm('¿Iniciar el sorteo manualmente ahora?')) return;
    
    try {
      await axios.put(`${API}/admin/sorteo/${sorteoId}/estado?nuevo_estado=live`, {}, { withCredentials: true });
      toast.success('Sorteo iniciado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sorteo');
    }
  };

  const finalizarSorteo = async (sorteoId) => {
    if (!window.confirm('¿Forzar finalización del sorteo?')) return;
    
    try {
      await axios.put(`${API}/admin/sorteo/${sorteoId}/estado?nuevo_estado=completed`, {}, { withCredentials: true });
      toast.success('Sorteo finalizado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al finalizar sorteo');
    }
  };

  const cambiarRoleUsuario = async (userId, newRole) => {
    try {
      await axios.put(`${API}/admin/usuario/${userId}/role?role=${newRole}`, {}, { withCredentials: true });
      toast.success('Role actualizado exitosamente');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar role');
    }
  };

  const bloquearUsuario = async (userId) => {
    if (!window.confirm('¿Estás seguro de bloquear este usuario?')) return;
    try {
      await axios.put(`${API}/admin/usuario/${userId}/bloquear`, {}, { withCredentials: true });
      toast.success('Usuario bloqueado exitosamente');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al bloquear usuario');
    }
  };

  const desbloquearUsuario = async (userId) => {
    try {
      await axios.put(`${API}/admin/usuario/${userId}/desbloquear`, {}, { withCredentials: true });
      toast.success('Usuario desbloqueado exitosamente');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al desbloquear usuario');
    }
  };

  const eliminarUsuario = async (userId) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`${API}/admin/usuario/${userId}`, { withCredentials: true });
      toast.success('Usuario eliminado exitosamente');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const fetchBoletosPendientes = async () => {
    setLoadingPendientes(true);
    try {
      const response = await axios.get(`${API}/admin/boletos-pendientes`, { withCredentials: true });
      setBoletosPendientes(response.data);
    } catch (error) {
      console.error('Error al cargar boletos pendientes:', error);
    } finally {
      setLoadingPendientes(false);
    }
  };

  const fetchBoletosAprobados = async (sorteoId = '', numeroBoleto = '') => {
    setLoadingAprobados(true);
    try {
      let url = `${API}/admin/boletos-aprobados?`;
      if (sorteoId && sorteoId !== 'all') url += `sorteo_id=${sorteoId}&`;
      if (numeroBoleto) url += `numero_boleto=${numeroBoleto}`;
      
      const response = await axios.get(url, { withCredentials: true });
      setBoletosAprobados(response.data);
    } catch (error) {
      console.error('Error al cargar boletos aprobados:', error);
    } finally {
      setLoadingAprobados(false);
    }
  };

  const handleAprobarBoleto = async () => {
    if (!numeroComprobante || !numeroComprobante.trim()) {
      toast.error('El número de comprobante es obligatorio');
      return;
    }
    
    try {
      await axios.put(`${API}/admin/boleto/${boletoAprobar}/aprobar?numero_comprobante=${encodeURIComponent(numeroComprobante)}`, {}, { withCredentials: true });
      toast.success('Boleto aprobado exitosamente');
      setNumeroComprobante('');
      setBoletoAprobar(null);
      fetchBoletosPendientes();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al aprobar boleto');
    }
  };

  const handleRechazarBoleto = async (boletoId) => {
    if (!window.confirm('¿Estás seguro de rechazar este boleto? Se eliminará permanentemente.')) return;
    try {
      await axios.put(`${API}/admin/boleto/${boletoId}/rechazar`, {}, { withCredentials: true });
      toast.success('Boleto rechazado');
      fetchBoletosPendientes();
      fetchData();
    } catch (error) {
      toast.error('Error al rechazar boleto');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordNueva !== passwordConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    try {
      await axios.put(`${API}/auth/cambiar-password?password_actual=${passwordActual}&password_nueva=${passwordNueva}`, {}, { withCredentials: true });
      toast.success('Contraseña cambiada exitosamente');
      setShowChangePassword(false);
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirm('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
    }
  };

  return (
    <div className="min-h-screen gradient-background">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xl">A</div>
              <div>
                <h1 className="text-2xl font-bold">Panel de Administración</h1>
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
                      <Input id="password-actual" type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="password-nueva">Nueva Contraseña</Label>
                      <Input id="password-nueva" type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="password-confirm">Confirmar Nueva Contraseña</Label>
                      <Input id="password-confirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>Cancelar</Button>
                      <Button type="submit">Cambiar Contraseña</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate('/admin/perfil')} data-testid="perfil-btn">
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} data-testid="home-btn">
                <Home className="w-4 h-4 mr-2" />Inicio
              </Button>
              <Button variant="outline" onClick={handleLogout} data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sorteos Activos</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sorteos.filter(s => s.estado === 'activo').length}</div>
            </CardContent>
          </Card>
          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sorteos</CardTitle>
              <Trophy className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sorteos.length}</div>
            </CardContent>
          </Card>
          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.length}</div>
            </CardContent>
          </Card>
          <Card className="sorteo-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.filter(u => u.role === 'vendedor').length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sorteos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sorteos" data-testid="tab-sorteos">Sorteos</TabsTrigger>
            <TabsTrigger value="usuarios" data-testid="tab-usuarios">Usuarios</TabsTrigger>
            <TabsTrigger value="pendientes" data-testid="tab-pendientes">
              Boletos Pendientes {boletosPendientes.length > 0 && `(${boletosPendientes.length})`}
            </TabsTrigger>
            <TabsTrigger value="aprobados" data-testid="tab-aprobados">Boletos Aprobados</TabsTrigger>
          </TabsList>

          <TabsContent value="sorteos" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gestión de Sorteos</h2>
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button data-testid="crear-sorteo-btn">
                    <Plus className="w-4 h-4 mr-2" />Crear Sorteo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Sorteo</DialogTitle>
                    <DialogDescription>Completa los datos para crear un nuevo sorteo</DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleCrearSorteo} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="titulo">Título del Sorteo</Label>
                        <Input id="titulo" name="titulo" value={formData.titulo} onChange={handleInputChange} required data-testid="titulo-input" />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={3} required />
                      </div>
                      <div>
                        <Label htmlFor="precio_boleto">Precio por Boleto ($)</Label>
                        <Input id="precio_boleto" name="precio_boleto" type="number" step="0.01" value={formData.precio_boleto} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="porcentaje_comision">Comisión Vendedor (%)</Label>
                        <Input id="porcentaje_comision" name="porcentaje_comision" type="number" step="0.1" value={formData.porcentaje_comision} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="cantidad_minima_boletos">Boletos Mínimos</Label>
                        <Input id="cantidad_minima_boletos" name="cantidad_minima_boletos" type="number" value={formData.cantidad_minima_boletos} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="cantidad_total_boletos">Boletos Totales</Label>
                        <Input id="cantidad_total_boletos" name="cantidad_total_boletos" type="number" value={formData.cantidad_total_boletos} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
                        <Input id="fecha_inicio" name="fecha_inicio" type="datetime-local" value={formData.fecha_inicio} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="fecha_cierre">Fecha Cierre</Label>
                        <Input id="fecha_cierre" name="fecha_cierre" type="datetime-local" value={formData.fecha_cierre} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <Label htmlFor="tipo">Tipo de Sorteo</Label>
                        <Select value={formData.tipo} onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unico">Sorteo Único</SelectItem>
                            <SelectItem value="etapas">Sorteo por Etapas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="col-span-2 border-t pt-4">
                      <h3 className="font-semibold mb-3">Imágenes Promocionales</h3>
                      {formData.imagenes.map((img, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                          <span className="flex-1 text-sm truncate">{img}</span>
                          <Button type="button" variant="destructive" size="sm" onClick={() => {
                            setFormData(prev => ({ ...prev, imagenes: prev.imagenes.filter((_, i) => i !== index) }));
                          }}>Eliminar</Button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <Input 
                          placeholder="URL de imagen (ej: https://...)" 
                          type="url"
                          value={imagenUrl} 
                          onChange={(e) => setImagenUrl(e.target.value)} 
                        />
                        <Button type="button" onClick={() => {
                          if (imagenUrl.trim()) {
                            setFormData(prev => ({ ...prev, imagenes: [...prev.imagenes, imagenUrl.trim()] }));
                            setImagenUrl('');
                          }
                        }}>Agregar</Button>
                      </div>
                    </div>

                    <div className="col-span-2 border-t pt-4">
                      <h3 className="font-semibold mb-3">Videos Promocionales</h3>
                      {formData.videos.map((vid, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                          <span className="flex-1 text-sm truncate">{vid}</span>
                          <Button type="button" variant="destructive" size="sm" onClick={() => {
                            setFormData(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== index) }));
                          }}>Eliminar</Button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <Input 
                          placeholder="URL de video (YouTube, Google Drive, etc)" 
                          type="url"
                          value={videoUrl} 
                          onChange={(e) => setVideoUrl(e.target.value)} 
                        />
                        <Button type="button" onClick={() => {
                          if (videoUrl.trim()) {
                            setFormData(prev => ({ ...prev, videos: [...prev.videos, videoUrl.trim()] }));
                            setVideoUrl('');
                          }
                        }}>Agregar</Button>
                      </div>
                    </div>

                    {formData.tipo === 'etapas' && (
                      <div className="col-span-2 border-t pt-4">
                        <h3 className="font-semibold mb-3">Configurar Etapas</h3>
                        
                        {/* Lista de etapas agregadas */}
                        {formData.etapas.map((etapa, index) => (
                          <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-lg">Etapa {etapa.numero}: {etapa.nombre || etapa.premio}</p>
                                <p className="text-sm text-gray-600">Premio: {etapa.premio}</p>
                                <p className="text-sm text-gray-600">Se activa al {etapa.porcentaje}% de ventas</p>
                                {etapa.imagen_urls && etapa.imagen_urls.length > 0 && (
                                  <p className="text-xs text-blue-600 mt-1">✓ {etapa.imagen_urls.length} imagen(es)</p>
                                )}
                                {etapa.video_urls && etapa.video_urls.length > 0 && (
                                  <p className="text-xs text-purple-600 mt-1">✓ {etapa.video_urls.length} video(s)</p>
                                )}
                              </div>
                              <Button type="button" variant="destructive" size="sm" onClick={() => eliminarEtapa(index)}>
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Formulario para agregar nueva etapa */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-semibold mb-3 text-blue-900">Agregar Nueva Etapa</h4>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <Label className="text-xs">Nombre de la Etapa (opcional)</Label>
                              <Input 
                                placeholder="Ej: Primera Etapa" 
                                value={etapaForm.nombre} 
                                onChange={(e) => setEtapaForm(prev => ({ ...prev, nombre: e.target.value }))} 
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Porcentaje de Activación *</Label>
                              <Input 
                                placeholder="Ej: 25" 
                                type="number" 
                                value={etapaForm.porcentaje} 
                                onChange={(e) => setEtapaForm(prev => ({ ...prev, porcentaje: e.target.value }))} 
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <Label className="text-xs">Premio de esta Etapa *</Label>
                            <Input 
                              placeholder="Ej: iPhone 15 Pro" 
                              value={etapaForm.premio} 
                              onChange={(e) => setEtapaForm(prev => ({ ...prev, premio: e.target.value }))} 
                            />
                          </div>

                          {/* URLs de imágenes para esta etapa */}
                          <div className="mb-3">
                            <Label className="text-xs">Imágenes de esta Etapa (opcional)</Label>
                            {etapaForm.imagen_urls.map((img, idx) => (
                              <div key={idx} className="flex items-center gap-2 mb-1">
                                <span className="flex-1 text-xs truncate bg-white px-2 py-1 rounded">{img}</span>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    setEtapaForm(prev => ({ 
                                      ...prev, 
                                      imagen_urls: prev.imagen_urls.filter((_, i) => i !== idx) 
                                    }));
                                  }}
                                >
                                  X
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-1">
                              <Input 
                                placeholder="URL de imagen"
                                type="url"
                                value={etapaImagenUrl}
                                onChange={(e) => setEtapaImagenUrl(e.target.value)}
                                className="text-sm"
                              />
                              <Button 
                                type="button" 
                                size="sm"
                                onClick={() => {
                                  if (etapaImagenUrl.trim()) {
                                    setEtapaForm(prev => ({ 
                                      ...prev, 
                                      imagen_urls: [...prev.imagen_urls, etapaImagenUrl.trim()] 
                                    }));
                                    setEtapaImagenUrl('');
                                  }
                                }}
                              >
                                + Agregar
                              </Button>
                            </div>
                          </div>

                          {/* URLs de videos para esta etapa */}
                          <div className="mb-3">
                            <Label className="text-xs">Videos de esta Etapa (opcional)</Label>
                            {etapaForm.video_urls.map((vid, idx) => (
                              <div key={idx} className="flex items-center gap-2 mb-1">
                                <span className="flex-1 text-xs truncate bg-white px-2 py-1 rounded">{vid}</span>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setEtapaForm(prev => ({ 
                                      ...prev, 
                                      video_urls: prev.video_urls.filter((_, i) => i !== idx) 
                                    }));
                                  }}
                                >
                                  X
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-1">
                              <Input 
                                placeholder="URL de video (YouTube, etc)"
                                type="url"
                                value={etapaVideoUrl}
                                onChange={(e) => setEtapaVideoUrl(e.target.value)}
                                className="text-sm"
                              />
                              <Button 
                                type="button" 
                                size="sm"
                                onClick={() => {
                                  if (etapaVideoUrl.trim()) {
                                    setEtapaForm(prev => ({ 
                                      ...prev, 
                                      video_urls: [...prev.video_urls, etapaVideoUrl.trim()] 
                                    }));
                                    setEtapaVideoUrl('');
                                  }
                                }}
                              >
                                + Agregar
                              </Button>
                            </div>
                          </div>

                          <Button type="button" onClick={agregarEtapa} className="w-full">
                            Agregar Esta Etapa
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                      <Button type="submit" data-testid="submit-sorteo-btn">Crear Sorteo</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : sorteos.length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No hay sorteos creados</h3>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sorteos.map((sorteo) => {
                  // Función para obtener el badge según el estado
                  const getEstadoBadge = (estado) => {
                    const badges = {
                      draft: { bg: 'bg-gray-200', text: 'text-gray-800', label: '📝 BORRADOR' },
                      published: { bg: 'bg-green-100', text: 'text-green-700', label: '🟢 PUBLICADO' },
                      waiting: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ EN ESPERA' },
                      live: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 EN VIVO' },
                      completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '✅ COMPLETADO' },
                      pausado: { bg: 'bg-orange-100', text: 'text-orange-700', label: '⏸️ PAUSADO' },
                      activo: { bg: 'bg-green-100', text: 'text-green-700', label: '🟢 ACTIVO' }, // legacy
                    };
                    return badges[estado] || badges.draft;
                  };
                  
                  const badge = getEstadoBadge(sorteo.estado);
                  
                  return (
                    <Card key={sorteo.id} className="sorteo-card">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold">{sorteo.titulo}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </div>
                          <p className="text-sm text-gray-600 mb-2">{sorteo.descripcion}</p>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>Precio: {formatCurrency(sorteo.precio_boleto)}</span>
                            <span>Vendidos: {sorteo.cantidad_vendida}/{sorteo.cantidad_total_boletos}</span>
                            <span>Progreso: {sorteo.progreso_porcentaje.toFixed(1)}%</span>
                          </div>
                          {sorteo.tipo === 'etapas' && sorteo.etapas.length > 0 && (
                            <div className="mt-3 flex gap-2">
                              {sorteo.etapas.map((etapa) => (
                                <Button key={etapa.numero} size="sm" variant={etapa.completado ? 'secondary' : 'default'}
                                  onClick={() => !etapa.completado && ejecutarSorteo(sorteo.id, etapa.numero)}
                                  disabled={etapa.completado} data-testid={`ejecutar-etapa-${sorteo.id}-${etapa.numero}`}>
                                  <Play className="w-3 h-3 mr-1" />Etapa {etapa.numero} {etapa.completado ? '✓' : ''}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* DRAFT: Publicar y Editar */}
                          {sorteo.estado === 'draft' && (
                            <>
                              <Button 
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
                                onClick={() => publicarSorteo(sorteo.id)}
                                data-testid={`publicar-sorteo-${sorteo.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Publicar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => editarSorteo(sorteo.id)}
                                data-testid={`editar-sorteo-${sorteo.id}`}
                              >
                                Editar
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => eliminarSorteo(sorteo.id)}
                                data-testid={`eliminar-sorteo-${sorteo.id}`}
                              >
                                Eliminar
                              </Button>
                            </>
                          )}

                          {/* PUBLISHED / ACTIVO: Pausar */}
                          {(sorteo.estado === 'published' || sorteo.estado === 'activo') && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => pausarSorteo(sorteo.id)}
                                data-testid={`pausar-sorteo-${sorteo.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Pausar Ventas
                              </Button>
                            </>
                          )}

                          {/* PAUSADO: Reactivar */}
                          {sorteo.estado === 'pausado' && (
                            <Button 
                              className="bg-orange-600 hover:bg-orange-700"
                              size="sm"
                              onClick={() => pausarSorteo(sorteo.id)}
                              data-testid={`reactivar-sorteo-${sorteo.id}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Reactivar
                            </Button>
                          )}

                          {/* WAITING: Iniciar manualmente */}
                          {sorteo.estado === 'waiting' && (
                            <Button 
                              className="bg-yellow-600 hover:bg-yellow-700"
                              size="sm"
                              onClick={() => iniciarSorteo(sorteo.id)}
                              data-testid={`iniciar-sorteo-${sorteo.id}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Iniciar Sorteo
                            </Button>
                          )}

                          {/* LIVE: Finalizar */}
                          {sorteo.estado === 'live' && (
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => finalizarSorteo(sorteo.id)}
                              data-testid={`finalizar-sorteo-${sorteo.id}`}
                            >
                              Finalizar
                            </Button>
                          )}

                          {/* COMPLETED: solo info */}
                          {sorteo.estado === 'completed' && (
                            <p className="text-xs text-gray-500 italic">Completado</p>
                          )}

                          {/* Etapas (si aplica) */}
                          {sorteo.tipo === 'etapas' && sorteo.etapas && sorteo.etapas.length > 0 && sorteo.estado !== 'draft' && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs font-semibold mb-1">Etapas:</p>
                              {sorteo.etapas.map((etapa) => (
                                <div key={etapa.numero} className="flex items-center gap-1 text-xs mb-1">
                                  <span className={etapa.completado ? 'text-green-600' : 'text-gray-600'}>
                                    {etapa.completado ? '✓' : '○'} Etapa {etapa.numero}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
              <Input
                placeholder="Buscar por nombre o email..."
                className="max-w-xs"
                onChange={(e) => {
                  const search = e.target.value.toLowerCase();
                  if (search) {
                    setUsuarios(usuarios.filter(u => 
                      u.name.toLowerCase().includes(search) || 
                      u.email.toLowerCase().includes(search)
                    ));
                  } else {
                    fetchData();
                  }
                }}
              />
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid gap-4">
                {usuarios.map((usuario) => (
                  <Card key={usuario.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold">{usuario.name}</h3>
                            {usuario.bloqueado && (
                              <Badge variant="destructive">Bloqueado</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{usuario.email}</p>
                          {usuario.cedula && (
                            <p className="text-xs text-gray-500">Cédula: {usuario.cedula}</p>
                          )}
                          {usuario.celular && (
                            <p className="text-xs text-gray-500">Celular: {usuario.celular}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              usuario.role === 'admin' ? 'bg-red-100 text-red-700' :
                              usuario.role === 'vendedor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>{usuario.role}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Select value={usuario.role} onValueChange={(value) => cambiarRoleUsuario(usuario.id, value)}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="usuario">Usuario</SelectItem>
                              <SelectItem value="vendedor">Vendedor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          {!usuario.bloqueado ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => bloquearUsuario(usuario.id)}
                              data-testid={`bloquear-usuario-${usuario.id}`}
                            >
                              Bloquear
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => desbloquearUsuario(usuario.id)}
                              data-testid={`desbloquear-usuario-${usuario.id}`}
                            >
                              Desbloquear
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => eliminarUsuario(usuario.id)}
                            data-testid={`eliminar-usuario-${usuario.id}`}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pendientes" className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Boletos Pendientes de Aprobación</h2>
            
            {loadingPendientes ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : boletosPendientes.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">No hay boletos pendientes de aprobación</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {boletosPendientes.map((boleto) => (
                  <Card key={boleto.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary">Boleto #{boleto.numero_boleto}</Badge>
                            <Badge className="bg-yellow-100 text-yellow-700">Pendiente</Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-semibold">Sorteo:</span>
                              <p className="text-gray-700">{boleto.sorteo?.titulo}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Usuario:</span>
                              <p className="text-gray-700">{boleto.usuario?.name} ({boleto.usuario?.email})</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Cédula:</span>
                              <p className="text-gray-700">{boleto.usuario?.cedula}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Celular:</span>
                              <p className="text-gray-700">{boleto.usuario?.celular}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Fecha de compra:</span>
                              <p className="text-gray-700">{formatDateTime(boleto.fecha_compra)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Monto:</span>
                              <p className="text-lg font-bold text-primary">{formatCurrency(boleto.precio_pagado)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          {boleto.comprobante_url && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-semibold mb-2">Comprobante:</p>
                              <a 
                                href={boleto.comprobante_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm break-all"
                              >
                                Ver comprobante
                              </a>
                            </div>
                          )}
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => setBoletoAprobar(boleto.id)}
                                data-testid={`aprobar-boleto-${boleto.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprobar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Aprobar Boleto</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                  Ingresa el número de comprobante bancario para aprobar este boleto
                                </p>
                                <div>
                                  <Label htmlFor="numero-comprobante">Número de Comprobante *</Label>
                                  <Input
                                    id="numero-comprobante"
                                    value={numeroComprobante}
                                    onChange={(e) => setNumeroComprobante(e.target.value)}
                                    placeholder="Ej: 123456789"
                                    required
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <DialogTrigger asChild>
                                    <Button variant="outline">Cancelar</Button>
                                  </DialogTrigger>
                                  <DialogTrigger asChild>
                                    <Button onClick={handleAprobarBoleto}>
                                      Aprobar Boleto
                                    </Button>
                                  </DialogTrigger>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleRechazarBoleto(boleto.id)}
                            data-testid={`rechazar-boleto-${boleto.id}`}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="aprobados" className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Boletos Aprobados</h2>
            
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Filtrar por Sorteo</Label>
                    <Select value={sorteoFiltroAprobados} onValueChange={(value) => {
                      setSorteoFiltroAprobados(value);
                      fetchBoletosAprobados(value, numeroBoletoFiltro);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los sorteos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los sorteos</SelectItem>
                        {sorteos.map(sorteo => (
                          <SelectItem key={sorteo.id} value={sorteo.id}>{sorteo.titulo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Número de Boleto</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Buscar por número"
                        value={numeroBoletoFiltro}
                        onChange={(e) => setNumeroBoletoFiltro(e.target.value)}
                      />
                      <Button onClick={() => fetchBoletosAprobados(sorteoFiltroAprobados, numeroBoletoFiltro)}>
                        Buscar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {loadingAprobados ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : boletosAprobados.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">No hay boletos aprobados con los filtros seleccionados</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {boletosAprobados.map((boleto) => (
                  <Card key={boleto.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="default">Boleto #{boleto.numero_boleto}</Badge>
                            <Badge className="bg-green-100 text-green-700">Aprobado</Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-semibold">Sorteo:</span>
                              <p className="text-gray-700">{boleto.sorteo?.titulo}</p>
                              <p className="text-xs text-gray-500">Código: {boleto.sorteo?.landing_slug}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Usuario:</span>
                              <p className="text-gray-700">{boleto.usuario?.name} ({boleto.usuario?.email})</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Comprobante:</span>
                              <p className="text-green-700 font-bold">{boleto.numero_comprobante || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Fecha de compra:</span>
                              <p className="text-gray-700">{formatDateTime(boleto.fecha_compra)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Monto:</span>
                              <p className="text-lg font-bold text-primary">{formatCurrency(boleto.precio_pagado)}</p>
                            </div>
                          </div>
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

export default AdminDashboard;
