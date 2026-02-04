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
- Hide raffles from Home without changing state
- Google Drive image URL support
- **NEW (Dec 2025):** User pagination (10 per page)
- **NEW (Dec 2025):** Delete published/waiting sorteos with purchases

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

### Session 2: User Pagination & Delete Sorteos
**Completed:**
1. **User Pagination**
   - Backend: `GET /api/admin/usuarios?page=1&limit=10`
   - Returns: `{usuarios, total, page, limit, total_pages}`
   - Frontend: Pagination controls (Anterior/Siguiente) when >10 users
   - Shows total count in header "Gestión de Usuarios (X)"

2. **Delete Published/Waiting Sorteos**
   - Backend: `DELETE /api/admin/sorteo/{id}?confirmar_con_compras=true`
   - Allows deletion of sorteos in: draft, published, activo, waiting, completed (30+ days)
   - Blocks deletion of LIVE sorteos
   - If sorteo has purchases, requires explicit confirmation
   - Deletes all associated boletos, comisiones, ganadores
   - Frontend: Shows warning with boleto count before deletion

### Session 1: Hide Raffle & Google Drive Support
**Completed:**
1. **Hide Raffle Feature**
   - Backend: `PUT /api/admin/sorteo/{id}/ocultar` - toggles visibility
   - Frontend: "Ocultar del Home" / "Mostrar en Home" button

2. **Google Drive URL Conversion**
   - Automatic conversion of Google Drive URLs to direct image links

## Known Issues / Technical Debt

### P1 - WebSocket Connectivity (Recurring)
- Real-time countdown functionality unreliable
- WebSocket connections failing intermittently

### P2 - User Verification
- "Mis Premios Ganados" tab needs user verification testing

## Test Credentials
- **Admin:** admin@wishway.com / admin123
- **User:** usuario@test.com / password123

## API Endpoints Summary

### Admin - Users
- `GET /api/admin/usuarios?page=1&limit=10` - Paginated user list

### Admin - Sorteos
- `POST /api/admin/sorteo` - Create raffle
- `DELETE /api/admin/sorteo/{id}?confirmar_con_compras=true` - Delete with purchases
- `PUT /api/admin/sorteo/{id}/ocultar` - Toggle visibility
- `PUT /api/admin/sorteo/{id}/publicar` - Publish

## Backlog

### P1 (Future)
- Fix WebSocket connectivity for live countdown
- Complete "Mis Premios Ganados" verification

### P2 (Nice to have)
- Email notifications for winners
- Seller referral system improvements
