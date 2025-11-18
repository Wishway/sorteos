from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random
import httpx
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DAYS = 7

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ ENUMS ============
class UserRole(str, Enum):
    ADMIN = "admin"
    VENDEDOR = "vendedor"
    USUARIO = "usuario"

class SorteoTipo(str, Enum):
    ETAPAS = "etapas"
    UNICO = "unico"

class SorteoEstado(str, Enum):
    ACTIVO = "activo"
    PAUSADO = "pausado"
    COMPLETADO = "completado"

class BoletoEstado(str, Enum):
    ACTIVO = "activo"
    GANADOR = "ganador"
    EXCLUIDO = "excluido"

class MetodoPago(str, Enum):
    PAYPHONE = "payphone"
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"

class ComisionEstado(str, Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"

# ============ MODELS ============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    picture: Optional[str] = None
    password_hash: Optional[str] = None
    role: UserRole = UserRole.USUARIO
    wallet_balance: float = 0.0
    link_unico: Optional[str] = None
    email_verified: bool = False
    verification_token: Optional[str] = None
    cedula: Optional[str] = None
    celular: Optional[str] = None
    datos_completos: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Etapa(BaseModel):
    numero: int
    porcentaje: float
    premio: str
    ganador_id: Optional[str] = None
    fecha_sorteo: Optional[datetime] = None
    completado: bool = False

class Sorteo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titulo: str
    descripcion: str
    precio_boleto: float
    cantidad_minima_boletos: int
    cantidad_total_boletos: int
    tipo: SorteoTipo
    porcentaje_comision: float
    fecha_inicio: datetime
    fecha_cierre: datetime
    estado: SorteoEstado = SorteoEstado.ACTIVO
    etapas: List[Etapa] = []
    imagenes: List[str] = []
    videos: List[str] = []
    color_primario: str = "#4F46E5"
    color_secundario: str = "#06B6D4"
    cantidad_vendida: int = 0
    progreso_porcentaje: float = 0.0
    landing_slug: str
    reglas: Optional[str] = None
    compra_minima: int = 1
    datos_bancarios: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Boleto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sorteo_id: str
    usuario_id: str
    vendedor_id: Optional[str] = None
    numero_boleto: int
    fecha_compra: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metodo_pago: MetodoPago
    precio_pagado: float
    estado: BoletoEstado = BoletoEstado.ACTIVO
    etapas_participantes: List[int] = []
    etapa_ganada: Optional[int] = None
    transaction_id: Optional[str] = None
    pago_confirmado: bool = False
    comprobante_url: Optional[str] = None

class Ganador(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sorteo_id: str
    etapa_numero: Optional[int] = None
    boleto_id: str
    usuario_id: str
    premio: str
    fecha_sorteo: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notificado: bool = False

class Comision(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendedor_id: str
    sorteo_id: str
    boleto_id: str
    monto: float
    estado: ComisionEstado = ComisionEstado.PENDIENTE
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConfiguracionAdmin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre_titular: str
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    cedula_ruc: str
    correo_pagos: str
    numero_whatsapp: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ REQUEST/RESPONSE MODELS ============
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    cedula: str
    celular: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str]
    session_token: str
    role: UserRole

class SorteoCreate(BaseModel):
    titulo: str
    descripcion: str
    precio_boleto: float
    cantidad_minima_boletos: int
    cantidad_total_boletos: int
    tipo: SorteoTipo
    porcentaje_comision: float
    fecha_inicio: datetime
    fecha_cierre: datetime
    etapas: List[Etapa] = []
    imagenes: List[str] = []
    videos: List[str] = []
    color_primario: str = "#4F46E5"
    color_secundario: str = "#06B6D4"
    reglas: Optional[str] = None

class BoletoCompra(BaseModel):
    sorteo_id: str
    numeros_boletos: List[int]
    metodo_pago: MetodoPago
    vendedor_link: Optional[str] = None
    comprobante_url: Optional[str] = None

class EjecutarSorteoRequest(BaseModel):
    sorteo_id: str
    etapa_numero: Optional[int] = None

# ============ AUTH HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> User:
    # Check cookie first
    session_token = request.cookies.get('session_token')
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_token = auth_header.split(' ')[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="No autenticado")
    
    # Check session in database
    session = await db.user_sessions.find_one({'session_token': session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Sesión inválida")
    
    # Check expiration
    expires_at = session['expires_at']
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sesión expirada")
    
    # Get user
    user_doc = await db.users.find_one({'id': session['user_id']})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return User(**user_doc)

async def require_role(required_roles: List[UserRole]):
    async def role_checker(request: Request) -> User:
        user = await get_current_user(request)
        if user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Acceso denegado")
        return user
    return role_checker

# ============ AUTH ENDPOINTS ============
@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    # Check if email exists
    existing_email = await db.users.find_one({'email': data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Check if cedula exists
    existing_cedula = await db.users.find_one({'cedula': data.cedula})
    if existing_cedula:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada")
    
    # Check if celular exists
    existing_celular = await db.users.find_one({'celular': data.celular})
    if existing_celular:
        raise HTTPException(status_code=400, detail="El celular ya está registrado")
    
    # Create user
    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        cedula=data.cedula,
        celular=data.celular,
        datos_completos=True,
        verification_token=str(uuid.uuid4())
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # TODO: Send verification email
    
    return {"message": "Usuario registrado exitosamente.", "user_id": user.id}

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    # Find user
    user_doc = await db.users.find_one({'email': data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    user = User(**user_doc)
    
    # Verify password
    if not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Create session
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    )
    
    session_dict = session.model_dump()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    # Set cookie
    response.set_cookie(
        key='session_token',
        value=session_token,
        httponly=True,
        secure=True,
        samesite='none',
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path='/'
    )
    
    return SessionDataResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        session_token=session_token,
        role=user.role
    )

@api_router.get("/auth/session-data")
async def get_session_data(request: Request, response: Response):
    # Check X-Session-ID header (from Google OAuth)
    session_id = request.headers.get('X-Session-ID')
    
    if session_id:
        # Exchange session_id for user data from Emergent Auth
        async with httpx.AsyncClient() as client:
            try:
                auth_response = await client.get(
                    'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
                    headers={'X-Session-ID': session_id}
                )
                auth_response.raise_for_status()
                auth_data = auth_response.json()
            except Exception as e:
                raise HTTPException(status_code=401, detail="Error al obtener datos de sesión")
        
        # Check if user exists
        user_doc = await db.users.find_one({'email': auth_data['email']})
        
        if not user_doc:
            # Create new user
            user = User(
                email=auth_data['email'],
                name=auth_data['name'],
                picture=auth_data.get('picture'),
                email_verified=True
            )
            user_dict = user.model_dump()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            await db.users.insert_one(user_dict)
        else:
            user = User(**user_doc)
        
        # Create session
        session_token = auth_data['session_token']
        session = UserSession(
            user_id=user.id,
            session_token=session_token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
        )
        
        session_dict = session.model_dump()
        session_dict['created_at'] = session_dict['created_at'].isoformat()
        session_dict['expires_at'] = session_dict['expires_at'].isoformat()
        await db.user_sessions.insert_one(session_dict)
        
        # Set cookie
        response.set_cookie(
            key='session_token',
            value=session_token,
            httponly=True,
            secure=True,
            samesite='none',
            max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
            path='/'
        )
        
        return SessionDataResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            session_token=session_token,
            role=user.role
        )
    
    raise HTTPException(status_code=400, detail="No se proporcionó session_id")

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get('session_token')
    if session_token:
        await db.user_sessions.delete_one({'session_token': session_token})
    
    response.delete_cookie(key='session_token', path='/')
    return {"message": "Sesión cerrada"}

@api_router.put("/auth/completar-datos")
async def completar_datos(request: Request, cedula: str, celular: str):
    user = await get_current_user(request)
    
    # Validate cedula and celular are not taken by other users
    existing_cedula = await db.users.find_one({'cedula': cedula, 'id': {'$ne': user.id}})
    if existing_cedula:
        raise HTTPException(status_code=400, detail="La cédula ya está registrada")
    
    existing_celular = await db.users.find_one({'celular': celular, 'id': {'$ne': user.id}})
    if existing_celular:
        raise HTTPException(status_code=400, detail="El celular ya está registrado")
    
    await db.users.update_one(
        {'id': user.id},
        {'$set': {'cedula': cedula, 'celular': celular, 'datos_completos': True}}
    )
    
    return {"message": "Datos completados exitosamente"}

@api_router.put("/auth/cambiar-password")
async def cambiar_password(request: Request, password_actual: str, password_nueva: str):
    user = await get_current_user(request)
    
    if not user.password_hash or not verify_password(password_actual, user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    await db.users.update_one(
        {'id': user.id},
        {'$set': {'password_hash': hash_password(password_nueva)}}
    )
    
    return {"message": "Contraseña cambiada exitosamente"}

# ============ SORTEOS ENDPOINTS ============
@api_router.post("/sorteos", response_model=Sorteo)
async def create_sorteo(data: SorteoCreate, request: Request):
    user = await get_current_user(request)
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden crear sorteos")
    
    # Generate landing slug
    landing_slug = str(uuid.uuid4())[:8]
    
    sorteo = Sorteo(
        **data.model_dump(),
        landing_slug=landing_slug
    )
    
    sorteo_dict = sorteo.model_dump()
    sorteo_dict['fecha_inicio'] = sorteo_dict['fecha_inicio'].isoformat()
    sorteo_dict['fecha_cierre'] = sorteo_dict['fecha_cierre'].isoformat()
    sorteo_dict['created_at'] = sorteo_dict['created_at'].isoformat()
    
    await db.sorteos.insert_one(sorteo_dict)
    return sorteo

@api_router.get("/sorteos", response_model=List[Sorteo])
async def get_sorteos(estado: Optional[str] = None):
    query = {}
    if estado:
        query['estado'] = estado
    
    sorteos = await db.sorteos.find(query, {"_id": 0}).to_list(1000)
    for sorteo in sorteos:
        if isinstance(sorteo['fecha_inicio'], str):
            sorteo['fecha_inicio'] = datetime.fromisoformat(sorteo['fecha_inicio'])
        if isinstance(sorteo['fecha_cierre'], str):
            sorteo['fecha_cierre'] = datetime.fromisoformat(sorteo['fecha_cierre'])
        if isinstance(sorteo['created_at'], str):
            sorteo['created_at'] = datetime.fromisoformat(sorteo['created_at'])
        
        # Convert etapas fecha_sorteo
        for etapa in sorteo.get('etapas', []):
            if etapa.get('fecha_sorteo') and isinstance(etapa['fecha_sorteo'], str):
                etapa['fecha_sorteo'] = datetime.fromisoformat(etapa['fecha_sorteo'])
    
    return sorteos

@api_router.get("/sorteos/{sorteo_id}", response_model=Sorteo)
async def get_sorteo(sorteo_id: str):
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id}, {"_id": 0})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if isinstance(sorteo_doc['fecha_inicio'], str):
        sorteo_doc['fecha_inicio'] = datetime.fromisoformat(sorteo_doc['fecha_inicio'])
    if isinstance(sorteo_doc['fecha_cierre'], str):
        sorteo_doc['fecha_cierre'] = datetime.fromisoformat(sorteo_doc['fecha_cierre'])
    if isinstance(sorteo_doc['created_at'], str):
        sorteo_doc['created_at'] = datetime.fromisoformat(sorteo_doc['created_at'])
    
    for etapa in sorteo_doc.get('etapas', []):
        if etapa.get('fecha_sorteo') and isinstance(etapa['fecha_sorteo'], str):
            etapa['fecha_sorteo'] = datetime.fromisoformat(etapa['fecha_sorteo'])
    
    return Sorteo(**sorteo_doc)

@api_router.get("/sorteos/slug/{slug}", response_model=Sorteo)
async def get_sorteo_by_slug(slug: str):
    sorteo_doc = await db.sorteos.find_one({'landing_slug': slug}, {"_id": 0})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if isinstance(sorteo_doc['fecha_inicio'], str):
        sorteo_doc['fecha_inicio'] = datetime.fromisoformat(sorteo_doc['fecha_inicio'])
    if isinstance(sorteo_doc['fecha_cierre'], str):
        sorteo_doc['fecha_cierre'] = datetime.fromisoformat(sorteo_doc['fecha_cierre'])
    if isinstance(sorteo_doc['created_at'], str):
        sorteo_doc['created_at'] = datetime.fromisoformat(sorteo_doc['created_at'])
    
    for etapa in sorteo_doc.get('etapas', []):
        if etapa.get('fecha_sorteo') and isinstance(etapa['fecha_sorteo'], str):
            etapa['fecha_sorteo'] = datetime.fromisoformat(etapa['fecha_sorteo'])
    
    return Sorteo(**sorteo_doc)

@api_router.get("/sorteos/{sorteo_id}/numeros-disponibles")
async def get_numeros_disponibles(sorteo_id: str):
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    # Get all taken numbers
    boletos = await db.boletos.find({'sorteo_id': sorteo_id}, {"numero_boleto": 1}).to_list(10000)
    numeros_ocupados = {b['numero_boleto'] for b in boletos}
    
    # Generate available numbers
    numeros_disponibles = [n for n in range(1, sorteo_doc['cantidad_total_boletos'] + 1) if n not in numeros_ocupados]
    
    return {
        "disponibles": numeros_disponibles,
        "ocupados": list(numeros_ocupados),
        "total": sorteo_doc['cantidad_total_boletos']
    }

# ============ BOLETOS ENDPOINTS ============
@api_router.post("/boletos/comprar")
async def comprar_boletos(data: BoletoCompra, request: Request):
    user = await get_current_user(request)
    
    # Check if user has complete data
    if not user.datos_completos or not user.cedula or not user.celular:
        raise HTTPException(status_code=400, detail="Debes completar tus datos (cédula y celular) antes de comprar")
    
    # Get sorteo
    sorteo_doc = await db.sorteos.find_one({'id': data.sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    sorteo = Sorteo(**sorteo_doc)
    
    if sorteo.estado != SorteoEstado.ACTIVO:
        raise HTTPException(status_code=400, detail="El sorteo no está activo")
    
    # Validate all numbers
    numeros_invalidos = []
    numeros_ocupados = []
    
    for numero in data.numeros_boletos:
        # Validate range
        if numero < 1 or numero > sorteo.cantidad_total_boletos:
            numeros_invalidos.append(numero)
            continue
        
        # Check if already taken (including pending ones from last 24 hours)
        hace_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        existing = await db.boletos.find_one({
            'sorteo_id': sorteo.id,
            'numero_boleto': numero,
            '$or': [
                {'pago_confirmado': True},
                {'fecha_compra': {'$gte': hace_24h}}
            ]
        })
        if existing:
            numeros_ocupados.append(numero)
    
    if numeros_invalidos:
        raise HTTPException(
            status_code=400, 
            detail=f"Los siguientes números no están en el rango válido (1-{sorteo.cantidad_total_boletos}): {', '.join(map(str, numeros_invalidos))}"
        )
    
    if numeros_ocupados:
        raise HTTPException(
            status_code=400,
            detail=f"Los siguientes números ya están ocupados o reservados: {', '.join(map(str, numeros_ocupados))}"
        )
    
    # Get vendedor if link provided
    vendedor_id = None
    if data.vendedor_link:
        vendedor_doc = await db.users.find_one({'link_unico': data.vendedor_link})
        if vendedor_doc:
            vendedor_id = vendedor_doc['id']
    
    # Determine etapas participantes
    etapas_participantes = []
    if sorteo.tipo == SorteoTipo.ETAPAS:
        etapas_participantes = [e.numero for e in sorteo.etapas]
    
    # Create boletos
    boletos_creados = []
    pago_confirmado = data.metodo_pago == MetodoPago.PAYPHONE
    
    for numero in data.numeros_boletos:
        boleto = Boleto(
            sorteo_id=sorteo.id,
            usuario_id=user.id,
            vendedor_id=vendedor_id,
            numero_boleto=numero,
            metodo_pago=data.metodo_pago,
            precio_pagado=sorteo.precio_boleto,
            etapas_participantes=etapas_participantes,
            estado=BoletoEstado.ACTIVO,
            pago_confirmado=pago_confirmado,
            comprobante_url=data.comprobante_url
        )
        
        boleto_dict = boleto.model_dump()
        boleto_dict['fecha_compra'] = boleto_dict['fecha_compra'].isoformat()
        await db.boletos.insert_one(boleto_dict)
        boletos_creados.append(boleto)
        
        # Create comision if vendedor
        if vendedor_id:
            comision = Comision(
                vendedor_id=vendedor_id,
                sorteo_id=sorteo.id,
                boleto_id=boleto.id,
                monto=sorteo.precio_boleto * (sorteo.porcentaje_comision / 100)
            )
            comision_dict = comision.model_dump()
            comision_dict['fecha'] = comision_dict['fecha'].isoformat()
            await db.comisiones.insert_one(comision_dict)
    
    # Update sorteo
    nueva_cantidad = sorteo.cantidad_vendida + len(data.numeros_boletos)
    nuevo_progreso = (nueva_cantidad / sorteo.cantidad_total_boletos) * 100
    
    await db.sorteos.update_one(
        {'id': sorteo.id},
        {'$set': {
            'cantidad_vendida': nueva_cantidad,
            'progreso_porcentaje': nuevo_progreso
        }}
    )
    
    cantidad_boletos = len(data.numeros_boletos)
    total = sorteo.precio_boleto * cantidad_boletos
    
    return {
        "message": f"{cantidad_boletos} boleto(s) comprado(s) exitosamente" + (" - Pendiente de aprobación" if not pago_confirmado else ""),
        "boletos": [b.model_dump() for b in boletos_creados],
        "total": total,
        "metodo_pago": data.metodo_pago,
        "pendiente_aprobacion": not pago_confirmado
    }

@api_router.get("/boletos/mis-boletos", response_model=List[Boleto])
async def get_mis_boletos(request: Request):
    user = await get_current_user(request)
    
    boletos = await db.boletos.find({'usuario_id': user.id}, {"_id": 0}).to_list(1000)
    for boleto in boletos:
        if isinstance(boleto['fecha_compra'], str):
            boleto['fecha_compra'] = datetime.fromisoformat(boleto['fecha_compra'])
    
    return boletos

# ============ GANADORES ENDPOINTS ============
@api_router.get("/ganadores/sorteo/{sorteo_id}", response_model=List[Ganador])
async def get_ganadores_sorteo(sorteo_id: str):
    ganadores = await db.ganadores.find({'sorteo_id': sorteo_id}, {"_id": 0}).to_list(1000)
    for ganador in ganadores:
        if isinstance(ganador['fecha_sorteo'], str):
            ganador['fecha_sorteo'] = datetime.fromisoformat(ganador['fecha_sorteo'])
    return ganadores

# ============ ADMIN ENDPOINTS ============
@api_router.post("/admin/ejecutar-sorteo")
async def ejecutar_sorteo(data: EjecutarSorteoRequest, request: Request):
    user = await get_current_user(request)
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden ejecutar sorteos")
    
    sorteo_doc = await db.sorteos.find_one({'id': data.sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    sorteo = Sorteo(**sorteo_doc)
    
    # Get eligible boletos
    query = {
        'sorteo_id': sorteo.id,
        'pago_confirmado': True,
        'estado': BoletoEstado.ACTIVO
    }
    
    if data.etapa_numero is not None:
        # Sorteo de etapa
        query['etapas_participantes'] = data.etapa_numero
        query['etapa_ganada'] = None
    
    boletos_elegibles = await db.boletos.find(query, {"_id": 0}).to_list(10000)
    
    if not boletos_elegibles:
        raise HTTPException(status_code=400, detail="No hay boletos elegibles para el sorteo")
    
    # Select random winner
    boleto_ganador = random.choice(boletos_elegibles)
    
    # Get premio
    premio = ""
    if data.etapa_numero is not None:
        etapa = next((e for e in sorteo.etapas if e.numero == data.etapa_numero), None)
        if etapa:
            premio = etapa.premio
    else:
        premio = sorteo.titulo
    
    # Create ganador
    ganador = Ganador(
        sorteo_id=sorteo.id,
        etapa_numero=data.etapa_numero,
        boleto_id=boleto_ganador['id'],
        usuario_id=boleto_ganador['usuario_id'],
        premio=premio
    )
    
    ganador_dict = ganador.model_dump()
    ganador_dict['fecha_sorteo'] = ganador_dict['fecha_sorteo'].isoformat()
    await db.ganadores.insert_one(ganador_dict)
    
    # Update boleto
    if data.etapa_numero is not None:
        # Mark etapa as won
        await db.boletos.update_one(
            {'id': boleto_ganador['id']},
            {'$set': {'etapa_ganada': data.etapa_numero}}
        )
        
        # Update etapa in sorteo
        for etapa in sorteo.etapas:
            if etapa.numero == data.etapa_numero:
                etapa.completado = True
                etapa.ganador_id = boleto_ganador['usuario_id']
                etapa.fecha_sorteo = datetime.now(timezone.utc)
        
        etapas_dict = [e.model_dump() for e in sorteo.etapas]
        for e in etapas_dict:
            if e.get('fecha_sorteo'):
                e['fecha_sorteo'] = e['fecha_sorteo'].isoformat()
        
        await db.sorteos.update_one(
            {'id': sorteo.id},
            {'$set': {'etapas': etapas_dict}}
        )
    else:
        # Final draw - mark boleto as ganador
        await db.boletos.update_one(
            {'id': boleto_ganador['id']},
            {'$set': {'estado': BoletoEstado.GANADOR}}
        )
        
        # Mark sorteo as completado
        await db.sorteos.update_one(
            {'id': sorteo.id},
            {'$set': {'estado': SorteoEstado.COMPLETADO}}
        )
    
    return {
        "message": "Sorteo ejecutado exitosamente",
        "ganador": ganador_dict,
        "boleto_ganador": boleto_ganador
    }

@api_router.get("/admin/usuarios", response_model=List[User])
async def get_usuarios(request: Request):
    user = await get_current_user(request)
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden ver usuarios")
    
    usuarios = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for usuario in usuarios:
        if isinstance(usuario['created_at'], str):
            usuario['created_at'] = datetime.fromisoformat(usuario['created_at'])
    
    return usuarios

@api_router.put("/admin/usuario/{user_id}/role")
async def update_user_role(user_id: str, role: UserRole, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden cambiar roles")
    
    # If making someone a vendedor, create unique link
    update_data = {'role': role}
    if role == UserRole.VENDEDOR:
        link_unico = str(uuid.uuid4())[:8]
        update_data['link_unico'] = link_unico
    
    result = await db.users.update_one(
        {'id': user_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Role actualizado exitosamente"}

@api_router.get("/admin/boletos-pendientes")
async def get_boletos_pendientes(request: Request, sorteo_id: Optional[str] = None):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden ver boletos pendientes")
    
    query = {'pago_confirmado': False}
    if sorteo_id:
        query['sorteo_id'] = sorteo_id
    
    boletos = await db.boletos.find(query, {"_id": 0}).to_list(1000)
    
    # Get user info for each boleto
    for boleto in boletos:
        if isinstance(boleto['fecha_compra'], str):
            boleto['fecha_compra'] = datetime.fromisoformat(boleto['fecha_compra'])
        
        user_doc = await db.users.find_one({'id': boleto['usuario_id']}, {"_id": 0, "password_hash": 0})
        boleto['usuario'] = user_doc
        
        sorteo_doc = await db.sorteos.find_one({'id': boleto['sorteo_id']}, {"_id": 0})
        boleto['sorteo'] = {'titulo': sorteo_doc.get('titulo', ''), 'id': sorteo_doc.get('id', '')}
    
    return boletos

@api_router.put("/admin/boleto/{boleto_id}/aprobar")
async def aprobar_boleto(boleto_id: str, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden aprobar boletos")
    
    result = await db.boletos.update_one(
        {'id': boleto_id},
        {'$set': {'pago_confirmado': True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Boleto no encontrado")
    
    return {"message": "Boleto aprobado exitosamente"}

@api_router.put("/admin/boleto/{boleto_id}/rechazar")
async def rechazar_boleto(boleto_id: str, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden rechazar boletos")
    
    # Get boleto to update sorteo count
    boleto_doc = await db.boletos.find_one({'id': boleto_id})
    if not boleto_doc:
        raise HTTPException(status_code=404, detail="Boleto no encontrado")
    
    # Delete boleto
    await db.boletos.delete_one({'id': boleto_id})
    
    # Update sorteo count
    sorteo_doc = await db.sorteos.find_one({'id': boleto_doc['sorteo_id']})
    if sorteo_doc:
        nueva_cantidad = max(0, sorteo_doc['cantidad_vendida'] - 1)
        nuevo_progreso = (nueva_cantidad / sorteo_doc['cantidad_total_boletos']) * 100
        await db.sorteos.update_one(
            {'id': sorteo_doc['id']},
            {'$set': {
                'cantidad_vendida': nueva_cantidad,
                'progreso_porcentaje': nuevo_progreso
            }}
        )
    
    return {"message": "Boleto rechazado y eliminado"}

@api_router.get("/admin/configuracion")
async def get_configuracion_admin(request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden ver configuración")
    
    config = await db.configuracion_admin.find_one({}, {"_id": 0})
    if not config:
        # Create default config
        default_config = ConfiguracionAdmin(
            nombre_titular="WishWay EC",
            banco="Banco del Pichincha",
            tipo_cuenta="Corriente",
            numero_cuenta="1234567890",
            cedula_ruc="1234567890001",
            correo_pagos="pagos@wishway.com",
            numero_whatsapp="+593987654321"
        )
        config_dict = default_config.model_dump()
        config_dict['updated_at'] = config_dict['updated_at'].isoformat()
        await db.configuracion_admin.insert_one(config_dict)
        return default_config
    
    if isinstance(config.get('updated_at'), str):
        config['updated_at'] = datetime.fromisoformat(config['updated_at'])
    
    return ConfiguracionAdmin(**config)

@api_router.put("/admin/configuracion")
async def update_configuracion_admin(config: ConfiguracionAdmin, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar configuración")
    
    config.updated_at = datetime.now(timezone.utc)
    config_dict = config.model_dump()
    config_dict['updated_at'] = config_dict['updated_at'].isoformat()
    
    # Upsert
    await db.configuracion_admin.update_one(
        {},
        {'$set': config_dict},
        upsert=True
    )
    
    return {"message": "Configuración actualizada exitosamente"}

@api_router.get("/configuracion-publica")
async def get_configuracion_publica():
    """Endpoint público para obtener datos bancarios y WhatsApp"""
    config = await db.configuracion_admin.find_one({}, {"_id": 0})
    if not config:
        return {
            "nombre_titular": "WishWay EC",
            "banco": "Banco del Pichincha",
            "tipo_cuenta": "Corriente",
            "numero_cuenta": "1234567890",
            "cedula_ruc": "1234567890001",
            "numero_whatsapp": "+593987654321"
        }
    
    return {
        "nombre_titular": config.get("nombre_titular", ""),
        "banco": config.get("banco", ""),
        "tipo_cuenta": config.get("tipo_cuenta", ""),
        "numero_cuenta": config.get("numero_cuenta", ""),
        "cedula_ruc": config.get("cedula_ruc", ""),
        "numero_whatsapp": config.get("numero_whatsapp", "")
    }

# ============ VENDEDOR ENDPOINTS ============
@api_router.get("/vendedor/mis-ventas")
async def get_mis_ventas(request: Request):
    user = await get_current_user(request)
    if user.role != UserRole.VENDEDOR:
        raise HTTPException(status_code=403, detail="Solo vendedores pueden ver ventas")
    
    boletos = await db.boletos.find({'vendedor_id': user.id}, {"_id": 0}).to_list(1000)
    comisiones = await db.comisiones.find({'vendedor_id': user.id}, {"_id": 0}).to_list(1000)
    
    total_ventas = len(boletos)
    total_comisiones = sum(c['monto'] for c in comisiones)
    comisiones_pendientes = sum(c['monto'] for c in comisiones if c['estado'] == ComisionEstado.PENDIENTE)
    
    return {
        "total_ventas": total_ventas,
        "total_comisiones": total_comisiones,
        "comisiones_pendientes": comisiones_pendientes,
        "link_unico": user.link_unico,
        "boletos": boletos,
        "comisiones": comisiones
    }

# ============ ROOT ============
@api_router.get("/")
async def root():
    return {"message": "WishWay Sorteos API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
