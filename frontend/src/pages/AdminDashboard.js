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
import { Trophy, Users, DollarSign, LogOut, Home, Plus, Play, Key, CheckCircle, XCircle, Settings, Image } from 'lucide-react';
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
  const [editingSorteoId, setEditingSorteoId] = useState(null);
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
  
  // Estados para retiros
  const [retiros, setRetiros] = useState([]);
  const [loadingRetiros, setLoadingRetiros] = useState(false);
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [retiroSeleccionado, setRetiroSeleccionado] = useState(null);
  const [showAprobarRetiro, setShowAprobarRetiro] = useState(false);
  const [editandoMinimo, setEditandoMinimo] = useState(null);
  const [nuevoMinimo, setNuevoMinimo] = useState(1);
  const [sorteoExpandido, setSorteoExpandido] = useState(null);
  const [imagenesTemp, setImagenesTemp] = useState({});
  const [premiosImagenesTemp, setPremiosImagenesTemp] = useState({});

  const [formData, setFormData] = useState({
    titulo: '', descripcion: '', precio_boleto: '', cantidad_minima_boletos: '',
    cantidad_total_boletos: '', tipo: 'unico', porcentaje_comision: '10',
    fecha_cierre: '', color_primario: '#4F46E5',
    color_secundario: '#06B6D4', reglas: '', imagenes: [], etapas: [], premios: []
  });
  
  const [imagenUrl, setImagenUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [premioForm, setPremioForm] = useState({
    nombre: '',
    descripcion: '',
    imagen_url: '',
    video_url: ''
  });

  const [etapaForm, setEtapaForm] = useState({ 
    numero: 1, 
    porcentaje: '', 
    premio: '',  // Mantener por compatibilidad
    nombre: '',
    imagen_urls: [],
    video_urls: [],
    premios: []  // NUEVO: Array de premios para múltiples premios por etapa
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
    fetchRetiros();
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
  
  const fetchRetiros = async () => {
    setLoadingRetiros(true);
    try {
      const response = await axios.get(`${API}/admin/retiros-pendientes`, { withCredentials: true });
      setRetiros(response.data);
    } catch (error) {
      console.error('Error al cargar retiros:', error);
      toast.error('Error al cargar retiros');
    } finally {
      setLoadingRetiros(false);
    }
  };
  
  const handleAprobarRetiro = async () => {
    if (!comprobanteUrl.trim()) {
      toast.error('Debe ingresar la URL del comprobante');
      return;
    }
    
    try {
      await axios.post(`${API}/admin/retiro/${retiroSeleccionado.id}/aprobar`, {
        comprobante_url: comprobanteUrl
      }, { withCredentials: true });
      
      toast.success('Retiro aprobado correctamente');
      setShowAprobarRetiro(false);
      setComprobanteUrl('');
      setRetiroSeleccionado(null);
      fetchRetiros();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al aprobar retiro');
    }
  };
  
  const handleRechazarRetiro = async (retiroId) => {
    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (!motivo) return;
    
    try {
      await axios.post(`${API}/admin/retiro/${retiroId}/rechazar?motivo=${encodeURIComponent(motivo)}`, {}, { withCredentials: true });
      toast.success('Retiro rechazado');
      fetchRetiros();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al rechazar retiro');
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
    // CAMBIO: Validar que tenga al menos 1 premio
    if (!etapaForm.porcentaje || (!etapaForm.premios || etapaForm.premios.length === 0)) {
      toast.error('Completa porcentaje y agrega al menos un premio a la etapa');
      return;
    }
    const nuevaEtapa = {
      numero: formData.etapas.length + 1,
      porcentaje: parseFloat(etapaForm.porcentaje),
      premio: etapaForm.premios[0]?.nombre || '',  // Mantener compatibilidad con campo único
      premios: etapaForm.premios,  // NUEVO: Array de premios
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
      video_urls: [],
      premios: []  // Resetear array de premios
    });
    setEtapaImagenUrl('');
    setEtapaVideoUrl('');
    toast.success('Etapa agregada');
  };

  const eliminarEtapa = (index) => {
    setFormData(prev => ({ ...prev, etapas: prev.etapas.filter((_, i) => i !== index) }));
    toast.success('Etapa eliminada');
  };

  const agregarPremio = () => {
    if (!premioForm.nombre) {
      toast.error('El nombre del premio es obligatorio');
      return;
    }
    const nuevoPremio = { ...premioForm };
    setFormData(prev => ({ ...prev, premios: [...prev.premios, nuevoPremio] }));
    setPremioForm({
      nombre: '',
      descripcion: '',
      imagen_url: '',
      video_url: ''
    });
    toast.success('Premio agregado');
  };

  const eliminarPremio = (index) => {
    setFormData(prev => ({ ...prev, premios: prev.premios.filter((_, i) => i !== index) }));
    toast.success('Premio eliminado');
  };

  const agregarPremioAEtapa = (etapaIndex) => {
    if (!premioForm.nombre) {
      toast.error('El nombre del premio es obligatorio');
      return;
    }
    const nuevoPremio = { ...premioForm };
    setFormData(prev => {
      const etapasActualizadas = [...prev.etapas];
      if (!etapasActualizadas[etapaIndex].premios) {
        etapasActualizadas[etapaIndex].premios = [];
      }
      etapasActualizadas[etapaIndex].premios.push(nuevoPremio);
      return { ...prev, etapas: etapasActualizadas };
    });
    setPremioForm({
      nombre: '',
      descripcion: '',
      imagen_url: '',
      video_url: ''
    });
    toast.success(`Premio agregado a Etapa ${etapaIndex + 1}`);
  };

  const eliminarPremioDeEtapa = (etapaIndex, premioIndex) => {
    setFormData(prev => {
      const etapasActualizadas = [...prev.etapas];
      etapasActualizadas[etapaIndex].premios = etapasActualizadas[etapaIndex].premios.filter((_, i) => i !== premioIndex);
      return { ...prev, etapas: etapasActualizadas };
    });
    toast.success('Premio eliminado de la etapa');
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
        fecha_cierre: new Date(formData.fecha_cierre).toISOString()
      };
      
      if (editingSorteoId) {
        // Modo edición
        await axios.put(`${API}/admin/sorteo/${editingSorteoId}`, sorteoData, { withCredentials: true });
        toast.success('¡Sorteo actualizado exitosamente!');
      } else {
        // Modo creación
        await axios.post(`${API}/sorteos`, sorteoData, { withCredentials: true });
        toast.success('¡Sorteo creado exitosamente!');
      }
      
      setShowCreateModal(false);
      setEditingSorteoId(null);
      fetchData();
      setFormData({
        titulo: '', descripcion: '', precio_boleto: '', cantidad_minima_boletos: '',
        cantidad_total_boletos: '', tipo: 'unico', porcentaje_comision: '10',
        fecha_cierre: '', color_primario: '#4F46E5',
        color_secundario: '#06B6D4', reglas: '', imagenes: [], etapas: [], premios: []
      });
      setImagenUrl('');
      setVideoUrl('');
      setEtapaForm({ 
        numero: 1, 
        porcentaje: '', 
        premio: '', 
        nombre: '',
        imagen_urls: [],
        video_urls: []
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || `Error al ${editingSorteoId ? 'actualizar' : 'crear'} sorteo`);
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

  const editarSorteo = async (sorteoId) => {
    try {
      // Obtener los datos del sorteo
      const response = await axios.get(`${API}/sorteos/${sorteoId}`, { withCredentials: true });
      const sorteo = response.data;
      
      // Formatear fechas para el input datetime-local
      const formatDateForInput = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
      };
      
      // Cargar datos en el formulario
      // Usar fecha_cierre o fecha_inicio (compatibilidad)
      const fechaSorteo = sorteo.fecha_cierre || sorteo.fecha_inicio;
      
      setFormData({
        titulo: sorteo.titulo,
        descripcion: sorteo.descripcion,
        precio_boleto: sorteo.precio_boleto.toString(),
        cantidad_minima_boletos: sorteo.cantidad_minima_boletos.toString(),
        cantidad_total_boletos: sorteo.cantidad_total_boletos.toString(),
        tipo: sorteo.tipo,
        porcentaje_comision: sorteo.porcentaje_comision.toString(),
        fecha_cierre: formatDateForInput(fechaSorteo),
        color_primario: sorteo.color_primario,
        color_secundario: sorteo.color_secundario,
        reglas: sorteo.reglas || '',
        imagenes: sorteo.imagenes || [],
        etapas: sorteo.etapas || [],
        premios: sorteo.premios || []
      });
      
      setEditingSorteoId(sorteoId);
      setShowCreateModal(true);
      toast.info('Editando sorteo en borrador');
    } catch (error) {
      toast.error('Error al cargar datos del sorteo');
      console.error(error);
    }
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

  const pausarDespausarVentas = async (sorteoId, pausar) => {
    try {
      await axios.put(`${API}/admin/sorteo/${sorteoId}/pausar-ventas?pausar=${pausar}`, {}, { withCredentials: true });
      toast.success(pausar ? 'Ventas pausadas' : 'Ventas reanudadas');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al pausar/despausar ventas');
    }
  };

  const ajustarMinimoBoletos = async (sorteoId, minimo) => {
    try {
      await axios.put(`${API}/admin/sorteo/${sorteoId}/ajustar-minimo?minimo=${minimo}`, {}, { withCredentials: true });
      toast.success(`Mínimo ajustado a ${minimo} boletos`);
      setEditandoMinimo(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al ajustar mínimo');
    }
  };

  // Función removida - reemplazada por la sección expandible de edición de imágenes

  const iniciarSorteo = async (sorteoId) => {
    if (!window.confirm('¿Iniciar el sorteo en LIVE ahora? Esto iniciará la animación de 2 minutos.')) return;
    
    try {
      await axios.put(`${API}/admin/sorteo/${sorteoId}/iniciar-live`, {}, { withCredentials: true });
      toast.success('¡Sorteo iniciado en LIVE! La animación durará 2 minutos');
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
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xl">A</div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Panel de Administración</h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="change-password-btn" className="flex-1 md:flex-none">
                    <Key className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Cambiar Contraseña</span>
                    <span className="sm:hidden">Contraseña</span>
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
              <Button variant="outline" onClick={() => navigate('/admin/perfil')} data-testid="perfil-btn" className="flex-1 md:flex-none">
                <Settings className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Configuración</span>
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
          <TabsList className="flex-wrap h-auto gap-2">
            <TabsTrigger value="sorteos" data-testid="tab-sorteos" className="flex-shrink-0">Sorteos</TabsTrigger>
            <TabsTrigger value="usuarios" data-testid="tab-usuarios" className="flex-shrink-0">Usuarios</TabsTrigger>
            <TabsTrigger value="retiros" data-testid="tab-retiros" className="flex-shrink-0 whitespace-nowrap">
              <span className="hidden sm:inline">Retiros de Vendedores</span>
              <span className="sm:hidden">Retiros</span>
            </TabsTrigger>
            <TabsTrigger value="pendientes" data-testid="tab-pendientes" className="flex-shrink-0 whitespace-nowrap">
              <span className="hidden sm:inline">Boletos Pendientes {boletosPendientes.length > 0 && `(${boletosPendientes.length})`}</span>
              <span className="sm:hidden">Pendientes {boletosPendientes.length > 0 && `(${boletosPendientes.length})`}</span>
            </TabsTrigger>
            <TabsTrigger value="aprobados" data-testid="tab-aprobados" className="flex-shrink-0 whitespace-nowrap">
              <span className="hidden sm:inline">Boletos Aprobados</span>
              <span className="sm:hidden">Aprobados</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sorteos" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gestión de Sorteos</h2>
              <Dialog open={showCreateModal} onOpenChange={(open) => {
                setShowCreateModal(open);
                if (!open) {
                  // Resetear al cerrar
                  setEditingSorteoId(null);
                  setFormData({
                    titulo: '', descripcion: '', precio_boleto: '', cantidad_minima_boletos: '',
                    cantidad_total_boletos: '', tipo: 'unico', porcentaje_comision: '10',
                    fecha_cierre: '', color_primario: '#4F46E5',
                    color_secundario: '#06B6D4', reglas: '', imagenes: [], etapas: [], premios: []
                  });
                  setImagenUrl('');
                  setVideoUrl('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="crear-sorteo-btn">
                    <Plus className="w-4 h-4 mr-2" />Crear Sorteo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingSorteoId ? 'Editar Sorteo (Borrador)' : 'Crear Nuevo Sorteo'}</DialogTitle>
                    <DialogDescription>
                      {editingSorteoId ? 'Modifica los datos del sorteo en borrador' : 'Completa los datos para crear un nuevo sorteo'}
                    </DialogDescription>
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
                      <div className="col-span-2">
                        <Label htmlFor="fecha_cierre">Fecha y Hora del Sorteo *</Label>
                        <Input 
                          id="fecha_cierre" 
                          name="fecha_cierre" 
                          type="datetime-local" 
                          value={formData.fecha_cierre} 
                          onChange={handleInputChange} 
                          required 
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Esta es la ÚNICA fecha que controla el sorteo: contadores, transiciones de estado y realización del sorteo.
                        </p>
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
                      <div className="max-h-40 overflow-y-auto space-y-2 mb-3">
                        {formData.imagenes.map((img, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <span className="flex-1 text-sm truncate max-w-[300px] overflow-hidden text-ellipsis" title={img}>{img}</span>
                            <Button type="button" variant="destructive" size="sm" onClick={() => {
                              setFormData(prev => ({ ...prev, imagenes: prev.imagenes.filter((_, i) => i !== index) }));
                            }}>Eliminar</Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="URL de imagen (ej: https://...)" 
                          type="url"
                          value={imagenUrl} 
                          onChange={(e) => setImagenUrl(e.target.value)}
                          className="flex-1 min-w-0"
                        />
                        <Button type="button" onClick={() => {
                          if (imagenUrl.trim()) {
                            setFormData(prev => ({ ...prev, imagenes: [...prev.imagenes, imagenUrl.trim()] }));
                            setImagenUrl('');
                          }
                        }} className="flex-shrink-0">Agregar</Button>
                      </div>
                    </div>

                    {/* Sección de videos eliminada - los videos van en cada premio individual */}

                    {/* Sección de Premios para Sorteo Único */}
                    {formData.tipo === 'unico' && (
                      <div className="col-span-2 border-t pt-4">
                        <h3 className="font-semibold mb-3">Premios del Sorteo</h3>
                        
                        {/* Lista de premios agregados */}
                        {formData.premios && formData.premios.length > 0 && (
                          <div className="mb-4 space-y-2">
                            {formData.premios.map((premio, index) => (
                              <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold">{premio.nombre}</p>
                                  {premio.descripcion && <p className="text-sm text-gray-600">{premio.descripcion}</p>}
                                  {premio.imagen_url && <p className="text-xs text-blue-600 mt-1">✓ Imagen</p>}
                                  {premio.video_url && <p className="text-xs text-purple-600 mt-1">✓ Video</p>}
                                </div>
                                <Button type="button" variant="destructive" size="sm" onClick={() => eliminarPremio(index)}>
                                  Eliminar
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Formulario para agregar nuevo premio */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="font-semibold mb-3 text-green-900">Agregar Nuevo Premio</h4>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <Label className="text-xs">Nombre del Premio *</Label>
                              <Input 
                                placeholder="Ej: iPhone 15 Pro Max" 
                                value={premioForm.nombre} 
                                onChange={(e) => setPremioForm(prev => ({ ...prev, nombre: e.target.value }))} 
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Descripción (opcional)</Label>
                              <Input 
                                placeholder="Ej: 256GB color titanio" 
                                value={premioForm.descripcion} 
                                onChange={(e) => setPremioForm(prev => ({ ...prev, descripcion: e.target.value }))} 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">URL de Imagen (opcional)</Label>
                              <Input 
                                placeholder="https://..." 
                                type="url"
                                value={premioForm.imagen_url} 
                                onChange={(e) => setPremioForm(prev => ({ ...prev, imagen_url: e.target.value }))}
                                className="min-w-0"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">URL de Video (opcional)</Label>
                              <Input 
                                placeholder="https://..." 
                                type="url"
                                value={premioForm.video_url} 
                                onChange={(e) => setPremioForm(prev => ({ ...prev, video_url: e.target.value }))}
                                className="min-w-0"
                              />
                            </div>
                          </div>

                          <Button type="button" onClick={agregarPremio} className="w-full mt-3">
                            + Agregar Premio
                          </Button>
                        </div>
                      </div>
                    )}

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
                                {etapa.premios && etapa.premios.length > 0 && (
                                  <p className="text-xs text-green-600 mt-1">✓ {etapa.premios.length} premio(s) detallado(s)</p>
                                )}
                              </div>
                              <Button type="button" variant="destructive" size="sm" onClick={() => eliminarEtapa(index)}>
                                Eliminar
                              </Button>
                            </div>
                            
                            {/* Premios de esta etapa */}
                            {etapa.premios && etapa.premios.length > 0 && (
                              <div className="mt-3 pl-4 border-l-2 border-green-500">
                                <p className="text-xs font-semibold text-green-700 mb-2">Premios:</p>
                                {etapa.premios.map((premio, pIdx) => (
                                  <div key={pIdx} className="text-xs bg-white p-2 rounded mb-1 flex justify-between items-center">
                                    <span>{premio.nombre}</span>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => eliminarPremioDeEtapa(index, pIdx)}
                                      className="h-6 w-6 p-0"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
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

                          {/* PREMIOS DE LA ETAPA (múltiples) */}
                          <div className="mb-3">
                            <Label className="text-xs font-semibold">Premios de esta Etapa *</Label>
                            {etapaForm.premios && etapaForm.premios.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {etapaForm.premios.map((premio, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-2 p-2 bg-white rounded border">
                                    <div className="flex-1">
                                      <p className="font-semibold text-sm">{premio.nombre}</p>
                                      {premio.descripcion && <p className="text-xs text-gray-600">{premio.descripcion}</p>}
                                      {premio.imagen_url && <p className="text-xs text-blue-600">✓ Imagen</p>}
                                      {premio.video_url && <p className="text-xs text-purple-600">✓ Video</p>}
                                    </div>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => {
                                        setEtapaForm(prev => ({ 
                                          ...prev, 
                                          premios: prev.premios.filter((_, i) => i !== pIdx) 
                                        }));
                                      }}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Formulario para agregar premio a la etapa */}
                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-xs font-semibold mb-2 text-green-900">Agregar Premio a esta Etapa</p>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                  <Label className="text-xs">Nombre *</Label>
                                  <Input 
                                    placeholder="Ej: iPhone 15 Pro" 
                                    value={premioForm.nombre} 
                                    onChange={(e) => setPremioForm(prev => ({ ...prev, nombre: e.target.value }))} 
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Descripción</Label>
                                  <Input 
                                    placeholder="Opcional" 
                                    value={premioForm.descripcion} 
                                    onChange={(e) => setPremioForm(prev => ({ ...prev, descripcion: e.target.value }))} 
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                  <Label className="text-xs">URL Imagen</Label>
                                  <Input 
                                    placeholder="https://..." 
                                    type="url"
                                    value={premioForm.imagen_url} 
                                    onChange={(e) => setPremioForm(prev => ({ ...prev, imagen_url: e.target.value }))}
                                    className="text-sm min-w-0"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">URL Video</Label>
                                  <Input 
                                    placeholder="https://..." 
                                    type="url"
                                    value={premioForm.video_url} 
                                    onChange={(e) => setPremioForm(prev => ({ ...prev, video_url: e.target.value }))}
                                    className="text-sm min-w-0"
                                  />
                                </div>
                              </div>
                              <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => {
                                  if (!premioForm.nombre.trim()) {
                                    toast.error('El nombre del premio es obligatorio');
                                    return;
                                  }
                                  setEtapaForm(prev => ({ 
                                    ...prev, 
                                    premios: [...(prev.premios || []), { ...premioForm }]
                                  }));
                                  setPremioForm({ nombre: '', descripcion: '', imagen_url: '', video_url: '' });
                                }}
                                className="w-full"
                              >
                                + Agregar Premio
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
                      <Button type="button" variant="outline" onClick={() => {
                        setShowCreateModal(false);
                        setEditingSorteoId(null);
                      }}>Cancelar</Button>
                      <Button type="submit" data-testid="submit-sorteo-btn">
                        {editingSorteoId ? 'Guardar Cambios' : 'Crear Sorteo'}
                      </Button>
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
                      completado: { bg: 'bg-blue-100', text: 'text-blue-700', label: '✅ COMPLETADO' }, // legacy
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
                          {/* Mostrar INFORMACIÓN de etapas (sin botones manuales) */}
                          {sorteo.tipo === 'etapas' && sorteo.etapas && sorteo.etapas.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-3">
                              {sorteo.etapas.map((etapa) => (
                                <div 
                                  key={etapa.numero} 
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    etapa.completado 
                                      ? 'bg-green-100 text-green-700 border border-green-300' 
                                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                                  }`}
                                >
                                  Etapa {etapa.numero} - {etapa.porcentaje}% {etapa.completado ? '✓ Completada' : ''}
                                </div>
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

                          {/* PUBLISHED / ACTIVO / WAITING: Pausar/Despausar Ventas y Ajustar Mínimo */}
                          {(sorteo.estado === 'published' || sorteo.estado === 'activo' || sorteo.estado === 'waiting') && (
                            <>
                              <Button 
                                variant={sorteo.ventas_pausadas ? "default" : "outline"}
                                size="sm"
                                onClick={() => pausarDespausarVentas(sorteo.id, !sorteo.ventas_pausadas)}
                                data-testid={`pausar-ventas-${sorteo.id}`}
                                className={sorteo.ventas_pausadas ? "bg-orange-600 hover:bg-orange-700" : ""}
                              >
                                {sorteo.ventas_pausadas ? (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Reanudar Ventas
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Pausar Ventas
                                  </>
                                )}
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditandoMinimo(sorteo.id);
                                  setNuevoMinimo(sorteo.minimo_boletos || 1);
                                }}
                                data-testid={`ajustar-minimo-${sorteo.id}`}
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Ajustar Mínimo (Actual: {sorteo.minimo_boletos || 1})
                              </Button>
                            </>
                          )}

                          {/* CAMBIO: Eliminado botón manual "Iniciar Sorteo" - Sistema 100% automático */}

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

                          {/* PUBLISHED / WAITING: Ver/Editar Medios */}
                          {(sorteo.estado === 'published' || sorteo.estado === 'activo' || sorteo.estado === 'waiting') && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => setSorteoExpandido(sorteoExpandido === sorteo.id ? null : sorteo.id)}
                              className="mt-2"
                            >
                              <Image className="w-4 h-4 mr-2" />
                              {sorteoExpandido === sorteo.id ? 'Ocultar' : 'Ver/Editar'} Imágenes y Videos
                            </Button>
                          )}

                          {/* COMPLETED: Puede eliminarse */}
                          {(sorteo.estado === 'completed' || sorteo.estado === 'completado') && (
                            <>
                              <p className="text-xs text-gray-500 italic mb-2">Sorteo finalizado</p>
                              
                              {/* INFORMACIÓN COMPLETA DE GANADORES */}
                              {sorteo.ganadores && sorteo.ganadores.length > 0 ? (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                    🏆 Ganadores del Sorteo ({sorteo.ganadores.length})
                                  </h4>
                                  <div className="space-y-4">
                                    {sorteo.ganadores.map((ganador, gIdx) => (
                                      <div key={gIdx} className="p-3 bg-white border border-green-300 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {/* Datos del Ganador */}
                                          <div>
                                            <p className="text-xs text-green-700 font-semibold mb-1">👤 Datos del Ganador:</p>
                                            <p className="text-sm"><strong>Nombre:</strong> {ganador.nombre_usuario || ganador.nombre || 'N/A'}</p>
                                            <p className="text-sm"><strong>Email:</strong> {ganador.email_usuario || ganador.email || 'N/A'}</p>
                                            <p className="text-sm"><strong>Cédula:</strong> {ganador.cedula_usuario || 'N/A'}</p>
                                            <p className="text-sm"><strong>Celular:</strong> {ganador.celular_usuario || 'N/A'}</p>
                                          </div>
                                          
                                          {/* Datos del Boleto y Premio */}
                                          <div>
                                            <p className="text-xs text-green-700 font-semibold mb-1">🎟️ Datos del Boleto:</p>
                                            <p className="text-sm"><strong>N° Boleto:</strong> #{ganador.numero_boleto}</p>
                                            <p className="text-sm"><strong>Premio:</strong> {ganador.premio || 'Premio principal'}</p>
                                            {(ganador.etapa || ganador.etapa_numero) && (
                                              <p className="text-sm"><strong>Etapa:</strong> {ganador.etapa || ganador.etapa_numero}</p>
                                            )}
                                            {ganador.fecha_sorteo && (
                                              <p className="text-sm"><strong>Fecha:</strong> {formatDateTime(ganador.fecha_sorteo)}</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-sm text-yellow-700">⚠️ No hay ganadores registrados para este sorteo</p>
                                </div>
                              )}
                              
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

                          {/* SECCIÓN EXPANDIBLE: EDITAR IMÁGENES Y VIDEOS (PUBLISHED / WAITING) */}
                          {sorteoExpandido === sorteo.id && (sorteo.estado === 'published' || sorteo.estado === 'activo' || sorteo.estado === 'waiting') && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="font-semibold mb-3 text-blue-900">Editar Imágenes y Videos</h4>
                              
                              {/* IMÁGENES PROMOCIONALES */}
                              <div className="mb-4">
                                <Label className="font-semibold text-sm mb-2 block">Imágenes Promocionales</Label>
                                
                                {/* Imágenes existentes */}
                                {sorteo.imagenes && sorteo.imagenes.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    {sorteo.imagenes.map((img, imgIdx) => (
                                      <div key={imgIdx} className="flex gap-2">
                                        <Input 
                                          value={imagenesTemp[`${sorteo.id}-${imgIdx}`] !== undefined ? imagenesTemp[`${sorteo.id}-${imgIdx}`] : img}
                                          onChange={(e) => setImagenesTemp(prev => ({...prev, [`${sorteo.id}-${imgIdx}`]: e.target.value}))}
                                          placeholder="URL de imagen"
                                          className="flex-1"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            const nuevaUrl = imagenesTemp[`${sorteo.id}-${imgIdx}`] || img;
                                            try {
                                              await axios.put(`${API}/admin/sorteo/${sorteo.id}/actualizar-imagen-promo`, {
                                                index: imgIdx,
                                                url: nuevaUrl
                                              }, { withCredentials: true });
                                              toast.success('Imagen actualizada');
                                              fetchData();
                                            } catch (error) {
                                              toast.error('Error al actualizar');
                                            }
                                          }}
                                        >
                                          Guardar cambios
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={async () => {
                                            try {
                                              const nuevasImagenes = sorteo.imagenes.filter((_, i) => i !== imgIdx);
                                              await axios.put(`${API}/admin/sorteo/${sorteo.id}/actualizar-imagenes`, {
                                                imagenes: nuevasImagenes
                                              }, { withCredentials: true });
                                              toast.success('Imagen eliminada');
                                              fetchData();
                                            } catch (error) {
                                              toast.error('Error al eliminar');
                                            }
                                          }}
                                        >
                                          Eliminar
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Agregar nueva imagen */}
                                <div className="flex gap-2">
                                  <Input 
                                    value={imagenesTemp[`${sorteo.id}-nueva`] || ''}
                                    onChange={(e) => setImagenesTemp(prev => ({...prev, [`${sorteo.id}-nueva`]: e.target.value}))}
                                    placeholder="URL de nueva imagen (https://...)"
                                    className="flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      const nuevaUrl = imagenesTemp[`${sorteo.id}-nueva`];
                                      if (!nuevaUrl || !nuevaUrl.trim()) {
                                        toast.error('Ingresa una URL válida');
                                        return;
                                      }
                                      try {
                                        const imagenesActuales = sorteo.imagenes || [];
                                        await axios.put(`${API}/admin/sorteo/${sorteo.id}/actualizar-imagenes`, {
                                          imagenes: [...imagenesActuales, nuevaUrl.trim()]
                                        }, { withCredentials: true });
                                        toast.success('Imagen agregada');
                                        setImagenesTemp(prev => ({...prev, [`${sorteo.id}-nueva`]: ''}));
                                        fetchData();
                                      } catch (error) {
                                        toast.error('Error al agregar');
                                      }
                                    }}
                                  >
                                    Agregar imagen
                                  </Button>
                                </div>
                              </div>

                              {/* IMÁGENES Y VIDEOS DE PREMIOS */}
                              <div>
                                <Label className="font-semibold text-sm mb-2 block">Premios</Label>
                                
                                {/* Premios de sorteo único */}
                                {sorteo.tipo === 'unico' && sorteo.premios && sorteo.premios.length > 0 && sorteo.premios.map((premio, pIdx) => (
                                  <div key={pIdx} className="mb-4 p-3 bg-white border rounded">
                                    <p className="font-semibold text-sm mb-2">Premio: {premio.nombre} <span className="text-gray-500 text-xs">(no editable)</span></p>
                                    
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <Label className="text-xs">URL Imagen:</Label>
                                          <Input 
                                            value={premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-img`] !== undefined 
                                              ? premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-img`] 
                                              : (premio.imagen_url || premio.imagen || '')}
                                            onChange={(e) => setPremiosImagenesTemp(prev => ({...prev, [`${sorteo.id}-premio-${pIdx}-img`]: e.target.value}))}
                                            placeholder="https://..."
                                            className="mt-1"
                                          />
                                        </div>
                                        <Button
                                          size="sm"
                                          className="self-end"
                                          onClick={async () => {
                                            const nuevaUrl = premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-img`] !== undefined 
                                              ? premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-img`] 
                                              : (premio.imagen_url || premio.imagen || '');
                                            try {
                                              await axios.put(`${API}/admin/sorteo/${sorteo.id}/actualizar-premio-imagen`, {
                                                premio_index: pIdx,
                                                imagen_url: nuevaUrl
                                              }, { withCredentials: true });
                                              toast.success('Imagen actualizada');
                                              fetchData();
                                            } catch (error) {
                                              toast.error('Error al actualizar');
                                            }
                                          }}
                                        >
                                          Guardar cambios
                                        </Button>
                                      </div>

                                      <div className="flex gap-2">
                                        <div className="flex-1">
                                          <Label className="text-xs">URL Video:</Label>
                                          <Input 
                                            value={premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-vid`] !== undefined 
                                              ? premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-vid`] 
                                              : (premio.video_url || premio.video || '')}
                                            onChange={(e) => setPremiosImagenesTemp(prev => ({...prev, [`${sorteo.id}-premio-${pIdx}-vid`]: e.target.value}))}
                                            placeholder="https://..."
                                            className="mt-1"
                                          />
                                        </div>
                                        <Button
                                          size="sm"
                                          className="self-end"
                                          onClick={async () => {
                                            const nuevaUrl = premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-vid`] !== undefined 
                                              ? premiosImagenesTemp[`${sorteo.id}-premio-${pIdx}-vid`] 
                                              : (premio.video_url || premio.video || '');
                                            try {
                                              await axios.put(`${API}/admin/sorteo/${sorteo.id}/actualizar-premio-video`, {
                                                premio_index: pIdx,
                                                video_url: nuevaUrl
                                              }, { withCredentials: true });
                                              toast.success('Video actualizado');
                                              fetchData();
                                            } catch (error) {
                                              toast.error('Error al actualizar');
                                            }
                                          }}
                                        >
                                          Guardar cambios
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Premios de sorteo por etapas */}
                                {sorteo.tipo === 'etapas' && sorteo.etapas && sorteo.etapas.length > 0 && sorteo.etapas.map((etapa, etapaIdx) => (
                                  <div key={etapaIdx} className="mb-4">
                                    <p className="font-semibold text-sm mb-2 text-blue-700">Etapa {etapa.numero}: {etapa.nombre || etapa.premio}</p>
                                    
                                    {etapa.premios && etapa.premios.length > 0 ? (
                                      etapa.premios.map((premio, pIdx) => (
                                        <div key={pIdx} className="mb-3 p-3 bg-white border rounded ml-4">
                                          <p className="font-semibold text-sm mb-2">Premio: {premio.nombre} <span className="text-gray-500 text-xs">(no editable)</span></p>
                                          
                                          <div className="space-y-2">
                                            <div className="flex gap-2">
                                              <div className="flex-1">
                                                <Label className="text-xs">URL Imagen:</Label>
                                                <Input 
                                                  value={premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-img`] !== undefined 
                                                    ? premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-img`] 
                                                    : (premio.imagen_url || premio.imagen || '')}
                                                  onChange={(e) => setPremiosImagenesTemp(prev => ({...prev, [`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-img`]: e.target.value}))}
                                                  placeholder="https://..."
                                                  className="mt-1"
                                                />
                                              </div>
                                              <Button
                                                size="sm"
                                                className="self-end"
                                                onClick={async () => {
                                                  const nuevaUrl = premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-img`] !== undefined 
                                                    ? premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-img`] 
                                                    : (premio.imagen_url || premio.imagen || '');
                                                  try {
                                                    await axios.put(`${API}/admin/sorteo/${sorteo.id}/actualizar-etapa-premio-imagen`, {
                                                      etapa_index: etapaIdx,
                                                      premio_index: pIdx,
                                                      imagen_url: nuevaUrl
                                                    }, { withCredentials: true });
                                                    toast.success('Imagen actualizada');
                                                    fetchData();
                                                  } catch (error) {
                                                    toast.error('Error al actualizar');
                                                  }
                                                }}
                                              >
                                                Guardar cambios
                                              </Button>
                                            </div>

                                            <div className="flex gap-2">
                                              <div className="flex-1">
                                                <Label className="text-xs">URL Video:</Label>
                                                <Input 
                                                  value={premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-vid`] !== undefined 
                                                    ? premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-vid`] 
                                                    : (premio.video_url || premio.video || '')}
                                                  onChange={(e) => setPremiosImagenesTemp(prev => ({...prev, [`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-vid`]: e.target.value}))}
                                                  placeholder="https://..."
                                                  className="mt-1"
                                                />
                                              </div>
                                              <Button
                                                size="sm"
                                                className="self-end"
                                                onClick={async () => {
                                                  const nuevaUrl = premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-vid`] !== undefined 
                                                    ? premiosImagenesTemp[`${sorteo.id}-etapa-${etapaIdx}-premio-${pIdx}-vid`] 
                                                    : (premio.video_url || premio.video || '');
                                                  try {
                                                    await axios.put(`${API}/admin/sorteo/${sorteo.id}/actualizar-etapa-premio-video`, {
                                                      etapa_index: etapaIdx,
                                                      premio_index: pIdx,
                                                      video_url: nuevaUrl
                                                    }, { withCredentials: true });
                                                    toast.success('Video actualizado');
                                                    fetchData();
                                                  } catch (error) {
                                                    toast.error('Error al actualizar');
                                                  }
                                                }}
                                              >
                                                Guardar cambios
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-gray-500 ml-4">Sin premios detallados en esta etapa</p>
                                    )}
                                  </div>
                                ))}
                                
                                {/* Mensaje si no hay premios */}
                                {(!sorteo.premios || sorteo.premios.length === 0) && (!sorteo.etapas || sorteo.etapas.length === 0) && (
                                  <p className="text-sm text-gray-500">No hay premios configurados</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
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
                ))}
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

          {/* TAB DE RETIROS */}
          <TabsContent value="retiros" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Retiros de Vendedores</h2>
              <Button onClick={fetchRetiros} variant="outline">
                Actualizar
              </Button>
            </div>
            
            {loadingRetiros ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : retiros.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">No hay retiros pendientes</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {retiros.map((retiro) => (
                  <Card key={retiro.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={
                              retiro.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                              retiro.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {retiro.estado.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm font-semibold">Vendedor:</span>
                              <p className="text-gray-700">{retiro.vendedor?.name}</p>
                              <p className="text-xs text-gray-500">{retiro.vendedor?.email}</p>
                            </div>
                            
                            <div>
                              <span className="text-sm font-semibold">Monto solicitado:</span>
                              <p className="text-2xl font-bold text-green-600">{formatCurrency(retiro.monto)}</p>
                            </div>
                            
                            <div>
                              <span className="text-sm font-semibold">Fecha de solicitud:</span>
                              <p className="text-gray-700">{formatDateTime(retiro.fecha_solicitud)}</p>
                            </div>
                            
                            <div className="border-t pt-2 mt-2">
                              <span className="text-sm font-semibold block mb-1">Datos Bancarios:</span>
                              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                <p><strong>Banco:</strong> {retiro.vendedor?.nombre_banco || 'No especificado'}</p>
                                <p><strong>Tipo:</strong> {retiro.vendedor?.tipo_cuenta || 'No especificado'}</p>
                                <p><strong>Cuenta:</strong> {retiro.vendedor?.numero_cuenta || 'No especificado'}</p>
                                <p><strong>Teléfono:</strong> {retiro.vendedor?.telefono || 'No especificado'}</p>
                                {retiro.vendedor?.whatsapp && retiro.vendedor.whatsapp !== retiro.vendedor.telefono && (
                                  <p><strong>WhatsApp:</strong> {retiro.vendedor.whatsapp}</p>
                                )}
                              </div>
                            </div>
                            
                            {retiro.comprobante_url && (
                              <div>
                                <span className="text-sm font-semibold">Comprobante:</span>
                                <a href={retiro.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                                  Ver comprobante
                                </a>
                              </div>
                            )}
                            
                            {retiro.motivo_rechazo && (
                              <div>
                                <span className="text-sm font-semibold">Motivo de rechazo:</span>
                                <p className="text-red-600">{retiro.motivo_rechazo}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {retiro.estado === 'pendiente' && (
                            <>
                              <Button 
                                onClick={() => {
                                  setRetiroSeleccionado(retiro);
                                  setShowAprobarRetiro(true);
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aprobar
                              </Button>
                              
                              <Button 
                                onClick={() => handleRechazarRetiro(retiro.id)}
                                variant="destructive"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Rechazar
                              </Button>
                            </>
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
      
      {/* Modal para aprobar retiro */}
      <Dialog open={showAprobarRetiro} onOpenChange={setShowAprobarRetiro}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Retiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Monto a aprobar: <strong>{retiroSeleccionado && formatCurrency(retiroSeleccionado.monto)}</strong></p>
            <p>Vendedor: <strong>{retiroSeleccionado?.vendedor?.name}</strong></p>
            
            <div>
              <Label>URL del Comprobante de Transferencia</Label>
              <Input
                type="url"
                value={comprobanteUrl}
                onChange={(e) => setComprobanteUrl(e.target.value)}
                placeholder="https://..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Sube el comprobante a un servicio como Imgur o Google Drive y pega la URL aquí
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAprobarRetiro} className="flex-1 bg-green-600 hover:bg-green-700">
                Aprobar y Enviar
              </Button>
              <Button onClick={() => setShowAprobarRetiro(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para ajustar mínimo de boletos */}
      <Dialog open={editandoMinimo !== null} onOpenChange={() => setEditandoMinimo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Mínimo de Boletos</DialogTitle>
            <DialogDescription>
              Cambia temporalmente el mínimo de boletos para permitir compras menores. Útil cuando faltan pocos boletos para completar el sorteo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nuevo mínimo de boletos por compra</Label>
              <Input
                type="number"
                min="1"
                value={nuevoMinimo}
                onChange={(e) => setNuevoMinimo(parseInt(e.target.value) || 1)}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-2">
                Ejemplo: Si quedan 2 boletos por vender y el mínimo es 5, cámbialo a 1 o 2 para poder completar el sorteo.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => ajustarMinimoBoletos(editandoMinimo, nuevoMinimo)} 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Guardar Cambio
              </Button>
              <Button onClick={() => setEditandoMinimo(null)} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;
