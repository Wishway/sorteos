"""
Máquina de estados para sorteos - Implementación EXACTA según nueva especificación

SORTEOS ÚNICOS: NO SE TOCAN (ya funcionan perfecto)
SORTEOS POR ETAPAS: Nueva lógica con WebSockets obligatorios
"""
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from typing import Optional, Dict
import random
import asyncio

logger = logging.getLogger(__name__)

# Esta función debe ser llamada desde server.py después de importar los modelos
db = None
Sorteo = None
SorteoEstado = None
SorteoTipo = None

def init_state_machine(database, sorteo_model, estado_enum, tipo_enum):
    global db, Sorteo, SorteoEstado, SorteoTipo
    db = database
    Sorteo = sorteo_model
    SorteoEstado = estado_enum
    SorteoTipo = tipo_enum

def normalize_datetime_to_utc(dt):
    """Convierte un datetime a UTC-aware, manejando casos naive y aware"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Si es naive, asumimos que es UTC
        return dt.replace(tzinfo=timezone.utc)
    # Si ya tiene timezone, convertir a UTC
    return dt.astimezone(timezone.utc)

async def verificar_transicion_estado_nuevo(sorteo_id: str) -> Optional[str]:
    """
    Máquina de estados:
    - SORTEOS ÚNICOS: lógica original (NO SE TOCA)
    - SORTEOS POR ETAPAS: nueva lógica con 5 min WAITING y WebSockets
    """
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        return None
    
    sorteo = Sorteo(**sorteo_doc)
    ahora = datetime.now(timezone.utc)
    
    # Normalizar TODAS las fechas del sorteo a UTC-aware
    sorteo.fecha_cierre = normalize_datetime_to_utc(sorteo.fecha_cierre)
    if hasattr(sorteo, 'waiting_hasta') and sorteo.waiting_hasta:
        sorteo.waiting_hasta = normalize_datetime_to_utc(sorteo.waiting_hasta)
    if hasattr(sorteo, 'fecha_waiting') and sorteo.fecha_waiting:
        sorteo.fecha_waiting = normalize_datetime_to_utc(sorteo.fecha_waiting)
    if hasattr(sorteo, 'fecha_live') and sorteo.fecha_live:
        sorteo.fecha_live = normalize_datetime_to_utc(sorteo.fecha_live)
    
    estado_actual = sorteo.estado
    nuevo_estado = None
    update_data = {}
    
    # Si ventas están pausadas, no hacer transiciones
    if sorteo.ventas_pausadas and estado_actual == SorteoEstado.PUBLISHED:
        return None
    
    # ==================== PUBLISHED → WAITING ====================
    if estado_actual == SorteoEstado.PUBLISHED:
        transicion = await check_published_to_waiting(sorteo, ahora, sorteo_id)
        if transicion:
            nuevo_estado, update_data = transicion
    
    # ==================== WAITING → LIVE ====================
    elif estado_actual == SorteoEstado.WAITING:
        transicion = await check_waiting_to_live(sorteo, ahora, sorteo_id)
        if transicion:
            nuevo_estado, update_data = transicion
    
    # Actualizar estado si cambió
    if nuevo_estado and nuevo_estado != estado_actual:
        update_data['estado'] = nuevo_estado
        
        await db.sorteos.update_one(
            {'id': sorteo_id},
            {'$set': update_data}
        )
        
        logger.info(f"Sorteo {sorteo_id}: {estado_actual} → {nuevo_estado}")
        
        # Emitir evento WebSocket
        from websocket_manager import emit_sorteo_state_changed
        await emit_sorteo_state_changed(sorteo_id, nuevo_estado, update_data)
        
        # Si pasó a LIVE, iniciar animación
        if nuevo_estado == SorteoEstado.LIVE:
            from live_animation_service import iniciar_animacion_live
            asyncio.create_task(iniciar_animacion_live(sorteo_id))
        
        return nuevo_estado
    
    return None


async def check_published_to_waiting(sorteo, ahora, sorteo_id):
    """
    PUBLISHED → WAITING
    
    SORTEOS ÚNICOS: NO SE TOCAN
    
    SORTEOS POR ETAPAS:
    - Etapas intermedias: SOLO porcentaje (sin fecha)
    - Etapa final: porcentaje + fecha
    """
    update_data = {}
    
    # Contar boletos aprobados
    boletos_aprobados = await db.boletos.count_documents({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    })
    
    if sorteo.tipo == SorteoTipo.UNICO:
        # ============ SORTEO ÚNICO (NO SE TOCA) ============
        todos_vendidos = boletos_aprobados >= sorteo.cantidad_total_boletos
        fecha_alcanzada = sorteo.fecha_cierre <= ahora
        
        # Forma 1: Ambas condiciones (fecha Y boletos)
        if todos_vendidos and fecha_alcanzada:
            update_data['fecha_waiting'] = ahora
            return (SorteoEstado.WAITING, update_data)
        
        # Forma 2: Solo fecha (permite seguir vendiendo)
        elif fecha_alcanzada and not todos_vendidos:
            update_data['fecha_waiting'] = ahora
            return (SorteoEstado.WAITING, update_data)
        
        # Forma 3: Solo boletos (ya no se venden, espera fecha)
        elif todos_vendidos and not fecha_alcanzada:
            update_data['fecha_waiting'] = ahora
            return (SorteoEstado.WAITING, update_data)
    
    else:
        # ============ SORTEO POR ETAPAS (NUEVA LÓGICA) ============
        etapa_actual_num = sorteo.etapa_actual
        
        # Si no hay etapa actual, iniciar en etapa 1
        if etapa_actual_num == 0:
            etapa_actual_num = 1
            update_data['etapa_actual'] = 1
        
        if etapa_actual_num <= len(sorteo.etapas):
            etapa_actual = sorteo.etapas[etapa_actual_num - 1]
            
            # Calcular boletos necesarios para esta etapa
            porcentaje_requerido = etapa_actual.porcentaje / 100
            boletos_requeridos = int(sorteo.cantidad_total_boletos * porcentaje_requerido)
            
            # Verificar si se cumplió el porcentaje de esta etapa
            porcentaje_alcanzado = boletos_aprobados >= boletos_requeridos
            
            # Determinar si es la última etapa
            es_ultima_etapa = etapa_actual_num == len(sorteo.etapas)
            
            if es_ultima_etapa:
                # ============ ETAPA FINAL: DOBLE CONDICIÓN ============
                todos_vendidos = boletos_aprobados >= sorteo.cantidad_total_boletos
                fecha_alcanzada = sorteo.fecha_cierre <= ahora
                
                # Ambas condiciones deben cumplirse
                if todos_vendidos and fecha_alcanzada:
                    # WAITING de 5 minutos para etapa final
                    update_data['fecha_waiting'] = ahora
                    update_data['waiting_hasta'] = ahora + timedelta(minutes=5)
                    return (SorteoEstado.WAITING, update_data)
            
            else:
                # ============ ETAPA INTERMEDIA: SOLO PORCENTAJE ============
                if porcentaje_alcanzado:
                    # WAITING de 5 minutos
                    update_data['fecha_waiting'] = ahora
                    update_data['waiting_hasta'] = ahora + timedelta(minutes=5)
                    return (SorteoEstado.WAITING, update_data)
    
    return None


async def check_waiting_to_live(sorteo, ahora, sorteo_id):
    """
    WAITING → LIVE
    
    Para ETAPAS: esperar exactamente 5 minutos desde que entró en WAITING
    """
    update_data = {}
    
    boletos_aprobados = await db.boletos.count_documents({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    })
    
    if sorteo.tipo == SorteoTipo.UNICO:
        # ============ SORTEO ÚNICO (NO SE TOCA) ============
        todos_vendidos = boletos_aprobados >= sorteo.cantidad_total_boletos
        fecha_alcanzada = sorteo.fecha_cierre <= ahora
        
        if todos_vendidos and fecha_alcanzada:
            # Seleccionar ganadores antes de pasar a LIVE
            if not sorteo.ganadores or len(sorteo.ganadores) == 0:
                ganadores = await seleccionar_ganadores(sorteo_id, sorteo)
                update_data['ganadores'] = ganadores
            
            update_data['fecha_live'] = ahora
            return (SorteoEstado.LIVE, update_data)
    
    else:
        # ============ SORTEO POR ETAPAS (NUEVA LÓGICA) ============
        # Verificar si ya pasaron los 5 minutos de WAITING
        if sorteo.waiting_hasta and ahora >= sorteo.waiting_hasta:
            # Pasar a LIVE
            # Seleccionar ganadores de TODOS los premios de la etapa actual
            ganadores_actuales = sorteo.ganadores if sorteo.ganadores else []
            
            # Verificar si ya se sorteó esta etapa
            etapa_actual_num = sorteo.etapa_actual
            ya_sorteado = any(g.get('etapa_numero') == etapa_actual_num or g.get('etapa') == etapa_actual_num for g in ganadores_actuales)
            
            if not ya_sorteado:
                # Seleccionar ganadores para TODOS los premios de esta etapa
                ganadores_etapa = await seleccionar_ganador_etapa(sorteo_id, sorteo, etapa_actual_num)
                if ganadores_etapa:
                    # ganadores_etapa ahora es una LISTA de ganadores
                    update_data['ganadores'] = ganadores_actuales + ganadores_etapa
                    logger.info(f"Sorteo {sorteo_id}: Seleccionados {len(ganadores_etapa)} ganadores para Etapa {etapa_actual_num}")
            
            update_data['fecha_live'] = ahora
            return (SorteoEstado.LIVE, update_data)
    
    return None


async def seleccionar_ganadores(sorteo_id: str, sorteo):
    """
    Seleccionar ganadores para SORTEO ÚNICO (NO SE TOCA)
    """
    boletos = await db.boletos.find({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    }).to_list(10000)
    
    if not boletos:
        return []
    
    ganadores = []
    num_premios = len(sorteo.premios)
    
    # Evitar más ganadores que boletos
    num_ganadores = min(num_premios, len(boletos))
    
    boletos_ganadores = random.sample(boletos, num_ganadores)
    
    for i, boleto in enumerate(boletos_ganadores):
        usuario = await db.users.find_one({'id': boleto['usuario_id']}, {"_id": 0})
        
        premio_nombre = ""
        if sorteo.tipo == SorteoTipo.UNICO:
            premio_nombre = sorteo.premios[i].nombre if i < len(sorteo.premios) else "Premio"
        
        ganador = {
            'boleto_id': boleto['id'],
            'usuario_id': boleto['usuario_id'],
            'nombre': usuario.get('name', '') if usuario else '',
            'email': usuario.get('email', '') if usuario else '',
            'numero_boleto': boleto['numero_boleto'],
            'premio': premio_nombre,
            'etapa_numero': None,
            'fecha_seleccion': datetime.now(timezone.utc).isoformat()
        }
        
        ganadores.append(ganador)
    
    return ganadores


async def seleccionar_ganador_etapa(sorteo_id: str, sorteo, etapa_num: int):
    """
    Seleccionar ganadores para TODOS los premios de una ETAPA específica.
    Retorna una LISTA de ganadores (uno por cada premio de la etapa).
    """
    boletos = await db.boletos.find({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    }).to_list(10000)
    
    if not boletos:
        return []
    
    # Obtener info de la etapa
    etapa = sorteo.etapas[etapa_num - 1] if etapa_num <= len(sorteo.etapas) else None
    if not etapa:
        return []
    
    ganadores = []
    boletos_disponibles = list(boletos)
    
    # Verificar si la etapa tiene premios definidos
    etapa_premios = []
    if hasattr(etapa, 'premios') and etapa.premios:
        etapa_premios = etapa.premios
    
    if etapa_premios:
        # SORTEAR CADA PREMIO de la etapa
        for premio in etapa_premios:
            if not boletos_disponibles:
                break
            
            # Elegir un boleto al azar
            boleto_ganador = random.choice(boletos_disponibles)
            boletos_disponibles.remove(boleto_ganador)  # Evitar que gane otro premio de la misma etapa
            
            usuario = await db.users.find_one({'id': boleto_ganador['usuario_id']}, {"_id": 0})
            
            # Obtener nombre del premio
            premio_nombre = premio.nombre if hasattr(premio, 'nombre') else premio.get('nombre', f'Premio Etapa {etapa_num}')
            premio_imagen = premio.imagen_url if hasattr(premio, 'imagen_url') else premio.get('imagen_url', None)
            premio_video = premio.video_url if hasattr(premio, 'video_url') else premio.get('video_url', None)
            
            ganador = {
                'boleto_id': boleto_ganador['id'],
                'usuario_id': boleto_ganador['usuario_id'],
                'nombre_usuario': usuario.get('name', '') if usuario else '',
                'email_usuario': usuario.get('email', '') if usuario else '',
                'cedula_usuario': usuario.get('cedula', '') if usuario else '',
                'celular_usuario': usuario.get('celular', '') if usuario else '',
                'numero_boleto': boleto_ganador['numero_boleto'],
                'premio': premio_nombre,
                'premio_imagen': premio_imagen,
                'premio_video': premio_video,
                'etapa': etapa_num,
                'etapa_numero': etapa_num,
                'fecha_sorteo': datetime.now(timezone.utc).isoformat()
            }
            
            ganadores.append(ganador)
            logger.info(f"Sorteo {sorteo_id} Etapa {etapa_num}: Ganador para premio '{premio_nombre}' - Boleto #{boleto_ganador['numero_boleto']}")
    else:
        # Si no hay premios detallados, usar el nombre de la etapa como premio único
        if boletos_disponibles:
            boleto_ganador = random.choice(boletos_disponibles)
            usuario = await db.users.find_one({'id': boleto_ganador['usuario_id']}, {"_id": 0})
            
            premio_nombre = etapa.premio if hasattr(etapa, 'premio') else etapa.nombre if hasattr(etapa, 'nombre') else f"Premio Etapa {etapa_num}"
            
            ganador = {
                'boleto_id': boleto_ganador['id'],
                'usuario_id': boleto_ganador['usuario_id'],
                'nombre_usuario': usuario.get('name', '') if usuario else '',
                'email_usuario': usuario.get('email', '') if usuario else '',
                'cedula_usuario': usuario.get('cedula', '') if usuario else '',
                'celular_usuario': usuario.get('celular', '') if usuario else '',
                'numero_boleto': boleto_ganador['numero_boleto'],
                'premio': premio_nombre,
                'premio_imagen': None,
                'premio_video': None,
                'etapa': etapa_num,
                'etapa_numero': etapa_num,
                'fecha_sorteo': datetime.now(timezone.utc).isoformat()
            }
            
            ganadores.append(ganador)
            logger.info(f"Sorteo {sorteo_id} Etapa {etapa_num}: Ganador para '{premio_nombre}' - Boleto #{boleto_ganador['numero_boleto']}")
    
    return ganadores
