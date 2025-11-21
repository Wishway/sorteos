import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Trophy, Calendar, DollarSign, TrendingUp, Clock, Star, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// URL de la imagen del hero (negro+dorado)
const HERO_IMAGE = 'https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/b5g73ddt_image.png';

const Home = () => {
  const { user } = useAuth();
  const [sorteos, setSorteos] = useState([]);
  const [sorteosProximos, setSorteosProximos] = useState([]);
  const [sorteosEnProceso, setSorteosEnProceso] = useState([]);
  const [ganadoresRecientes, setGanadoresRecientes] = useState([]);
  const [participantesActivos, setParticipantesActivos] = useState({});
  const [loading, setLoading] = useState(true);
  const [countdowns, setCountdowns] = useState({});

  useEffect(() => {
    fetchSorteos();
    fetchGanadoresRecientes();
    const interval = setInterval(() => {
      updateCountdowns();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSorteos = async () => {
    try {
      const response = await axios.get(`${API}/sorteos`);
      const allSorteos = response.data;
      
      // Filtrar sorteos activos
      const activos = allSorteos.filter(s => s.estado === 'activo');
      setSorteos(activos);
      
      // Sorteos próximos a empezar (próximas 24 horas)
      const ahora = new Date();
      const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
      
      const proximos = activos.filter(s => {
        const fechaInicio = new Date(s.fecha_inicio);
        return fechaInicio > ahora && fechaInicio <= en24Horas;
      });
      setSorteosProximos(proximos);
      
      // Sorteos en proceso: 
      // Para sorteos por etapas: si alguna etapa se está ejecutando o está por ejecutarse
      // Para sorteos únicos: si ya pasó la fecha de inicio pero no ha cerrado
      const enProceso = activos.filter(s => {
        const fechaInicio = new Date(s.fecha_inicio);
        const fechaCierre = new Date(s.fecha_cierre);
        
        if (s.tipo === 'etapas' && s.etapas && s.etapas.length > 0) {
          // Verificar si alguna etapa está lista para ejecutarse
          return s.etapas.some(etapa => {
            const progresoActual = s.progreso_porcentaje;
            return progresoActual >= etapa.porcentaje && !etapa.completado;
          });
        } else {
          // Sorteo único: si ya pasó inicio y está cerca del cierre o tiene buen progreso
          return fechaInicio <= ahora && fechaCierre >= ahora && s.progreso_porcentaje >= 70;
        }
      });
      
      setSorteosEnProceso(enProceso);
      
      // Cargar participantes activos para sorteos en proceso
      for (const sorteo of enProceso) {
        fetchParticipantes(sorteo.id);
      }
      
    } catch (error) {
      console.error('Error al cargar sorteos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGanadoresRecientes = async () => {
    try {
      const response = await axios.get(`${API}/ganadores/recientes`);
      setGanadoresRecientes(response.data);
    } catch (error) {
      console.error('Error al cargar ganadores recientes:', error);
    }
  };

  const fetchParticipantes = async (sorteoId) => {
    try {
      const response = await axios.get(`${API}/sorteos/${sorteoId}/participantes`);
      setParticipantesActivos(prev => ({
        ...prev,
        [sorteoId]: response.data.participantes
      }));
    } catch (error) {
      console.error('Error al cargar participantes:', error);
    }
  };

  const updateCountdowns = () => {
    const newCountdowns = {};
    sorteosProximos.forEach(sorteo => {
      const ahora = new Date();
      const fechaInicio = new Date(sorteo.fecha_inicio);
      const diff = fechaInicio - ahora;
      
      if (diff > 0) {
        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        newCountdowns[sorteo.id] = { horas, minutos, segundos, diff };
      }
    });
    setCountdowns(newCountdowns);
  };

  // Función para obtener participantes aleatorios para la animación
  const obtenerParticipantesAleatorios = (sorteoId, cantidad = 12) => {
    const participantes = participantesActivos[sorteoId] || [];
    if (participantes.length === 0) return [];
    
    // Mezclar y tomar una muestra
    const mezclados = [...participantes].sort(() => Math.random() - 0.5);
    return mezclados.slice(0, cantidad);
  };

  const obtenerNumerosAleatorios = (sorteoId, cantidad = 20) => {
    const participantes = participantesActivos[sorteoId] || [];
    if (participantes.length === 0) return [];
    
    // Extraer números y mezclar
    const numeros = participantes.map(p => p.numero_boleto.toString().padStart(4, '0'));
    const mezclados = [...numeros].sort(() => Math.random() - 0.5);
    return mezclados.slice(0, cantidad);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* HERO SECTION - Banner Principal con imagen negro+dorado */}
      <div 
        className="relative h-[600px] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay para mejor legibilidad */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center px-4">
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
                  data-testid="go-to-panel-btn"
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
                  data-testid="hero-login-btn"
                >
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white font-bold text-lg px-8 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  data-testid="hero-register-btn"
                >
                  Registrarse
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN: SORTEOS POR EMPEZAR */}
      {sorteosProximos.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <Clock className="w-10 h-10 text-orange-600" />
                ⏰ Sorteos Por Empezar
              </h2>
              <p className="text-lg text-gray-700">¡No te pierdas estos sorteos que están a punto de iniciar!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sorteosProximos.map((sorteo) => {
                const countdown = countdowns[sorteo.id] || { horas: 0, minutos: 0, segundos: 0, diff: 0 };
                const esCritico = countdown.diff < 3600000; // Menos de 1 hora
                
                // Determinar qué etapa va a iniciar (si es multi-etapa)
                let etapaProxima = null;
                if (sorteo.tipo === 'etapas' && sorteo.etapas) {
                  etapaProxima = sorteo.etapas.find(e => !e.completado);
                }

                return (
                  <Card 
                    key={sorteo.id} 
                    className={`overflow-hidden transform hover:scale-105 transition-all shadow-xl ${
                      esCritico ? 'border-4 border-red-500 animate-pulse' : 'border-2 border-orange-300'
                    }`}
                  >
                    <div className="relative h-48 overflow-hidden">
                      {sorteo.imagenes && sorteo.imagenes.length > 0 ? (
                        <img 
                          src={sorteo.imagenes[0]} 
                          alt={sorteo.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                          <Trophy className="w-20 h-20 text-white opacity-50" />
                        </div>
                      )}
                      {esCritico && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-600 text-white font-bold text-xs px-3 py-1">
                            ¡URGENTE!
                          </Badge>
                        </div>
                      )}
                      {etapaProxima && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-blue-600 text-white font-bold text-xs px-3 py-1">
                            Etapa {etapaProxima.numero}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="p-6">
                      <h3 className="font-bold text-xl mb-2 line-clamp-1">{sorteo.titulo}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">{sorteo.descripcion}</p>
                      
                      {/* Mostrar información de la etapa si aplica */}
                      {etapaProxima && (
                        <div className="bg-blue-50 rounded-lg p-2 mb-3">
                          <p className="text-xs text-blue-800 font-semibold">
                            🎯 Próxima etapa: {etapaProxima.premio}
                          </p>
                          <p className="text-xs text-blue-600">
                            Se activa al {etapaProxima.porcentaje}% de ventas
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-gray-900 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-400 text-center mb-2">Comienza en:</p>
                        <div className="flex justify-center gap-2">
                          <div className="text-center">
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg px-3 py-2 min-w-[60px]">
                              <span className="text-3xl font-bold text-black">
                                {countdown.horas.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block">Horas</span>
                          </div>
                          <div className="text-white text-3xl font-bold flex items-center">:</div>
                          <div className="text-center">
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg px-3 py-2 min-w-[60px]">
                              <span className="text-3xl font-bold text-black">
                                {countdown.minutos.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block">Mins</span>
                          </div>
                          <div className="text-white text-3xl font-bold flex items-center">:</div>
                          <div className="text-center">
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg px-3 py-2 min-w-[60px]">
                              <span className="text-3xl font-bold text-black">
                                {countdown.segundos.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block">Segs</span>
                          </div>
                        </div>
                      </div>

                      <Link to={`/sorteo/${sorteo.landing_slug}`}>
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold">
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

      {/* SECCIÓN: SORTEO EN PROCESO (Estilo evento premium) */}
      {sorteosEnProceso.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 py-20 px-4 relative overflow-hidden">
          {/* Confetti animado de fondo */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-gradient-to-br from-yellow-400 to-yellow-600"
                style={{
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 20 + 10}px`,
                  left: `${Math.random() * 100}%`,
                  top: `-20px`,
                  animation: `fall ${Math.random() * 3 + 2}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            ))}
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            {sorteosEnProceso.map((sorteo, idx) => {
              // Determinar qué etapa se está ejecutando
              let etapaActual = null;
              if (sorteo.tipo === 'etapas' && sorteo.etapas) {
                etapaActual = sorteo.etapas.find(e => {
                  const progresoActual = sorteo.progreso_porcentaje;
                  return progresoActual >= e.porcentaje && !e.completado;
                });
              }
              
              return (
                <div key={sorteo.id} className={idx > 0 ? 'mt-16' : ''}>
                  <div className="text-center mb-12">
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-lg px-6 py-2 mb-4">
                      🎉 EN VIVO AHORA
                    </Badge>
                    <h2 className="text-4xl lg:text-6xl font-bold text-white mb-4">
                      Sorteo en Proceso
                    </h2>
                    {etapaActual && (
                      <Badge className="bg-blue-600 text-white text-xl px-6 py-2 mb-3">
                        Etapa {etapaActual.numero}
                      </Badge>
                    )}
                    <h3 className="text-2xl lg:text-3xl text-yellow-400 font-semibold">
                      {sorteo.titulo}
                    </h3>
                    {etapaActual && (
                      <p className="text-lg text-yellow-200 mt-2">
                        Premio: {etapaActual.premio}
                      </p>
                    )}
                  </div>

                {/* Animación de nombres y números */}
                <div className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border-2 border-yellow-500/50 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Columna de participantes */}
                    <div className="bg-black/50 rounded-xl p-6 border border-yellow-500/30">
                      <h4 className="text-xl font-bold text-yellow-400 mb-4 text-center">
                        👥 Participantes
                      </h4>
                      <div className="space-y-2 h-64 overflow-hidden">
                        {obtenerParticipantesAleatorios(sorteo.id).length > 0 ? (
                          obtenerParticipantesAleatorios(sorteo.id).map((participante, i) => (
                            <div
                              key={i}
                              className="text-white text-lg font-medium p-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-lg animate-slide-up"
                              style={{
                                animationDelay: `${i * 0.2}s`,
                                animationDuration: '3s',
                                animationIterationCount: 'infinite'
                              }}
                            >
                              {participante.nombre}
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-yellow-400/60 py-8">
                            Cargando participantes...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna de números */}
                    <div className="bg-black/50 rounded-xl p-6 border border-yellow-500/30">
                      <h4 className="text-xl font-bold text-yellow-400 mb-4 text-center">
                        🎫 Números en Sorteo
                      </h4>
                      <div className="grid grid-cols-4 gap-2 h-64 overflow-hidden">
                        {obtenerNumerosAleatorios(sorteo.id).length > 0 ? (
                          obtenerNumerosAleatorios(sorteo.id).map((num, i) => (
                            <div
                              key={i}
                              className="text-white text-xl font-bold flex items-center justify-center bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg animate-bounce-slow"
                              style={{
                                animationDelay: `${i * 0.1}s`,
                                aspectRatio: '1/1'
                              }}
                            >
                              {num}
                            </div>
                          ))
                        ) : (
                          <div className="col-span-4 text-center text-yellow-400/60 py-8">
                            Cargando números...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-8">
                    <Link to={`/sorteo/${sorteo.landing_slug}`}>
                      <Button 
                        size="lg"
                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold text-xl px-12 py-6 rounded-full shadow-2xl"
                      >
                        <Trophy className="w-6 h-6 mr-2" />
                        Ver Sorteo en Vivo
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          <style jsx>{`
            @keyframes fall {
              to {
                transform: translateY(100vh) rotate(360deg);
              }
            }
            @keyframes slide-up {
              0%, 100% {
                transform: translateY(0);
                opacity: 1;
              }
              50% {
                transform: translateY(-10px);
                opacity: 0.7;
              }
            }
            @keyframes bounce-slow {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.1);
              }
            }
            .animate-slide-up {
              animation: slide-up 3s ease-in-out infinite;
            }
            .animate-bounce-slow {
              animation: bounce-slow 2s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}

      {/* SECCIÓN: GANADORES RECIENTES */}
      {ganadoresRecientes.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-lg px-6 py-2 mb-4">
                🎉 GANADORES RECIENTES
              </Badge>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                ¡Felicitaciones a nuestros ganadores!
              </h2>
              <p className="text-lg text-gray-700">
                Conoce a los afortunados ganadores de los últimos 30 días
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ganadoresRecientes.map((ganador, idx) => (
                <Card 
                  key={ganador.id} 
                  className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-yellow-400"
                >
                  {/* Imagen del sorteo */}
                  <div className="relative h-48 overflow-hidden">
                    {ganador.sorteo?.imagenes && ganador.sorteo.imagenes.length > 0 ? (
                      <img 
                        src={ganador.sorteo.imagenes[0]} 
                        alt={ganador.sorteo.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <Trophy className="w-20 h-20 text-white opacity-50" />
                      </div>
                    )}
                    
                    {/* Badge de ganador */}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-yellow-500 text-black font-bold text-sm px-4 py-2 shadow-lg">
                        🏆 GANADOR
                      </Badge>
                    </div>

                    {/* Badge de etapa si aplica */}
                    {ganador.etapa_numero && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-blue-600 text-white font-bold text-xs px-3 py-1">
                          Etapa {ganador.etapa_numero}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6">
                    {/* Nombre del sorteo */}
                    <h3 className="font-bold text-xl mb-3 text-gray-900 line-clamp-2">
                      {ganador.sorteo?.titulo || 'Sorteo'}
                    </h3>

                    {/* Información del ganador */}
                    <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                          {ganador.usuario?.name?.[0]?.toUpperCase() || '🎊'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Ganador</p>
                          <p className="font-bold text-gray-900">{ganador.usuario?.name || 'Anónimo'}</p>
                        </div>
                      </div>
                      
                      {/* Número de boleto ganador */}
                      <div className="bg-white rounded-lg p-3 mt-2 text-center">
                        <p className="text-xs text-gray-600 mb-1">Boleto Ganador</p>
                        <p className="text-3xl font-bold text-yellow-600">
                          #{ganador.numero_boleto?.toString().padStart(4, '0') || '0000'}
                        </p>
                      </div>
                    </div>

                    {/* Premio */}
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-800 mb-1">Premio</p>
                      <p className="font-semibold text-blue-900 line-clamp-2">
                        {ganador.premio}
                      </p>
                    </div>

                    {/* Fecha del sorteo */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-yellow-600" />
                      <span>Sorteado: {formatDate(ganador.fecha_sorteo)}</span>
                    </div>

                    {/* Link al sorteo */}
                    {ganador.sorteo?.landing_slug && (
                      <Link to={`/sorteo/${ganador.sorteo.landing_slug}`} className="block mt-3">
                        <Button 
                          variant="outline" 
                          className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                          size="sm"
                        >
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

      {/* SECCIÓN: SORTEOS ACTIVOS (E-commerce Premium) */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm px-4 py-1 mb-4">
            🌟 SORTEOS DISPONIBLES
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Participa hoy y gana grandes premios
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explora nuestros sorteos activos y elige tu próxima oportunidad de ganar
          </p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Cargando sorteos...</p>
          </div>
        ) : sorteos.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Trophy className="w-20 h-20 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-xl">No hay sorteos activos en este momento.</p>
            <p className="text-gray-500 mt-2">¡Vuelve pronto para nuevas oportunidades!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sorteos.map((sorteo) => (
              <Card 
                key={sorteo.id} 
                className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg"
                data-testid={`sorteo-card-${sorteo.id}`}
              >
                {/* Imagen grande */}
                <div className="relative h-64 overflow-hidden group">
                  {sorteo.imagenes && sorteo.imagenes.length > 0 ? (
                    <img 
                      src={sorteo.imagenes[0]} 
                      alt={sorteo.titulo}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(135deg, ${sorteo.color_primario} 0%, ${sorteo.color_secundario} 100%)`
                      }}
                    >
                      <Trophy className="w-24 h-24 text-white opacity-50" />
                    </div>
                  )}
                  
                  {/* Badge de tipo */}
                  <div className="absolute top-4 right-4">
                    <Badge 
                      className="text-xs font-bold"
                      style={{ backgroundColor: sorteo.color_secundario }}
                    >
                      {sorteo.tipo === 'etapas' ? 'Multi-Etapas' : 'Sorteo Único'}
                    </Badge>
                  </div>

                  {/* Overlay con estadística */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
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
                  {/* Título grande */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {sorteo.titulo}
                  </h3>
                  
                  {/* Descripción breve */}
                  <p className="text-gray-600 mb-4 line-clamp-2 min-h-[48px]">
                    {sorteo.descripcion}
                  </p>

                  {/* Precio destacado */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Precio del boleto</p>
                        <p className="text-3xl font-bold text-purple-700">
                          {formatCurrency(sorteo.precio_boleto)}
                        </p>
                      </div>
                      <DollarSign className="w-12 h-12 text-purple-400" />
                    </div>
                  </div>

                  {/* Progreso visual moderno */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-gray-700">Progreso del sorteo</span>
                      <span className="text-sm font-bold text-purple-600">
                        {sorteo.cantidad_vendida}/{sorteo.cantidad_total_boletos}
                      </span>
                    </div>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                        style={{ width: `${sorteo.progreso_porcentaje}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Fecha límite */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 pb-4 border-b">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>Cierra: <strong>{formatDate(sorteo.fecha_cierre)}</strong></span>
                  </div>

                  {/* Etapas si las tiene */}
                  {sorteo.tipo === 'etapas' && sorteo.etapas.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-blue-800 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        <strong>{sorteo.etapas.length} etapas</strong> de premios increíbles
                      </p>
                    </div>
                  )}

                  {/* Botón destacado */}
                  <Link to={`/sorteo/${sorteo.landing_slug}`}>
                    <Button 
                      className="w-full text-lg font-bold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                      style={{ 
                        background: `linear-gradient(135deg, ${sorteo.color_primario} 0%, ${sorteo.color_secundario} 100%)`
                      }}
                      data-testid={`ver-sorteo-btn-${sorteo.id}`}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Participar Ahora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN: PROMOCIONES Y DESTACADOS */}
      {sorteos.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                🎁 Sorteos Destacados y Promociones
              </h2>
              <p className="text-lg text-gray-600">
                No te pierdas estas increíbles oportunidades
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {sorteos.slice(0, 2).map((sorteo, idx) => (
                <Link 
                  key={sorteo.id}
                  to={`/sorteo/${sorteo.landing_slug}`}
                  className="block group"
                >
                  <div className="relative h-96 rounded-3xl overflow-hidden shadow-2xl transform group-hover:scale-105 transition-all duration-300">
                    {sorteo.imagenes && sorteo.imagenes.length > 0 ? (
                      <img 
                        src={sorteo.imagenes[0]} 
                        alt={sorteo.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full"
                        style={{ 
                          background: `linear-gradient(135deg, ${sorteo.color_primario} 0%, ${sorteo.color_secundario} 100%)`
                        }}
                      />
                    )}
                    
                    {/* Overlay con info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-8">
                      <Badge className="w-fit bg-yellow-500 text-black font-bold mb-3">
                        ⭐ DESTACADO
                      </Badge>
                      <h3 className="text-3xl lg:text-4xl font-bold text-white mb-3">
                        {sorteo.titulo}
                      </h3>
                      <p className="text-white/90 text-lg mb-4 line-clamp-2">
                        {sorteo.descripcion}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <span className="text-white font-bold text-xl">
                            {formatCurrency(sorteo.precio_boleto)}
                          </span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                          <span className="text-white font-bold">
                            {sorteo.progreso_porcentaje.toFixed(0)}% vendido
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            ¿Listo para cambiar tu vida?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Únete a miles de ganadores que ya confiaron en WishWay
          </p>
          {!user && (
            <Link to="/register">
              <Button 
                size="lg"
                className="bg-white text-purple-700 hover:bg-gray-100 font-bold text-xl px-12 py-6 rounded-full shadow-2xl"
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

export default Home;
