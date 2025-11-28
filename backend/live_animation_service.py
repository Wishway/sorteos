"""
Servicio para manejar animaciones LIVE en tiempo real
2 minutos (120 segundos) por premio - OBLIGATORIO
"""
import asyncio
from datetime import datetime, timezone
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Variables globales
db = None
Sorteo = None
SorteoEstado = None
SorteoTipo = None

# Diccionario para rastrear animaciones activas
active_animations: Dict[str, asyncio.Task] = {}

def init_live_service(database, sorteo_model, estado_enum, tipo_enum):
    global db, Sorteo, SorteoEstado, SorteoTipo
    db = database
    Sorteo = sorteo_model
    SorteoEstado = estado_enum
    SorteoTipo = tipo_enum

async def iniciar_animacion_live(sorteo_id: str):
    """
    Iniciar animación LIVE para un sorteo
    2 minutos por premio - OBLIGATORIO
    """
    # Evitar iniciar si ya hay una animación activa
    if sorteo_id in active_animations:
        logger.warning(f"Animación ya activa para sorteo {sorteo_id}")
        return
    
    # Crear tarea asíncrona
    task = asyncio.create_task(ejecutar_animacion_live(sorteo_id))
    active_animations[sorteo_id] = task
    
    logger.info(f"✅ Animación LIVE programada para sorteo {sorteo_id}")
    
    try:
        await task
    finally:
        if sorteo_id in active_animations:
            del active_animations[sorteo_id]
            logger.info(f"✅ Animación LIVE finalizada y eliminada para sorteo {sorteo_id}")

async def verificar_y_reiniciar_animaciones():
    """
    Verificar sorteos LIVE sin animación activa y reiniciarlos
    """
    sorteos_live = await db.sorteos.find({'estado': 'live'}).to_list(100)
    
    for sorteo_doc in sorteos_live:
        sorteo_id = sorteo_doc['id']
        
        # Si el sorteo está LIVE pero NO tiene animación activa
        if sorteo_id not in active_animations:
            logger.warning(f"⚠️  Sorteo LIVE sin animación: {sorteo_id} - Reiniciando...")
            asyncio.create_task(iniciar_animacion_live(sorteo_id))

async def ejecutar_animacion_live(sorteo_id: str):
    """
    Ejecutar la animación LIVE
    """
    from websocket_manager import (
        emit_live_animation_start,
        emit_live_prize_drawing,
        emit_live_time_update,
        emit_live_winner_announced,
        emit_live_animation_complete,
        emit_sorteo_state_changed
    )
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        return
    
    sorteo = Sorteo(**sorteo_doc)
    
    logger.info(f"Iniciando animación LIVE para sorteo {sorteo_id}")
    
    # Obtener participantes
    participantes = await db.boletos.find({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    }).to_list(10000)
    
    # Obtener información de usuarios
    participantes_data = []
    for boleto in participantes:
        usuario = await db.users.find_one({'id': boleto['usuario_id']}, {"_id": 0})
        participantes_data.append({
            'nombre': usuario.get('name', '') if usuario else 'Participante',
            'email': usuario.get('email', ''),
            'numero_boleto': boleto['numero_boleto']
        })
    
    # Emitir inicio de animación
    await emit_live_animation_start(sorteo_id, {
        'sorteo_id': sorteo_id,
        'participantes': participantes_data,
        'num_premios': len(sorteo.ganadores) if sorteo.ganadores else 1,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    # Procesar cada premio (2 minutos cada uno - OBLIGATORIO)
    ganadores = sorteo.ganadores if sorteo.ganadores else []
    duracion_por_premio = 120  # 120 segundos = 2 minutos (REQUERIMIENTO OBLIGATORIO)
    
    for idx, ganador in enumerate(ganadores):
        premio_nombre = ganador.get('premio', f'Premio {idx + 1}')
        
        logger.info(f"Sorteando premio {idx + 1}/{len(ganadores)}: {premio_nombre}")
        
        # Emitir inicio de sorteo de este premio
        inicio_premio = datetime.now(timezone.utc)
        await emit_live_prize_drawing(sorteo_id, {
            'premio_index': idx,
            'premio_nombre': premio_nombre,
            'duracion_segundos': duracion_por_premio,
            'total_premios': len(ganadores),
            'timestamp': inicio_premio.isoformat(),
            'tiempo_restante': duracion_por_premio
        })
        
        # Esperar 2 minutos (120 segundos) enviando actualizaciones cada segundo
        for segundo in range(duracion_por_premio, 0, -1):
            # Emitir actualización de tiempo cada segundo
            await emit_live_time_update(sorteo_id, {
                'premio_index': idx,
                'premio_nombre': premio_nombre,
                'tiempo_restante': segundo,
                'total_premios': len(ganadores),
                'timestamp': datetime.now(timezone.utc).isoformat()
            })
            await asyncio.sleep(1)
        
        # Anunciar ganador
        await emit_live_winner_announced(sorteo_id, {
            'premio_index': idx,
            'premio_nombre': premio_nombre,
            'ganador': ganador,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Ganador anunciado: {ganador.get('nombre', ganador.get('email'))} - Boleto #{ganador.get('numero_boleto')}")
    
    # Animación completada
    logger.info(f"Animación LIVE completada para sorteo {sorteo_id}")
    
    await emit_live_animation_complete(sorteo_id, {
        'sorteo_id': sorteo_id,
        'ganadores': ganadores,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    # Determinar siguiente estado
    if sorteo.tipo == SorteoTipo.ETAPAS:
        # Para sorteos por etapas
        etapa_actual_num = sorteo.etapa_actual
        es_ultima_etapa = etapa_actual_num == len(sorteo.etapas)
        
        if es_ultima_etapa:
            # Última etapa → COMPLETED
            nuevo_estado = SorteoEstado.COMPLETED
            await db.sorteos.update_one(
                {'id': sorteo_id},
                {'$set': {
                    'estado': nuevo_estado,
                    'fecha_completed': datetime.now(timezone.utc)
                }}
            )
            logger.info(f"Sorteo {sorteo_id} completado (última etapa)")
        else:
            # Etapa intermedia → volver a PUBLISHED para siguiente etapa
            nuevo_estado = SorteoEstado.PUBLISHED
            await db.sorteos.update_one(
                {'id': sorteo_id},
                {'$set': {
                    'estado': nuevo_estado,
                    'etapa_actual': etapa_actual_num + 1,
                    'fecha_live': None,
                    'fecha_waiting': None
                }}
            )
            logger.info(f"Sorteo {sorteo_id} vuelve a PUBLISHED para etapa {etapa_actual_num + 1}")
        
        await emit_sorteo_state_changed(sorteo_id, nuevo_estado)
    
    else:
        # Sorteo único → COMPLETED
        nuevo_estado = SorteoEstado.COMPLETED
        await db.sorteos.update_one(
            {'id': sorteo_id},
            {'$set': {
                'estado': nuevo_estado,
                'fecha_completed': datetime.now(timezone.utc)
            }}
        )
        logger.info(f"Sorteo {sorteo_id} completado")
        await emit_sorteo_state_changed(sorteo_id, nuevo_estado)
    
    # Guardar ganadores en colección separada
    await guardar_ganadores_db(sorteo_id, ganadores, sorteo.titulo)

async def guardar_ganadores_db(sorteo_id: str, ganadores: list, sorteo_titulo: str):
    """Guardar ganadores en la colección ganadores"""
    for ganador in ganadores:
        ganador_doc = {
            'id': f"gan-{sorteo_id}-{ganador['boleto_id']}",
            'sorteo_id': sorteo_id,
            'sorteo_titulo': sorteo_titulo,
            'boleto_id': ganador['boleto_id'],
            'usuario_id': ganador['usuario_id'],
            'premio': ganador['premio'],
            'numero_boleto': ganador['numero_boleto'],
            'fecha_sorteo': datetime.now(timezone.utc).isoformat(),
            'notificado': False
        }
        
        # Upsert para evitar duplicados
        await db.ganadores.update_one(
            {'id': ganador_doc['id']},
            {'$set': ganador_doc},
            upsert=True
        )
    
    logger.info(f"Guardados {len(ganadores)} ganadores en DB para sorteo {sorteo_id}")
