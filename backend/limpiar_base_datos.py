import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def limpiar_base_datos():
    """Eliminar todos los sorteos, boletos y ganadores de la base de datos"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("🔄 Iniciando limpieza de la base de datos...")
    print("=" * 50)
    
    # Contar elementos antes de eliminar
    sorteos_count = await db.sorteos.count_documents({})
    boletos_count = await db.boletos.count_documents({})
    ganadores_count = await db.ganadores.count_documents({})
    
    print(f"\n📊 Estado actual:")
    print(f"  - Sorteos: {sorteos_count}")
    print(f"  - Boletos: {boletos_count}")
    print(f"  - Ganadores: {ganadores_count}")
    
    # Eliminar ganadores
    print(f"\n🗑️  Eliminando {ganadores_count} ganadores...")
    result_ganadores = await db.ganadores.delete_many({})
    print(f"✅ Eliminados {result_ganadores.deleted_count} ganadores")
    
    # Eliminar boletos
    print(f"\n🗑️  Eliminando {boletos_count} boletos...")
    result_boletos = await db.boletos.delete_many({})
    print(f"✅ Eliminados {result_boletos.deleted_count} boletos")
    
    # Eliminar sorteos
    print(f"\n🗑️  Eliminando {sorteos_count} sorteos...")
    result_sorteos = await db.sorteos.delete_many({})
    print(f"✅ Eliminados {result_sorteos.deleted_count} sorteos")
    
    # Verificar que todo está limpio
    sorteos_final = await db.sorteos.count_documents({})
    boletos_final = await db.boletos.count_documents({})
    ganadores_final = await db.ganadores.count_documents({})
    
    print("\n" + "=" * 50)
    print("📊 Estado final:")
    print(f"  - Sorteos: {sorteos_final}")
    print(f"  - Boletos: {boletos_final}")
    print(f"  - Ganadores: {ganadores_final}")
    
    if sorteos_final == 0 and boletos_final == 0 and ganadores_final == 0:
        print("\n✅ ¡Base de datos limpiada exitosamente!")
        print("🚀 Ahora puedes crear nuevos sorteos para pruebas")
    else:
        print("\n⚠️  Advertencia: Algunos elementos no se eliminaron correctamente")
    
    client.close()

if __name__ == "__main__":
    print("\n⚠️  ADVERTENCIA: Este script eliminará TODOS los sorteos, boletos y ganadores")
    print("¿Estás seguro de que deseas continuar? (s/n)")
    respuesta = input().lower()
    
    if respuesta == 's' or respuesta == 'si':
        asyncio.run(limpiar_base_datos())
    else:
        print("❌ Operación cancelada")
