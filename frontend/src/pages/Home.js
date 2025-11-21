import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Trophy, Calendar, Clock, Star, Sparkles, Award, Users } from 'lucide-react';

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

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      updateCountdowns();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      const [sorteosRes, ganadoresRes] = await Promise.all([
        axios.get(`${API}/sorteos`),
        axios.get(`${API}/ganadores/recientes`)
      ]);
      
      const allSorteos = sorteosRes.data;
      const ahora = new Date();
      const en6Horas = new Date(ahora.getTime() + 6 * 60 * 60 * 1000);
      
      // Filtrar sorteos por estado
      const live = allSorteos.filter(s => s.estado === 'live');
      const waiting = allSorteos.filter(s => {
        const fechaInicio = new Date(s.fecha_inicio);
        return s.estado === 'waiting' && fechaInicio > ahora && fechaInicio <= en6Horas;
      });
      const published = allSorteos.filter(s => s.estado === 'published' || s.estado === 'activo');
      const completed = allSorteos.filter(s => s.estado === 'completed' || s.estado === 'completado');
      
      setSorteosLive(live);
      setSorteosWaiting(waiting);
      setSorteosPublished(published);
      setSorteosCompleted(completed);
      setGanadores(ganadoresRes.data);
      
      // Iniciar animaciones para sorteos LIVE
      live.forEach(sorteo => {
        if (!liveAnimations[sorteo.id]) {
          startLiveAnimation(sorteo.id);
        }
      });
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLiveAnimation = async (sorteoId) => {
    try {
      // Obtener participantes del sorteo
      const response = await axios.get(`${API}/sorteos/${sorteoId}/participantes`);
      const participantes = response.data.participantes || [];
      
      setLiveAnimations(prev => ({
        ...prev,
        [sorteoId]: {
          participantes,
          currentIndex: 0,
          isAnimating: true,
          startTime: Date.now(),
          winners: [] // Se llenará después de 2 minutos
        }
      }));
      
      // Simular animación de 2 minutos
      const animationDuration = 120000; // 2 minutos
      const updateInterval = 100; // Actualizar cada 100ms
      
      const animationInterval = setInterval(() => {
        setLiveAnimations(prev => {
          const current = prev[sorteoId];
          if (!current) return prev;
          
          const elapsed = Date.now() - current.startTime;
          
          if (elapsed >= animationDuration) {
            // Animación terminada, mostrar ganador
            clearInterval(animationInterval);
            fetchWinners(sorteoId);
            return {
              ...prev,
              [sorteoId]: {
                ...current,
                isAnimating: false
              }
            };
          }
          
          // Cambiar participante/número aleatorio
          return {
            ...prev,
            [sorteoId]: {
              ...current,
              currentIndex: Math.floor(Math.random() * participantes.length)
            }
          };
        });
      }, updateInterval);
      
    } catch (error) {
      console.error('Error al iniciar animación:', error);
    }
  };

  const fetchWinners = async (sorteoId) => {
    try {
      const response = await axios.get(`${API}/ganadores/sorteo/${sorteoId}`);
      setLiveAnimations(prev => ({
        ...prev,
        [sorteoId]: {
          ...prev[sorteoId],
          winners: response.data,
          showWinners: true
        }
      }));
    } catch (error) {
      console.error('Error al cargar ganadores:', error);
    }
  };

  const updateCountdowns = () => {
    const newCountdowns = {};
    sorteosWaiting.forEach(sorteo => {
      const ahora = new Date();
      const fechaInicio = new Date(sorteo.fecha_inicio);
      const diff = fechaInicio - ahora;
      
      if (diff > 0) {
        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        newCountdowns[sorteo.id] = { horas, minutos, segundos };
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
            className="h-24 mx-auto mb-8 drop-shadow-2xl object-contain"
          />
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
            WishWay Sorteos
          </h1>
          <p className="text-xl sm:text-2xl text-white mb-8 max-w-3xl mx-auto drop-shadow-lg font-medium">
            Participa en sorteos emocionantes y gana premios increíbles. Tu próximo sueño está a un boleto de distancia.
          </p>
          
          {user ? (
            <div className="flex gap-4 justify-center">
              <Link to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'vendedor' ? '/vendedor/dashboard' : '/usuario/dashboard'}>
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
      {sorteosLive.length > 0 && sorteosLive.map((sorteo) => {
        const animation = liveAnimations[sorteo.id];
        const currentParticipant = animation?.participantes?.[animation?.currentIndex];
        
        return (
          <div key={sorteo.id} className="relative py-20 px-4 overflow-hidden" style={{
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a2e 50%, #16213e 100%)'
          }}>
            {/* Luces de fondo animadas */}
            <div className="absolute inset-0 opacity-30">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${Math.random() * 200 + 50}px`,
                    height: `${Math.random() * 200 + 50}px`,
                    background: `radial-gradient(circle, ${i % 2 === 0 ? '#ffd700' : '#4169e1'} 0%, transparent 70%)`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              {/* Título del evento */}
              <div className="text-center mb-12">
                <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white text-xl px-8 py-3 mb-6 animate-pulse">
                  🔴 EN VIVO AHORA
                </Badge>
                <h2 className="text-5xl lg:text-6xl font-bold mb-4" style={{
                  background: 'linear-gradient(90deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                }}>
                  {sorteo.titulo}
                </h2>
              </div>

              {animation?.isAnimating ? (
                /* Animación de selección */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                  {/* Panel de participantes */}
                  <div className="bg-black/50 backdrop-blur-md rounded-3xl p-8 border-2 border-yellow-500/50 shadow-2xl">
                    <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center flex items-center justify-center gap-3">
                      <Users className="w-8 h-8" />
                      PARTICIPANTES
                    </h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center animate-pulse">
                        <div className="text-6xl font-bold text-white mb-4">
                          {currentParticipant?.nombre || 'Seleccionando...'}
                        </div>
                        <div className="text-3xl text-yellow-400">
                          Boleto #{currentParticipant?.numero_boleto?.toString().padStart(4, '0') || '0000'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel de números */}
                  <div className="bg-black/50 backdrop-blur-md rounded-3xl p-8 border-2 border-blue-500/50 shadow-2xl">
                    <h3 className="text-2xl font-bold text-blue-400 mb-6 text-center flex items-center justify-center gap-3">
                      <Trophy className="w-8 h-8" />
                      NÚMERO GANADOR
                    </h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-9xl font-bold text-blue-400 animate-bounce">
                        {currentParticipant?.numero_boleto?.toString().padStart(4, '0') || '????'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : animation?.showWinners && animation?.winners?.length > 0 ? (
                /* Mostrar ganadores */
                <div className="space-y-6">
                  {animation.winners.map((winner, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-yellow-500/20 to-yellow-700/20 backdrop-blur-md rounded-3xl p-8 border-4 border-yellow-400 shadow-2xl">
                      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-3xl shadow-lg">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-yellow-400 text-sm uppercase tracking-wider mb-1">Ganador</p>
                            <h3 className="text-4xl font-bold text-white mb-2">{winner.usuario?.name || 'Ganador'}</h3>
                            <p className="text-gray-300 text-lg">Boleto #{winner.numero_boleto?.toString().padStart(4, '0')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 text-sm uppercase tracking-wider mb-1">Premio</p>
                          <h4 className="text-3xl font-bold text-white">{winner.premio}</h4>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-white text-2xl py-12">
                  Cargando información del sorteo...
                </div>
              )}
            </div>

            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.1); }
              }
            `}</style>
          </div>
        );
      })}

      {/* SECCIÓN 3: SORTEOS EN ESPERA (WAITING) - Faltan 6 horas o menos */}
      {sorteosWaiting.length > 0 && (
        <div className="bg-gradient-to-r from-orange-900 via-red-900 to-orange-900 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                <Clock className="w-12 h-12 text-orange-400" />
                ⏰ Sorteos Por Iniciar
              </h2>
              <p className="text-xl text-orange-200">¡Faltan menos de 6 horas! Prepárate...</p>
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
                      
                      <div className="bg-black rounded-xl p-6 mb-4">
                        <p className="text-orange-400 text-sm mb-3 font-semibold">Inicia en:</p>
                        <div className="flex justify-center gap-3">
                          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg px-4 py-3 min-w-[70px]">
                            <div className="text-4xl font-bold text-white">{countdown.horas.toString().padStart(2, '0')}</div>
                            <div className="text-xs text-orange-100">Horas</div>
                          </div>
                          <div className="text-white text-4xl font-bold flex items-center">:</div>
                          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg px-4 py-3 min-w-[70px]">
                            <div className="text-4xl font-bold text-white">{countdown.minutos.toString().padStart(2, '0')}</div>
                            <div className="text-xs text-orange-100">Mins</div>
                          </div>
                          <div className="text-white text-4xl font-bold flex items-center">:</div>
                          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg px-4 py-3 min-w-[70px]">
                            <div className="text-4xl font-bold text-white">{countdown.segundos.toString().padStart(2, '0')}</div>
                            <div className="text-xs text-orange-100">Segs</div>
                          </div>
                        </div>
                      </div>

                      <p className="text-orange-300 text-sm mb-4">
                        {formatDateTime(sorteo.fecha_inicio)}
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
                    <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2">
                      {sorteo.titulo}
                    </h3>
                    
                    <p className="text-gray-400 mb-4 line-clamp-2 min-h-[48px]">
                      {sorteo.descripcion}
                    </p>

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
                          {sorteo.cantidad_vendida}/{sorteo.cantidad_total_boletos}
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
                          {ganador.usuario?.name?.[0]?.toUpperCase() || '🎊'}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-yellow-400">Ganador</p>
                          <p className="font-bold text-white">{ganador.usuario?.name || 'Anónimo'}</p>
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