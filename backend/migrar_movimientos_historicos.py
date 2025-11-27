"""
Script para migrar movimientos históricos de vendedores
Ejecutar UNA VEZ para crear los movimientos de comisiones y retiros ya existentes
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from uuid import uuid4

async def migrar_movimientos():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["wishway_sorteos"]
    
    print("🔄 Iniciando migración de movimientos históricos...")
    
    # 1. Migrar COMISIONES ACREDITADAS como INGRESOS
    comisiones = await db.comisiones.find({"estado": "acreditada"}).to_list(10000)
    print(f"📊 Encontradas {len(comisiones)} comisiones acreditadas")
    
    for comision in comisiones:
        # Verificar si ya existe el movimiento
        existe = await db.movimientos_vendedor.find_one({
            "vendedor_id": comision['vendedor_id'],
            "boleto_id": comision.get('boleto_id'),
            "tipo": "ingreso"
        })
        
        if existe:
            continue
        
        # Obtener datos del sorteo
        sorteo_doc = await db.sorteos.find_one({"id": comision['sorteo_id']}, {"_id": 0})
        
        # Obtener datos del comprador
        comprador_doc = await db.users.find_one({"id": comision['comprador_id']}, {"_id": 0})
        
        # Obtener número de boleto
        boleto_doc = await db.boletos.find_one({"id": comision.get('boleto_id')}, {"_id": 0})
        
        movimiento = {
            "id": str(uuid4()),
            "vendedor_id": comision['vendedor_id'],
            "tipo": "ingreso",
            "monto": comision['monto'],
            "descripcion": f"Comisión por venta - Sorteo: {sorteo_doc.get('titulo', 'Sorteo') if sorteo_doc else 'Sorteo'}",
            "fecha": comision.get('fecha_creacion', datetime.now(timezone.utc)),
            "sorteo_id": comision['sorteo_id'],
            "sorteo_titulo": sorteo_doc.get('titulo', 'Sorteo') if sorteo_doc else 'Sorteo',
            "boleto_id": comision.get('boleto_id', ''),
            "numero_boleto": boleto_doc.get('numero_boleto', 0) if boleto_doc else 0,
            "comprador_id": comision['comprador_id'],
            "comprador_nombre": comprador_doc.get('name', 'Usuario') if comprador_doc else 'Usuario'
        }
        
        await db.movimientos_vendedor.insert_one(movimiento)
        print(f"✅ Ingreso migrado: ${movimiento['monto']} para vendedor {movimiento['vendedor_id'][:8]}...")
    
    # 2. Migrar RETIROS APROBADOS como EGRESOS
    retiros = await db.retiros.find({"estado": "aprobado"}).to_list(10000)
    print(f"\n📊 Encontrados {len(retiros)} retiros aprobados")
    
    for retiro in retiros:
        # Verificar si ya existe el movimiento
        existe = await db.movimientos_vendedor.find_one({
            "vendedor_id": retiro['vendedor_id'],
            "retiro_id": retiro['id'],
            "tipo": "egreso"
        })
        
        if existe:
            continue
        
        # Obtener datos bancarios del vendedor
        vendedor_doc = await db.users.find_one({"id": retiro['vendedor_id']}, {"_id": 0})
        
        movimiento = {
            "id": str(uuid4()),
            "vendedor_id": retiro['vendedor_id'],
            "tipo": "egreso",
            "monto": retiro['monto'],
            "descripcion": f"Pago realizado - {vendedor_doc.get('nombre_banco', 'Banco') if vendedor_doc else 'Banco'} {vendedor_doc.get('tipo_cuenta', '') if vendedor_doc else ''}",
            "fecha": retiro.get('fecha_aprobacion', retiro.get('fecha_solicitud', datetime.now(timezone.utc))),
            "retiro_id": retiro['id'],
            "comprobante_url": retiro.get('comprobante_url', ''),
            "banco": vendedor_doc.get('nombre_banco', 'N/A') if vendedor_doc else 'N/A',
            "numero_cuenta": vendedor_doc.get('numero_cuenta', 'N/A') if vendedor_doc else 'N/A',
            "tipo_cuenta": vendedor_doc.get('tipo_cuenta', 'N/A') if vendedor_doc else 'N/A'
        }
        
        await db.movimientos_vendedor.insert_one(movimiento)
        print(f"✅ Egreso migrado: ${movimiento['monto']} para vendedor {movimiento['vendedor_id'][:8]}...")
    
    print("\n✅ Migración completada!")
    print(f"📈 Total ingresos migrados: {len(comisiones)}")
    print(f"📉 Total egresos migrados: {len(retiros)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrar_movimientos())
