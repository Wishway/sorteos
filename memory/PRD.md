# WishWay Sorteos - Product Requirements Document

## Overview
WishWay Sorteos is a full-stack digital raffle platform that enables administrators to create and manage multi-stage raffles, users to purchase tickets, and sellers to earn commissions.

## Tech Stack
- **Backend:** FastAPI + Motor (async MongoDB)
- **Frontend:** React + TailwindCSS + shadcn/ui
- **Database:** MongoDB
- **Auth:** JWT + Google OAuth (Emergent-managed)
- **Real-time:** Socket.IO (WebSocket) ✅ WORKING

## Core Features (Implemented)

### Admin Features
- Create/Edit/Delete raffles with multi-stage support
- Multiple prizes per stage
- Publish/Pause/Hide raffles
- Approve/Reject ticket purchases
- View winner information with full contact details
- Edit promotional images/videos for PUBLISHED and WAITING states
- Hide raffles from Home without changing state
- Google Drive image URL support (lh3.googleusercontent.com)
- User pagination (10 per page)
- Delete published/waiting sorteos with purchases

### User Features
- Purchase tickets for raffles
- View purchased tickets (pending/approved)
- Google OAuth login
- **View won prizes ("Mis Premios Ganados")** ✅ VERIFIED

### Seller Features
- Earn commissions on ticket sales
- Request withdrawals
- Dashboard with earnings tracking

### Real-time Features
- **WebSocket connectivity** ✅ FIXED - Now working via `/api/socket.io`
- Live countdown synchronization
- Real-time state updates

### Automated System
- State machine for automatic raffle transitions
- Automatic winner selection for each prize in multi-prize stages
- 5-minute countdown before LIVE state
- 2-minute LIVE animation with prize drawings

## Recent Updates (December 2025)

### Session 3: WebSocket Fix & Premios Ganados Verification
**Completed:**
1. **WebSocket Connectivity Fix**
   - Problem: Socket.IO path `/socket.io` wasn't being routed through Kubernetes ingress
   - Solution: Changed Socket.IO path to `/api/socket.io`
   - Backend: `socketio.ASGIApp(sio, app, socketio_path='/api/socket.io')`
   - Frontend: Updated `websocket.js` to use `path: '/api/socket.io'`
   - Status: ✅ CONNECTED - WebSocket now works in production

2. **"Mis Premios Ganados" Verification**
   - Backend endpoint: `GET /api/usuario/mis-premios` ✅ Working
   - Frontend: Tab "PremiosGanados" in UsuarioDashboard ✅ Working
   - Shows: Premio name, sorteo title, boleto number, date, image
   - Status: ✅ VERIFIED - Full functionality confirmed

### Previous Sessions
- Session 2: User pagination, delete sorteos with purchases
- Session 1: Hide raffle feature, Google Drive URL support

## Test Credentials
- **Admin:** admin@wishway.com / admin123
- **User:** usuario@test.com / password123

## API Endpoints Summary

### WebSocket
- **Path:** `/api/socket.io` (changed from `/socket.io`)
- **Events:** `sorteo_update`, `countdown_tick`, `live_animation`

### User - Premios
- `GET /api/usuario/mis-premios` - Get user's won prizes

### Admin - Users
- `GET /api/admin/usuarios?page=1&limit=10` - Paginated user list

### Admin - Sorteos
- `DELETE /api/admin/sorteo/{id}?confirmar_con_compras=true` - Delete with purchases
- `PUT /api/admin/sorteo/{id}/ocultar` - Toggle visibility

## Backlog

### P2 (Nice to have)
- Email notifications for winners
- Seller referral system improvements
