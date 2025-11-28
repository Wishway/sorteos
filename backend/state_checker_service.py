"""
Servicio para verificar periódicamente los estados de los sorteos
Verifica cada 30 segundos si algún sorteo debe cambiar de estado
"""
import asyncio
import logging

logger = logging.getLogger(__name__)

db = None
state_machine = None

def init_state_checker(database, sm_module):
    global db, state_machine
    db = database
    state_machine = sm_module

async def verificar_estados_periodicamente():
    """
    Verifica cada 30 segundos TODOS los sorteos activos
    """
    while True:
        try:
            # Buscar sorteos que NO están en COMPLETED
            sorteos = await db.sorteos.find({
                'estado': {'$ne': 'completed'}
            }, {"_id": 0, "id": 1, "titulo": 1, "estado": 1, "tipo": 1}).to_list(1000)
            
            for sorteo in sorteos:
                try:
                    resultado = await state_machine.verificar_transicion_estado_nuevo(sorteo['id'])
                    if resultado:
                        logger.info(f"✅ Sorteo {sorteo['titulo']}: transición ejecutada → {resultado}")
                except Exception as e:
                    logger.error(f"❌ Error verificando sorteo {sorteo['id']}: {e}")
            
            # Esperar 30 segundos antes de la siguiente verificación
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"❌ Error en verificación periódica: {e}")
            await asyncio.sleep(60)

def iniciar_verificador_estados():
    """Iniciar tarea en background"""
    asyncio.create_task(verificar_estados_periodicamente())
    logger.info("✅ Verificador periódico de estados iniciado (cada 30s)")
