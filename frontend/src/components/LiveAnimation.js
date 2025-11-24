import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, Sparkles, Star, Gift } from 'lucide-react';
import websocketService from '../services/websocket';

const LiveAnimation = ({ sorteo, participantes = [], onAnimationComplete }) => {
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [winners, setWinners] = useState([]);
  const [showWinners, setShowWinners] = useState(false);
  const [currentPrize, setCurrentPrize] = useState(null);
  const [prizeIndex, setPrizeIndex] = useState(0);
  const [wsParticipantes, setWsParticipantes] = useState([]);
  
  // Si el sorteo ya tiene ganadores guardados, mostrarlos directamente
  const yaTerminado = sorteo.ganadores && sorteo.ganadores.length > 0 && sorteo.estado === 'completed';

  useEffect(() => {
    // Si ya terminó (completed con ganadores), mostrarlos directamente
    if (yaTerminado) {
      setIsAnimating(false);
      setWinners(sorteo.ganadores);
      setShowWinners(true);
      return;
    }
    
    // Si está en estado LIVE, conectar WebSocket
    if (sorteo.estado === 'live') {
      websocketService.joinSorteo(sorteo.id);
      
      // Escuchar inicio de animación
      const handleAnimationStart = (data) => {
        console.log('🎬 Animación LIVE iniciada', data);
        setWsParticipantes(data.participantes || participantes);
        setIsAnimating(true);
      };
      
      // Escuchar sorteo de premio
      const handlePrizeDrawing = (data) => {
        console.log('🎁 Sorteando premio', data);
        setCurrentPrize(data.premio_nombre);
        setPrizeIndex(data.premio_index);
        setTimeLeft(data.duracion_segundos); // 60 segundos por premio
        setIsAnimating(true);
      };
      
      // Escuchar anuncio de ganador
      const handleWinnerAnnounced = (data) => {
        console.log('🏆 Ganador anunciado', data);
        setWinners(prev => [...prev, data.ganador]);
        setIsAnimating(false);
        setTimeLeft(0);
      };
      
      // Escuchar finalización de animación
      const handleAnimationComplete = (data) => {
        console.log('✅ Animación completada', data);
        setWinners(data.ganadores);
        setShowWinners(true);
        setIsAnimating(false);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      };
      
      websocketService.onLiveAnimationStart(handleAnimationStart);
      websocketService.onLivePrizeDrawing(handlePrizeDrawing);
      websocketService.onLiveWinnerAnnounced(handleWinnerAnnounced);
      websocketService.onLiveAnimationComplete(handleAnimationComplete);
      
      return () => {
        websocketService.offLiveAnimationStart(handleAnimationStart);
        websocketService.offLivePrizeDrawing(handlePrizeDrawing);
        websocketService.offLiveWinnerAnnounced(handleWinnerAnnounced);
        websocketService.offLiveAnimationComplete(handleAnimationComplete);
        websocketService.leaveSorteo(sorteo.id);
      };
    }
  }, [sorteo.id, sorteo.estado]);

  // Animación de rotación de participantes
  useEffect(() => {
    if (!isAnimating || wsParticipantes.length === 0) return;

    const rotationInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * wsParticipantes.length);
      setCurrentParticipant(wsParticipantes[randomIndex]);
    }, 150);

    return () => clearInterval(rotationInterval);
  }, [isAnimating, wsParticipantes]);

  // Countdown timer
  useEffect(() => {
    if (!isAnimating || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnimating, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      {/* Fondo animado con luces */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 opacity-50 animate-pulse"></div>
      
      <Card className="relative border-4 border-yellow-400 shadow-2xl overflow-hidden">
        {/* Efectos de luces */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-red-500 to-yellow-400 animate-pulse"></div>
        
        <CardContent className="p-8 bg-gradient-to-br from-gray-900 to-black">
          {/* Header con título del sorteo */}
          <div className="text-center mb-6">
            <Badge className="bg-red-600 text-white text-lg px-6 py-2 mb-4 animate-bounce">
              🔴 EN VIVO
            </Badge>
            <h2 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              {sorteo.titulo}
            </h2>
            <p className="text-gray-300 text-lg">Sorteo en progreso...</p>
          </div>

          {isAnimating ? (
            // Animación en progreso
            <div className="space-y-6">
              {/* Contador regresivo */}
              <div className="text-center">
                <p className="text-yellow-400 text-sm mb-2 font-semibold">Tiempo restante:</p>
                <div className="text-7xl font-bold text-white bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Participante actual rotando */}
              {currentParticipant && (
                <div className="bg-gradient-to-br from-yellow-500 via-red-600 to-purple-700 p-1 rounded-2xl animate-pulse">
                  <div className="bg-black rounded-2xl p-8">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <Sparkles className="w-8 h-8 text-yellow-400 animate-spin" />
                      <p className="text-yellow-400 text-xl font-semibold">Seleccionando ganador...</p>
                      <Sparkles className="w-8 h-8 text-yellow-400 animate-spin" />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-5xl font-bold text-white mb-3 animate-pulse">
                        {currentParticipant.nombre || currentParticipant.email}
                      </div>
                      <div className="flex items-center justify-center gap-3 text-3xl text-yellow-400">
                        <Trophy className="w-8 h-8" />
                        <span className="font-bold">Boleto #{currentParticipant.numero_boleto}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Efectos visuales */}
              <div className="flex justify-center gap-4">
                <Star className="w-12 h-12 text-yellow-400 animate-bounce" style={{ animationDelay: '0s' }} />
                <Star className="w-12 h-12 text-red-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <Star className="w-12 h-12 text-purple-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>

              {/* Indicador de participantes */}
              <div className="text-center text-gray-400 text-sm">
                {participantes.length} participante{participantes.length !== 1 ? 's' : ''} en total
              </div>
            </div>
          ) : showWinners ? (
            // Mostrar ganador(es)
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-4xl font-bold text-yellow-400 mb-2">
                  ¡{winners.length > 1 ? 'GANADORES' : 'GANADOR'}!
                </h3>
                <p className="text-gray-300">¡Felicitaciones!</p>
              </div>

              {/* Lista de ganadores */}
              <div className="space-y-4">
                {winners.map((winner, index) => {
                  const premio = sorteo.tipo === 'unico' 
                    ? sorteo.premios?.[index] || { nombre: 'Premio Principal' }
                    : sorteo.etapas?.[index]?.premio || `Premio ${index + 1}`;
                  
                  return (
                    <div 
                      key={index}
                      className="bg-gradient-to-r from-yellow-500 via-red-600 to-purple-700 p-1 rounded-xl"
                    >
                      <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-red-600 rounded-full flex items-center justify-center">
                              <Gift className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <Badge className="bg-yellow-600 text-white mb-2">
                              {typeof premio === 'string' ? premio : premio.nombre}
                            </Badge>
                            <div className="text-3xl font-bold text-white mb-2">
                              {winner.nombre || winner.email}
                            </div>
                            <div className="flex items-center gap-2 text-yellow-400">
                              <Trophy className="w-5 h-5" />
                              <span className="text-lg font-semibold">
                                Boleto #{winner.numero_boleto}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timestamp */}
              <div className="text-center text-gray-400 text-sm mt-6">
                <p>Sorteo realizado el {new Date().toLocaleString('es-EC', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveAnimation;
