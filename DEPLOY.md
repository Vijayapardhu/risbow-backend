# RISBOW Backend Deployment Guide

## 1. Local Development
1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   Start Postgres & Redis using Docker:
   ```bash
   docker-compose up -d
   ```
   Apply Prisma Schema:
   ```bash
   npx prisma db push
   ```

3. **Run Application**:
   ```bash
   npm run start:dev
   ```
   API will be available at: http://localhost:3000/api/v1
   Swagger Docs: http://localhost:3000/api/docs

## 2. Real-time Features (WebSockets)
The Rooms module uses Socket.IO.
- **Namespace**: `/rooms`
- **Events**:
    - Listen for `room_update` to get member joins and unlock status.
    - Emit `join_room` with `{ roomId: "..." }` to subscribe.
    
## 3. Postman Collection
Update variables in `risbow_postman_collection.json`:
- `token`: Get from `/auth/otp-verify`
- `userId`: Get from `/users/me`

## 4. Production Deployment (Railway/VPS)

### Required Environment Variables (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/risbow?schema=public"

# Redis (For OTPs)
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
JWT_SECRET="super_secret_jwt_key_change_in_prod"

# Payments (Razorpay)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

### Option A: Railway (Recommended)
1.  Connect GitHub repo to Railway.
2.  Add **PostgreSQL** and **Redis** services.
3.  Set variables from `.env` above.
4.  Deploy.

### Option B: Docker Compose
```bash
docker-compose up --build -d
```
This serves the App, Postgres, and Redis together directly.

## 5. Database Management
- **Migration**: In production, use `npx prisma migrate deploy` instead of `db push`.
- **Seeding**: The app auto-seeds initial Admin/Vendor data on startup if empty.
- **GUI**: Use `npx prisma studio` to view data locally.

## 6. Directory Structure
- `src/auth`: JWT & OTP logic
- `src/users`: Profiles & Referrals
- `src/coins`: Wallet & Ledger
- `src/catalog`: Products & Gifts
- `src/rooms`: Group Buying & WebSockets
- `prisma/schema.prisma`: Database Schema
