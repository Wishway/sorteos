# WishWay Sorteos - Product Requirements Document

## Overview
WishWay Sorteos is a full-stack digital raffle platform that enables administrators to create and manage multi-stage raffles, users to purchase tickets, and sellers to earn commissions.

## Tech Stack
- **Backend:** FastAPI + Motor (async MongoDB)
- **Frontend:** React + TailwindCSS + shadcn/ui
- **Database:** MongoDB
- **Auth:** JWT + Google OAuth (Emergent-managed) + Dual-transport (Cookie + Bearer token)
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

### Authentication (Mobile-compatible)
- CORS: `allow_origin_regex` reflects actual Origin (Safari/iOS compatible)
- Dual-transport auth: Cookie (primary) + Bearer token via localStorage (fallback)
- Stale session cleanup on login
- Consistent cookie config: `secure=True, samesite='none', path='/'`
- Axios interceptor auto-adds Bearer header from localStorage

### Seller Features
- Earn commissions on ticket sales
- Request withdrawals
- Dashboard with earnings tracking

### Real-time Features
- WebSocket connectivity - FIXED via `/api/socket.io`
- Live countdown synchronization
- Real-time state updates

## Recent Updates

### February 2026

#### Mobile Auth Fix (CRITICAL)
**Problem:** Users on iPhone Safari and old Android sessions got false "Email o contrasena incorrectos" error.
**Root causes fixed:**
1. CORS: `allow_origins=['*']` + `allow_credentials=True` invalid per spec, Safari blocks it. Fixed with `allow_origin_regex=r'.*'`
2. Inconsistent cookie settings across endpoints (vendor reg used `samesite='lax'` without `secure`). All standardized to `secure=True, samesite='none', path='/'`
3. No stale session cleanup on login. Now deletes old cookie + expired sessions before creating new.
4. No fallback for mobile browsers that block cookies. Added localStorage token storage + axios Bearer header interceptor.

#### Bulk Purchase Performance Optimization
- Bulk validation endpoint, $in queries, insert_many, database indexes
- 500-ticket validation: 0.087s, purchase: 0.6s (12.7x faster)

#### Purchase Flow UX + Client Dashboard Overhaul
- Loading indicators, double-click prevention, error handling
- Summary view by raffle + paginated detail (15/page)

## Test Credentials
- **Admin:** admin@wishway.com / admin123
- **User:** usuario@test.com / password123

## API Endpoints Summary

### Auth
- `POST /api/auth/login` - Login (cleans stale sessions, sets cookie + returns token)
- `GET /api/auth/me` - Get current user (supports cookie + Bearer)
- `POST /api/auth/logout` - Logout (clears session + cookie + localStorage)
- `POST /api/auth/google/callback` - Google OAuth callback

### Tickets
- `POST /api/sorteos/{id}/validar-numeros-bulk` - Bulk validation
- `POST /api/boletos/comprar` - Purchase (max 500, batch insert)
- `GET /api/boletos/mis-boletos/resumen` - Summary by raffle
- `GET /api/boletos/mis-boletos/sorteo/{id}` - Paginated per-raffle

## Database Indexes
- **users**: `(cedula, tipo_usuario)` unique sparse
- **boletos**: `(sorteo_id, numero_boleto)`, `(sorteo_id, pago_confirmado)`, `(usuario_id)`, `(purchase_id)`

## Backlog

### P1 (Next)
- Email notifications for raffle winners
- Full end-to-end regression test of raffle lifecycle

### P2 (Nice to have)
- Seller referral system improvements
