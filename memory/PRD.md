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
- Optimized bulk purchase (500 tickets in <1s validation, <1s insertion)
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

#### Bulk Purchase Performance Optimization
**Completed:**
1. **Bulk validation endpoint** - `/sorteos/{id}/validar-numeros-bulk` validates all numbers in 1 query using `$in`
2. **Optimized purchase** - Uses `$in` for availability check + `insert_many` for batch insertion
3. **Database indexes** - Added indexes on boletos (sorteo_id+numero_boleto, sorteo_id+pago_confirmado, usuario_id, purchase_id)
4. **Frontend optimization** - 1 bulk API call instead of N individual calls

**Performance results:**
- 500-number validation: 0.087s (was ~30-60s with 500 individual calls)
- 500-ticket purchase: 0.6s (was ~30s+ with individual inserts)
- 12.7x faster than previous implementation

#### Purchase Flow UX Improvements
- Loading indicators, double-click prevention, error handling, dialog close prevention

#### Client Dashboard Overhaul
- Summary view by raffle + paginated detail (15/page)
- 500-ticket purchase limit, removed 1000-ticket display limit

### December 2025
- WebSocket fix, Premios Ganados, User pagination, Delete sorteos
- Hide raffle, Google Drive URLs, Dual user registration
- Password reset, Voucher number, Branding/meta tags, Grouped ticket approval

## Test Credentials
- **Admin:** admin@wishway.com / admin123
- **User:** usuario@test.com / password123

## API Endpoints Summary

### Ticket Validation
- `POST /api/sorteos/{id}/validar-numero` - Single number validation (legacy)
- `POST /api/sorteos/{id}/validar-numeros-bulk` - Bulk validation (optimized)
- `GET /api/sorteos/{id}/numeros-disponibles` - Get available numbers

### User - Boletos
- `GET /api/boletos/mis-boletos` - All user tickets
- `GET /api/boletos/mis-boletos/resumen` - Summary grouped by raffle
- `GET /api/boletos/mis-boletos/sorteo/{id}?page=1&limit=15&estado=todos` - Paginated per-raffle
- `POST /api/boletos/comprar` - Purchase tickets (max 500, batch insert)

### User - Premios
- `GET /api/usuario/mis-premios` - Get user's won prizes

### Admin
- `GET /api/admin/usuarios?page=1&limit=10` - Paginated user list
- `DELETE /api/admin/sorteo/{id}?confirmar_con_compras=true` - Delete with purchases
- `PUT /api/admin/sorteo/{id}/ocultar` - Toggle visibility

## Database Indexes
- **users**: `(cedula, tipo_usuario)` unique sparse
- **boletos**: `(sorteo_id, numero_boleto)`, `(sorteo_id, pago_confirmado)`, `(usuario_id)`, `(purchase_id)`

## Backlog

### P1 (Next)
- Email notifications for raffle winners
- Full end-to-end regression test of raffle lifecycle

### P2 (Nice to have)
- Seller referral system improvements
