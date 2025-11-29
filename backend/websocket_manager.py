"""
WebSocket Manager para manejo de eventos en tiempo real
"""
import socketio
from typing import Dict, Set
import asyncio
import logging

logger = logging.getLogger(__name__)

# Crear el servidor Socket.IO con modo asgi
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Diccionario para rastrear usuarios conectados por sorteo
sorteo_rooms: Dict[str, Set[str]] = {}

@sio.event
async def connect(sid, environ):
    """Cliente conectado"""
    logger.info(f"Cliente conectado: {sid}")
    await sio.emit('connection_established', {'sid': sid}, room=sid)

@sio.event
async def disconnect(sid):
    """Cliente desconectado"""
    logger.info(f"Cliente desconectado: {sid}")
    # Remover de todas las rooms
    for sorteo_id in list(sorteo_rooms.keys()):
        if sid in sorteo_rooms[sorteo_id]:
            sorteo_rooms[sorteo_id].remove(sid)
            if not sorteo_rooms[sorteo_id]:
                del sorteo_rooms[sorteo_id]

@sio.event
async def join_sorteo(sid, data):
    """Unirse a una room de sorteo específico"""
    sorteo_id = data.get('sorteo_id')
    if sorteo_id:
        await sio.enter_room(sid, f'sorteo_{sorteo_id}')
        if sorteo_id not in sorteo_rooms:
            sorteo_rooms[sorteo_id] = set()
        sorteo_rooms[sorteo_id].add(sid)
        logger.info(f"Cliente {sid} se unió a sorteo {sorteo_id}")
        await sio.emit('joined_sorteo', {'sorteo_id': sorteo_id}, room=sid)

@sio.event
async def leave_sorteo(sid, data):
    """Salir de una room de sorteo"""
    sorteo_id = data.get('sorteo_id')
    if sorteo_id:
        await sio.leave_room(sid, f'sorteo_{sorteo_id}')
        if sorteo_id in sorteo_rooms and sid in sorteo_rooms[sorteo_id]:
            sorteo_rooms[sorteo_id].remove(sid)
            if not sorteo_rooms[sorteo_id]:
                del sorteo_rooms[sorteo_id]
        logger.info(f"Cliente {sid} salió de sorteo {sorteo_id}")

# Funciones para emitir eventos
async def emit_sorteo_updated(sorteo_id: str, sorteo_data: dict):
    """Emitir actualización de sorteo a todos los clientes suscritos"""
    await sio.emit('sorteo_updated', sorteo_data, room=f'sorteo_{sorteo_id}')
    logger.info(f"Emitido sorteo_updated para sorteo {sorteo_id}")

async def emit_sorteo_state_changed(sorteo_id: str, new_state: str, data: dict = None):
    """Emitir cambio de estado de sorteo"""
    event_data = {
        'sorteo_id': sorteo_id,
        'new_state': new_state,
        'timestamp': data.get('timestamp') if data else None
    }
    if data:
        event_data.update(data)
    await sio.emit('sorteo_state_changed', event_data, room=f'sorteo_{sorteo_id}')
    logger.info(f"Emitido cambio de estado: {sorteo_id} -> {new_state}")

async def emit_live_animation_start(sorteo_id: str, data: dict):
    """Iniciar animación LIVE"""
    await sio.emit('live_animation_start', data, room=f'sorteo_{sorteo_id}')
    logger.info(f"Iniciada animación LIVE para sorteo {sorteo_id}")

async def emit_live_prize_drawing(sorteo_id: str, prize_data: dict):
    """Emitir sorteo de un premio específico"""
    await sio.emit('live_prize_drawing', prize_data, room=f'sorteo_{sorteo_id}')
    logger.info(f"Sorteando premio para sorteo {sorteo_id}")

async def emit_live_winner_announced(sorteo_id: str, winner_data: dict):
    """Anunciar ganador de un premio"""
    await sio.emit('live_winner_announced', winner_data, room=f'sorteo_{sorteo_id}')
    logger.info(f"Ganador anunciado para sorteo {sorteo_id}")

async def emit_live_time_update(sorteo_id: str, time_data: dict):
    """Emitir actualización de tiempo cada segundo"""
    await sio.emit('live_time_update', time_data, room=f'sorteo_{sorteo_id}')

async def emit_waiting_countdown_update(sorteo_id: str, countdown_data: dict):
    """Emitir actualización de countdown WAITING cada segundo"""
    await sio.emit('waiting_countdown_update', countdown_data, room=f'sorteo_{sorteo_id}')

async def emit_live_animation_complete(sorteo_id: str, data: dict):
    """Completar animación LIVE"""
    await sio.emit('live_animation_complete', data, room=f'sorteo_{sorteo_id}')
    logger.info(f"Animación LIVE completada para sorteo {sorteo_id}")

async def emit_ventas_pausadas(sorteo_id: str, pausadas: bool):
    """Emitir cambio en estado de ventas"""
    await sio.emit('ventas_pausadas', {
        'sorteo_id': sorteo_id,
        'pausadas': pausadas
    }, room=f'sorteo_{sorteo_id}')
    logger.info(f"Ventas {'pausadas' if pausadas else 'reanudadas'} para sorteo {sorteo_id}")

# Broadcast global
async def broadcast_sorteos_update():
    """Emitir actualización global de sorteos (para home)"""
    await sio.emit('sorteos_list_updated', {})
    logger.info("Emitida actualización global de sorteos")
