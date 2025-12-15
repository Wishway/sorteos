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
import Countdown from '../components/Countdown';
import referralService from '../services/referralService';

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
  const [otrosSorteos, setOtrosSorteos] = useState([]);
  
  const vendedorLink = new URLSearchParams(window.location.search).get('ref');

  useEffect(() => {
    fetchSorteoData();
    fetchConfiguracion();
    fetchOtrosSorteos();
  }, [slug]);

  const fetchSorteoData = async () => {
    try {
      const [sorteoRes, ganadoresRes] = await Promise.all([
        axios.get(`${API}/sorteos/slug/${slug}`),
        axios.get(`${API}/ganadores/sorteo/${slug}`).catch(() => ({ data: [] }))
      ]);
      
      const sorteoData = sorteoRes.data;
      setSorteo(sorteoData);
      setGanadores(ganadoresRes.data);
      
      // Inicializar cantidad con el mínimo de boletos
      const cantidadMinima = sorteoData.cantidad_minima_boletos || 1;
      setCantidad(cantidadMinima);
      
      // Fetch available numbers primero
      const numerosRes = await axios.get(`${API}/sorteos/${sorteoData.id}/numeros-disponibles`);
      const disponibles = numerosRes.data.disponibles;
      setNumerosDisponibles(disponibles);
      
      // CAMBIO: Asignar números aleatorios al inicializar
      if (disponibles && disponibles.length > 0) {
        const disponiblesCopia = [...disponibles];
        const numerosIniciales = [];
        for (let i = 0; i < cantidadMinima && disponiblesCopia.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * disponiblesCopia.length);
          numerosIniciales.push(disponiblesCopia[randomIndex].toString());
          disponiblesCopia.splice(randomIndex, 1);
        }
        setNumerosBoletos(numerosIniciales);
      } else {
        setNumerosBoletos(Array(cantidadMinima).fill(''));
      }
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

  const fetchOtrosSorteos = async () => {
    try {
      const response = await axios.get(`${API}/sorteos`);
      // Filter published/active raffles excluding the current one
      const activos = response.data.filter(s => 
        (s.estado === 'published' || s.estado === 'activo') && s.landing_slug !== slug
      ).slice(0, 3); // Show max 3 other raffles
      setOtrosSorteos(activos);
    } catch (error) {
      console.error('Error al cargar otros sorteos:', error);
    }
  };

  // NUEVA FUNCIÓN: Asignar números aleatorios disponibles
  const asignarNumerosAleatorios = (cantidad) => {
    if (!numerosDisponibles || numerosDisponibles.length === 0) {
      return Array(cantidad).fill('');
    }
    
    // Copiar array de disponibles
    const disponiblesCopia = [...numerosDisponibles];
    const numerosAsignados = [];
    
    for (let i = 0; i < cantidad && disponiblesCopia.length > 0; i++) {
      // Seleccionar índice aleatorio
      const randomIndex = Math.floor(Math.random() * disponiblesCopia.length);
      numerosAsignados.push(disponiblesCopia[randomIndex].toString());
      // Remover el número seleccionado para no repetirlo
      disponiblesCopia.splice(randomIndex, 1);
    }
    
    // Si no hay suficientes disponibles, rellenar con vacíos
    while (numerosAsignados.length < cantidad) {
      numerosAsignados.push('');
    }
    
    return numerosAsignados;
  };

  const handleCantidadChange = (nuevaCantidad) => {
    const num = parseInt(nuevaCantidad) || 1;
    const minimo = sorteo?.cantidad_minima_boletos || 1;
    
    // No permitir menos del mínimo
    if (num < minimo) {
      toast.error(`La compra mínima es de ${minimo} boletos`);
      return;
    }
    
    setCantidad(num);
    // CAMBIO: Asignar números aleatorios en lugar de vacíos
    const nuevosNumeros = asignarNumerosAleatorios(num);
    setNumerosBoletos(nuevosNumeros);
  };

  const handleNumeroChange = (index, valor) => {
    const nuevosNumeros = [...numerosBoletos];
    nuevosNumeros[index] = valor;
    setNumerosBoletos(nuevosNumeros);
  };
  
  const validarTodosLosNumeros = async () => {
    // Validar todos los números antes de proceder con la compra
    const errores = [];
    
    // Validar cantidad mínima
    const cantidadMinima = sorteo.cantidad_minima_boletos || 1;
    if (numerosBoletos.length < cantidadMinima) {
      errores.push(`Debes comprar al menos ${cantidadMinima} boleto(s)`);
      return errores;
    }
    
    for (let i = 0; i < numerosBoletos.length; i++) {
      const numero = parseInt(numerosBoletos[i]);
      
      // Validar que se haya ingresado un número
      if (!numero) {
        errores.push(`Debe ingresar un número para el boleto ${i + 1}`);
        continue;
      }
      
      // Validar rango
      if (numero < 1 || numero > sorteo.cantidad_total_boletos) {
        errores.push(`El boleto ${i + 1} debe estar entre 1 y ${sorteo.cantidad_total_boletos}`);
        continue;
      }
      
      // Validar duplicados en la misma compra
      for (let j = i + 1; j < numerosBoletos.length; j++) {
        if (parseInt(numerosBoletos[j]) === numero) {
          errores.push(`El número ${numero} está repetido en la compra`);
          break;
        }
      }
      
      // Validar disponibilidad en backend
      try {
        const response = await axios.post(
          `${API}/sorteos/${sorteo.id}/validar-numero`,
          { numero },
          { withCredentials: true }
        );
        
        if (!response.data.disponible) {
          errores.push(response.data.mensaje);
        }
      } catch (error) {
        console.error('Error al validar número:', error);
        errores.push(`Error al validar el número ${numero}`);
      }
    }
    
    return errores;
  };

  const handleVerDatosBancarios = async () => {
    // Validar todos los números antes de mostrar los datos bancarios
    const errores = await validarTodosLosNumeros();
    
    if (errores.length > 0) {
      // Mostrar todos los errores al usuario
      errores.forEach(error => {
        toast.error(error);
      });
      return;
    }
    
    // Si no hay errores, mostrar el diálogo de datos bancarios
    setShowDatosBancarios(true);
  };

  const handleComprar = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para comprar boletos');
      navigate('/login');
      return;
    }

    // Validate minimum purchase quantity
    if (sorteo.cantidad_minima_boletos && cantidad < sorteo.cantidad_minima_boletos) {
      toast.error(`Debes comprar al menos ${sorteo.cantidad_minima_boletos} boleto(s)`);
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
      // Obtener vendedor_id desde referralService
      const vendedorId = referralService.getVendedorForPurchase();
      
      const response = await axios.post(
        `${API}/boletos/comprar`,
        {
          sorteo_id: sorteo.id,
          numeros_boletos: numerosValidos,
          metodo_pago: 'transferencia',
          vendedor_id: vendedorId,  // Enviar vendedor_id
          vendedor_link: vendedorLink,
          comprobante_url: comprobanteUrl
        },
        { withCredentials: true }
      );

      toast.success(response.data.message);
      
      // Limpiar vendedor después de compra exitosa
      if (vendedorId) {
        referralService.clearVendedor();
        console.log('✅ Vendedor limpiado después de compra exitosa');
      }
      
      setShowDatosBancarios(false);
      setCantidad(1);
      setNumerosBoletos(['']);
      setComprobanteUrl('');
      
      // REDIRIGIR AL PANEL DEL USUARIO - BOLETOS PENDIENTES
      toast.info('Redirigiendo a tu panel para ver tus boletos pendientes...');
      setTimeout(() => {
        navigate('/usuario?tab=boletos');
      }, 1500);
      
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
    if (configuracionAdmin) {
      const datos = `Banco: ${configuracionAdmin.banco}
Tipo: ${configuracionAdmin.tipo_cuenta}
Cuenta: ${configuracionAdmin.numero_cuenta}
Titular: ${configuracionAdmin.nombre_titular}
Cédula/RUC: ${configuracionAdmin.cedula_ruc}`;
      navigator.clipboard.writeText(datos);
      toast.success('Datos bancarios copiados');
    }
  };

  const abrirWhatsApp = () => {
    if (configuracionAdmin?.numero_whatsapp) {
      const mensaje = encodeURIComponent(`Hola, realicé una compra de boleto(s) para el sorteo: ${sorteo.titulo}`);
      window.open(`https://wa.me/${configuracionAdmin.numero_whatsapp.replace(/\D/g, '')}?text=${mensaje}`, '_blank');
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
      {/* Botón Volver al Inicio */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <Link to="/">
          <Button variant="outline" className="mb-4">
            ← Volver al Inicio
          </Button>
        </Link>
      </div>

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

            {/* Contador regresivo */}
            {(sorteo.estado === 'published' || sorteo.estado === 'waiting') && (
              <Card className="sorteo-card bg-gradient-to-br from-purple-50 to-blue-50 border-2" style={{ borderColor: sorteo.color_primario }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    {sorteo.estado === 'published' ? 'Sorteo Inicia En:' : 'Sorteo Por Comenzar'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Fecha: {formatDateTime(sorteo.fecha_cierre)}
                    </p>
                    {new Date(sorteo.fecha_cierre) > new Date() ? (
                      <Countdown 
                        targetDate={sorteo.fecha_cierre} 
                        className="justify-center"
                        darkMode={true}
                      />
                    ) : (
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-600">¡El sorteo ya está activo!</p>
                        <p className="text-sm text-gray-600 mt-2">Participa antes del cierre</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {sorteo.tipo === 'etapas' && sorteo.etapas.length > 0 && (
              <Card className="sorteo-card">
                <CardHeader>
                  <CardTitle>Etapas del Sorteo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sorteo.etapas.map((etapa) => {
                      // Buscar ganadores de esta etapa
                      const ganadoresEtapa = sorteo.ganadores 
                        ? sorteo.ganadores.filter(g => g.etapa === etapa.numero || g.etapa_numero === etapa.numero)
                        : [];
                      const tieneGanadores = ganadoresEtapa.length > 0;
                      const etapaCompletada = etapa.completado || tieneGanadores;
                      
                      return (
                        <div 
                          key={etapa.numero} 
                          className={`p-4 rounded-lg border-2 ${etapaCompletada ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
                          data-testid={`etapa-${etapa.numero}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={etapaCompletada ? 'default' : 'secondary'}>
                                  Etapa {etapa.numero}
                                </Badge>
                                {etapaCompletada && (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                              <p className="font-semibold text-lg">{etapa.nombre || etapa.premio}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Se activa al {etapa.porcentaje}% de boletos vendidos
                              </p>
                              {(etapa.completado && etapa.fecha_sorteo) && (
                                <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Sorteado el {formatDateTime(etapa.fecha_sorteo)}
                                </p>
                              )}
                              
                              {/* GANADORES Y PREMIOS DE ESTA ETAPA */}
                              {etapa.premios && etapa.premios.length > 0 && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                                  <p className="text-sm font-semibold text-yellow-800 mb-2">🏆 Premios y Ganadores:</p>
                                  <div className="space-y-2">
                                    {etapa.premios.map((premio, pIdx) => {
                                      // Buscar si este premio tiene ganador
                                      const ganadorPremio = ganadoresEtapa.find(g => 
                                        g.premio === premio.nombre || 
                                        g.premio === premio.nombre_premio ||
                                        (pIdx === 0 && ganadoresEtapa.length > 0 && !ganadoresEtapa[0].premio)
                                      );
                                      
                                      return (
                                        <div key={pIdx} className={`text-sm p-2 rounded border ${ganadorPremio ? 'bg-green-100 border-green-300' : 'bg-white'}`}>
                                          <p className="font-semibold">{premio.nombre}</p>
                                          {ganadorPremio ? (
                                            <p className="text-green-700">
                                              ✅ Ganador: {ganadorPremio.nombre_usuario || ganadorPremio.nombre || 'Ganador'} - Boleto #{ganadorPremio.numero_boleto}
                                            </p>
                                          ) : (
                                            <p className="text-gray-500 italic">⏳ Pendiente de sortear</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Si no hay premios detallados pero hay ganadores, mostrar solo ganadores */}
                              {(!etapa.premios || etapa.premios.length === 0) && tieneGanadores && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                                  <p className="text-sm font-semibold text-yellow-800 mb-2">🏆 Ganadores:</p>
                                  <div className="space-y-2">
                                    {ganadoresEtapa.map((ganador, gIdx) => (
                                      <div key={gIdx} className="text-sm bg-white p-2 rounded border">
                                        <p className="font-semibold">{ganador.nombre_usuario || ganador.nombre || 'Ganador'}</p>
                                        <p className="text-gray-600">Boleto #{ganador.numero_boleto} - {ganador.premio}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold" style={{ color: sorteo.color_primario }}>
                                {etapa.porcentaje}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sección de Premios */}
            <Card className="sorteo-card">
              <CardHeader>
                <CardTitle>Premios del Sorteo</CardTitle>
              </CardHeader>
              <CardContent>
                {sorteo.tipo === 'etapas' ? (
                  /* Premios agrupados por etapa */
                  <div className="space-y-6">
                    {sorteo.etapas.map((etapa) => (
                      <div key={etapa.numero} className="border-b pb-6 last:border-b-0">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <Badge style={{ backgroundColor: sorteo.color_primario }}>
                            Etapa {etapa.numero}
                          </Badge>
                          {etapa.nombre || etapa.premio}
                        </h3>
                        
                        {/* TODOS los premios de esta etapa */}
                        {etapa.premios && etapa.premios.length > 0 ? (
                          <div className="space-y-4">
                            {etapa.premios.map((premio, pIdx) => (
                              <div key={pIdx} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Trophy className="w-5 h-5 text-yellow-500" />
                                  <h4 className="font-semibold text-lg">{premio.nombre}</h4>
                                </div>
                                {premio.descripcion && (
                                  <p className="text-gray-600 mb-3">{premio.descripcion}</p>
                                )}
                                
                                {/* Imagen del premio */}
                                {(premio.imagen_url || premio.imagen) && (
                                  <div className="mb-3">
                                    <img 
                                      src={premio.imagen_url || premio.imagen} 
                                      alt={premio.nombre}
                                      className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow"
                                    />
                                  </div>
                                )}
                                
                                {/* Video del premio (EMBED YouTube) */}
                                {(premio.video_url || premio.video) && (
                                  <div className="aspect-video">
                                    {(() => {
                                      const videoUrl = premio.video_url || premio.video;
                                      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                      const match = videoUrl.match(regExp);
                                      const isYouTube = match && match[2].length === 11;
                                      
                                      if (isYouTube) {
                                        return (
                                          <iframe
                                            src={`https://www.youtube.com/embed/${match[2]}`}
                                            title={`Video ${premio.nombre}`}
                                            className="w-full h-full rounded-lg shadow-md"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                          ></iframe>
                                        );
                                      } else {
                                        return (
                                          <a 
                                            href={videoUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline flex items-center gap-2"
                                          >
                                            🎬 Ver video del premio
                                          </a>
                                        );
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Si no hay premios detallados, mostrar el nombre del premio de la etapa */
                          <p className="text-gray-600">{etapa.premio}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Premios para sorteo normal (único) */
                  <div className="space-y-6">
                    {sorteo.premios && sorteo.premios.length > 0 ? (
                      sorteo.premios.map((premio, idx) => (
                        <div key={idx} className="border-b pb-6 last:border-b-0">
                          <h3 className="text-xl font-bold mb-4">
                            {premio.nombre}
                          </h3>
                          {premio.descripcion && (
                            <p className="text-gray-600 mb-4">{premio.descripcion}</p>
                          )}
                          
                          {/* Imagen del premio */}
                          {premio.imagen_url && (
                            <div className="mb-4">
                              <img 
                                src={premio.imagen_url} 
                                alt={premio.nombre}
                                className="w-full h-64 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow"
                              />
                            </div>
                          )}
                          
                          {/* Video del premio (EMBED) */}
                          {premio.video_url && (
                            <div className="aspect-video">
                              <iframe
                                src={(() => {
                                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                  const match = premio.video_url.match(regExp);
                                  return (match && match[2].length === 11) 
                                    ? `https://www.youtube.com/embed/${match[2]}`
                                    : premio.video_url;
                                })()}
                                title={`Video ${premio.nombre}`}
                                className="w-full h-full rounded-lg shadow-md"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          )}
                          
                          {!premio.imagen_url && !premio.video_url && (
                            <p className="text-gray-500 text-sm italic">No hay imágenes o videos para este premio</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No hay premios configurados</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GALERÍA DE IMÁGENES PROMOCIONALES DEL SORTEO */}
            {sorteo.imagenes && sorteo.imagenes.length > 0 && (
              <Card className="sorteo-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📸 Imágenes del Sorteo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {sorteo.imagenes.map((imgUrl, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={imgUrl} 
                          alt={`${sorteo.titulo} - Imagen ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                          onClick={() => window.open(imgUrl, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg"></div>
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
                      <p className="text-gray-700 whitespace-pre-line break-words overflow-wrap-anywhere">{sorteo.descripcion}</p>
                      {sorteo.reglas && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-2">Reglas y Condiciones</h3>
                          <p className="text-gray-700 whitespace-pre-line break-words overflow-wrap-anywhere">{sorteo.reglas}</p>
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
                    {sorteo.ganadores && sorteo.ganadores.length > 0 ? (
                      <div className="space-y-4">
                        {sorteo.ganadores.map((ganador, idx) => (
                          <div key={idx} className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-400">
                            <div className="flex items-center gap-3">
                              <Trophy className="w-8 h-8 text-yellow-600" />
                              <div className="flex-1">
                                <p className="font-semibold text-lg text-gray-900">
                                  {ganador.nombre || ganador.email}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                  <span className="font-semibold">Boleto #{ganador.numero_boleto}</span>
                                  {sorteo.tipo === 'etapas' && ganador.etapa && (
                                    <>
                                      <span>•</span>
                                      <span>Etapa {ganador.etapa}</span>
                                    </>
                                  )}
                                </div>
                                <p className="text-gray-700 mt-1">
                                  <span className="font-medium">Premio:</span> {ganador.premio}
                                </p>
                                {ganador.fecha_seleccion && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Ganado el {new Date(ganador.fecha_seleccion).toLocaleDateString('es-EC', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-600">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Aún no hay ganadores para este sorteo</p>
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
                {(sorteo.estado === 'published' || sorteo.estado === 'activo' || sorteo.estado === 'waiting') && boletosDisponibles > 0 ? (
                  <>
                    <div>
                      <Label htmlFor="cantidad">¿Cuántos boletos?</Label>
                      <Input
                        id="cantidad"
                        type="number"
                        min={sorteo.cantidad_minima_boletos || 1}
                        max={Math.min(boletosDisponibles, 50)}
                        value={cantidad}
                        onChange={(e) => handleCantidadChange(e.target.value)}
                        className="w-full"
                        data-testid="cantidad-input"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {sorteo.cantidad_minima_boletos > 1 
                          ? `Mínimo ${sorteo.cantidad_minima_boletos} boletos`
                          : `Puedes comprar hasta ${Math.min(boletosDisponibles, 50)} boletos`
                        }
                      </p>
                    </div>

                    <div>
                      <Label>Números de boletos</Label>
                      <div className="space-y-2">
                        {numerosBoletos.map((numero, index) => (
                          <div key={index}>
                            <Input
                              type="number"
                              min="1"
                              max={sorteo.cantidad_total_boletos}
                              value={numero}
                              onChange={(e) => handleNumeroChange(index, e.target.value)}
                              placeholder={`Número del boleto ${index + 1}`}
                              className="w-full"
                              data-testid={`numero-boleto-input-${index}`}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Elige números entre 1 y {sorteo.cantidad_total_boletos}
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-2xl font-bold" style={{ color: sorteo.color_primario }}>
                          {formatCurrency(sorteo.precio_boleto * cantidad)}
                        </span>
                      </div>
                      
                      <Button
                        className="w-full mb-2"
                        style={{ backgroundColor: sorteo.color_primario }}
                        onClick={handleVerDatosBancarios}
                        disabled={numerosBoletos.some(n => !n)}
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
                            {configuracionAdmin ? (
                              <div className="text-sm space-y-1">
                                <p><span className="font-semibold">Banco:</span> {configuracionAdmin.banco}</p>
                                <p><span className="font-semibold">Tipo de cuenta:</span> {configuracionAdmin.tipo_cuenta}</p>
                                <p><span className="font-semibold">Número de cuenta:</span> {configuracionAdmin.numero_cuenta}</p>
                                <p><span className="font-semibold">Titular:</span> {configuracionAdmin.nombre_titular}</p>
                                <p><span className="font-semibold">Cédula/RUC:</span> {configuracionAdmin.cedula_ruc}</p>
                                <p className="text-lg font-bold mt-2">
                                  <span className="font-semibold">Monto a transferir:</span> {formatCurrency(sorteo.precio_boleto * cantidad)}
                                </p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-2"
                                  onClick={copyDatosBancarios}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copiar datos
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm">Cargando datos bancarios...</p>
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

                          {configuracionAdmin?.numero_whatsapp && (
                            <div className="pt-3 border-t">
                              <p className="text-sm text-gray-600 mb-2 text-center">
                                ¿Ya realizaste la transferencia?
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-green-50 hover:bg-green-100"
                                onClick={abrirWhatsApp}
                                data-testid="whatsapp-btn"
                              >
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                Enviar comprobante por WhatsApp
                              </Button>
                            </div>
                          )}
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

        {/* Promotional Banners for Other Active Raffles */}
        {otrosSorteos.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Otros Sorteos Activos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otrosSorteos.map((otroSorteo) => (
                <Card 
                  key={otroSorteo.id} 
                  className="sorteo-card cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/sorteo/${otroSorteo.landing_slug}`)}
                >
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    {otroSorteo.imagenes && otroSorteo.imagenes.length > 0 ? (
                      <img 
                        src={otroSorteo.imagenes[0]} 
                        alt={otroSorteo.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: otroSorteo.color_primario }}
                      >
                        <Trophy className="w-16 h-16 text-white opacity-30" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge style={{ backgroundColor: otroSorteo.color_secundario }}>
                        {otroSorteo.tipo === 'etapas' ? 'Por Etapas' : 'Único'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{otroSorteo.titulo}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{otroSorteo.descripcion}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">
                        {formatCurrency(otroSorteo.precio_boleto)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {otroSorteo.progreso_porcentaje.toFixed(0)}% vendido
                      </span>
                    </div>
                    <Button 
                      className="w-full mt-3" 
                      size="sm"
                      style={{ backgroundColor: otroSorteo.color_primario }}
                    >
                      Ver Sorteo
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SorteoLanding;
