#!/usr/bin/env python3
"""
Script para crear sorteos de prueba en diferentes estados
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import uuid

# Cargar variables de entorno
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# URLs de imágenes de ejemplo
IMAGEN_EJEMPLO_1 = "https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/b5g73ddt_image.png"
IMAGEN_EJEMPLO_2 = "https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/omvgwf5i_image.png"
IMAGEN_PREMIO = "https://customer-assets.emergentagent.com/job_rafflehub-1/artifacts/bq3n5ms2_Imagen%20de%20WhatsApp%202025-11-17%20a%20las%2014.18.04_bbdcdb92.jpg"

async def clear_test_sorteos():
    """Eliminar sorteos de prueba anteriores"""
    result = await db.sorteos.delete_many({
        'titulo': {'$regex': '.*\\(PRUEBA\\).*'}
    })
    print(f"✓ Eliminados {result.deleted_count} sorteos de prueba antiguos")

async def create_sorteo_etapa_unica_published():
    """Sorteo de etapa única con múltiples premios en estado PUBLISHED"""
    sorteo_id = str(uuid.uuid4())
    landing_slug = str(uuid.uuid4())[:8]
    
    sorteo = {
        'id': sorteo_id,
        'titulo': 'iPhone 15 Pro Max + AirPods (PRUEBA)',
        'descripcion': 'Gana un increíble iPhone 15 Pro Max 256GB más unos AirPods Pro de regalo. ¡No te lo pierdas!',
        'precio_boleto': 10.0,
        'cantidad_minima_boletos': 1,
        'cantidad_total_boletos': 100,
        'tipo': 'unico',
        'porcentaje_comision': 10.0,
        'fecha_inicio': (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
        'fecha_cierre': (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
        'estado': 'published',
        'etapas': [],
        'imagenes': [IMAGEN_EJEMPLO_1, IMAGEN_EJEMPLO_2, IMAGEN_PREMIO],
        'videos': ['https://www.youtube.com/watch?v=example1', 'https://www.youtube.com/watch?v=example2'],
        'color_primario': '#4F46E5',
        'color_secundario': '#06B6D4',
        'cantidad_vendida': 35,
        'progreso_porcentaje': 35.0,
        'landing_slug': landing_slug,
        'reglas': 'Sorteo válido solo para Ecuador. El ganador será notificado por email y WhatsApp.',
        'compra_minima': 1,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.sorteos.insert_one(sorteo)
    print(f"✓ Creado sorteo PUBLISHED (etapa única): {sorteo['titulo']} - Slug: {landing_slug}")
    return sorteo_id, landing_slug

async def create_sorteo_multi_etapa_published():
    """Sorteo por etapas con premios diferentes por etapa en estado PUBLISHED"""
    sorteo_id = str(uuid.uuid4())
    landing_slug = str(uuid.uuid4())[:8]
    
    sorteo = {
        'id': sorteo_id,
        'titulo': 'Mega Sorteo 3 Etapas - MacBook, iPhone y iPad (PRUEBA)',
        'descripcion': 'Participa en nuestro mega sorteo con 3 premios increíbles. Cada etapa tiene su propio premio garantizado.',
        'precio_boleto': 15.0,
        'cantidad_minima_boletos': 2,
        'cantidad_total_boletos': 200,
        'tipo': 'etapas',
        'porcentaje_comision': 12.0,
        'fecha_inicio': (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
        'fecha_cierre': (datetime.now(timezone.utc) + timedelta(days=20)).isoformat(),
        'estado': 'published',
        'etapas': [
            {
                'numero': 1,
                'porcentaje': 25.0,
                'premio': 'iPad Air 2024',
                'nombre': 'Primera Etapa - iPad',
                'imagen_urls': [IMAGEN_EJEMPLO_1],
                'video_urls': ['https://www.youtube.com/watch?v=ipad-video'],
                'ganador_id': None,
                'fecha_sorteo': None,
                'completado': False
            },
            {
                'numero': 2,
                'porcentaje': 50.0,
                'premio': 'iPhone 15 Pro',
                'nombre': 'Segunda Etapa - iPhone',
                'imagen_urls': [IMAGEN_EJEMPLO_2, IMAGEN_PREMIO],
                'video_urls': ['https://www.youtube.com/watch?v=iphone-video1', 'https://www.youtube.com/watch?v=iphone-video2'],
                'ganador_id': None,
                'fecha_sorteo': None,
                'completado': False
            },
            {
                'numero': 3,
                'porcentaje': 100.0,
                'premio': 'MacBook Pro M3',
                'nombre': 'Etapa Final - MacBook',
                'imagen_urls': [IMAGEN_EJEMPLO_1, IMAGEN_EJEMPLO_2],
                'video_urls': ['https://www.youtube.com/watch?v=macbook-video'],
                'ganador_id': None,
                'fecha_sorteo': None,
                'completado': False
            }
        ],
        'imagenes': [IMAGEN_EJEMPLO_1],
        'videos': [],
        'color_primario': '#7C3AED',
        'color_secundario': '#F59E0B',
        'cantidad_vendida': 60,
        'progreso_porcentaje': 30.0,
        'landing_slug': landing_slug,
        'reglas': 'Sorteo por etapas. Cada etapa se sortea al alcanzar el porcentaje indicado.',
        'compra_minima': 2,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.sorteos.insert_one(sorteo)
    print(f"✓ Creado sorteo PUBLISHED (multi-etapa): {sorteo['titulo']} - Slug: {landing_slug}")
    return sorteo_id, landing_slug

async def create_sorteo_draft():
    """Sorteo en estado DRAFT (borrador)"""
    sorteo_id = str(uuid.uuid4())
    landing_slug = str(uuid.uuid4())[:8]
    
    sorteo = {
        'id': sorteo_id,
        'titulo': 'PlayStation 5 + 2 Juegos (PRUEBA - BORRADOR)',
        'descripcion': 'Este es un sorteo en borrador, aún no está publicado.',
        'precio_boleto': 12.0,
        'cantidad_minima_boletos': 1,
        'cantidad_total_boletos': 150,
        'tipo': 'unico',
        'porcentaje_comision': 10.0,
        'fecha_inicio': (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        'fecha_cierre': (datetime.now(timezone.utc) + timedelta(days=25)).isoformat(),
        'estado': 'draft',
        'etapas': [],
        'imagenes': [IMAGEN_EJEMPLO_1],
        'videos': [],
        'color_primario': '#4F46E5',
        'color_secundario': '#06B6D4',
        'cantidad_vendida': 0,
        'progreso_porcentaje': 0.0,
        'landing_slug': landing_slug,
        'reglas': 'Sorteo en borrador - aún editable',
        'compra_minima': 1,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.sorteos.insert_one(sorteo)
    print(f"✓ Creado sorteo DRAFT: {sorteo['titulo']} - Slug: {landing_slug}")
    return sorteo_id, landing_slug

async def create_sorteo_waiting():
    """Sorteo en estado WAITING (esperando para comenzar)"""
    sorteo_id = str(uuid.uuid4())
    landing_slug = str(uuid.uuid4())[:8]
    
    # Fecha de inicio en 3 horas (dentro de la ventana de 6 horas para aparecer en "En Espera")
    fecha_inicio = datetime.now(timezone.utc) + timedelta(hours=3)
    
    sorteo = {
        'id': sorteo_id,
        'titulo': 'Smart TV 65" Samsung (PRUEBA - EN ESPERA)',
        'descripcion': 'Este sorteo está en espera y comenzará pronto. ¡Prepárate!',
        'precio_boleto': 8.0,
        'cantidad_minima_boletos': 1,
        'cantidad_total_boletos': 80,
        'tipo': 'unico',
        'porcentaje_comision': 10.0,
        'fecha_inicio': fecha_inicio.isoformat(),
        'fecha_cierre': (fecha_inicio + timedelta(days=10)).isoformat(),
        'estado': 'waiting',
        'etapas': [],
        'imagenes': [IMAGEN_EJEMPLO_2],
        'videos': ['https://www.youtube.com/watch?v=tv-video'],
        'color_primario': '#10B981',
        'color_secundario': '#3B82F6',
        'cantidad_vendida': 0,
        'progreso_porcentaje': 0.0,
        'landing_slug': landing_slug,
        'reglas': 'Sorteo próximo a comenzar',
        'compra_minima': 1,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.sorteos.insert_one(sorteo)
    print(f"✓ Creado sorteo WAITING: {sorteo['titulo']} - Inicia en 3 horas - Slug: {landing_slug}")
    return sorteo_id, landing_slug

async def create_sorteo_live():
    """Sorteo en estado LIVE (en proceso)"""
    sorteo_id = str(uuid.uuid4())
    landing_slug = str(uuid.uuid4())[:8]
    
    sorteo = {
        'id': sorteo_id,
        'titulo': 'Viaje a Galápagos para 2 personas (PRUEBA - EN VIVO)',
        'descripcion': 'Sorteo en vivo en este momento. ¡La animación está en curso!',
        'precio_boleto': 20.0,
        'cantidad_minima_boletos': 1,
        'cantidad_total_boletos': 100,
        'tipo': 'unico',
        'porcentaje_comision': 15.0,
        'fecha_inicio': (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
        'fecha_cierre': (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        'estado': 'live',
        'etapas': [],
        'imagenes': [IMAGEN_PREMIO],
        'videos': [],
        'color_primario': '#DC2626',
        'color_secundario': '#FBBF24',
        'cantidad_vendida': 100,
        'progreso_porcentaje': 100.0,
        'landing_slug': landing_slug,
        'reglas': 'Sorteo en proceso de ejecución',
        'compra_minima': 1,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.sorteos.insert_one(sorteo)
    print(f"✓ Creado sorteo LIVE: {sorteo['titulo']} - Slug: {landing_slug}")
    return sorteo_id, landing_slug

async def create_sorteo_completed():
    """Sorteo en estado COMPLETED (finalizado)"""
    sorteo_id = str(uuid.uuid4())
    landing_slug = str(uuid.uuid4())[:8]
    
    sorteo = {
        'id': sorteo_id,
        'titulo': 'Bicicleta Eléctrica (PRUEBA - COMPLETADO)',
        'descripcion': 'Este sorteo ya finalizó. Felicitaciones al ganador.',
        'precio_boleto': 5.0,
        'cantidad_minima_boletos': 1,
        'cantidad_total_boletos': 50,
        'tipo': 'unico',
        'porcentaje_comision': 10.0,
        'fecha_inicio': (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
        'fecha_cierre': (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
        'estado': 'completed',
        'etapas': [],
        'imagenes': [IMAGEN_EJEMPLO_1],
        'videos': [],
        'color_primario': '#6B7280',
        'color_secundario': '#9CA3AF',
        'cantidad_vendida': 50,
        'progreso_porcentaje': 100.0,
        'landing_slug': landing_slug,
        'reglas': 'Sorteo finalizado',
        'compra_minima': 1,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.sorteos.insert_one(sorteo)
    print(f"✓ Creado sorteo COMPLETED: {sorteo['titulo']} - Slug: {landing_slug}")
    return sorteo_id, landing_slug

async def main():
    print("=" * 60)
    print("🎲 Creando Sorteos de Prueba para WishWay")
    print("=" * 60)
    print()
    
    try:
        # Limpiar sorteos de prueba anteriores
        await clear_test_sorteos()
        print()
        
        # Crear sorteos en diferentes estados
        print("📝 Creando sorteos de prueba...")
        print()
        
        await create_sorteo_etapa_unica_published()
        await create_sorteo_multi_etapa_published()
        await create_sorteo_draft()
        await create_sorteo_waiting()
        await create_sorteo_live()
        await create_sorteo_completed()
        
        print()
        print("=" * 60)
        print("✅ Sorteos de prueba creados exitosamente")
        print("=" * 60)
        print()
        print("📋 Resumen:")
        print("  • 2 sorteos PUBLISHED (disponibles para compra)")
        print("    - 1 de etapa única con múltiples premios")
        print("    - 1 multi-etapa con premios por etapa")
        print("  • 1 sorteo DRAFT (borrador)")
        print("  • 1 sorteo WAITING (en espera, inicia en 3 horas)")
        print("  • 1 sorteo LIVE (en proceso)")
        print("  • 1 sorteo COMPLETED (finalizado)")
        print()
        print("🔍 Puedes ver todos los sorteos en el Home y en el Admin Dashboard")
        print()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
