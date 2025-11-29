import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket && this.connected) {
      console.log('✅ WebSocket ya está conectado');
      return;
    }
    
    if (this.socket && !this.connected) {
      console.log('⏳ WebSocket conectándose...');
      return;
    }

    // Conectar al backend
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    console.log('🔌 Conectando WebSocket a:', backendUrl);
    
    this.socket = io(backendUrl, {
      transports: ['polling', 'websocket'], // polling primero, luego websocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket CONECTADO exitosamente');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      this.connected = false;
    });

    this.socket.on('connection_established', (data) => {
      console.log('✅ Conexión establecida con SID:', data.sid);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
      this.connected = false;
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Unirse a un sorteo específico
  joinSorteo(sorteoId) {
    if (!this.socket) {
      console.warn('⚠️ Socket no inicializado, conectando...');
      this.connect();
    }
    
    const attemptJoin = (retries = 0) => {
      if (this.socket && this.connected) {
        console.log(`✅ Uniéndose al sorteo: ${sorteoId}`);
        this.socket.emit('join_sorteo', { sorteo_id: sorteoId });
        
        // Confirmar que se unió al room
        this.socket.once('joined_sorteo', (data) => {
          console.log(`✅ CONFIRMADO: Unido al sorteo ${data.sorteo_id}`);
        });
      } else if (retries < 20) { // Máximo 10 segundos de espera
        console.log(`⏳ Esperando conexión WebSocket... intento ${retries + 1}/20`);
        setTimeout(() => attemptJoin(retries + 1), 500);
      } else {
        console.error('❌ No se pudo conectar al WebSocket después de 10 segundos');
      }
    };
    
    attemptJoin();
  }

  // Salir de un sorteo
  leaveSorteo(sorteoId) {
    if (this.socket && this.connected) {
      console.log(`🔌 Saliendo del sorteo: ${sorteoId}`);
      this.socket.emit('leave_sorteo', { sorteo_id: sorteoId });
    }
  }

  // Escuchar actualización de sorteo
  onSorteoUpdated(callback) {
    if (this.socket) {
      this.socket.on('sorteo_updated', callback);
    }
  }

  // Escuchar cambio de estado
  onStateChanged(callback) {
    if (this.socket) {
      this.socket.on('sorteo_state_changed', callback);
    }
  }

  // Escuchar actualización global de sorteos
  onSorteosListUpdated(callback) {
    if (this.socket) {
      this.socket.on('sorteos_list_updated', callback);
    }
  }

  // Escuchar eventos de animación LIVE
  onLiveAnimationStart(callback) {
    if (this.socket) {
      this.socket.on('live_animation_start', callback);
    }
  }

  onLivePrizeDrawing(callback) {
    if (this.socket) {
      this.socket.on('live_prize_drawing', callback);
    }
  }

  onLiveTimeUpdate(callback) {
    if (this.socket) {
      this.socket.on('live_time_update', callback);
    }
  }

  onLiveWinnerAnnounced(callback) {
    if (this.socket) {
      this.socket.on('live_winner_announced', callback);
    }
  }

  onLiveAnimationComplete(callback) {
    if (this.socket) {
      this.socket.on('live_animation_complete', callback);
    }
  }

  onVentasPausadas(callback) {
    if (this.socket) {
      this.socket.on('ventas_pausadas', callback);
    }
  }

  // Remover listeners
  offSorteoUpdated(callback) {
    if (this.socket) {
      this.socket.off('sorteo_updated', callback);
    }
  }

  offStateChanged(callback) {
    if (this.socket) {
      this.socket.off('sorteo_state_changed', callback);
    }
  }

  offSorteosListUpdated(callback) {
    if (this.socket) {
      this.socket.off('sorteos_list_updated', callback);
    }
  }

  offLiveAnimationStart(callback) {
    if (this.socket) {
      this.socket.off('live_animation_start', callback);
    }
  }

  offLivePrizeDrawing(callback) {
    if (this.socket) {
      this.socket.off('live_prize_drawing', callback);
    }
  }

  offLiveTimeUpdate(callback) {
    if (this.socket) {
      this.socket.off('live_time_update', callback);
    }
  }

  offLiveWinnerAnnounced(callback) {
    if (this.socket) {
      this.socket.off('live_winner_announced', callback);
    }
  }

  offLiveAnimationComplete(callback) {
    if (this.socket) {
      this.socket.off('live_animation_complete', callback);
    }
  }

  offVentasPausadas(callback) {
    if (this.socket) {
      this.socket.off('ventas_pausadas', callback);
    }
  }
}

// Exportar instancia única (singleton)
const websocketService = new WebSocketService();
export default websocketService;
