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
    color_secundario: '#06B6D4', reglas: '', imagenes: [], etapas: []
  });

  const [etapaForm, setEtapaForm] = useState({ numero: 1, porcentaje: '', premio: '' });

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
        axios.get(`${API}/sorteos`, { withCredentials: true }),
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
      toast.error('Completa todos los campos de la etapa');
      return;
    }
    const nuevaEtapa = {
      numero: formData.etapas.length + 1,
      porcentaje: parseFloat(etapaForm.porcentaje),
      premio: etapaForm.premio,
      completado: false
    };
    setFormData(prev => ({ ...prev, etapas: [...prev.etapas, nuevaEtapa] }));
    setEtapaForm({ numero: formData.etapas.length + 2, porcentaje: '', premio: '' });
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
        color_secundario: '#06B6D4', reglas: '', imagenes: [], etapas: []
      });
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

  const cambiarRoleUsuario = async (userId, newRole) => {
    try {
      await axios.put(`${API}/admin/usuario/${userId}/role?role=${newRole}`, {}, { withCredentials: true });
      toast.success('Role actualizado exitosamente');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar role');
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

  const handleAprobarBoleto = async (boletoId) => {
    try {
      await axios.put(`${API}/admin/boleto/${boletoId}/aprobar`, {}, { withCredentials: true });
      toast.success('Boleto aprobado exitosamente');
      fetchBoletosPendientes();
      fetchData();
    } catch (error) {
      toast.error('Error al aprobar boleto');
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

                    {formData.tipo === 'etapas' && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Etapas</h3>
                        {formData.etapas.map((etapa, index) => (
                          <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
                            <span className="flex-1">Etapa {etapa.numero}: {etapa.premio} ({etapa.porcentaje}%)</span>
                            <Button type="button" variant="destructive" size="sm" onClick={() => eliminarEtapa(index)}>Eliminar</Button>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-3">
                          <Input placeholder="% (ej: 25)" type="number" value={etapaForm.porcentaje} 
                            onChange={(e) => setEtapaForm(prev => ({ ...prev, porcentaje: e.target.value }))} />
                          <Input placeholder="Premio" value={etapaForm.premio} 
                            onChange={(e) => setEtapaForm(prev => ({ ...prev, premio: e.target.value }))} />
                          <Button type="button" onClick={agregarEtapa}>Agregar</Button>
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
                {sorteos.map((sorteo) => (
                  <Card key={sorteo.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold">{sorteo.titulo}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              sorteo.estado === 'activo' ? 'bg-green-100 text-green-700' :
                              sorteo.estado === 'completado' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>{sorteo.estado}</span>
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
                        {sorteo.estado === 'activo' && (
                          <Button onClick={() => ejecutarSorteo(sorteo.id)} data-testid={`ejecutar-sorteo-${sorteo.id}`}>
                            <Play className="w-4 h-4 mr-2" />Ejecutar Final
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Gestión de Usuarios</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid gap-4">
                {usuarios.map((usuario) => (
                  <Card key={usuario.id} className="sorteo-card">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold">{usuario.name}</h3>
                          <p className="text-sm text-gray-600">{usuario.email}</p>
                          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                            usuario.role === 'admin' ? 'bg-red-100 text-red-700' :
                            usuario.role === 'vendedor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>{usuario.role}</span>
                        </div>
                        <Select value={usuario.role} onValueChange={(value) => cambiarRoleUsuario(usuario.id, value)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usuario">Usuario</SelectItem>
                            <SelectItem value="vendedor">Vendedor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
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
                          
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => handleAprobarBoleto(boleto.id)}
                            data-testid={`aprobar-boleto-${boleto.id}`}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar
                          </Button>
                          
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
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
