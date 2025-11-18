import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Calendar, DollarSign, Trophy, CheckCircle, Clock, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SorteoLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sorteo, setSorteo] = useState(null);
  const [ganadores, setGanadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [numerosBoletos, setNumerosBoletos] = useState(['']);
  const [comprando, setComprando] = useState(false);
  const [showDatosBancarios, setShowDatosBancarios] = useState(false);
  const [numerosDisponibles, setNumerosDisponibles] = useState([]);
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [configuracionAdmin, setConfiguracionAdmin] = useState(null);
  
  const vendedorLink = new URLSearchParams(window.location.search).get('ref');

  useEffect(() => {
    fetchSorteoData();
    fetchConfiguracion();
  }, [slug]);

  const fetchSorteoData = async () => {
    try {
      const [sorteoRes, ganadoresRes] = await Promise.all([
        axios.get(`${API}/sorteos/slug/${slug}`),
        axios.get(`${API}/ganadores/sorteo/${slug}`).catch(() => ({ data: [] }))
      ]);
      
      setSorteo(sorteoRes.data);
      setGanadores(ganadoresRes.data);
      
      // Fetch available numbers
      const numerosRes = await axios.get(`${API}/sorteos/${sorteoRes.data.id}/numeros-disponibles`);
      setNumerosDisponibles(numerosRes.data.disponibles);
    } catch (error) {
      console.error('Error al cargar sorteo:', error);
      toast.error('Error al cargar el sorteo');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfiguracion = async () => {
    try {
      const response = await axios.get(`${API}/configuracion-publica`);
      setConfiguracionAdmin(response.data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const handleCantidadChange = (nuevaCantidad) => {
    const num = parseInt(nuevaCantidad) || 1;
    setCantidad(num);
    const nuevosNumeros = Array(num).fill('').map((_, i) => numerosBoletos[i] || '');
    setNumerosBoletos(nuevosNumeros);
  };

  const handleNumeroChange = (index, valor) => {
    const nuevosNumeros = [...numerosBoletos];
    nuevosNumeros[index] = valor;
    setNumerosBoletos(nuevosNumeros);
  };

  const handleComprar = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para comprar boletos');
      navigate('/login');
      return;
    }

    // Validate all numbers are filled
    const numerosValidos = numerosBoletos.filter(n => n.trim() !== '').map(n => parseInt(n));
    if (numerosValidos.length !== cantidad) {
      toast.error('Debes ingresar todos los números de boleto');
      return;
    }

    // Check for duplicates
    const duplicados = numerosValidos.filter((n, i) => numerosValidos.indexOf(n) !== i);
    if (duplicados.length > 0) {
      toast.error(`Números duplicados: ${duplicados.join(', ')}`);
      return;
    }

    setComprando(true);

    try {
      const response = await axios.post(
        `${API}/boletos/comprar`,
        {
          sorteo_id: sorteo.id,
          numeros_boletos: numerosValidos,
          metodo_pago: 'transferencia',
          vendedor_link: vendedorLink,
          comprobante_url: comprobanteUrl
        },
        { withCredentials: true }
      );

      toast.success(response.data.message);
      setShowDatosBancarios(false);
      setCantidad(1);
      setNumerosBoletos(['']);
      setComprobanteUrl('');
      fetchSorteoData();
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('completar tus datos')) {
        toast.error('Debes completar tus datos antes de comprar');
        navigate('/completar-datos');
      } else {
        toast.error(error.response?.data?.detail || 'Error al comprar boletos');
      }
    } finally {
      setComprando(false);
    }
  };

  const copyDatosBancarios = () => {
    if (sorteo?.datos_bancarios) {
      navigator.clipboard.writeText(sorteo.datos_bancarios);
      toast.success('Datos bancarios copiados');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!sorteo) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-background">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Sorteo no encontrado</h2>
          <Link to="/">
            <Button>Volver al inicio</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const boletosDisponibles = sorteo.cantidad_total_boletos - sorteo.cantidad_vendida;

  return (
    <div className="min-h-screen gradient-background">
      <div className="relative h-96 overflow-hidden">
        {sorteo.imagenes && sorteo.imagenes.length > 0 ? (
          <img 
            src={sorteo.imagenes[0]} 
            alt={sorteo.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: sorteo.color_primario }}
          >
            <Trophy className="w-32 h-32 text-white opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-6xl mx-auto">
            <Badge className="mb-4" style={{ backgroundColor: sorteo.color_secundario }}>
              {sorteo.tipo === 'etapas' ? 'Sorteo por Etapas' : 'Sorteo Único'}
            </Badge>
            <h1 className="text-5xl font-bold mb-2" data-testid="sorteo-titulo">{sorteo.titulo}</h1>
            <p className="text-xl opacity-90">{sorteo.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="sorteo-card" data-testid="progress-card">
              <CardHeader>
                <CardTitle>Progreso del Sorteo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-semibold">Boletos vendidos</span>
                      <span className="text-2xl font-bold" style={{ color: sorteo.color_primario }}>
                        {sorteo.progreso_porcentaje.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={sorteo.progreso_porcentaje} className="h-4" />
                    <p className="text-sm text-gray-600 mt-2">
                      {sorteo.cantidad_vendida} de {sorteo.cantidad_total_boletos} boletos
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-blue-100">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Precio por boleto</p>
                        <p className="text-lg font-bold">{formatCurrency(sorteo.precio_boleto)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-green-100">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cierre</p>
                        <p className="text-lg font-bold">{formatDate(sorteo.fecha_cierre)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {sorteo.tipo === 'etapas' && sorteo.etapas.length > 0 && (
              <Card className="sorteo-card">
                <CardHeader>
                  <CardTitle>Etapas del Sorteo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sorteo.etapas.map((etapa) => (
                      <div 
                        key={etapa.numero} 
                        className={`p-4 rounded-lg border-2 ${etapa.completado ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
                        data-testid={`etapa-${etapa.numero}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={etapa.completado ? 'default' : 'secondary'}>
                                Etapa {etapa.numero}
                              </Badge>
                              {etapa.completado && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <p className="font-semibold text-lg">{etapa.premio}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Se activa al {etapa.porcentaje}% de boletos vendidos
                            </p>
                            {etapa.completado && etapa.fecha_sorteo && (
                              <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Sorteado el {formatDateTime(etapa.fecha_sorteo)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold" style={{ color: sorteo.color_primario }}>
                              {etapa.porcentaje}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="descripcion" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="descripcion">Descripción</TabsTrigger>
                <TabsTrigger value="ganadores">Ganadores</TabsTrigger>
              </TabsList>
              <TabsContent value="descripcion">
                <Card className="sorteo-card">
                  <CardHeader>
                    <CardTitle>Detalles del Sorteo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-line">{sorteo.descripcion}</p>
                      {sorteo.reglas && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-2">Reglas y Condiciones</h3>
                          <p className="text-gray-700 whitespace-pre-line">{sorteo.reglas}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="ganadores">
                <Card className="sorteo-card">
                  <CardHeader>
                    <CardTitle>Ganadores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ganadores.length === 0 ? (
                      <div className="text-center py-8 text-gray-600">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Aún no hay ganadores</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {ganadores.map((ganador) => (
                          <div key={ganador.id} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-400">
                            <div className="flex items-center gap-3">
                              <Trophy className="w-8 h-8 text-yellow-600" />
                              <div>
                                <p className="font-semibold text-lg">
                                  {ganador.etapa_numero ? `Etapa ${ganador.etapa_numero}` : 'Gran Premio'}
                                </p>
                                <p className="text-gray-700">{ganador.premio}</p>
                                <p className="text-sm text-gray-600">
                                  Ganado el {formatDateTime(ganador.fecha_sorteo)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <Card className="sorteo-card sticky top-4" data-testid="compra-card">
              <CardHeader>
                <CardTitle>Comprar Boleto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sorteo.estado === 'activo' && boletosDisponibles > 0 ? (
                  <>
                    <div>
                      <Label htmlFor="numero_boleto">Número de boleto</Label>
                      <Input
                        id="numero_boleto"
                        type="number"
                        min="1"
                        max={sorteo.cantidad_total_boletos}
                        value={numeroBoleto}
                        onChange={(e) => setNumeroBoleto(e.target.value)}
                        placeholder="Ej: 42"
                        className="w-full"
                        data-testid="numero-boleto-input"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Elige un número entre 1 y {sorteo.cantidad_total_boletos}
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-2xl font-bold" style={{ color: sorteo.color_primario }}>
                          {formatCurrency(sorteo.precio_boleto)}
                        </span>
                      </div>
                      
                      <Button
                        className="w-full mb-2"
                        style={{ backgroundColor: sorteo.color_primario }}
                        onClick={() => setShowDatosBancarios(true)}
                        disabled={!numeroBoleto}
                        data-testid="ver-datos-bancarios-btn"
                      >
                        Ver Datos Bancarios
                      </Button>

                      <p className="text-xs text-center text-gray-600 mt-2">
                        Método de pago: Transferencia bancaria
                      </p>
                    </div>

                    <Dialog open={showDatosBancarios} onOpenChange={setShowDatosBancarios}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Datos para Transferencia</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            {sorteo.datos_bancarios ? (
                              <>
                                <pre className="text-sm whitespace-pre-wrap font-mono">
                                  {sorteo.datos_bancarios}
                                </pre>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-2"
                                  onClick={copyDatosBancarios}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copiar
                                </Button>
                              </>
                            ) : (
                              <p className="text-sm">
                                Banco: Banco del Pichincha<br />
                                Cuenta: 1234567890<br />
                                Beneficiario: WishWay EC<br />
                                Monto: {formatCurrency(sorteo.precio_boleto)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700">
                              Tu boleto quedará en estado PENDIENTE hasta que el administrador apruebe el pago.
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="comprobante">URL del Comprobante (Opcional)</Label>
                            <Input
                              id="comprobante"
                              type="url"
                              value={comprobanteUrl}
                              onChange={(e) => setComprobanteUrl(e.target.value)}
                              placeholder="https://..."
                            />
                          </div>

                          <Button
                            className="w-full"
                            onClick={handleComprar}
                            disabled={comprando}
                            data-testid="confirmar-compra-btn"
                          >
                            {comprando ? 'Procesando...' : 'Confirmar Compra'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {vendedorLink && (
                      <p className="text-xs text-center text-gray-600">
                        Compra referida por vendedor
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-600 font-semibold mb-2">
                      {sorteo.estado === 'completado' ? 'Sorteo Finalizado' : 'Sorteo no disponible'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {boletosDisponibles === 0 ? 'Todos los boletos han sido vendidos' : ''}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SorteoLanding;
