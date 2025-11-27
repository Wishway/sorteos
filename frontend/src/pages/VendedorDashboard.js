import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { DollarSign, ShoppingCart, Link as LinkIcon, LogOut, Home, Copy, CheckCircle, Lock, Building, CreditCard, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VendedorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
    password_actual: '',
    password_nueva: '',
    confirmar_password: ''
  });
  
  const [montoRetiro, setMontoRetiro] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'vendedor') {
      navigate('/login');
      return;
    }
    fetchPerfil();
  }, [user]);

  const fetchPerfil = async () => {
    try {
      const response = await axios.get(`${API}/vendedor/perfil`, { withCredentials: true });
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
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const copyLink = () => {
    const link = `${window.location.origin}/?vendedor=${user.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado al portapapeles');
    setTimeout(() => setCopied(false), 3000);
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
    
    if (passwordData.password_nueva !== passwordData.confirmar_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (passwordData.password_nueva.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      await axios.post(`${API}/vendedor/cambiar-password`, {
        password_actual: passwordData.password_actual,
        password_nueva: passwordData.password_nueva
      }, { withCredentials: true });
      
      toast.success('Contraseña actualizada');
      setShowCambiarPassword(false);
      setPasswordData({ password_actual: '', password_nueva: '', confirmar_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
    }
  };

  const handleSolicitarRetiro = async (e) => {
    e.preventDefault();
    
    const monto = parseFloat(montoRetiro);
    if (isNaN(monto) || monto <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    
    if (monto > perfil.wallet_balance) {
      toast.error(`Saldo insuficiente. Disponible: ${formatCurrency(perfil.wallet_balance)}`);
      return;
    }
    
    try {
      await axios.post(`${API}/vendedor/solicitar-retiro`, { monto }, { withCredentials: true });
      toast.success('Solicitud de retiro enviada. Espere aprobación del administrador.');
      setShowSolicitarRetiro(false);
      setMontoRetiro('');
      fetchPerfil();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al solicitar retiro');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  const linkVendedor = `${window.location.origin}/?vendedor=${user.id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Panel de Vendedor</h1>
            <p className="text-purple-200">Bienvenido, {user.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="bg-white/10 text-white hover:bg-white/20">
              <Home className="w-4 h-4 mr-2" />
              Inicio
            </Button>
            <Button variant="outline" onClick={handleLogout} className="bg-white/10 text-white hover:bg-white/20">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Resumen de Wallet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Saldo Disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-400">{formatCurrency(perfil?.wallet_balance || 0)}</p>
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
              <p className="text-4xl font-bold text-blue-400">{formatCurrency(perfil?.total_comisiones || 0)}</p>
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
                className="w-full"
                variant={copied ? "default" : "outline"}
              >
                {copied ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Copiado</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copiar Link</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Botones de Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button 
            onClick={() => setShowDatosBancarios(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Building className="w-4 h-4 mr-2" />
            {perfil?.datos_bancarios_completos ? 'Editar Datos Bancarios' : 'Completar Datos Bancarios'}
          </Button>
          
          <Button 
            onClick={() => setShowCambiarPassword(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Lock className="w-4 h-4 mr-2" />
            Cambiar Contraseña
          </Button>
          
          <Button 
            onClick={() => setShowSolicitarRetiro(true)}
            disabled={!perfil?.datos_bancarios_completos || perfil?.wallet_balance <= 0}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Solicitar Retiro
          </Button>
        </div>

        {!perfil?.datos_bancarios_completos && (
          <Card className="bg-yellow-500/20 border-yellow-500 mb-6">
            <CardContent className="pt-6">
              <p className="text-white font-semibold">
                ⚠️ Debes completar tus datos bancarios para poder solicitar retiros
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardContent className="p-6">
            <Tabs defaultValue="comisiones" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="comisiones">Comisiones</TabsTrigger>
                <TabsTrigger value="retiros">Retiros</TabsTrigger>
              </TabsList>

              <TabsContent value="comisiones">
                <div className="space-y-4">
                  {perfil?.comisiones && perfil.comisiones.length > 0 ? (
                    perfil.comisiones.map((comision) => (
                      <Card key={comision.id} className="bg-white/5">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-white font-semibold">Sorteo: {comision.sorteo_id}</p>
                              <p className="text-purple-200 text-sm">Boleto: {comision.boleto_id}</p>
                              <p className="text-purple-200 text-sm">{formatDateTime(comision.fecha)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-400">{formatCurrency(comision.monto)}</p>
                              <span className={`text-sm px-2 py-1 rounded ${comision.estado === 'pagado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {comision.estado}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-white text-center py-8">No tienes comisiones registradas aún</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="retiros">
                <div className="space-y-4">
                  {perfil?.retiros && perfil.retiros.length > 0 ? (
                    perfil.retiros.map((retiro) => (
                      <Card key={retiro.id} className="bg-white/5">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-white font-semibold">Retiro #{retiro.id.slice(0, 8)}</p>
                              <p className="text-purple-200 text-sm">Solicitado: {formatDateTime(retiro.fecha_solicitud)}</p>
                              {retiro.fecha_aprobacion && (
                                <p className="text-purple-200 text-sm">Procesado: {formatDateTime(retiro.fecha_aprobacion)}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-white">{formatCurrency(retiro.monto)}</p>
                              <span className={`text-sm px-2 py-1 rounded ${
                                retiro.estado === 'aprobado' ? 'bg-green-500/20 text-green-400' :
                                retiro.estado === 'rechazado' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {retiro.estado}
                              </span>
                            </div>
                          </div>
                          {retiro.comprobante_url && (
                            <div className="mt-2">
                              <a href={retiro.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                                Ver comprobante
                              </a>
                            </div>
                          )}
                          {retiro.motivo_rechazo && (
                            <div className="mt-2">
                              <p className="text-red-400 text-sm">Motivo: {retiro.motivo_rechazo}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-white text-center py-8">No tienes retiros registrados</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Modal Datos Bancarios */}
        <Dialog open={showDatosBancarios} onOpenChange={setShowDatosBancarios}>
          <DialogContent className="bg-purple-900 text-white border-purple-700">
            <DialogHeader>
              <DialogTitle>Datos Bancarios</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGuardarDatosBancarios} className="space-y-4">
              <div>
                <Label>Nombre del Banco</Label>
                <Input 
                  value={datosBancarios.nombre_banco}
                  onChange={(e) => setDatosBancarios({...datosBancarios, nombre_banco: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label>Tipo de Cuenta</Label>
                <Select 
                  value={datosBancarios.tipo_cuenta}
                  onValueChange={(value) => setDatosBancarios({...datosBancarios, tipo_cuenta: value})}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ahorro">Ahorro</SelectItem>
                    <SelectItem value="corriente">Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Número de Cuenta</Label>
                <Input 
                  value={datosBancarios.numero_cuenta}
                  onChange={(e) => setDatosBancarios({...datosBancarios, numero_cuenta: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label>Teléfono</Label>
                <Input 
                  value={datosBancarios.telefono}
                  onChange={(e) => setDatosBancarios({...datosBancarios, telefono: e.target.value})}
                  required
                  placeholder="0999999999"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label>WhatsApp (opcional, si es diferente al teléfono)</Label>
                <Input 
                  value={datosBancarios.whatsapp}
                  onChange={(e) => setDatosBancarios({...datosBancarios, whatsapp: e.target.value})}
                  placeholder="0999999999"
                  className="bg-white/10 border-white/20 text-white"
                />
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
                <Label>Contraseña Actual</Label>
                <Input 
                  type="password"
                  value={passwordData.password_actual}
                  onChange={(e) => setPasswordData({...passwordData, password_actual: e.target.value})}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label>Nueva Contraseña</Label>
                <Input 
                  type="password"
                  value={passwordData.password_nueva}
                  onChange={(e) => setPasswordData({...passwordData, password_nueva: e.target.value})}
                  required
                  minLength={6}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <Label>Confirmar Nueva Contraseña</Label>
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
                <Label>Saldo Disponible: {formatCurrency(perfil?.wallet_balance || 0)}</Label>
              </div>
              
              <div>
                <Label>Monto a Retirar</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={montoRetiro}
                  onChange={(e) => setMontoRetiro(e.target.value)}
                  required
                  max={perfil?.wallet_balance || 0}
                  placeholder="0.00"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              {perfil?.datos_bancarios_completos && (
                <div className="bg-white/5 p-4 rounded">
                  <p className="text-sm text-purple-200 mb-2">Se depositará en:</p>
                  <p className="text-white"><strong>Banco:</strong> {perfil.nombre_banco}</p>
                  <p className="text-white"><strong>Tipo:</strong> {perfil.tipo_cuenta}</p>
                  <p className="text-white"><strong>Cuenta:</strong> {perfil.numero_cuenta}</p>
                </div>
              )}
              
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