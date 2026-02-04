# WishWay Sorteos - Product Requirements Document

## Overview
WishWay Sorteos is a full-stack digital raffle platform that enables administrators to create and manage multi-stage raffles, users to purchase tickets, and sellers to earn commissions.

## Tech Stack
- **Backend:** FastAPI + Motor (async MongoDB)
- **Frontend:** React + TailwindCSS + shadcn/ui
- **Database:** MongoDB
- **Auth:** JWT + Google OAuth (Emergent-managed)
- **Real-time:** Socket.IO (WebSocket)

## Core Features (Implemented)

### Admin Features
- Create/Edit/Delete raffles with multi-stage support
- Multiple prizes per stage
- Publish/Pause/Hide raffles
- Approve/Reject ticket purchases
- View winner information with full contact details
- Edit promotional images/videos for PUBLISHED and WAITING states
- **NEW (Dec 2025):** Hide raffles from Home without changing state
- **NEW (Dec 2025):** Google Drive image URL support

### User Features
- Purchase tickets for raffles
- View purchased tickets (pending/approved)
- Google OAuth login
- View won prizes ("Mis Premios Ganados")

### Seller Features
- Earn commissions on ticket sales
- Request withdrawals
- Dashboard with earnings tracking

### Automated System
- State machine for automatic raffle transitions
- Automatic winner selection for each prize in multi-prize stages
- 5-minute countdown before LIVE state
- 2-minute LIVE animation with prize drawings

## Recent Updates (December 2025)

### Session: Hide Raffle & Google Drive Support
**Completed:**
1. **Hide Raffle Feature**
   - Backend: `PUT /api/admin/sorteo/{id}/ocultar` - toggles visibility
   - Frontend: "Ocultar del Home" / "Mostrar en Home" button
   - Works for: published, activo, waiting, completed states
   - Hidden raffles excluded from `GET /api/sorteos` by default
   - Admin can see hidden raffles with `?incluir_ocultos=true`

2. **Google Drive URL Conversion**
   - Backend utility: `convert_google_drive_url()` and `process_image_urls()`
   - Supports formats:
     - `drive.google.com/file/d/FILE_ID/view`
     - `drive.google.com/open?id=FILE_ID`
     - `drive.google.com/uc?id=FILE_ID`
   - Converts to direct image URL: `https://drive.google.com/uc?export=view&id=FILE_ID`
   - Applied in all image update endpoints

## Known Issues / Technical Debt

### P1 - WebSocket Connectivity (Recurring)
- Real-time countdown functionality unreliable
- WebSocket connections failing intermittently
- Requires infrastructure investigation (Nginx config, CORS)

### P2 - User Verification
- "Mis Premios Ganados" tab needs user verification testing

## Database Schema

### sorteos collection
```
{
  id: string,
  titulo: string,
  descripcion: string,
  precio_boleto: number,
  cantidad_total_boletos: number,
  estado: "draft" | "published" | "activo" | "waiting" | "live" | "completed",
  oculto: boolean,  // NEW: controls Home visibility
  imagenes: string[],
  etapas: [{
    numero: number,
    porcentaje: number,
    premios: [{nombre, descripcion, imagen_url, video_url}],
    ganadores: [{user_id, boleto_numero, premio}]
  }],
  ganadores: [{user_id, boleto_numero, premio, ...user_details}]
}
```

## Test Credentials
- **Admin:** admin@wishway.com / admin123
- **User:** usuario@test.com / password123

## API Endpoints

### Admin Endpoints
- `POST /api/admin/sorteo` - Create raffle
- `PUT /api/admin/sorteo/{id}/publicar` - Publish
- `PUT /api/admin/sorteo/{id}/ocultar` - Toggle visibility (NEW)
- `PUT /api/admin/sorteo/{id}/actualizar-imagenes` - Update images
- `PUT /api/admin/sorteo/{id}/actualizar-premio-imagen` - Update prize image
- `PUT /api/admin/sorteo/{id}/actualizar-etapa-premio-imagen` - Update stage prize image

### Public Endpoints
- `GET /api/sorteos` - List visible raffles
- `GET /api/sorteos?incluir_ocultos=true` - Include hidden (admin)
- `GET /api/sorteo/{slug}` - Get raffle details

## Backlog

### P0 (Next)
- Full E2E test of multi-stage raffle lifecycle

### P1 (Future)
- Fix WebSocket connectivity for live countdown
- Complete "Mis Premios Ganados" verification

### P2 (Nice to have)
- Email notifications for winners
- Seller referral system improvements
