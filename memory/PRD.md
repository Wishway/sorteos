# WishWay Sorteos - Product Requirements Document

## Overview
WishWay Sorteos is a full-stack digital raffle platform that enables administrators to create and manage multi-stage raffles, users to purchase tickets, and sellers to earn commissions.

## Tech Stack
- **Backend:** FastAPI + Motor (async MongoDB)
- **Frontend:** React + TailwindCSS + shadcn/ui
- **Database:** MongoDB
- **Auth:** JWT + Google OAuth (Emergent-managed)
- **Real-time:** Socket.IO (WebSocket) - WORKING

## Core Features (Implemented)

### Admin Features
- Create/Edit/Delete raffles with multi-stage support
- Multiple prizes per stage
- Publish/Pause/Hide raffles
- Approve/Reject ticket purchases (individual + mass grouped approval)
- View winner information with full contact details
- Edit promotional images/videos for PUBLISHED and WAITING states
- Hide raffles from Home without changing state
- Google Drive image URL support (lh3.googleusercontent.com)
- User pagination (10 per page)
- Delete published/waiting sorteos with purchases
- Custom confirmation dialogs (no window.confirm)

### User Features
- Purchase tickets for raffles (max 500 per transaction)
- Purchase flow with loading indicators, double-click prevention, error handling
- View purchased tickets - summary by raffle + paginated detail (15/page)
- Google OAuth login
- View won prizes ("Mis Premios Ganados") - VERIFIED
- Change password
- Dual registration (cliente/vendedor with same cedula)

### Seller Features
- Earn commissions on ticket sales
- Request withdrawals
- Dashboard with earnings tracking

### Real-time Features
- WebSocket connectivity - FIXED via `/api/socket.io`
- Live countdown synchronization
- Real-time state updates

### Automated System
- State machine for automatic raffle transitions
- Automatic winner selection for each prize in multi-prize stages
- 5-minute countdown before LIVE state
- 2-minute LIVE animation with prize drawings

## Recent Updates

### February 2026

#### Purchase Flow UX Improvements
**Completed:**
1. **Loading indicator on "Ver datos bancarios"** - Spinner + "Validando boletos..." text
2. **Double-click prevention** - Both buttons disabled during processing
3. **Error handling** - Toast messages on validation/purchase failure, buttons re-enable
4. **Dialog close prevention** - Cannot close bank data dialog during purchase
5. **Success confirmation** - Toast + redirect to user panel

#### Client Dashboard Overhaul
**Completed:**
1. Removed 1000-ticket display limit (to_list(None))
2. 500-ticket purchase limit (server + client validation)
3. New dashboard: Summary view by raffle + paginated detail (15/page)
4. New endpoints: `/resumen`, `/sorteo/{id}` (paginated)

### December 2025
- WebSocket fix, Premios Ganados, User pagination, Delete sorteos
- Hide raffle, Google Drive URLs, Dual user registration
- Password reset, Voucher number, Branding/meta tags
- Grouped ticket approval, Custom confirmation modals

## Test Credentials
- **Admin:** admin@wishway.com / admin123
- **User:** usuario@test.com / password123

## API Endpoints Summary

### WebSocket
- **Path:** `/api/socket.io`

### User - Boletos
- `GET /api/boletos/mis-boletos` - All user tickets (no limit)
- `GET /api/boletos/mis-boletos/resumen` - Summary grouped by raffle
- `GET /api/boletos/mis-boletos/sorteo/{id}?page=1&limit=15&estado=todos` - Paginated per-raffle
- `POST /api/boletos/comprar` - Purchase tickets (max 500)

### User - Premios
- `GET /api/usuario/mis-premios` - Get user's won prizes

### Admin
- `GET /api/admin/usuarios?page=1&limit=10` - Paginated user list
- `DELETE /api/admin/sorteo/{id}?confirmar_con_compras=true` - Delete with purchases
- `PUT /api/admin/sorteo/{id}/ocultar` - Toggle visibility

## Key DB Schema
- **users**: `cedula` + `tipo_usuario` compound unique index, no unique on `celular`
- **boletos**: `purchase_id` (UUID) for grouping, `approval_mode` (individual/grouped)
- **sorteos**: `oculto: bool` for visibility control

## Backlog

### P1 (Next)
- Email notifications for raffle winners
- Full end-to-end regression test of raffle lifecycle

### P2 (Nice to have)
- Seller referral system improvements
- Performance optimization for large ticket datasets
