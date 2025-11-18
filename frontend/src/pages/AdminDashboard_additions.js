// Agregar al inicio del componente AdminDashboard:
const [boletosPendientes, setBoletosPendientes] = useState([]);
const [loadingPendientes, setLoadingPendientes] = useState(false);
const [showChangePassword, setShowChangePassword] = useState(false);
const [passwordActual, setPasswordActual] = useState('');
const [passwordNueva, setPasswordNueva] = useState('');
const [passwordConfirm, setPasswordConfirm] = useState('');

// Agregar después de fetchData:
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

// Modificar useEffect para cargar boletos pendientes:
useEffect(() => {
  if (!user || user.role !== 'admin') {
    navigate('/login');
    return;
  }
  fetchData();
  fetchBoletosPendientes();
}, [user]);

// Agregar nueva pestaña en TabsList:
<TabsTrigger value="pendientes" data-testid="tab-pendientes">Boletos Pendientes ({boletosPendientes.length})</TabsTrigger>

// Agregar nuevo TabsContent después de usuarios:
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
                  Aprobar
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleRechazarBoleto(boleto.id)}
                  data-testid={`rechazar-boleto-${boleto.id}`}
                >
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
