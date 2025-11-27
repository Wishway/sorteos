"""
Módulo para gestionar movimientos financieros de vendedores
"""
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

class TipoMovimiento:
    INGRESO = "ingreso"
    EGRESO = "egreso"

class MovimientoVendedor(BaseModel):
    """Modelo para movimientos del vendedor"""
    id: str
    vendedor_id: str
    tipo: str  # "ingreso" o "egreso"
    monto: float
    descripcion: str
    fecha: datetime
    
    # Datos específicos para INGRESOS
    sorteo_id: Optional[str] = None
    sorteo_titulo: Optional[str] = None
    boleto_id: Optional[str] = None
    numero_boleto: Optional[int] = None
    comprador_id: Optional[str] = None
    comprador_nombre: Optional[str] = None
    
    # Datos específicos para EGRESOS
    retiro_id: Optional[str] = None
    comprobante_url: Optional[str] = None
    banco: Optional[str] = None
    numero_cuenta: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

async def registrar_movimiento_ingreso(
    db,
    vendedor_id: str,
    monto: float,
    sorteo_id: str,
    sorteo_titulo: str,
    boleto_id: str,
    numero_boleto: int,
    comprador_id: str,
    comprador_nombre: str
):
    """Registrar movimiento de ingreso (comisión)"""
    from uuid import uuid4
    
    movimiento = {
        "id": str(uuid4()),
        "vendedor_id": vendedor_id,
        "tipo": TipoMovimiento.INGRESO,
        "monto": monto,
        "descripcion": f"Comisión por venta - Sorteo: {sorteo_titulo}",
        "fecha": datetime.now(timezone.utc),
        "sorteo_id": sorteo_id,
        "sorteo_titulo": sorteo_titulo,
        "boleto_id": boleto_id,
        "numero_boleto": numero_boleto,
        "comprador_id": comprador_id,
        "comprador_nombre": comprador_nombre
    }
    
    await db.movimientos_vendedor.insert_one(movimiento)
    return movimiento

async def registrar_movimiento_egreso(
    db,
    vendedor_id: str,
    monto: float,
    retiro_id: str,
    comprobante_url: str,
    banco: str,
    numero_cuenta: str,
    tipo_cuenta: str
):
    """Registrar movimiento de egreso (retiro aprobado)"""
    from uuid import uuid4
    
    movimiento = {
        "id": str(uuid4()),
        "vendedor_id": vendedor_id,
        "tipo": TipoMovimiento.EGRESO,
        "monto": monto,
        "descripcion": f"Pago realizado - {banco} {tipo_cuenta}",
        "fecha": datetime.now(timezone.utc),
        "retiro_id": retiro_id,
        "comprobante_url": comprobante_url,
        "banco": banco,
        "numero_cuenta": numero_cuenta,
        "tipo_cuenta": tipo_cuenta
    }
    
    await db.movimientos_vendedor.insert_one(movimiento)
    return movimiento

async def obtener_movimientos_vendedor(
    db,
    vendedor_id: str,
    tipo: Optional[str] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None
):
    """Obtener movimientos del vendedor con filtros"""
    filtro = {"vendedor_id": vendedor_id}
    
    if tipo:
        filtro["tipo"] = tipo
    
    if fecha_desde or fecha_hasta:
        filtro["fecha"] = {}
        if fecha_desde:
            filtro["fecha"]["$gte"] = fecha_desde
        if fecha_hasta:
            filtro["fecha"]["$lte"] = fecha_hasta
    
    movimientos = await db.movimientos_vendedor.find(
        filtro,
        {"_id": 0}
    ).sort("fecha", -1).to_list(1000)
    
    return movimientos
