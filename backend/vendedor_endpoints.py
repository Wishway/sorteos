"""Endpoints para vendedores - Sistema de referidos y retiros"""
from fastapi import HTTPException, Request
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import bcrypt

class DatosBancarios(BaseModel):
    nombre_banco: str
    tipo_cuenta: str
    numero_cuenta: str

class ActualizarPerfil(BaseModel):
    name: str
    cedula: str
    celular: str

class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str
    
class SolicitudRetiro(BaseModel):
    monto: float

class AprobarRetiroRequest(BaseModel):
    comprobante_url: str

def setup_vendedor_endpoints(api_router, db, get_current_user, UserRole, EstadoRetiro):
    """Configurar todos los endpoints de vendedor"""
    
    @api_router.put("/vendedor/datos-bancarios")
    async def actualizar_datos_bancarios(datos: DatosBancarios, request: Request):
        """Actualizar datos bancarios del vendedor"""
        user = await get_current_user(request)
        if user.role != UserRole.VENDEDOR:
            raise HTTPException(status_code=403, detail="Solo vendedores pueden actualizar datos bancarios")
        
        # Validar que el número de cuenta no esté vacío
        if not datos.numero_cuenta or datos.numero_cuenta.strip() == "":
            raise HTTPException(status_code=400, detail="El número de cuenta no puede estar vacío")
        
        # Actualizar datos bancarios
        await db.users.update_one(
            {'id': user.id},
            {'$set': {
                'nombre_banco': datos.nombre_banco,
                'tipo_cuenta': datos.tipo_cuenta,
                'numero_cuenta': datos.numero_cuenta,
                'datos_bancarios_completos': True
            }}
        )
        
        return {"message": "Datos bancarios actualizados correctamente"}
    
    @api_router.put("/vendedor/perfil")
    async def actualizar_perfil_vendedor(datos: ActualizarPerfil, request: Request):
        """Actualizar perfil del vendedor (nombre, cédula, celular)"""
        user = await get_current_user(request)
        if user.role != UserRole.VENDEDOR:
            raise HTTPException(status_code=403, detail="Solo vendedores pueden actualizar su perfil")
        
        # Validar que la cédula no se repita
        if datos.cedula != user.cedula:
            cedula_existente = await db.users.find_one({'cedula': datos.cedula, 'id': {'$ne': user.id}})
            if cedula_existente:
                raise HTTPException(status_code=400, detail="La cédula ya está registrada en otro usuario")
        
        # Validar que el celular no se repita
        if datos.celular != user.celular:
            celular_existente = await db.users.find_one({'celular': datos.celular, 'id': {'$ne': user.id}})
            if celular_existente:
                raise HTTPException(status_code=400, detail="El celular ya está registrado en otro usuario")
        
        # Actualizar perfil
        await db.users.update_one(
            {'id': user.id},
            {'$set': {
                'name': datos.name,
                'cedula': datos.cedula,
                'celular': datos.celular
            }}
        )
        
        return {"message": "Perfil actualizado correctamente"}
    
    @api_router.get("/vendedor/movimientos")
    async def obtener_historial_movimientos(
        request: Request,
        tipo: str = None,
        fecha_desde: str = None,
        fecha_hasta: str = None,
        page: int = 1,
        limit: int = 20
    ):
        """Obtener historial de movimientos del vendedor con filtros y paginación"""
        user = await get_current_user(request)
        if user.role != UserRole.VENDEDOR:
            raise HTTPException(status_code=403, detail="Solo vendedores")
        
        from datetime import datetime
        
        # Construir filtro
        filtro = {"vendedor_id": user.id}
        
        if tipo and tipo != "todos":
            filtro["tipo"] = tipo
        
        if fecha_desde or fecha_hasta:
            filtro["fecha"] = {}
            if fecha_desde:
                filtro["fecha"]["$gte"] = datetime.fromisoformat(fecha_desde)
            if fecha_hasta:
                filtro["fecha"]["$lte"] = datetime.fromisoformat(fecha_hasta)
        
        # Contar total
        total = await db.movimientos_vendedor.count_documents(filtro)
        
        # Calcular skip
        skip = (page - 1) * limit
        
        # Obtener movimientos paginados
        movimientos = await db.movimientos_vendedor.find(
            filtro,
            {"_id": 0}
        ).sort("fecha", -1).skip(skip).limit(limit).to_list(limit)
        
        return {
            "movimientos": movimientos,
            "total": total,
            "page": page,
            "total_pages": (total + limit - 1) // limit
        }
    
    @api_router.get("/vendedor/perfil")
    async def get_perfil_vendedor(request: Request):
        """Obtener perfil completo del vendedor"""
        user = await get_current_user(request)
        if user.role != UserRole.VENDEDOR:
            raise HTTPException(status_code=403, detail="Solo vendedores")
        
        user_doc = await db.users.find_one({'id': user.id}, {"_id": 0, "password_hash": 0})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="Vendedor no encontrado")
        
        # Obtener comisiones
        comisiones = await db.comisiones.find({'vendedor_id': user.id}, {"_id": 0}).to_list(1000)
        total_comisiones = sum(c.get('monto', 0) for c in comisiones)
        wallet_balance = user_doc.get('wallet_balance', 0.0)
        
        # Obtener retiros
        retiros = await db.retiros.find({'vendedor_id': user.id}, {"_id": 0}).sort('fecha_solicitud', -1).to_list(100)
        
        return {
            **user_doc,
            'wallet_balance': wallet_balance,
            'total_comisiones': total_comisiones,
            'comisiones': comisiones,
            'retiros': retiros
        }
    
    @api_router.post("/vendedor/cambiar-password")
    async def cambiar_password_vendedor(data: CambiarPasswordRequest, request: Request):
        """Cambiar contraseña del vendedor"""
        user = await get_current_user(request)
        if user.role != UserRole.VENDEDOR:
            raise HTTPException(status_code=403, detail="Solo vendedores")
        
        user_doc = await db.users.find_one({'id': user.id})
        
        # Verificar contraseña actual
        if not user_doc.get('password_hash'):
            raise HTTPException(status_code=400, detail="Usuario no tiene contraseña (registrado con Google)")
        
        if not bcrypt.checkpw(data.password_actual.encode('utf-8'), user_doc['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        
        # Hashear nueva contraseña
        nueva_hash = bcrypt.hashpw(data.password_nueva.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Actualizar
        await db.users.update_one(
            {'id': user.id},
            {'$set': {'password_hash': nueva_hash}}
        )
        
        return {"message": "Contraseña actualizada correctamente"}
    
    @api_router.post("/vendedor/solicitar-retiro")
    async def solicitar_retiro(data: SolicitudRetiro, request: Request):
        """Solicitar retiro de comisiones"""
        user = await get_current_user(request)
        if user.role != UserRole.VENDEDOR:
            raise HTTPException(status_code=403, detail="Solo vendedores")
        
        # Verificar datos bancarios completos
        if not user.datos_bancarios_completos:
            raise HTTPException(status_code=400, detail="Debe completar sus datos bancarios antes de solicitar retiros")
        
        # Verificar saldo disponible
        if data.monto > user.wallet_balance:
            raise HTTPException(status_code=400, detail=f"Saldo insuficiente. Disponible: ${user.wallet_balance}")
        
        if data.monto <= 0:
            raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
        
        # Crear solicitud de retiro
        retiro = {
            'id': str(__import__('uuid').uuid4()),
            'vendedor_id': user.id,
            'monto': data.monto,
            'estado': 'pendiente',
            'comprobante_url': None,
            'motivo_rechazo': None,
            'fecha_solicitud': datetime.now(timezone.utc),
            'fecha_aprobacion': None
        }
        
        await db.retiros.insert_one(retiro)
        
        return {"message": "Solicitud de retiro creada. Espere aprobación del administrador.", "retiro_id": retiro['id']}
    
    @api_router.get("/admin/retiros-pendientes")
    async def get_retiros_pendientes(request: Request):
        """Obtener todas las solicitudes de retiro pendientes (Admin)"""
        user = await get_current_user(request)
        if user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Solo administradores")
        
        retiros = await db.retiros.find({}, {"_id": 0}).sort('fecha_solicitud', -1).to_list(1000)
        
        # Enriquecer con datos del vendedor
        result = []
        for retiro in retiros:
            vendedor = await db.users.find_one({'id': retiro['vendedor_id']}, {"_id": 0, "password_hash": 0})
            result.append({
                **retiro,
                'vendedor': vendedor
            })
        
        return result
    
    @api_router.post("/admin/retiro/{retiro_id}/aprobar")
    async def aprobar_retiro(retiro_id: str, data: AprobarRetiroRequest, request: Request):
        """Aprobar retiro y subir comprobante"""
        user = await get_current_user(request)
        if user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Solo administradores")
        
        retiro_doc = await db.retiros.find_one({'id': retiro_id})
        if not retiro_doc:
            raise HTTPException(status_code=404, detail="Retiro no encontrado")
        
        if retiro_doc['estado'] != 'pendiente':
            raise HTTPException(status_code=400, detail="El retiro ya fue procesado")
        
        # Actualizar retiro
        await db.retiros.update_one(
            {'id': retiro_id},
            {'$set': {
                'estado': 'aprobado',
                'comprobante_url': data.comprobante_url,
                'fecha_aprobacion': datetime.now(timezone.utc)
            }}
        )
        
        # Descontar del wallet del vendedor
        await db.users.update_one(
            {'id': retiro_doc['vendedor_id']},
            {'$inc': {'wallet_balance': -retiro_doc['monto']}}
        )
        
        # Registrar movimiento de egreso
        from movimientos_vendedor import registrar_movimiento_egreso
        vendedor_doc = await db.users.find_one({'id': retiro_doc['vendedor_id']}, {"_id": 0})
        
        await registrar_movimiento_egreso(
            db=db,
            vendedor_id=retiro_doc['vendedor_id'],
            monto=retiro_doc['monto'],
            retiro_id=retiro_id,
            comprobante_url=data.comprobante_url,
            banco=vendedor_doc.get('nombre_banco', 'N/A') if vendedor_doc else 'N/A',
            numero_cuenta=vendedor_doc.get('numero_cuenta', 'N/A') if vendedor_doc else 'N/A',
            tipo_cuenta=vendedor_doc.get('tipo_cuenta', 'N/A') if vendedor_doc else 'N/A'
        )
        
        return {"message": "Retiro aprobado y procesado correctamente"}
    
    @api_router.post("/admin/retiro/{retiro_id}/rechazar")
    async def rechazar_retiro(retiro_id: str, motivo: str, request: Request):
        """Rechazar retiro"""
        user = await get_current_user(request)
        if user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Solo administradores")
        
        retiro_doc = await db.retiros.find_one({'id': retiro_id})
        if not retiro_doc:
            raise HTTPException(status_code=404, detail="Retiro no encontrado")
        
        if retiro_doc['estado'] != 'pendiente':
            raise HTTPException(status_code=400, detail="El retiro ya fue procesado")
        
        # Actualizar retiro
        await db.retiros.update_one(
            {'id': retiro_id},
            {'$set': {
                'estado': 'rechazado',
                'motivo_rechazo': motivo,
                'fecha_aprobacion': datetime.now(timezone.utc)
            }}
        )
        
        return {"message": "Retiro rechazado"}
