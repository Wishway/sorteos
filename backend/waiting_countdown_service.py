"""
Servicio para manejar el countdown de WAITING en tiempo real via WebSocket
Env\u00eda actualizaciones cada segundo a todos los clientes conectados
"""
import asyncio
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

db = None
SorteoEstado = None

def init_countdown_service(database, estado_enum):
    global db, SorteoEstado
    db = database
    SorteoEstado = estado_enum

async def monitorear_countdowns_waiting():
    """
    Monitorea TODOS los sorteos en estado WAITING y env\u00eda actualizaciones cada segundo
    """
    from websocket_manager import emit_waiting_countdown_update
    
    while True:
        try:
            # Buscar todos los sorteos en WAITING
            sorteos_waiting = await db.sorteos.find({
                'estado': 'waiting',
                'waiting_hasta': {'$exists': True}
            }, {"_id": 0}).to_list(100)
            
            ahora = datetime.now(timezone.utc)
            
            for sorteo in sorteos_waiting:
                # Asegurar timezone
                waiting_hasta = sorteo.get('waiting_hasta')
                if not waiting_hasta:
                    continue
                    
                if waiting_hasta.tzinfo is None:
                    waiting_hasta = waiting_hasta.replace(tzinfo=timezone.utc)
                
                # Calcular tiempo restante en segundos
                tiempo_restante = (waiting_hasta - ahora).total_seconds()
                tiempo_restante = max(0, int(tiempo_restante))
                
                # Emitir actualizaci\u00f3n via WebSocket
                await emit_waiting_countdown_update(sorteo['id'], {
                    'sorteo_id': sorteo['id'],
                    'tiempo_restante': tiempo_restante,
                    'waiting_hasta': waiting_hasta.isoformat(),
                    'timestamp': ahora.isoformat(),
                    'etapa_actual': sorteo.get('etapa_actual', 0),
                    'tipo': sorteo.get('tipo', 'unico')
                })
            
            # Esperar 1 segundo antes de la siguiente actualizaci\u00f3n
            await asyncio.sleep(1)
            
        except Exception as e:
            logger.error(f"Error en monitoreo de countdowns: {e}")
            await asyncio.sleep(5)  # Esperar m\u00e1s tiempo en caso de error

def iniciar_monitoreo_countdowns():
    """Iniciar tarea en background para monitorear countdowns"""
    asyncio.create_task(monitorear_countdowns_waiting())
    logger.info("✅ Servicio de countdown WAITING iniciado")
