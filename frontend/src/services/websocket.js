import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect() {
    if (this.socket) {
      console.log('WebSocket ya está conectado');
      return;
    }

    // Conectar al backend
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      this.connected = false;
    });

    this.socket.on('connection_established', (data) => {
      console.log('✅ Conexión establecida:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
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
    if (this.socket && this.connected) {
      console.log(`🔗 Uniéndose al sorteo: ${sorteoId}`);
      this.socket.emit('join_sorteo', { sorteo_id: sorteoId });
    }
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
