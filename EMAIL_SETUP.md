# Configuración de Email para Recuperación de Contraseña

## ⚠️ Configuración Requerida

Para que el sistema de recuperación de contraseña funcione, necesitas configurar las credenciales SMTP en el archivo `/app/backend/.env`.

---

## 📧 Opción 1: Gmail (Recomendado para desarrollo)

### Paso 1: Crear una contraseña de aplicación de Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Ve a **Seguridad**
3. Activa **Verificación en 2 pasos** (si no está activada)
4. Busca **Contraseñas de aplicaciones**
5. Crea una nueva contraseña de aplicación
6. Selecciona "Correo" y "Otro" (escribe "WishWay")
7. Copia la contraseña generada (16 caracteres)

### Paso 2: Configurar en .env

```bash
# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-contraseña-de-app-aqui"
FROM_EMAIL="tu-email@gmail.com"
FROM_NAME="WishWay Sorteos"
```

---

## 📧 Opción 2: SendGrid (Recomendado para producción)

### Paso 1: Crear cuenta en SendGrid

1. Regístrate en: https://sendgrid.com/
2. Verifica tu cuenta y dominio
3. Crea una API Key en Settings > API Keys

### Paso 2: Configurar en .env

```bash
# Email Configuration
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="tu-api-key-de-sendgrid"
FROM_EMAIL="noreply@tudominio.com"
FROM_NAME="WishWay Sorteos"
```

---

## 📧 Opción 3: Mailgun

### Paso 1: Crear cuenta en Mailgun

1. Regístrate en: https://www.mailgun.com/
2. Verifica tu dominio
3. Obtén tus credenciales SMTP

### Paso 2: Configurar en .env

```bash
# Email Configuration
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@tu-dominio.mailgun.org"
SMTP_PASSWORD="tu-password-de-mailgun"
FROM_EMAIL="noreply@tudominio.com"
FROM_NAME="WishWay Sorteos"
```

---

## 📧 Opción 4: Outlook/Hotmail

```bash
# Email Configuration
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="tu-email@outlook.com"
SMTP_PASSWORD="tu-contraseña"
FROM_EMAIL="tu-email@outlook.com"
FROM_NAME="WishWay Sorteos"
```

---

## 🔄 Reiniciar el Backend

Después de configurar las variables de entorno, reinicia el backend:

```bash
sudo supervisorctl restart backend
```

---

## ✅ Verificar que funciona

1. Ve a la página de login: `/login`
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Deberías recibir un correo en 1-2 minutos

---

## 🐛 Solución de Problemas

### No recibo emails

**1. Verifica las credenciales:**
```bash
# Ver logs del backend
tail -f /var/log/supervisor/backend.err.log
```

**2. Revisa la carpeta de spam**
- Los emails automáticos a veces van a spam

**3. Para Gmail:**
- Asegúrate de usar una contraseña de aplicación, NO tu contraseña normal
- Verifica que la verificación en 2 pasos esté activada

**4. Verifica la configuración:**
```bash
# Desde el backend
cd /app/backend
source .env
echo "SMTP_USER: $SMTP_USER"
echo "SMTP_HOST: $SMTP_HOST"
```

### Error: "Authentication failed"

- Verifica que la contraseña de aplicación sea correcta
- Para Gmail, asegúrate de copiar los 16 caracteres sin espacios

### Error: "Connection refused"

- Verifica el puerto (587 para TLS, 465 para SSL)
- Algunos servidores pueden bloquear SMTP, verifica tu firewall

---

## 📝 Formato del Email

El email incluye:
- Logo y marca de WishWay
- Botón grande para restablecer contraseña
- Enlace alternativo (por si el botón no funciona)
- Advertencia de que expira en 1 hora
- Diseño responsive y profesional

---

## 🔒 Seguridad

✅ **Implementado:**
- Tokens únicos (UUID)
- Expiración de 1 hora
- Tokens de un solo uso
- No se revela si el email existe
- No se muestra el token en ninguna respuesta
- Solo el email tiene el enlace de recuperación

❌ **Eliminado (inseguro):**
- Modo desarrollo que mostraba tokens
- Exposición de tokens en respuestas API
- Visualización de tokens en el frontend

---

## 📧 Plantilla del Email

El email enviado incluye:
- Diseño HTML responsivo
- Gradiente púrpura (colores de la marca)
- Botón CTA prominente
- Información clara sobre expiración
- Versión de texto plano (fallback)

---

## ✨ Próximos Pasos

Una vez configurado el SMTP, el sistema funcionará automáticamente:
1. Usuario solicita recuperar contraseña
2. Sistema genera token único
3. Email se envía automáticamente
4. Usuario hace clic en el enlace del email
5. Usuario restablece su contraseña
6. Token se marca como usado

---

**¿Necesitas ayuda?** Revisa los logs del backend para ver errores específicos de SMTP.
