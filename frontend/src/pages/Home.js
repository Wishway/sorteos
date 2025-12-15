import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Trophy, Calendar, Clock, Star, Sparkles, Award, Users } from 'lucide-react';
import Countdown from '../components/Countdown';
import LiveAnimation from '../components/LiveAnimation';
import websocketService from '../services/websocket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// URLs de imágenes
const HERO_IMAGE = 'https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/b5g73ddt_image.png';
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/13c8161p_descarga.png';

const HomeComplete = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [sorteosLive, setSorteosLive] = useState([]);
  const [sorteosWaiting, setSorteosWaiting] = useState([]);
  const [sorteosPublished, setSorteosPublished] = useState([]);
  const [sorteosCompleted, setSorteosCompleted] = useState([]);
  const [ganadores, setGanadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState({});
  const [liveAnimations, setLiveAnimations] = useState({});
  const [liveParticipants, setLiveParticipants] = useState({}); // Participantes por sorteo

  useEffect(() => {
    fetchAllData();
    
    // Conectar WebSocket
    websocketService.connect();
    
    // Escuchar actualización global de sorteos
    const handleSorteosListUpdated = () => {
      console.log('📡 Lista de sorteos actualizada desde WebSocket');
      fetchAllData();
    };
    
    websocketService.onSorteosListUpdated(handleSorteosListUpdated);
    
    // Polling para actualizar estados automáticamente cada 60 segundos
    const pollingInterval = setInterval(async () => {
      try {
        // Llamar al backend para actualizar estados
        await axios.post(`${API}/admin/actualizar-estados-sorteos`);
        // Recargar datos
        fetchAllData();
      } catch (error) {
        console.error('Error al actualizar estados:', error);
      }
    }, 60000); // Cada 60 segundos
    
    // Limpieza automática de sorteos antiguos cada 24 horas
    const limpiezaInterval = setInterval(async () => {
      try {
        await axios.post(`${API}/admin/limpiar-sorteos-antiguos`);
        console.log('Limpieza de sorteos antiguos ejecutada');
      } catch (error) {
        console.error('Error en limpieza automática:', error);
      }
    }, 86400000); // Cada 24 horas
    
    return () => {
      clearInterval(pollingInterval);
      clearInterval(limpiezaInterval);
      websocketService.offSorteosListUpdated(handleSorteosListUpdated);
    };
  }, []);

  const fetchAllData = async () => {
    try {
      const [sorteosRes, ganadoresRes] = await Promise.all([
        axios.get(`${API}/sorteos`),
        axios.get(`${API}/ganadores/recientes`)
      ]);
      
      const allSorteos = sorteosRes.data;
      const ahora = new Date();
      
      // Filtrar sorteos por estado
      const live = allSorteos.filter(s => s.estado === 'live');
      const waiting = allSorteos.filter(s => s.estado === 'waiting');
      const published = allSorteos.filter(s => s.estado === 'published' || s.estado === 'activo');
      const completed = allSorteos.filter(s => s.estado === 'completed' || s.estado === 'completado');
      
      setSorteosLive(live);
      setSorteosWaiting(waiting);
      setSorteosPublished(published);
      setSorteosCompleted(completed);
      setGanadores(ganadoresRes.data);
      
      // Cargar participantes para sorteos LIVE
      live.forEach(sorteo => {
        if (!liveParticipants[sorteo.id]) {
          loadParticipants(sorteo.id);
        }
      });
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (sorteoId) => {
    try {
      const response = await axios.get(`${API}/sorteos/${sorteoId}/participantes`);
      setLiveParticipants(prev => ({
        ...prev,
        [sorteoId]: response.data.participantes || []
      }));
    } catch (error) {
      console.error('Error al cargar participantes:', error);
    }
  };

  const handleAnimationComplete = async (sorteoId, winners) => {
    try {
      // Marcar sorteo como COMPLETED
      await axios.put(
        `${API}/admin/sorteo/${sorteoId}/completar`,
        {},
        { withCredentials: true }
      );
      console.log('Sorteo marcado como COMPLETED');
      
      // Recargar datos inmediatamente para mostrar en "Completados"
      fetchAllData();
    } catch (error) {
      console.error('Error al completar sorteo:', error);
      // Recargar de todas formas
      fetchAllData();
    }
  };

  const updateCountdowns = () => {
    const newCountdowns = {};
    sorteosWaiting.forEach(sorteo => {
      const ahora = new Date();
      
      // Si tiene waiting_hasta, usar ese (contador de 5 min)
      if (sorteo.waiting_hasta) {
        const waitingHasta = new Date(sorteo.waiting_hasta);
        const diff = waitingHasta - ahora;
        
        if (diff > 0) {
          const minutos = Math.floor(diff / (1000 * 60));
          const segundos = Math.floor((diff % (1000 * 60)) / 1000);
          newCountdowns[sorteo.id] = { 
            horas: 0, 
            minutos, 
            segundos,
            usaWaitingHasta: true 
          };
        } else {
          newCountdowns[sorteo.id] = { horas: 0, minutos: 0, segundos: 0, usaWaitingHasta: true };
        }
      } else {
        // Fallback: usar fecha_cierre
        const fechaInicio = new Date(sorteo.fecha_cierre);
        const diff = fechaInicio - ahora;
        
        if (diff > 0) {
          const horas = Math.floor(diff / (1000 * 60 * 60));
          const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const segundos = Math.floor((diff % (1000 * 60)) / 1000);
          newCountdowns[sorteo.id] = { horas, minutos, segundos, usaWaitingHasta: false };
        }
      }
    });
    setCountdowns(newCountdowns);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black">
      {/* SECCIÓN 1: HERO SECTION CON LOGO */}
      <div 
        className="relative h-[600px] flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center px-4">
          {/* Logo encima del título */}
          <img 
            src={LOGO_URL} 
            alt="WishWay Logo" 
            className="h-32 md:h-40 lg:h-48 mx-auto mb-8 drop-shadow-2xl object-contain"
          />
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
            WishWay Sorteos
          </h1>
          <p className="text-xl sm:text-2xl text-white mb-8 max-w-3xl mx-auto drop-shadow-lg font-medium">
            Participa en sorteos emocionantes y gana premios increíbles. Tu próximo sueño está a un boleto de distancia.
          </p>
          
          {user ? (
            <div className="flex gap-4 justify-center">
              <Link to={user.role === 'admin' ? '/admin' : user.role === 'vendedor' ? '/vendedor' : '/usuario'}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold text-lg px-8 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Ir a Mi Panel
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/login">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold text-lg px-8 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                >
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white font-bold text-lg px-8 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                >
                  Registrarse
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: SORTEOS EN VIVO (LIVE) */}
      {sorteosLive.length > 0 && (
        <div className="bg-gradient-to-b from-black via-purple-900/20 to-black py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xl px-8 py-3 mb-6 animate-pulse">
                🔴 SORTEO EN VIVO
              </Badge>
              <h2 className="text-5xl lg:text-6xl font-bold mb-4 text-white">
                Transmisión en Directo
              </h2>
              <p className="text-xl text-gray-300">¡El sorteo está sucediendo ahora!</p>
            </div>

            <div className="space-y-8">
              {sorteosLive.map((sorteo) => {
                const participantes = liveParticipants[sorteo.id] || [];
                
                return (
                  <LiveAnimation
                    key={sorteo.id}
                    sorteo={sorteo}
                    participantes={participantes}
                    onAnimationComplete={(winners) => handleAnimationComplete(sorteo.id, winners)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: SORTEOS EN ESPERA (WAITING) - Faltan 6 horas o menos */}
      {sorteosWaiting.length > 0 && (
        <div className="bg-gradient-to-r from-orange-900 via-red-900 to-orange-900 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                <Clock className="w-12 h-12 text-orange-400" />
                Sorteos Por Iniciar
              </h2>
              <p className="text-xl text-white font-semibold">¡La suerte está a punto de girar a tu favor!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sorteosWaiting.map((sorteo) => {
                const countdown = countdowns[sorteo.id] || { horas: 0, minutos: 0, segundos: 0 };
                
                return (
                  <Card key={sorteo.id} className="overflow-hidden border-4 border-orange-500 shadow-2xl bg-gradient-to-br from-gray-900 to-black">
                    <div className="relative h-48 overflow-hidden">
                      {sorteo.imagenes?.[0] ? (
                        <img src={sorteo.imagenes[0]} alt={sorteo.titulo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center">
                          <Trophy className="w-20 h-20 text-white opacity-50" />
                        </div>
                      )}
                      <Badge className="absolute top-4 right-4 bg-red-600 text-white font-bold animate-pulse">
                        ¡PRONTO!
                      </Badge>
                    </div>
                    
                    <CardContent className="p-6 text-center">
                      <h3 className="font-bold text-2xl mb-4 text-white">{sorteo.titulo}</h3>
                      
                      {/* CAMBIO: Solo barra de progreso, sin texto de boletos */}
                      <div className="mb-4">
                        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-red-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${sorteo.progreso_porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="bg-black rounded-xl p-6 mb-4">
                        {(() => {
                          const ahora = new Date();
                          const fechaInicio = new Date(sorteo.fecha_cierre);
                          const fechaWaiting = sorteo.fecha_waiting ? new Date(sorteo.fecha_waiting) : null;
                          const waitingHasta = sorteo.waiting_hasta ? new Date(sorteo.waiting_hasta) : null;
                          const todosVendidos = sorteo.progreso_porcentaje >= 100;
                          const fechaAlcanzada = fechaInicio <= ahora;
                          const countdown = countdowns[sorteo.id];
                          
                          // Si tiene waiting_hasta (contador de 5 min), mostrarlo directamente
                          if (waitingHasta && countdown && countdown.usaWaitingHasta) {
                            return (
                              <>
                                <p className="text-orange-400 text-sm mb-3 font-semibold">¡Sorteo comienza en:</p>
                                <div className="flex gap-2 items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-white">{String(countdown.minutos).padStart(2, '0')}</div>
                                    <div className="text-xs text-gray-300">min</div>
                                  </div>
                                  <span className="text-3xl font-bold text-white">:</span>
                                  <div className="text-center">
                                    <div className="text-3xl font-bold text-white">{String(countdown.segundos).padStart(2, '0')}</div>
                                    <div className="text-xs text-gray-300">seg</div>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-3">Margen previo al sorteo</p>
                              </>
                            );
                          }
                          
                          // Si tiene fecha_waiting pero no waiting_hasta (fallback 30 min)
                          if (todosVendidos && fechaAlcanzada && fechaWaiting) {
                            const fecha30Min = new Date(fechaWaiting.getTime() + 30 * 60 * 1000);
                            return (
                              <>
                                <p className="text-orange-400 text-sm mb-3 font-semibold">¡Sorteo comienza en:</p>
                                <Countdown targetDate={fecha30Min} className="justify-center" />
                                <p className="text-xs text-gray-400 mt-3">Margen de 30 minutos antes del sorteo</p>
                              </>
                            );
                          }
                          
                          // Si solo falta la fecha
                          if (todosVendidos && !fechaAlcanzada) {
                            return (
                              <>
                                <p className="text-orange-400 text-sm mb-3 font-semibold">¡Todos los boletos vendidos! Sorteo en:</p>
                                <Countdown targetDate={fechaInicio} className="justify-center" />
                              </>
                            );
                          }
                          
                          // Si solo faltan boletos
                          if (!todosVendidos && fechaAlcanzada) {
                            return (
                              <>
                                <p className="text-orange-400 text-sm mb-3 font-semibold">Fecha alcanzada</p>
                                <p className="text-white text-lg">Esperando completar venta de boletos</p>
                                {/* CAMBIO: Quitar texto de boletos faltantes, solo mostrar barra de progreso */}
                              </>
                            );
                          }
                          
                          // Default
                          return (
                            <>
                              <p className="text-orange-400 text-sm mb-3 font-semibold">Inicia en:</p>
                              <Countdown targetDate={fechaInicio} className="justify-center" />
                            </>
                          );
                        })()}
                      </div>

                      <p className="text-orange-300 text-sm mb-4">
                        Fecha programada: {formatDateTime(sorteo.fecha_cierre)}
                      </p>

                      <Link to={`/sorteo/${sorteo.landing_slug}`}>
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3">
                          Ver Detalles
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 4: SORTEOS DISPONIBLES (PUBLISHED) */}
      {sorteosPublished.length > 0 && (
        <div className="bg-gradient-to-b from-gray-900 to-gray-800 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg px-6 py-2 mb-4">
                🎯 SORTEOS DISPONIBLES
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Participa Ahora y Gana
              </h2>
              <p className="text-xl text-gray-400">
                Elige tu sorteo favorito y compra tus boletos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sorteosPublished.map((sorteo) => (
                <Card key={sorteo.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-gray-800 to-gray-900 border-0">
                  <div className="relative h-64 overflow-hidden group">
                    {sorteo.imagenes?.[0] ? (
                      <img 
                        src={sorteo.imagenes[0]} 
                        alt={sorteo.titulo}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                        <Trophy className="w-24 h-24 text-white opacity-50" />
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-green-600 text-white font-bold">
                        {sorteo.tipo === 'etapas' ? 'Multi-Etapas' : 'Único'}
                      </Badge>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                      <div className="flex items-center justify-between text-white">
                        <span className="text-sm flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {sorteo.cantidad_vendida} participantes
                        </span>
                        <span className="text-lg font-bold">
                          {sorteo.progreso_porcentaje.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bold text-white mb-4 line-clamp-2">
                      {sorteo.titulo}
                    </h3>

                    {/* Contador regresivo si aún no ha comenzado */}
                    {new Date(sorteo.fecha_cierre) > new Date() && (
                      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-3 mb-4 border border-blue-500/30">
                        <p className="text-xs text-blue-300 mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Inicia en:
                        </p>
                        <Countdown 
                          targetDate={sorteo.fecha_cierre} 
                          className="justify-center text-white"
                        />
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-4 mb-4 border border-purple-500/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-purple-300 mb-1">Precio del boleto</p>
                          <p className="text-3xl font-bold text-white">
                            {formatCurrency(sorteo.precio_boleto)}
                          </p>
                        </div>
                        <Sparkles className="w-10 h-10 text-purple-400" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-300">Progreso</span>
                        <span className="text-sm font-bold text-purple-400">
                          {sorteo.progreso_porcentaje.toFixed(0)}%
                        </span>
                      </div>
                      <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 rounded-full"
                          style={{ width: `${sorteo.progreso_porcentaje}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 pb-4 border-b border-gray-700">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span>Cierra: {formatDate(sorteo.fecha_cierre)}</span>
                    </div>

                    <Link to={`/sorteo/${sorteo.landing_slug}`}>
                      <Button className="w-full text-lg font-bold py-6 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg">
                        <Sparkles className="w-5 h-5 mr-2" />
                        Participar Ahora
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 5: GANADORES (Winner Wall) */}
      {ganadores.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-900/30 via-gray-900 to-gray-800 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-lg px-6 py-2 mb-4 font-bold">
                🏆 WALL OF WINNERS
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                ¡Felicitaciones a Nuestros Ganadores!
              </h2>
              <p className="text-xl text-gray-400">
                Conoce a los afortunados de los últimos 30 días
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ganadores.map((ganador) => (
                <Card key={ganador.id} className="overflow-hidden border-2 border-yellow-500 shadow-2xl bg-gradient-to-br from-gray-900 to-black hover:scale-105 transition-transform">
                  <div className="relative h-48 overflow-hidden">
                    {ganador.sorteo?.imagenes?.[0] ? (
                      <img 
                        src={ganador.sorteo.imagenes[0]} 
                        alt={ganador.sorteo.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                        <Trophy className="w-20 h-20 text-white opacity-50" />
                      </div>
                    )}
                    
                    <Badge className="absolute top-4 left-4 bg-yellow-500 text-black font-bold text-sm px-4 py-2 shadow-lg">
                      🏆 GANADOR
                    </Badge>

                    {ganador.etapa_numero && (
                      <Badge className="absolute top-4 right-4 bg-blue-600 text-white font-bold text-xs px-3 py-1">
                        Etapa {ganador.etapa_numero}
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-6">
                    <h3 className="font-bold text-xl mb-3 text-white line-clamp-2">
                      {ganador.sorteo?.titulo || 'Sorteo'}
                    </h3>

                    <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-lg p-4 mb-4 border border-yellow-500/30">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-lg">
                          {(ganador.usuario_nombre || ganador.usuario?.name)?.[0]?.toUpperCase() || '🎊'}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-yellow-400">Ganador</p>
                          <p className="font-bold text-white">{ganador.usuario_nombre || ganador.usuario?.name || 'Participante'}</p>
                        </div>
                      </div>
                      
                      <div className="bg-black/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-yellow-400 mb-1">Boleto Ganador</p>
                        <p className="text-3xl font-bold text-yellow-500">
                          #{ganador.numero_boleto?.toString().padStart(4, '0') || '0000'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-900/30 rounded-lg p-3 mb-3 border border-blue-500/30">
                      <p className="text-xs text-blue-400 mb-1">Premio</p>
                      <p className="font-semibold text-white line-clamp-2">
                        {ganador.premio}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4 text-yellow-500" />
                      <span>Sorteado: {formatDate(ganador.fecha_sorteo)}</span>
                    </div>

                    {ganador.sorteo?.landing_slug && (
                      <Link to={`/sorteo/${ganador.sorteo.landing_slug}`} className="block mt-3">
                        <Button variant="outline" className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/10" size="sm">
                          Ver Sorteo
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 6: SORTEOS COMPLETADOS/FINALIZADOS */}
      {sorteosCompleted.length > 0 && (
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                <Award className="w-12 h-12 text-blue-400" />
                Sorteos Finalizados
              </h2>
              <p className="text-xl text-gray-400">
                Historial de sorteos completados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sorteosCompleted.map((sorteo) => (
                <Card key={sorteo.id} className="overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 opacity-80 hover:opacity-100 transition-opacity">
                  <div className="relative h-48 overflow-hidden">
                    {sorteo.imagenes?.[0] ? (
                      <img 
                        src={sorteo.imagenes[0]} 
                        alt={sorteo.titulo}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <Trophy className="w-20 h-20 text-gray-600 opacity-50" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Badge className="bg-blue-600 text-white font-bold text-lg px-6 py-2">
                        ✓ FINALIZADO
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <h3 className="font-bold text-xl mb-2 text-white line-clamp-2">
                      {sorteo.titulo}
                    </h3>
                    
                    <p className="text-gray-500 text-sm mb-4">
                      Finalizado el {formatDate(sorteo.fecha_cierre)}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                      <Users className="w-4 h-4" />
                      <span>{sorteo.cantidad_vendida} participantes</span>
                    </div>

                    <Link to={`/sorteo/${sorteo.landing_slug}`}>
                      <Button variant="outline" className="w-full border-gray-600 text-gray-400 hover:bg-gray-800">
                        Ver Detalles
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección Conviértete en Vendedor */}
      <div className="bg-gradient-to-r from-green-900 to-emerald-900 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              💰 ¿Quieres Ganar Dinero Extra?
            </h2>
            <p className="text-xl text-gray-200 mb-2">
              Conviértete en vendedor y gana comisiones por cada sorteo que vendas
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">🔗</div>
                <h3 className="text-white font-bold text-lg mb-2">Link Único</h3>
                <p className="text-gray-200 text-sm">
                  Comparte tu link personalizado y empieza a ganar
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">💵</div>
                <h3 className="text-white font-bold text-lg mb-2">Comisiones Instantáneas</h3>
                <p className="text-gray-200 text-sm">
                  Gana por cada venta realizada a través de tu link
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">🏦</div>
                <h3 className="text-white font-bold text-lg mb-2">Retiros Fáciles</h3>
                <p className="text-gray-200 text-sm">
                  Solicita retiros cuando quieras a tu cuenta bancaria
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Link to="/registro-vendedor">
              <Button 
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xl px-12 py-6 rounded-full shadow-2xl"
              >
                🚀 Quiero Ser Vendedor
              </Button>
            </Link>
            <p className="text-gray-300 text-sm mt-4">
              Sin costos de inscripción • Sin límite de ganancias • Retiros automáticos
            </p>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            ¿Listo para cambiar tu vida?
          </h2>
          <p className="text-xl text-gray-200 mb-8">
            Únete a miles de ganadores que ya confiaron en WishWay
          </p>
          {!user && (
            <Link to="/register">
              <Button 
                size="lg"
                className="bg-white text-purple-900 hover:bg-gray-100 font-bold text-xl px-12 py-6 rounded-full shadow-2xl"
              >
                Crear Cuenta Gratis
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeComplete;