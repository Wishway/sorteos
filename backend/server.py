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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import socketio

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

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', SMTP_USER)
FROM_NAME = os.environ.get('FROM_NAME', 'WishWay Sorteos')

# Import WebSocket manager
from websocket_manager import sio, emit_sorteo_state_changed, emit_sorteo_updated, broadcast_sorteos_update, emit_live_animation_start, emit_live_prize_drawing, emit_live_winner_announced, emit_live_animation_complete, emit_ventas_pausadas

# Import state machine and live service
import state_machine
import live_animation_service
import vendedor_endpoints

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Wrap app with Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# ============ EMAIL FUNCTIONS ============
async def send_password_reset_email(to_email: str, user_name: str, reset_link: str):
    """Enviar email de recuperación de contraseña"""
    
    if not SMTP_USER or not SMTP_PASSWORD:
        logging.warning("SMTP credentials not configured. Email not sent.")
        return
    
    subject = "Recupera tu contraseña - WishWay"
    
    # HTML Email Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">WishWay Sorteos</h1>
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Hola {user_name},</h2>
                                
                                <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                                </p>
                                
                                <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    Haz clic en el botón de abajo para crear una nueva contraseña:
                                </p>
                                
                                <!-- Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding: 0 0 30px;">
                                            <a href="{reset_link}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                                                Restablecer Contraseña
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <div style="padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 20px;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                        <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad.
                                    </p>
                                </div>
                                
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                    Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.
                                </p>
                                
                                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                    Si tienes problemas con el botón, copia y pega este enlace en tu navegador:
                                </p>
                                
                                <p style="margin: 10px 0 0; color: #667eea; font-size: 12px; word-break: break-all;">
                                    {reset_link}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                    © 2024 WishWay Sorteos. Todos los derechos reservados.
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                    Este es un correo automático, por favor no respondas.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    # Plain text version
    text_content = f"""
    Hola {user_name},
    
    Recibimos una solicitud para restablecer la contraseña de tu cuenta en WishWay.
    
    Para crear una nueva contraseña, visita el siguiente enlace:
    {reset_link}
    
    Este enlace expirará en 1 hora por seguridad.
    
    Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
    
    Saludos,
    Equipo WishWay
    """
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg['To'] = to_email
    
    # Attach both plain and HTML versions
    part1 = MIMEText(text_content, 'plain', 'utf-8')
    part2 = MIMEText(html_content, 'html', 'utf-8')
    msg.attach(part1)
    msg.attach(part2)
    
    # Send email in a separate thread to not block
    def send_sync():
        try:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
                logging.info(f"Password reset email sent to {to_email}")
        except Exception as e:
            logging.error(f"Failed to send email to {to_email}: {str(e)}")
            raise
    
    # Run in executor to avoid blocking
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_sync)

# ============ ENUMS ============
class UserRole(str, Enum):
    ADMIN = "admin"
    VENDEDOR = "vendedor"
    USUARIO = "usuario"

class SorteoTipo(str, Enum):
    ETAPAS = "etapas"
    UNICO = "unico"

class SorteoEstado(str, Enum):
    DRAFT = "draft"              # Borrador - no visible, 100% editable
    PUBLISHED = "published"      # Publicado/En Venta - visible, no editable
    WAITING = "waiting"          # En Espera - pre-sorteo con contador
    LIVE = "live"                # En Proceso - ejecutándose con animación
    COMPLETED = "completed"      # Completado - finalizado
    COMPLETADO = "completado"    # Legacy - mismo que completed
    PAUSADO = "pausado"          # Pausado (legacy, mantener por compatibilidad)
    ACTIVO = "activo"            # Legacy - mismo que published

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
class ValidarNumeroRequest(BaseModel):
    numero: int
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
    bloqueado: bool = False
    # Campos para vendedores (datos bancarios)
    nombre_banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    datos_bancarios_completos: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Premio(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    video_url: Optional[str] = None

class Etapa(BaseModel):
    numero: int
    porcentaje: float
    premio: str
    nombre: Optional[str] = None  # Nombre de la etapa
    premios: List[Premio] = []    # Lista de premios para esta etapa
    imagen_urls: List[str] = []   # URLs de imágenes para esta etapa (legacy)
    video_urls: List[str] = []    # URLs de videos para esta etapa (legacy)
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
    fecha_cierre: datetime  # ÚNICA fecha/hora que controla TODO el sorteo
    estado: SorteoEstado = SorteoEstado.DRAFT  # Por defecto en borrador
    etapas: List[Etapa] = []
    premios: List[Premio] = []    # Premios para sorteo de etapa única
    imagenes: List[str] = []      # Imágenes promocionales
    color_primario: str = "#4F46E5"
    color_secundario: str = "#06B6D4"
    cantidad_vendida: int = 0
    progreso_porcentaje: float = 0.0
    landing_slug: str
    reglas: Optional[str] = None
    compra_minima: int = 1
    datos_bancarios: Optional[str] = None
    fecha_waiting: Optional[datetime] = None  # Cuándo entró en WAITING
    waiting_hasta: Optional[datetime] = None  # Hasta cuándo dura WAITING (5 min para etapas)
    fecha_live: Optional[datetime] = None     # Cuándo inició LIVE
    fecha_completed: Optional[datetime] = None  # Cuándo se completó
    ganadores: List[dict] = []  # Lista de ganadores seleccionados
    ventas_pausadas: bool = False  # Para pausar/despausar ventas en estado PUBLISHED
    etapa_actual: int = 0  # Etapa actual para sorteos por etapas (0 = no iniciado)
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
    numero_comprobante: Optional[str] = None

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

class EstadoRetiro(str, Enum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"

class Retiro(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendedor_id: str
    monto: float
    estado: EstadoRetiro = EstadoRetiro.PENDIENTE
    comprobante_url: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    fecha_solicitud: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_aprobacion: Optional[datetime] = None

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
    fecha_cierre: datetime  # ÚNICA fecha/hora del sorteo
    etapas: List[Etapa] = []
    premios: List[Premio] = []
    imagenes: List[str] = []
    color_primario: str = "#4F46E5"
    color_secundario: str = "#06B6D4"
    reglas: Optional[str] = None

class BoletoCompra(BaseModel):
    sorteo_id: str
    numeros_boletos: List[int]
    metodo_pago: MetodoPago
    vendedor_id: Optional[str] = None  # ID del vendedor desde el frontend
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

@api_router.post("/auth/registro-vendedor")
async def registro_vendedor(data: RegisterRequest, response: Response):
    """Registrar un nuevo vendedor y crear sesión automáticamente"""
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
    
    # Generar link único para vendedor
    link_unico = str(uuid.uuid4())[:8]
    
    # Create user as VENDEDOR
    user = User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
        cedula=data.cedula,
        celular=data.celular,
        role=UserRole.VENDEDOR,  # VENDEDOR role
        link_unico=link_unico,
        datos_completos=True,
        verification_token=str(uuid.uuid4())
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Create session automatically
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    )
    
    session_dict = session.model_dump()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    await db.sessions.insert_one(session_dict)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        samesite="lax"
    )
    
    logger.info(f"Nuevo vendedor registrado: {user.email} con link {link_unico}")
    
    return {
        "message": "Vendedor registrado exitosamente",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "link_unico": link_unico
        }
    }

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

@api_router.post("/auth/google/callback")
async def google_callback(request: Request, response: Response):
    """Handle Google OAuth callback from Emergent Auth"""
    try:
        body = await request.json()
        session_id = body.get('session_id')
        
        if not session_id:
            raise HTTPException(status_code=400, detail="Missing session_id")
        
        # Exchange session_id for user data from Emergent Auth
        async with httpx.AsyncClient() as client:
            try:
                auth_response = await client.get(
                    'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
                    headers={'X-Session-ID': session_id}
                )
                auth_response.raise_for_status()
                auth_data = auth_response.json()
            except httpx.HTTPError as e:
                logger.error(f"Error calling Emergent Auth API: {e}")
                raise HTTPException(status_code=401, detail="Error al obtener datos de sesión de Google")
        
        # Check if user exists
        user_doc = await db.users.find_one({'email': auth_data['email']}, {"_id": 0})
        
        if not user_doc:
            # Create new user with Google data
            user = User(
                email=auth_data['email'],
                name=auth_data.get('name', auth_data['email'].split('@')[0]),
                picture=auth_data.get('picture'),
                email_verified=True,
                role=UserRole.USUARIO  # Default role for Google signup
            )
            user_dict = user.model_dump()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            await db.users.insert_one(user_dict)
            logger.info(f"New user created via Google: {user.email}")
        else:
            user = User(**user_doc)
        
        # Create session
        session_token = auth_data.get('session_token', str(uuid.uuid4()))
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
        
        logger.info(f"User logged in via Google: {user.email}")
        
        return SessionDataResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            session_token=session_token,
            role=user.role
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in Google callback: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

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

@api_router.post("/auth/forgot-password")
async def forgot_password(data: dict):
    """Solicitar recuperación de contraseña"""
    email = data.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email requerido")
    
    user_doc = await db.users.find_one({'email': email})
    if not user_doc:
        # Por seguridad, no revelar si el email existe o no
        return {"message": "Si el email está registrado, recibirás un correo con las instrucciones"}
    
    # Generar token de recuperación único
    reset_token = str(uuid.uuid4())
    reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)  # Token válido por 1 hora
    
    # Guardar token en la base de datos
    await db.password_resets.insert_one({
        'user_id': user_doc['id'],
        'email': email,
        'reset_token': reset_token,
        'expires_at': reset_expires,
        'used': False,
        'created_at': datetime.now(timezone.utc)
    })
    
    # Construir el enlace de recuperación
    frontend_url = os.environ.get('FRONTEND_URL', 'https://rafflewave-1.preview.emergentagent.com')
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Enviar email con el enlace
    try:
        await send_password_reset_email(email, user_doc.get('name', 'Usuario'), reset_link)
    except Exception as e:
        logging.error(f"Error al enviar email de recuperación: {str(e)}")
        # No revelar el error al usuario por seguridad
    
    # Siempre devolver el mismo mensaje para no revelar si el email existe
    return {"message": "Si el email está registrado, recibirás un correo con las instrucciones"}

@api_router.post("/auth/verify-reset-token")
async def verify_reset_token(data: dict):
    """Verificar si el token de recuperación es válido"""
    token = data.get('token')
    if not token:
        raise HTTPException(status_code=400, detail="Token requerido")
    
    reset_doc = await db.password_resets.find_one({
        'reset_token': token,
        'used': False,
        'expires_at': {'$gt': datetime.now(timezone.utc)}
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    return {"valid": True, "email": reset_doc['email']}

@api_router.post("/auth/reset-password")
async def reset_password(data: dict):
    """Restablecer contraseña con token"""
    token = data.get('token')
    new_password = data.get('new_password')
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token y nueva contraseña requeridos")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Buscar token válido
    reset_doc = await db.password_resets.find_one({
        'reset_token': token,
        'used': False,
        'expires_at': {'$gt': datetime.now(timezone.utc)}
    })
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    # Actualizar contraseña
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    await db.users.update_one(
        {'id': reset_doc['user_id']},
        {'$set': {'password': hashed_password}}
    )
    
    # Marcar token como usado
    await db.password_resets.update_one(
        {'reset_token': token},
        {'$set': {'used': True, 'used_at': datetime.now(timezone.utc)}}
    )
    
    # Invalidar todas las sesiones del usuario por seguridad
    await db.user_sessions.delete_many({'user_id': reset_doc['user_id']})
    
    return {"message": "Contraseña actualizada exitosamente"}

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

# ============ BACKGROUND JOBS ============
async def liberar_boletos_expirados():
    """Liberar boletos pendientes que tienen más de 24 horas"""
    try:
        # Calcular fecha límite (24 horas atrás)
        fecha_limite = datetime.now(timezone.utc) - timedelta(hours=24)
        
        # Buscar boletos pendientes antiguos
        result = await db.boletos.delete_many({
            'pago_confirmado': False,
            'fecha_compra': {'$lt': fecha_limite}
        })
        
        if result.deleted_count > 0:
            logging.info(f"Liberados {result.deleted_count} boletos expirados")
        
        return result.deleted_count
    except Exception as e:
        logging.error(f"Error al liberar boletos: {str(e)}")
        return 0

async def limpiar_sorteos_completados_antiguos():
    """Eliminar sorteos completados y sus datos después de 30 días"""
    try:
        # Calcular fecha límite (30 días atrás)
        fecha_limite = datetime.now(timezone.utc) - timedelta(days=30)
        
        # Buscar sorteos completados con más de 30 días
        sorteos_antiguos = await db.sorteos.find({
            'estado': 'completed',
            'fecha_completed': {'$lt': fecha_limite}
        }).to_list(1000)
        
        sorteos_eliminados = 0
        boletos_eliminados = 0
        ganadores_eliminados = 0
        
        for sorteo in sorteos_antiguos:
            sorteo_id = sorteo['id']
            
            # Eliminar boletos asociados
            result_boletos = await db.boletos.delete_many({'sorteo_id': sorteo_id})
            boletos_eliminados += result_boletos.deleted_count
            
            # Eliminar ganadores asociados
            result_ganadores = await db.ganadores.delete_many({'sorteo_id': sorteo_id})
            ganadores_eliminados += result_ganadores.deleted_count
            
            # Eliminar el sorteo
            await db.sorteos.delete_one({'id': sorteo_id})
            sorteos_eliminados += 1
        
        if sorteos_eliminados > 0:
            logging.info(f"Limpieza 30 días: {sorteos_eliminados} sorteos, {boletos_eliminados} boletos, {ganadores_eliminados} ganadores")
        
        return {
            'sorteos': sorteos_eliminados,
            'boletos': boletos_eliminados,
            'ganadores': ganadores_eliminados
        }
    except Exception as e:
        logging.error(f"Error al limpiar sorteos antiguos: {str(e)}")
        return {'sorteos': 0, 'boletos': 0, 'ganadores': 0}

# ============ HELPER FUNCTIONS ============
async def actualizar_progreso_sorteo(sorteo_id: str):
    """Actualizar cantidad vendida y progreso basado en boletos aprobados"""
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        return
    
    # Contar solo boletos aprobados (pago_confirmado=True)
    boletos_aprobados = await db.boletos.count_documents({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    })
    
    cantidad_total = sorteo_doc['cantidad_total_boletos']
    progreso = (boletos_aprobados / cantidad_total) * 100 if cantidad_total > 0 else 0
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {
            'cantidad_vendida': boletos_aprobados,
            'progreso_porcentaje': progreso
        }}
    )
    
    return boletos_aprobados, progreso

async def verificar_transicion_estado(sorteo_id: str):
    """Verificar y ejecutar transiciones automáticas de estado - LÓGICA COMPLETA"""
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        return
    
    sorteo = Sorteo(**sorteo_doc)
    ahora = datetime.now(timezone.utc)
    
    # Asegurar que fecha_cierre tenga zona horaria
    if sorteo.fecha_cierre.tzinfo is None:
        sorteo.fecha_cierre = sorteo.fecha_cierre.replace(tzinfo=timezone.utc)
    
    estado_actual = sorteo.estado
    nuevo_estado = None
    update_data = {}
    
    # PUBLISHED → WAITING
    if estado_actual in [SorteoEstado.PUBLISHED, SorteoEstado.ACTIVO]:
        # Contar boletos aprobados
        boletos_aprobados = await db.boletos.count_documents({
            'sorteo_id': sorteo_id,
            'pago_confirmado': True
        })
        
        todos_vendidos = boletos_aprobados >= sorteo.cantidad_total_boletos
        fecha_alcanzada = sorteo.fecha_cierre <= ahora
        
        # Si se vendieron todos los boletos O si llegó la fecha del sorteo
        if todos_vendidos or fecha_alcanzada:
            nuevo_estado = SorteoEstado.WAITING
            update_data['fecha_waiting'] = datetime.now(timezone.utc)
    
    # WAITING → LIVE (automático después de 5 minutos si ambas condiciones se cumplen)
    elif estado_actual == SorteoEstado.WAITING:
        boletos_aprobados = await db.boletos.count_documents({
            'sorteo_id': sorteo_id,
            'pago_confirmado': True
        })
        
        todos_vendidos = boletos_aprobados >= sorteo.cantidad_total_boletos
        fecha_alcanzada = sorteo.fecha_cierre <= ahora
        
        # Si ambas condiciones se cumplen y pasaron 5 minutos desde entrada a WAITING
        if todos_vendidos and fecha_alcanzada:
            fecha_waiting = sorteo.fecha_waiting
            if fecha_waiting:
                if isinstance(fecha_waiting, str):
                    fecha_waiting = datetime.fromisoformat(fecha_waiting.replace('Z', '+00:00'))
                elif fecha_waiting.tzinfo is None:
                    # Si no tiene zona horaria, agregarle UTC
                    fecha_waiting = fecha_waiting.replace(tzinfo=timezone.utc)
                
                minutos_en_waiting = (ahora - fecha_waiting).total_seconds() / 60
                
                # Pasar a LIVE después de ~5 minutos (4.5 min para dar margen)
                if minutos_en_waiting >= 4.5:
                    # Seleccionar ganadores AHORA (solo una vez)
                    if not sorteo.ganadores or len(sorteo.ganadores) == 0:
                        ganadores_seleccionados = await seleccionar_ganadores_sorteo(sorteo_id)
                        update_data['ganadores'] = ganadores_seleccionados
                    
                    nuevo_estado = SorteoEstado.LIVE
                    update_data['fecha_live'] = datetime.now(timezone.utc)
    
    # Actualizar estado si cambió
    if nuevo_estado and nuevo_estado != estado_actual:
        update_data['estado'] = nuevo_estado
        
        await db.sorteos.update_one(
            {'id': sorteo_id},
            {'$set': update_data}
        )
        logging.info(f"Sorteo {sorteo_id} cambió de estado: {estado_actual} → {nuevo_estado}")
        
        return nuevo_estado
    
    return None

async def seleccionar_ganadores_sorteo(sorteo_id: str):
    """Seleccionar ganadores de un sorteo de forma aleatoria"""
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        return []
    
    sorteo = Sorteo(**sorteo_doc)
    
    # Obtener participantes con boletos aprobados
    boletos = await db.boletos.find({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    }).to_list(10000)
    
    if not boletos:
        return []
    
    import random
    ganadores = []
    boletos_disponibles = list(boletos)
    
    if sorteo.tipo == 'unico':
        # Para sorteos ÚNICOS: un ganador por cada premio
        for i, premio in enumerate(sorteo.premios):
            if not boletos_disponibles:
                break
            
            boleto_ganador = random.choice(boletos_disponibles)
            boletos_disponibles.remove(boleto_ganador)
            
            # Obtener info del usuario
            usuario = await db.users.find_one({'id': boleto_ganador['usuario_id']}, {"_id": 0})
            
            ganadores.append({
                'boleto_id': boleto_ganador['id'],
                'usuario_id': boleto_ganador['usuario_id'],
                'nombre_usuario': usuario.get('name', '') if usuario else '',
                'email_usuario': usuario.get('email', '') if usuario else '',
                'cedula_usuario': usuario.get('cedula', '') if usuario else '',
                'celular_usuario': usuario.get('celular', '') if usuario else '',
                'numero_boleto': boleto_ganador['numero_boleto'],
                'premio': premio.nombre,
                'premio_imagen': premio.imagen,
                'premio_video': premio.video,
                'etapa': None,
                'etapa_numero': None,
                'fecha_sorteo': datetime.now(timezone.utc).isoformat()
            })
    else:
        # Para sorteos POR ETAPAS: un ganador por cada premio de cada etapa
        for etapa in sorteo.etapas:
            etapa_premios = etapa.premios if hasattr(etapa, 'premios') and etapa.premios else []
            
            if etapa_premios:
                # Si la etapa tiene premios definidos, sortear cada uno
                for premio in etapa_premios:
                    if not boletos_disponibles:
                        break
                    
                    boleto_ganador = random.choice(boletos_disponibles)
                    boletos_disponibles.remove(boleto_ganador)
                    
                    # Obtener info del usuario
                    usuario = await db.users.find_one({'id': boleto_ganador['usuario_id']}, {"_id": 0})
                    
                    ganadores.append({
                        'boleto_id': boleto_ganador['id'],
                        'usuario_id': boleto_ganador['usuario_id'],
                        'nombre_usuario': usuario.get('name', '') if usuario else '',
                        'email_usuario': usuario.get('email', '') if usuario else '',
                        'cedula_usuario': usuario.get('cedula', '') if usuario else '',
                        'celular_usuario': usuario.get('celular', '') if usuario else '',
                        'numero_boleto': boleto_ganador['numero_boleto'],
                        'premio': premio.nombre if hasattr(premio, 'nombre') else str(premio.get('nombre', '')),
                        'premio_imagen': premio.imagen_url if hasattr(premio, 'imagen_url') else premio.get('imagen_url', None),
                        'premio_video': premio.video_url if hasattr(premio, 'video_url') else premio.get('video_url', None),
                        'etapa': etapa.numero,
                        'etapa_numero': etapa.numero,
                        'fecha_sorteo': datetime.now(timezone.utc).isoformat()
                    })
            else:
                # Si la etapa no tiene premios detallados, usar el nombre de la etapa como premio
                if not boletos_disponibles:
                    break
                
                boleto_ganador = random.choice(boletos_disponibles)
                boletos_disponibles.remove(boleto_ganador)
                
                # Obtener info del usuario
                usuario = await db.users.find_one({'id': boleto_ganador['usuario_id']}, {"_id": 0})
                
                ganadores.append({
                    'boleto_id': boleto_ganador['id'],
                    'usuario_id': boleto_ganador['usuario_id'],
                    'nombre_usuario': usuario.get('name', '') if usuario else '',
                    'email_usuario': usuario.get('email', '') if usuario else '',
                    'cedula_usuario': usuario.get('cedula', '') if usuario else '',
                    'celular_usuario': usuario.get('celular', '') if usuario else '',
                    'numero_boleto': boleto_ganador['numero_boleto'],
                    'premio': etapa.premio if hasattr(etapa, 'premio') else etapa.nombre,
                    'premio_imagen': None,
                    'premio_video': None,
                    'etapa': etapa.numero,
                    'etapa_numero': etapa.numero,
                    'fecha_sorteo': datetime.now(timezone.utc).isoformat()
                })
    
    return ganadores

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
    sorteo_dict['fecha_cierre'] = sorteo_dict['fecha_cierre'].isoformat()
    sorteo_dict['created_at'] = sorteo_dict['created_at'].isoformat()
    
    await db.sorteos.insert_one(sorteo_dict)
    return sorteo

@api_router.get("/sorteos", response_model=List[Sorteo])
async def get_sorteos(estado: Optional[str] = None, incluir_draft: bool = False):
    """
    Obtener sorteos. Por defecto, excluye los borradores.
    - estado: filtrar por estado específico
    - incluir_draft: si True, incluye borradores (solo para admin)
    """
    query = {}
    if estado:
        query['estado'] = estado
    elif not incluir_draft:
        # Excluir borradores por defecto (solo mostrar published, waiting, live, completed, pausado)
        query['estado'] = {'$ne': 'draft'}
    
    sorteos = await db.sorteos.find(query, {"_id": 0}).to_list(1000)
    for sorteo in sorteos:
        # Convertir fecha_cierre (única fecha del sorteo)
        if isinstance(sorteo.get('fecha_cierre'), str):
            sorteo['fecha_cierre'] = datetime.fromisoformat(sorteo['fecha_cierre'])
        if isinstance(sorteo.get('created_at'), str):
            sorteo['created_at'] = datetime.fromisoformat(sorteo['created_at'])
        
        # Mantener compatibilidad: si existe fecha_inicio, usarla como fecha_cierre
        if 'fecha_inicio' in sorteo and not sorteo.get('fecha_cierre'):
            if isinstance(sorteo['fecha_inicio'], str):
                sorteo['fecha_cierre'] = datetime.fromisoformat(sorteo['fecha_inicio'])
            else:
                sorteo['fecha_cierre'] = sorteo['fecha_inicio']
        
        # Convert etapas fecha_sorteo
        for etapa in sorteo.get('etapas', []):
            if etapa.get('fecha_sorteo') and isinstance(etapa['fecha_sorteo'], str):
                etapa['fecha_sorteo'] = datetime.fromisoformat(etapa['fecha_sorteo'])
        
        # ENRIQUECER datos de ganadores con información actualizada del usuario
        for ganador in sorteo.get('ganadores', []):
            if ganador.get('usuario_id') and (not ganador.get('celular_usuario') or not ganador.get('cedula_usuario')):
                usuario_doc = await db.users.find_one({'id': ganador['usuario_id']}, {"_id": 0})
                if usuario_doc:
                    if not ganador.get('nombre_usuario'):
                        ganador['nombre_usuario'] = usuario_doc.get('name', '')
                    if not ganador.get('email_usuario'):
                        ganador['email_usuario'] = usuario_doc.get('email', '')
                    if not ganador.get('cedula_usuario'):
                        ganador['cedula_usuario'] = usuario_doc.get('cedula', '')
                    if not ganador.get('celular_usuario'):
                        ganador['celular_usuario'] = usuario_doc.get('celular', '')
    
    return sorteos

@api_router.get("/sorteos/{sorteo_id}/participantes")
async def get_participantes_sorteo(sorteo_id: str):
    """Obtener lista de participantes (usuarios con boletos aprobados) para sorteo LIVE"""
    # Obtener todos los boletos aprobados del sorteo
    boletos = await db.boletos.find({
        'sorteo_id': sorteo_id,
        'pago_confirmado': True
    }, {"_id": 0}).to_list(10000)
    
    # Agrupar por usuario y obtener información
    participantes = []
    usuarios_unicos = {}
    
    for boleto in boletos:
        usuario_id = boleto['usuario_id']
        
        if usuario_id not in usuarios_unicos:
            # Obtener información del usuario
            usuario_doc = await db.users.find_one({'id': usuario_id}, {"_id": 0})
            if usuario_doc:
                usuarios_unicos[usuario_id] = {
                    'usuario_id': usuario_id,
                    'nombre': usuario_doc.get('name', ''),
                    'email': usuario_doc.get('email', ''),
                    'numeros_boletos': []
                }
        
        # Agregar número de boleto
        if usuario_id in usuarios_unicos:
            usuarios_unicos[usuario_id]['numeros_boletos'].append(boleto['numero_boleto'])
    
    # Convertir a lista y crear una entrada por cada boleto
    for usuario_data in usuarios_unicos.values():
        for numero_boleto in usuario_data['numeros_boletos']:
            participantes.append({
                'usuario_id': usuario_data['usuario_id'],
                'nombre': usuario_data['nombre'],
                'email': usuario_data['email'],
                'numero_boleto': numero_boleto
            })
    
    return {
        'sorteo_id': sorteo_id,
        'total_participantes': len(participantes),
        'participantes': participantes
    }

@api_router.get("/sorteos/{sorteo_id}", response_model=Sorteo)
async def get_sorteo(sorteo_id: str):
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id}, {"_id": 0})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    # Convertir fechas (compatibilidad con sorteos antiguos)
    if sorteo_doc.get('fecha_cierre') and isinstance(sorteo_doc['fecha_cierre'], str):
        sorteo_doc['fecha_cierre'] = datetime.fromisoformat(sorteo_doc['fecha_cierre'])
    if sorteo_doc.get('created_at') and isinstance(sorteo_doc['created_at'], str):
        sorteo_doc['created_at'] = datetime.fromisoformat(sorteo_doc['created_at'])
    
    # Compatibilidad: si existe fecha_inicio pero no fecha_cierre, usar fecha_inicio
    if sorteo_doc.get('fecha_inicio') and not sorteo_doc.get('fecha_cierre'):
        if isinstance(sorteo_doc['fecha_inicio'], str):
            sorteo_doc['fecha_cierre'] = datetime.fromisoformat(sorteo_doc['fecha_inicio'])
        else:
            sorteo_doc['fecha_cierre'] = sorteo_doc['fecha_inicio']
    
    for etapa in sorteo_doc.get('etapas', []):
        if etapa.get('fecha_sorteo') and isinstance(etapa['fecha_sorteo'], str):
            etapa['fecha_sorteo'] = datetime.fromisoformat(etapa['fecha_sorteo'])
    
    return Sorteo(**sorteo_doc)

@api_router.put("/admin/sorteo/{sorteo_id}")
async def update_sorteo(sorteo_id: str, data: SorteoCreate, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden editar sorteos")
    
    # Check if sorteo exists
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    # Solo se puede editar si está en DRAFT
    if sorteo_doc['estado'] != 'draft':
        raise HTTPException(
            status_code=400, 
            detail="Solo se pueden editar sorteos en estado DRAFT (borrador). Este sorteo ya está publicado."
        )
    
    # Update sorteo
    update_data = data.model_dump()
    update_data['fecha_cierre'] = update_data['fecha_cierre'].isoformat()
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': update_data}
    )
    
    return {"message": "Sorteo actualizado exitosamente"}

@api_router.delete("/admin/sorteo/{sorteo_id}")
async def eliminar_sorteo(sorteo_id: str, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden eliminar sorteos")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    estado = sorteo_doc['estado']
    
    # Reglas de eliminación según estado
    if estado == 'draft':
        # DRAFT: se puede eliminar libremente
        pass
    elif estado in ['completed', 'completado']:
        # COMPLETED: verificar que han pasado 30 días
        fecha_completado = sorteo_doc.get('fecha_completado')
        if fecha_completado:
            if isinstance(fecha_completado, str):
                fecha_completado = datetime.fromisoformat(fecha_completado)
            dias_transcurridos = (datetime.now(timezone.utc) - fecha_completado).days
            if dias_transcurridos < 30:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Los sorteos completados solo se pueden eliminar después de 30 días. Faltan {30 - dias_transcurridos} días."
                )
        else:
            # Si no tiene fecha_completado, permitir eliminar (sorteos legacy sin fecha)
            pass
    else:
        # PUBLISHED, WAITING, LIVE, PAUSADO, ACTIVO: no se pueden eliminar
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar un sorteo en estado {estado}. Solo se pueden eliminar sorteos en DRAFT o COMPLETED (después de 30 días)."
        )
    
    # Delete sorteo
    await db.sorteos.delete_one({'id': sorteo_id})
    
    # Also delete related boletos and comisiones if no tickets (safety check)
    await db.boletos.delete_many({'sorteo_id': sorteo_id})
    await db.comisiones.delete_many({'sorteo_id': sorteo_id})
    await db.ganadores.delete_many({'sorteo_id': sorteo_id})
    
    return {"message": "Sorteo eliminado exitosamente"}

@api_router.put("/admin/sorteo/{sorteo_id}/publicar")
async def publicar_sorteo(sorteo_id: str, request: Request):
    """Cambiar estado de DRAFT a PUBLISHED"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden publicar sorteos")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] != 'draft':
        raise HTTPException(status_code=400, detail="Solo se pueden publicar sorteos en borrador")
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'estado': 'published'}}
    )
    
    return {"message": "Sorteo publicado exitosamente"}

@api_router.put("/admin/sorteo/{sorteo_id}/pausar-ventas")
async def pausar_despausar_ventas(sorteo_id: str, pausar: bool, request: Request):
    """Pausar o despausar ventas de un sorteo publicado"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden pausar ventas")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] != 'published':
        raise HTTPException(status_code=400, detail="Solo se pueden pausar ventas de sorteos publicados")
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'ventas_pausadas': pausar}}
    )
    
    # Emitir evento WebSocket
    await emit_ventas_pausadas(sorteo_id, pausar)
    await broadcast_sorteos_update()
    
    return {"message": f"Ventas {'pausadas' if pausar else 'reanudadas'} exitosamente", "pausadas": pausar}

@api_router.put("/admin/sorteo/{sorteo_id}/ajustar-minimo")
async def ajustar_minimo_boletos(sorteo_id: str, minimo: int, request: Request):
    """Ajustar el mínimo de boletos de un sorteo publicado (para emergencias)"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden ajustar el mínimo")
    
    if minimo < 1:
        raise HTTPException(status_code=400, detail="El mínimo debe ser al menos 1")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] not in ['published', 'activo', 'waiting']:
        raise HTTPException(status_code=400, detail="Solo se puede ajustar el mínimo de sorteos publicados o en espera")
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {
            'minimo_boletos': minimo,
            'cantidad_minima_boletos': minimo  # Actualizar ambos campos para compatibilidad
        }}
    )
    
    logger.info(f"Admin {admin.email} ajustó mínimo de boletos del sorteo {sorteo_id} a {minimo}")
    
    await broadcast_sorteos_update()
    
    return {"message": f"Mínimo de boletos ajustado a {minimo} exitosamente", "minimo": minimo}

class ActualizarImagenPromoRequest(BaseModel):
    index: int
    url: str

class ActualizarPremioImagenRequest(BaseModel):
    premio_index: int
    imagen_url: str

class ActualizarPremioVideoRequest(BaseModel):
    premio_index: int
    video_url: str

@api_router.put("/admin/sorteo/{sorteo_id}/actualizar-imagen-promo")
async def actualizar_imagen_promo(sorteo_id: str, data: ActualizarImagenPromoRequest, request: Request):
    """Actualizar UNA imagen promocional específica de un sorteo PUBLISHED"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar imágenes")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] not in ['published', 'activo', 'waiting']:
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar imágenes de sorteos publicados o en espera")
    
    imagenes = sorteo_doc.get('imagenes', [])
    if data.index >= len(imagenes):
        raise HTTPException(status_code=400, detail="Índice de imagen inválido")
    
    imagenes[data.index] = data.url
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'imagenes': imagenes}}
    )
    
    logger.info(f"Admin {admin.email} actualizó imagen promocional {data.index} del sorteo {sorteo_id}")
    await broadcast_sorteos_update()
    
    return {"message": "Imagen actualizada exitosamente"}

class ActualizarImagenesPromoRequest(BaseModel):
    imagenes: List[str]

@api_router.put("/admin/sorteo/{sorteo_id}/actualizar-imagenes")
async def actualizar_imagenes_promo(sorteo_id: str, data: ActualizarImagenesPromoRequest, request: Request):
    """Actualizar TODAS las imágenes promocionales de un sorteo PUBLISHED (agregar/eliminar)"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar imágenes")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] not in ['published', 'activo', 'waiting']:
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar imágenes de sorteos publicados o en espera")
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'imagenes': data.imagenes}}
    )
    
    logger.info(f"Admin {admin.email} actualizó imágenes promocionales del sorteo {sorteo_id}: {len(data.imagenes)} imágenes")
    await broadcast_sorteos_update()
    
    return {"message": "Imágenes actualizadas exitosamente"}

@api_router.put("/admin/sorteo/{sorteo_id}/actualizar-premio-imagen")
async def actualizar_premio_imagen(sorteo_id: str, data: ActualizarPremioImagenRequest, request: Request):
    """Actualizar imagen de UN premio específico de un sorteo PUBLISHED"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar imágenes")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] not in ['published', 'activo', 'waiting']:
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar imágenes de sorteos publicados o en espera")
    
    premios = sorteo_doc.get('premios', [])
    if data.premio_index >= len(premios):
        raise HTTPException(status_code=400, detail="Índice de premio inválido")
    
    premios[data.premio_index]['imagen_url'] = data.imagen_url
    if 'imagen' in premios[data.premio_index]:
        premios[data.premio_index]['imagen'] = data.imagen_url
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'premios': premios}}
    )
    
    logger.info(f"Admin {admin.email} actualizó imagen de premio {data.premio_index} del sorteo {sorteo_id}")
    await broadcast_sorteos_update()
    
    return {"message": "Imagen de premio actualizada exitosamente"}

@api_router.put("/admin/sorteo/{sorteo_id}/actualizar-premio-video")
async def actualizar_premio_video(sorteo_id: str, data: ActualizarPremioVideoRequest, request: Request):
    """Actualizar video de UN premio específico de un sorteo PUBLISHED"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar videos")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] not in ['published', 'activo', 'waiting']:
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar videos de sorteos publicados o en espera")
    
    premios = sorteo_doc.get('premios', [])
    if data.premio_index >= len(premios):
        raise HTTPException(status_code=400, detail="Índice de premio inválido")
    
    premios[data.premio_index]['video_url'] = data.video_url
    if 'video' in premios[data.premio_index]:
        premios[data.premio_index]['video'] = data.video_url
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'premios': premios}}
    )
    
    logger.info(f"Admin {admin.email} actualizó video de premio {data.premio_index} del sorteo {sorteo_id}")
    await broadcast_sorteos_update()
    
    return {"message": "Video de premio actualizado exitosamente"}

class ActualizarEtapaPremioImagenRequest(BaseModel):
    etapa_index: int
    premio_index: int
    imagen_url: str

class ActualizarEtapaPremioVideoRequest(BaseModel):
    etapa_index: int
    premio_index: int
    video_url: str

@api_router.put("/admin/sorteo/{sorteo_id}/actualizar-etapa-premio-imagen")
async def actualizar_etapa_premio_imagen(sorteo_id: str, data: ActualizarEtapaPremioImagenRequest, request: Request):
    """Actualizar imagen de UN premio específico dentro de una etapa de un sorteo PUBLISHED"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar imágenes")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] not in ['published', 'activo', 'waiting']:
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar imágenes de sorteos publicados o en espera")
    
    etapas = sorteo_doc.get('etapas', [])
    if data.etapa_index >= len(etapas):
        raise HTTPException(status_code=400, detail="Índice de etapa inválido")
    
    premios = etapas[data.etapa_index].get('premios', [])
    if data.premio_index >= len(premios):
        raise HTTPException(status_code=400, detail="Índice de premio inválido")
    
    etapas[data.etapa_index]['premios'][data.premio_index]['imagen_url'] = data.imagen_url
    if 'imagen' in etapas[data.etapa_index]['premios'][data.premio_index]:
        etapas[data.etapa_index]['premios'][data.premio_index]['imagen'] = data.imagen_url
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'etapas': etapas}}
    )
    
    logger.info(f"Admin {admin.email} actualizó imagen de premio {data.premio_index} en etapa {data.etapa_index} del sorteo {sorteo_id}")
    await broadcast_sorteos_update()
    
    return {"message": "Imagen de premio de etapa actualizada exitosamente"}

@api_router.put("/admin/sorteo/{sorteo_id}/actualizar-etapa-premio-video")
async def actualizar_etapa_premio_video(sorteo_id: str, data: ActualizarEtapaPremioVideoRequest, request: Request):
    """Actualizar video de UN premio específico dentro de una etapa de un sorteo PUBLISHED"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden actualizar videos")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] not in ['published', 'activo', 'waiting']:
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar videos de sorteos publicados o en espera")
    
    etapas = sorteo_doc.get('etapas', [])
    if data.etapa_index >= len(etapas):
        raise HTTPException(status_code=400, detail="Índice de etapa inválido")
    
    premios = etapas[data.etapa_index].get('premios', [])
    if data.premio_index >= len(premios):
        raise HTTPException(status_code=400, detail="Índice de premio inválido")
    
    etapas[data.etapa_index]['premios'][data.premio_index]['video_url'] = data.video_url
    if 'video' in etapas[data.etapa_index]['premios'][data.premio_index]:
        etapas[data.etapa_index]['premios'][data.premio_index]['video'] = data.video_url
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'etapas': etapas}}
    )
    
    logger.info(f"Admin {admin.email} actualizó video de premio {data.premio_index} en etapa {data.etapa_index} del sorteo {sorteo_id}")
    await broadcast_sorteos_update()
    
    return {"message": "Video de premio de etapa actualizado exitosamente"}

@api_router.post("/admin/actualizar-estados-sorteos")
async def actualizar_estados_automatico():
    """Verificar y actualizar estados de todos los sorteos activos (para llamar periódicamente)"""
    try:
        # Obtener sorteos en PUBLISHED, WAITING y LIVE
        sorteos_activos = await db.sorteos.find({
            'estado': {'$in': ['published', 'waiting', 'live']}
        }).to_list(1000)
        
        actualizaciones = 0
        for sorteo_doc in sorteos_activos:
            # Usar la nueva máquina de estados
            resultado = await state_machine.verificar_transicion_estado_nuevo(sorteo_doc['id'])
            if resultado:
                actualizaciones += 1
                
                # Si cambió a LIVE, iniciar animación
                if resultado == 'live':
                    asyncio.create_task(live_animation_service.iniciar_animacion_live(sorteo_doc['id']))
                    logger.info(f"Iniciando animación LIVE para sorteo {sorteo_doc['id']}")
        
        # Emitir actualización global
        if actualizaciones > 0:
            await broadcast_sorteos_update()
        
        return {"message": f"Se actualizaron {actualizaciones} sorteos"}
    except Exception as e:
        logging.error(f"Error al actualizar estados: {str(e)}")
        return {"error": str(e)}

@api_router.post("/admin/liberar-boletos-expirados")
async def ejecutar_liberacion_boletos(request: Request):
    """Liberar boletos pendientes con más de 24 horas (job manual)"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins")
    
    count = await liberar_boletos_expirados()
    return {"message": f"Se liberaron {count} boletos expirados"}

@api_router.post("/admin/limpiar-sorteos-antiguos")
async def ejecutar_limpieza_sorteos():
    """Limpiar sorteos completados con más de 30 días (automático)"""
    resultado = await limpiar_sorteos_completados_antiguos()
    return {
        "message": "Limpieza completada",
        "sorteos_eliminados": resultado['sorteos'],
        "boletos_eliminados": resultado['boletos'],
        "ganadores_eliminados": resultado['ganadores']
    }

@api_router.post("/admin/sorteo/{sorteo_id}/guardar-ganadores")
async def guardar_ganadores_sorteo(sorteo_id: str, ganadores: List[dict], request: Request):
    """Guardar ganadores del sorteo y marcar como completado"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden guardar ganadores")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    # Guardar cada ganador
    for ganador_data in ganadores:
        ganador = Ganador(
            sorteo_id=sorteo_id,
            sorteo_titulo=sorteo_doc['titulo'],
            usuario_id=ganador_data['usuario_id'],
            usuario_nombre=ganador_data.get('nombre', ''),
            usuario_email=ganador_data.get('email', ''),
            numero_boleto=ganador_data['numero_boleto'],
            premio=ganador_data.get('premio', 'Premio Principal'),
            fecha_sorteo=datetime.now(timezone.utc)
        )
        
        ganador_dict = ganador.model_dump()
        ganador_dict['fecha_sorteo'] = ganador_dict['fecha_sorteo'].isoformat()
        await db.ganadores.insert_one(ganador_dict)
    
    # Marcar sorteo como completado
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'estado': 'completed'}}
    )
    
    return {"message": f"{len(ganadores)} ganador(es) guardado(s) exitosamente", "sorteo_completado": True}

@api_router.put("/admin/sorteo/{sorteo_id}/completar")
async def completar_sorteo(sorteo_id: str):
    """Marcar sorteo como COMPLETED después de la animación LIVE - Puede ser llamado públicamente"""
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] != 'live':
        raise HTTPException(status_code=400, detail="Solo se pueden completar sorteos en estado LIVE")
    
    # Actualizar estado a COMPLETED
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {
            'estado': 'completed',
            'fecha_completed': datetime.now(timezone.utc)
        }}
    )
    
    # Guardar ganadores en colección separada si hay
    ganadores = sorteo_doc.get('ganadores', [])
    if ganadores:
        for ganador_data in ganadores:
            ganador = Ganador(
                sorteo_id=sorteo_id,
                boleto_id=ganador_data['boleto_id'],
                usuario_id=ganador_data['usuario_id'],
                premio=ganador_data.get('premio', 'Premio Principal'),
                etapa_numero=ganador_data.get('etapa_numero'),
                fecha_sorteo=datetime.now(timezone.utc)
            )
            
            ganador_dict = ganador.model_dump()
            ganador_dict['fecha_sorteo'] = ganador_dict['fecha_sorteo'].isoformat()
            
            # Agregar campos adicionales que no están en el modelo Ganador
            ganador_dict['premio_nombre'] = ganador_data.get('premio', 'Premio Principal')
            ganador_dict['premio_imagen'] = ganador_data.get('premio_imagen')
            ganador_dict['premio_video'] = ganador_data.get('premio_video')
            ganador_dict['usuario_nombre'] = ganador_data.get('nombre', '')
            ganador_dict['usuario_email'] = ganador_data.get('email', '')
            ganador_dict['numero_boleto'] = ganador_data.get('numero_boleto', 0)
            ganador_dict['sorteo_titulo'] = sorteo_doc.get('titulo', '')
            
            await db.ganadores.insert_one(ganador_dict)
    
    return {"message": "Sorteo completado exitosamente", "ganadores_guardados": len(ganadores)}

@api_router.put("/admin/sorteo/{sorteo_id}/iniciar-live")
async def iniciar_sorteo_live(sorteo_id: str, request: Request):
    """Iniciar sorteo en LIVE (solo desde WAITING)"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden iniciar sorteos")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    if sorteo_doc['estado'] != 'waiting':
        raise HTTPException(status_code=400, detail="Solo se pueden iniciar sorteos en estado WAITING")
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {
            'estado': 'live',
            'fecha_live': datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Sorteo iniciado en modo LIVE"}

@api_router.put("/admin/sorteo/{sorteo_id}/estado")
async def cambiar_estado_sorteo(sorteo_id: str, nuevo_estado: str, request: Request):
    """Cambiar estado del sorteo manualmente (admin)"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden cambiar estados")
    
    sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    # Validar transiciones de estado
    estado_actual = sorteo_doc['estado']
    estados_validos = ['draft', 'published', 'waiting', 'live', 'completed', 'pausado']
    
    if nuevo_estado not in estados_validos:
        raise HTTPException(status_code=400, detail="Estado no válido")
    
    # Reglas de transición
    if estado_actual == 'draft' and nuevo_estado not in ['published']:
        raise HTTPException(status_code=400, detail="Desde draft solo se puede publicar")
    
    if estado_actual == 'completed':
        raise HTTPException(status_code=400, detail="No se puede cambiar estado de un sorteo completado")
    
    await db.sorteos.update_one(
        {'id': sorteo_id},
        {'$set': {'estado': nuevo_estado}}
    )
    
    return {"message": f"Estado cambiado a {nuevo_estado} exitosamente"}

@api_router.get("/sorteos/slug/{slug}", response_model=Sorteo)
async def get_sorteo_by_slug(slug: str):
    sorteo_doc = await db.sorteos.find_one({'landing_slug': slug}, {"_id": 0})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    # Convertir fecha_cierre (única fecha del sorteo)
    if sorteo_doc.get('fecha_cierre') and isinstance(sorteo_doc['fecha_cierre'], str):
        sorteo_doc['fecha_cierre'] = datetime.fromisoformat(sorteo_doc['fecha_cierre'])
    
    if sorteo_doc.get('created_at') and isinstance(sorteo_doc['created_at'], str):
        sorteo_doc['created_at'] = datetime.fromisoformat(sorteo_doc['created_at'])
    
    # Compatibilidad con sorteos antiguos que tienen fecha_inicio
    if sorteo_doc.get('fecha_inicio'):
        if isinstance(sorteo_doc['fecha_inicio'], str):
            fecha_inicio = datetime.fromisoformat(sorteo_doc['fecha_inicio'])
        else:
            fecha_inicio = sorteo_doc['fecha_inicio']
        
        # Si no tiene fecha_cierre, usar fecha_inicio
        if not sorteo_doc.get('fecha_cierre'):
            sorteo_doc['fecha_cierre'] = fecha_inicio
    
    # Convertir fechas de etapas
    for etapa in sorteo_doc.get('etapas', []):
        if etapa.get('fecha_sorteo') and isinstance(etapa['fecha_sorteo'], str):
            etapa['fecha_sorteo'] = datetime.fromisoformat(etapa['fecha_sorteo'])
    
    return Sorteo(**sorteo_doc)

@api_router.post("/sorteos/{sorteo_id}/validar-numero")
async def validar_numero_boleto(sorteo_id: str, request: ValidarNumeroRequest):
    """Validar si un número de boleto está disponible (pendiente o comprado)"""
    numero = request.numero
    
    # Buscar boletos con este número
    boleto = await db.boletos.find_one({
        'sorteo_id': sorteo_id,
        'numero_boleto': numero
    })
    
    if not boleto:
        return {"disponible": True, "mensaje": "Número disponible"}
    
    # Si el boleto está aprobado/comprado, no está disponible
    if boleto.get('pago_confirmado', False):
        return {"disponible": False, "mensaje": f"Error: el número {numero} ya está reservado o vendido"}
    
    # Si está pendiente, verificar las 24 horas
    fecha_compra = boleto.get('fecha_compra')
    if fecha_compra:
        if isinstance(fecha_compra, str):
            fecha_compra = datetime.fromisoformat(fecha_compra.replace('Z', '+00:00'))
        
        horas_pasadas = (datetime.now(timezone.utc) - fecha_compra).total_seconds() / 3600
        
        if horas_pasadas < 24:
            return {"disponible": False, "mensaje": f"Error: el número {numero} ya está reservado o vendido"}
    
    # Si pasaron más de 24 horas y está pendiente, está disponible
    return {"disponible": True, "mensaje": "Número disponible"}

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
    
    # Check if user is blocked
    if user.bloqueado:
        raise HTTPException(status_code=403, detail="Tu cuenta ha sido bloqueada. Contacta al administrador")
    
    # Check if user has complete data
    if not user.datos_completos or not user.cedula or not user.celular:
        raise HTTPException(status_code=400, detail="Debes completar tus datos (cédula y celular) antes de comprar")
    
    # Get sorteo
    sorteo_doc = await db.sorteos.find_one({'id': data.sorteo_id})
    if not sorteo_doc:
        raise HTTPException(status_code=404, detail="Sorteo no encontrado")
    
    sorteo = Sorteo(**sorteo_doc)
    
    # ============ VALIDACIÓN DE DISPONIBILIDAD ============
    # 1. Validar estado del sorteo
    # PUBLISHED o ACTIVO: siempre se puede comprar
    # WAITING: se puede comprar SI aún faltan boletos por vender
    if sorteo.estado not in [SorteoEstado.PUBLISHED, SorteoEstado.ACTIVO, SorteoEstado.WAITING]:
        raise HTTPException(status_code=400, detail="Sorteo no disponible para compra")
    
    # 2. Validar que haya boletos disponibles (contando solo aprobados)
    boletos_aprobados = await db.boletos.count_documents({
        'sorteo_id': sorteo.id,
        'pago_confirmado': True
    })
    
    boletos_disponibles = sorteo.cantidad_total_boletos - boletos_aprobados
    if boletos_disponibles <= 0:
        raise HTTPException(status_code=400, detail="No hay boletos disponibles")
    
    if len(data.numeros_boletos) > boletos_disponibles:
        raise HTTPException(
            status_code=400, 
            detail=f"Solo hay {boletos_disponibles} boleto(s) disponible(s)"
        )
    
    # Validate minimum quantity
    if len(data.numeros_boletos) < sorteo.compra_minima:
        raise HTTPException(
            status_code=400, 
            detail=f"La compra mínima es de {sorteo.compra_minima} boleto(s). Seleccionaste {len(data.numeros_boletos)}"
        )
    
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
    
    # Get vendedor from ID or link
    vendedor_id = None
    
    # Prioridad 1: vendedor_id directo desde el frontend
    if data.vendedor_id:
        vendedor_doc = await db.users.find_one({'id': data.vendedor_id, 'role': 'vendedor'})
        if vendedor_doc:
            vendedor_id = vendedor_doc['id']
            logger.info(f"Vendedor detectado desde ID: {vendedor_id}")
        else:
            logger.warning(f"Vendedor ID {data.vendedor_id} no encontrado o no es vendedor")
    
    # Fallback: vendedor_link (legacy)
    elif data.vendedor_link:
        vendedor_doc = await db.users.find_one({'link_unico': data.vendedor_link})
        if vendedor_doc:
            vendedor_id = vendedor_doc['id']
            logger.info(f"Vendedor detectado desde link: {vendedor_id}")
    
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
    
    # Actualizar progreso del sorteo basado en boletos aprobados
    # Si el pago es por Payphone, está aprobado automáticamente
    if pago_confirmado:
        await actualizar_progreso_sorteo(sorteo.id)
        resultado = await state_machine.verificar_transicion_estado_nuevo(sorteo.id)
        if resultado == 'live':
            asyncio.create_task(live_animation_service.iniciar_animacion_live(sorteo.id))
    
    cantidad_boletos = len(data.numeros_boletos)
    total = sorteo.precio_boleto * cantidad_boletos
    
    return {
        "message": f"{cantidad_boletos} boleto(s) comprado(s) exitosamente" + (" - Pendiente de aprobación" if not pago_confirmado else ""),
        "boletos": [b.model_dump() for b in boletos_creados],
        "total": total,
        "metodo_pago": data.metodo_pago,
        "pendiente_aprobacion": not pago_confirmado
    }

@api_router.get("/boletos/mis-boletos")
async def get_mis_boletos(request: Request):
    user = await get_current_user(request)
    
    boletos = await db.boletos.find({'usuario_id': user.id}, {"_id": 0}).to_list(1000)
    for boleto in boletos:
        if isinstance(boleto['fecha_compra'], str):
            boleto['fecha_compra'] = datetime.fromisoformat(boleto['fecha_compra'])
        
        # Get sorteo info
        sorteo_doc = await db.sorteos.find_one({'id': boleto['sorteo_id']}, {"_id": 0})
        if sorteo_doc:
            boleto['sorteo'] = {
                'titulo': sorteo_doc.get('titulo', ''),
                'id': sorteo_doc.get('id', ''),
                'landing_slug': sorteo_doc.get('landing_slug', '')
            }
    
    return boletos

# ============ GANADORES ENDPOINTS ============
@api_router.get("/ganadores/sorteo/{sorteo_id}", response_model=List[Ganador])
async def get_ganadores_sorteo(sorteo_id: str):
    ganadores = await db.ganadores.find({'sorteo_id': sorteo_id}, {"_id": 0}).to_list(1000)
    for ganador in ganadores:
        if isinstance(ganador['fecha_sorteo'], str):
            ganador['fecha_sorteo'] = datetime.fromisoformat(ganador['fecha_sorteo'])
    return ganadores

@api_router.get("/ganadores/recientes")
async def get_ganadores_recientes():
    """Obtiene ganadores de los últimos 30 días hábiles (calculado como 30 días calendario)"""
    fecha_limite = datetime.now(timezone.utc) - timedelta(days=30)
    fecha_limite_iso = fecha_limite.isoformat()
    
    ganadores = await db.ganadores.find({
        'fecha_sorteo': {'$gte': fecha_limite_iso}
    }, {"_id": 0}).to_list(1000)
    
    # Enriquecer con info del sorteo, usuario y boleto
    for ganador in ganadores:
        if isinstance(ganador['fecha_sorteo'], str):
            ganador['fecha_sorteo'] = datetime.fromisoformat(ganador['fecha_sorteo'])
        
        # Get sorteo info
        sorteo_doc = await db.sorteos.find_one({'id': ganador['sorteo_id']}, {"_id": 0})
        if sorteo_doc:
            ganador['sorteo_titulo'] = sorteo_doc.get('titulo', '')
            ganador['sorteo'] = {
                'titulo': sorteo_doc.get('titulo', ''),
                'imagenes': sorteo_doc.get('imagenes', []),
                'landing_slug': sorteo_doc.get('landing_slug', ''),
                'tipo': sorteo_doc.get('tipo', 'unico')
            }
            
            # Si es sorteo por etapas y tiene etapa_numero, obtener info de la etapa
            if ganador.get('etapa_numero') is not None and sorteo_doc.get('tipo') == 'etapas':
                etapas = sorteo_doc.get('etapas', [])
                etapa_info = next((e for e in etapas if e.get('numero') == ganador['etapa_numero']), None)
                if etapa_info:
                    ganador['etapa'] = {
                        'numero': etapa_info.get('numero'),
                        'premio': etapa_info.get('premio', ''),
                        'imagen': etapa_info.get('imagen'),
                        'video': etapa_info.get('video')
                    }
        
        # Si ya tiene la info guardada directamente, usarla
        if not ganador.get('usuario_nombre') and not ganador.get('nombre_usuario'):
            # Get user info
            user_doc = await db.users.find_one({'id': ganador['usuario_id']}, {"_id": 0})
            if user_doc:
                ganador['nombre_usuario'] = user_doc.get('name', 'Anónimo')
                ganador['email_usuario'] = user_doc.get('email', '')
                ganador['cedula_usuario'] = user_doc.get('cedula', '')
                ganador['celular_usuario'] = user_doc.get('celular', '')
                # También mantener compatibilidad con campos antiguos
                ganador['usuario_nombre'] = user_doc.get('name', 'Anónimo')
                ganador['usuario_email'] = user_doc.get('email', '')
        
        # Si no tiene numero_boleto, buscarlo
        if not ganador.get('numero_boleto'):
            boleto_doc = await db.boletos.find_one({'id': ganador['boleto_id']}, {"_id": 0})
            if boleto_doc:
                ganador['numero_boleto'] = boleto_doc.get('numero_boleto', 0)
        
        # Asegurar que premio_nombre existe
        if not ganador.get('premio_nombre'):
            ganador['premio_nombre'] = ganador.get('premio', 'Premio Principal')
    
    # Ordenar por fecha descendente (más recientes primero)
    ganadores.sort(key=lambda x: x['fecha_sorteo'], reverse=True)
    
    return ganadores

# Removed duplicate endpoint

@api_router.get("/usuario/mis-premios")
async def get_mis_premios_ganados(request: Request):
    """Obtiene todos los premios ganados por el usuario autenticado"""
    user = await get_current_user(request)
    
    # Buscar todos los ganadores donde el usuario_id coincide
    ganadores = await db.ganadores.find({
        'usuario_id': user.id
    }, {"_id": 0}).to_list(1000)
    
    # Enriquecer con información del sorteo y premio
    premios_ganados = []
    for ganador in ganadores:
        # Obtener información del sorteo
        sorteo_doc = await db.sorteos.find_one({'id': ganador['sorteo_id']}, {"_id": 0})
        if not sorteo_doc:
            continue
        
        premio_info = {
            'id': ganador.get('id'),
            'fecha_sorteo': ganador.get('fecha_sorteo'),
            'numero_boleto': ganador.get('numero_boleto'),
            'sorteo': {
                'id': sorteo_doc['id'],
                'titulo': sorteo_doc.get('titulo', ''),
                'imagenes': sorteo_doc.get('imagenes', []),
                'landing_slug': sorteo_doc.get('landing_slug', '')
            }
        }
        
        # Determinar información del premio según el tipo de sorteo
        if sorteo_doc.get('tipo') == 'etapas' and ganador.get('etapa_numero') is not None:
            # Sorteo por etapas - obtener info de la etapa
            etapas = sorteo_doc.get('etapas', [])
            etapa_num = ganador.get('etapa_numero')
            etapa_info = next((e for e in etapas if e.get('numero') == etapa_num), None)
            
            if etapa_info:
                premio_info['premio'] = {
                    'nombre': etapa_info.get('premio', ''),
                    'imagen': etapa_info.get('imagen'),
                    'etapa_numero': etapa_num
                }
            else:
                premio_info['premio'] = {
                    'nombre': ganador.get('premio', 'Premio'),
                    'etapa_numero': etapa_num
                }
        else:
            # Sorteo único
            premio_info['premio'] = {
                'nombre': ganador.get('premio', 'Premio Principal'),
                'imagen': sorteo_doc.get('imagenes', [None])[0] if sorteo_doc.get('imagenes') else None
            }
        
        premios_ganados.append(premio_info)
    
    # Ordenar por fecha descendente
    premios_ganados.sort(key=lambda x: x.get('fecha_sorteo', ''), reverse=True)
    
    return premios_ganados

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
        # Manejar created_at que puede no existir o ser string
        if 'created_at' in usuario:
            if isinstance(usuario['created_at'], str):
                usuario['created_at'] = datetime.fromisoformat(usuario['created_at'])
        else:
            usuario['created_at'] = datetime.now(timezone.utc)
    
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

@api_router.put("/admin/usuario/{user_id}/bloquear")
async def bloquear_usuario(user_id: str, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden bloquear usuarios")
    
    result = await db.users.update_one(
        {'id': user_id},
        {'$set': {'bloqueado': True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario bloqueado exitosamente"}

@api_router.put("/admin/usuario/{user_id}/desbloquear")
async def desbloquear_usuario(user_id: str, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden desbloquear usuarios")
    
    result = await db.users.update_one(
        {'id': user_id},
        {'$set': {'bloqueado': False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario desbloqueado exitosamente"}

@api_router.delete("/admin/usuario/{user_id}")
async def eliminar_usuario(user_id: str, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden eliminar usuarios")
    
    # Check if user has active tickets
    boletos_count = await db.boletos.count_documents({'usuario_id': user_id})
    if boletos_count > 0:
        raise HTTPException(status_code=400, detail="No se puede eliminar un usuario con boletos comprados")
    
    result = await db.users.delete_one({'id': user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Also delete sessions
    await db.user_sessions.delete_many({'user_id': user_id})
    
    return {"message": "Usuario eliminado exitosamente"}

@api_router.get("/admin/buscar-usuario")
async def buscar_usuario(request: Request, email: str):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden buscar usuarios")
    
    user_doc = await db.users.find_one({'email': {'$regex': email, '$options': 'i'}}, {"_id": 0, "password_hash": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    # Get boletos count
    boletos_count = await db.boletos.count_documents({'usuario_id': user_doc['id']})
    user_doc['boletos_count'] = boletos_count
    
    return user_doc

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
        boleto['sorteo'] = {'titulo': sorteo_doc.get('titulo', ''), 'id': sorteo_doc.get('id', ''), 'landing_slug': sorteo_doc.get('landing_slug', '')}
    
    return boletos

@api_router.get("/admin/boletos-aprobados")
async def get_boletos_aprobados(request: Request, sorteo_id: Optional[str] = None, numero_boleto: Optional[int] = None):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden ver boletos aprobados")
    
    query = {'pago_confirmado': True}
    if sorteo_id:
        query['sorteo_id'] = sorteo_id
    if numero_boleto:
        query['numero_boleto'] = numero_boleto
    
    boletos = await db.boletos.find(query, {"_id": 0}).to_list(1000)
    
    # Get user and sorteo info for each boleto
    for boleto in boletos:
        if isinstance(boleto['fecha_compra'], str):
            boleto['fecha_compra'] = datetime.fromisoformat(boleto['fecha_compra'])
        
        user_doc = await db.users.find_one({'id': boleto['usuario_id']}, {"_id": 0, "password_hash": 0})
        boleto['usuario'] = user_doc
        
        sorteo_doc = await db.sorteos.find_one({'id': boleto['sorteo_id']}, {"_id": 0})
        if sorteo_doc:
            boleto['sorteo'] = {
                'titulo': sorteo_doc.get('titulo', ''),
                'id': sorteo_doc.get('id', ''),
                'landing_slug': sorteo_doc.get('landing_slug', '')
            }
    
    return boletos

@api_router.put("/admin/boleto/{boleto_id}/aprobar")
async def aprobar_boleto(boleto_id: str, numero_comprobante: str, request: Request):
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden aprobar boletos")
    
    if not numero_comprobante or numero_comprobante.strip() == "":
        raise HTTPException(status_code=400, detail="El número de comprobante es obligatorio")
    
    # Get boleto info first
    boleto_doc = await db.boletos.find_one({'id': boleto_id})
    if not boleto_doc:
        raise HTTPException(status_code=404, detail="Boleto no encontrado")
    
    # VALIDACIÓN 1: Verificar si el boleto actual ya está aprobado
    if boleto_doc.get('pago_confirmado'):
        raise HTTPException(
            status_code=400, 
            detail="Este boleto ya ha sido aprobado anteriormente."
        )
    
    # VALIDACIÓN 2: Verificar que el número de boleto sigue disponible
    numero_boleto = boleto_doc.get('numero_boleto')
    sorteo_id = boleto_doc.get('sorteo_id')
    
    # Verificar si existe otro boleto CON PAGO CONFIRMADO para el mismo número
    boleto_existente = await db.boletos.find_one({
        'sorteo_id': sorteo_id,
        'numero_boleto': numero_boleto,
        'pago_confirmado': True,
        'id': {'$ne': boleto_id}  # Excluir el boleto actual
    })
    
    if boleto_existente:
        raise HTTPException(
            status_code=400, 
            detail=f"El boleto #{numero_boleto} ya no está disponible. Fue adquirido por otro usuario."
        )
    
    result = await db.boletos.update_one(
        {'id': boleto_id},
        {'$set': {
            'pago_confirmado': True,
            'numero_comprobante': numero_comprobante.strip()
        }}
    )
    
    # ACREDITAR COMISIÓN AL VENDEDOR si existe
    if boleto_doc.get('vendedor_id'):
        # Buscar comisión pendiente
        comision = await db.comisiones.find_one({
            'boleto_id': boleto_id,
            'estado': ComisionEstado.PENDIENTE
        })
        
        if comision:
            # Marcar comisión como pagada
            await db.comisiones.update_one(
                {'id': comision['id']},
                {'$set': {'estado': ComisionEstado.PAGADO}}
            )
            
            # Acreditar a la wallet del vendedor
            await db.users.update_one(
                {'id': boleto_doc['vendedor_id']},
                {'$inc': {'wallet_balance': comision['monto']}}
            )
            
            # Registrar movimiento de ingreso
            from movimientos_vendedor import registrar_movimiento_ingreso
            sorteo_doc = await db.sorteos.find_one({'id': boleto_doc['sorteo_id']}, {"_id": 0})
            comprador_doc = await db.users.find_one({'id': boleto_doc['usuario_id']}, {"_id": 0})
            
            await registrar_movimiento_ingreso(
                db=db,
                vendedor_id=boleto_doc['vendedor_id'],
                monto=comision['monto'],
                sorteo_id=boleto_doc['sorteo_id'],
                sorteo_titulo=sorteo_doc.get('titulo', 'Sorteo') if sorteo_doc else 'Sorteo',
                boleto_id=boleto_id,
                numero_boleto=boleto_doc.get('numero_boleto', 0),
                comprador_id=boleto_doc['usuario_id'],
                comprador_nombre=comprador_doc.get('name', 'Usuario') if comprador_doc else 'Usuario'
            )
            
            logger.info(f"Comisión de ${comision['monto']} acreditada a vendedor {boleto_doc['vendedor_id']}")
    
    # Actualizar progreso del sorteo y verificar transiciones
    sorteo_id = boleto_doc['sorteo_id']
    await actualizar_progreso_sorteo(sorteo_id)
    resultado = await state_machine.verificar_transicion_estado_nuevo(sorteo_id)
    if resultado == 'live':
        asyncio.create_task(live_animation_service.iniciar_animacion_live(sorteo_id))
    
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

@api_router.post("/admin/limpiar-boletos-expirados")
async def limpiar_boletos_expirados(request: Request):
    """Elimina boletos pendientes con más de 24 horas"""
    admin = await get_current_user(request)
    if admin.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Solo admins pueden ejecutar limpieza")
    
    hace_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Find expired tickets
    boletos_expirados = await db.boletos.find({
        'pago_confirmado': False,
        'fecha_compra': {'$lt': hace_24h}
    }).to_list(10000)
    
    cantidad_eliminados = 0
    sorteos_actualizados = set()
    
    for boleto in boletos_expirados:
        await db.boletos.delete_one({'id': boleto['id']})
        cantidad_eliminados += 1
        sorteos_actualizados.add(boleto['sorteo_id'])
    
    # Update sorteo counts
    for sorteo_id in sorteos_actualizados:
        boletos_count = await db.boletos.count_documents({'sorteo_id': sorteo_id})
        sorteo_doc = await db.sorteos.find_one({'id': sorteo_id})
        if sorteo_doc:
            nuevo_progreso = (boletos_count / sorteo_doc['cantidad_total_boletos']) * 100
            await db.sorteos.update_one(
                {'id': sorteo_id},
                {'$set': {
                    'cantidad_vendida': boletos_count,
                    'progreso_porcentaje': nuevo_progreso
                }}
            )
    
    return {
        "message": f"Se eliminaron {cantidad_eliminados} boleto(s) expirado(s)",
        "cantidad": cantidad_eliminados
    }

# ============ ROOT ============
@api_router.get("/")
async def root():
    return {"message": "WishWay Sorteos API"}

# Configurar logging PRIMERO
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Inicializar endpoints de vendedor ANTES de incluir el router
vendedor_endpoints.setup_vendedor_endpoints(api_router, db, get_current_user, UserRole, EstadoRetiro)
logger.info("Endpoints de vendedor inicializados")

# AHORA sí incluir el router con todos los endpoints
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Inicializar módulos al arrancar"""
    # Inicializar state_machine
    state_machine.init_state_machine(db, Sorteo, SorteoEstado, SorteoTipo)
    logger.info("State machine inicializada")
    
    # Inicializar live_animation_service
    live_animation_service.init_live_service(db, Sorteo, SorteoEstado, SorteoTipo)
    logger.info("Live animation service inicializado")
    
    # Inicializar waiting_countdown_service
    import waiting_countdown_service
    waiting_countdown_service.init_countdown_service(db, SorteoEstado)
    waiting_countdown_service.iniciar_monitoreo_countdowns()
    logger.info("Waiting countdown service inicializado")
    
    # Inicializar verificador periódico de estados
    import state_checker_service
    state_checker_service.init_state_checker(db, state_machine)
    state_checker_service.iniciar_verificador_estados()
    logger.info("State checker service inicializado")
    
    # Verificar y reiniciar animaciones LIVE faltantes
    await live_animation_service.verificar_y_reiniciar_animaciones()
    logger.info("Verificación de animaciones LIVE completada")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
