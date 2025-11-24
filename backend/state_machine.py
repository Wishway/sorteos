"""
Máquina de estados para sorteos - Versión según especificación exacta del usuario
"""
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from typing import Optional, Dict
import random

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

async def verificar_transicion_estado_nuevo(sorteo_id: str) -> Optional[str]:
    """
    Máquina de estados según especificación exacta:
    
    DRAFT → PUBLISHED (manual, botón publicar)
    PUBLISHED → WAITING (automático, 3 formas)
    WAITING → LIVE (automático, cuando se cumplen condiciones)
    LIVE → COMPLETED o PUBLISHED (automático, depende si es última etapa)
    """
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        return None
    
    sorteo = Sorteo(**sorteo_doc)
    ahora = datetime.now(timezone.utc)
    
    # Asegurar timezone
    if sorteo.fecha_cierre.tzinfo is None:
        sorteo.fecha_cierre = sorteo.fecha_cierre.replace(tzinfo=timezone.utc)
    
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
        
        return nuevo_estado
    
    return None


async def check_published_to_waiting(sorteo, ahora, sorteo_id):
    """
    PUBLISHED → WAITING tiene 3 formas:
    
    1. Sorteo Único: fecha cumplida Y todos los boletos vendidos
    2. Sorteo por Etapas: etapa actual cumplió su porcentaje
    3. Fecha cumplida pero boletos insuficientes (sigue permitiendo vender)
    4. Boletos cumplidos pero fecha no llegó (ya NO se venden más)
    """
    update_data = {}
    
    # Contar boletos aprobados
    boletos_aprobados = await db.boletos.count_documents({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    })
    
    if sorteo.tipo == SorteoTipo.UNICO:
        # SORTEO ÚNICO
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
        # SORTEO POR ETAPAS
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
            if boletos_aprobados >= boletos_requeridos:
                # Si es la ÚLTIMA etapa, también verificar fecha
                es_ultima_etapa = etapa_actual_num == len(sorteo.etapas)
                
                if es_ultima_etapa:
                    # Última etapa: verificar fecha también
                    if sorteo.fecha_cierre <= ahora:
                        update_data['fecha_waiting'] = ahora
                        return (SorteoEstado.WAITING, update_data)
                else:
                    # Etapa intermedia: solo porcentaje
                    update_data['fecha_waiting'] = ahora
                    return (SorteoEstado.WAITING, update_data)
    
    return None


async def check_waiting_to_live(sorteo, ahora, sorteo_id):
    """
    WAITING → LIVE cuando se cumplen TODAS las condiciones exactas
    """
    update_data = {}
    
    boletos_aprobados = await db.boletos.count_documents({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    })
    
    if sorteo.tipo == SorteoTipo.UNICO:
        # SORTEO ÚNICO: fecha exacta + hora exacta + boletos vendidos
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
        # SORTEO POR ETAPAS
        etapa_actual_num = sorteo.etapa_actual
        if etapa_actual_num > 0 and etapa_actual_num <= len(sorteo.etapas):
            etapa_actual = sorteo.etapas[etapa_actual_num - 1]
            
            porcentaje_requerido = etapa_actual.porcentaje / 100
            boletos_requeridos = int(sorteo.cantidad_total_boletos * porcentaje_requerido)
            porcentaje_cumplido = boletos_aprobados >= boletos_requeridos
            
            es_ultima_etapa = etapa_actual_num == len(sorteo.etapas)
            
            if es_ultima_etapa:
                # Última etapa: fecha + hora + porcentaje
                fecha_cumplida = sorteo.fecha_cierre <= ahora
                if porcentaje_cumplido and fecha_cumplida:
                    # Seleccionar ganador de esta etapa
                    if not etapa_actual.ganador_id:
                        ganador = await seleccionar_ganador_etapa(sorteo_id, sorteo, etapa_actual_num)
                        if ganador:
                            update_data[f'etapas.{etapa_actual_num - 1}.ganador_id'] = ganador['usuario_id']
                            update_data[f'etapas.{etapa_actual_num - 1}.completado'] = True
                    
                    update_data['fecha_live'] = ahora
                    return (SorteoEstado.LIVE, update_data)
            else:
                # Etapa intermedia: solo porcentaje
                if porcentaje_cumplido:
                    # Seleccionar ganador de esta etapa
                    if not etapa_actual.ganador_id:
                        ganador = await seleccionar_ganador_etapa(sorteo_id, sorteo, etapa_actual_num)
                        if ganador:
                            update_data[f'etapas.{etapa_actual_num - 1}.ganador_id'] = ganador['usuario_id']
                            update_data[f'etapas.{etapa_actual_num - 1}.completado'] = True
                    
                    update_data['fecha_live'] = ahora
                    return (SorteoEstado.LIVE, update_data)
    
    return None


async def seleccionar_ganadores(sorteo_id: str, sorteo):
    """Seleccionar ganadores para sorteo único"""
    boletos = await db.boletos.find({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    }).to_list(10000)
    
    if not boletos:
        return []
    
    num_premios = len(sorteo.premios) if sorteo.premios else 1
    ganadores = []
    boletos_disponibles = list(boletos)
    
    for i in range(min(num_premios, len(boletos_disponibles))):
        boleto_ganador = random.choice(boletos_disponibles)
        boletos_disponibles.remove(boleto_ganador)
        
        usuario = await db.users.find_one({'id': boleto_ganador['usuario_id']}, {"_id": 0})
        premio_nombre = sorteo.premios[i].nombre if i < len(sorteo.premios) else "Premio Principal"
        
        ganadores.append({
            'boleto_id': boleto_ganador['id'],
            'usuario_id': boleto_ganador['usuario_id'],
            'nombre': usuario.get('name', '') if usuario else '',
            'email': usuario.get('email', '') if usuario else '',
            'numero_boleto': boleto_ganador['numero_boleto'],
            'premio': premio_nombre,
            'fecha_seleccion': datetime.now(timezone.utc).isoformat()
        })
    
    return ganadores


async def seleccionar_ganador_etapa(sorteo_id: str, sorteo, etapa_num: int):
    """Seleccionar ganador para una etapa específica"""
    boletos = await db.boletos.find({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    }).to_list(10000)
    
    if not boletos:
        return None
    
    boleto_ganador = random.choice(boletos)
    usuario = await db.users.find_one({'id': boleto_ganador['usuario_id']}, {"_id": 0})
    
    etapa = sorteo.etapas[etapa_num - 1]
    premio_nombre = etapa.premio if hasattr(etapa, 'premio') else f"Premio Etapa {etapa_num}"
    
    ganador = {
        'boleto_id': boleto_ganador['id'],
        'usuario_id': boleto_ganador['usuario_id'],
        'nombre': usuario.get('name', '') if usuario else '',
        'email': usuario.get('email', '') if usuario else '',
        'numero_boleto': boleto_ganador['numero_boleto'],
        'premio': premio_nombre,
        'etapa': etapa_num,
        'fecha_seleccion': datetime.now(timezone.utc).isoformat()
    }
    
    return ganador
