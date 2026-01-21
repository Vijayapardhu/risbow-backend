  # RISBOW - Ecommerce Super App SRS
  **Software Requirements Specification**  
  **Version 1.0** | **Date: Jan 5, 2026** | **Solo Developer**  
  **Tech Stack: NestJS + Prisma + Flutter + Supabase/Railway** | **Scale: 1M MAU** | **Budget: <₹2k/mo**

  ---

  ## 1. Introduction

  ### 1.1 Purpose
  Detailed specification for **RISBOW** — multi-vendor ecommerce super app (Amazon/Flipkart style) with **Rooms group buying**, **referral coins**, **₹2k+ gifts**, **Bow AI assistant**. Backend APIs first for UI designer integration.

  ### 1.2 Scope
  - **Customer Mobile App**: Browse, Rooms, cart, checkout, coins, Bow AI
  - **Vendor Mobile App**: Dashboard, products, orders, coins→banners  
  - **Admin Web Panel**: Manage rooms, vendors, gifts, analytics
  - **Out of scope**: Live streaming, AR (Phase 3)

  ### 1.3 Target Users
  - **Customers**: Telugu/English Tier-2/3 India (Hyderabad focus)
  - **Vendors**: Small retailers (GST/Non-GST)  
  - **Admins**: Platform ops

  ---

  ## 2. Overall Description

  ### 2.1 Product Perspective
  RISBOW differentiates via **social commerce** (Rooms = friends group offers) + **gamification** (coins ecosystem) + **AI personalization** (Bow). Low budget, AI-built, scales to 1M users.

  ### 2.2 Key USPs with Examples
  | USP | Description | Example Flow |
  |-----|-------------|-------------|
  | **Rooms Shopping** | Friends create/join rooms → weekly offers → unlock on min orders | Room-4: 3/4 orders → unlock → all get 20% off + gift |
  | **Referral Coins** | Share → both earn coins post first order | Ravi shares → Anu orders → Ravi + Anu get 100 coins each |
  | **₹2k+ Gifts** | Cart ≥₹2k → choose gift (belt/shirt cloth) @₹0 | Cart ₹2500 → "Choose Gift: Belt (stock: 50)" |
  | **Bow AI** | Chat/voice guide + outfit suggestions | "Show cotton shirts <₹999" → voice → curated list |

  ---

  ## 3. Functional Requirements

  ### 3.1 User Roles & Permissions
  | Role | Key Actions |
  |------|-------------|
  | **Customer** | Browse/search, Rooms, cart/checkout, coins redeem, Bow chat |
  | **Vendor** | Register/KYC, products/inventory, orders, coins→banners |
  | **Admin** | Approve vendors/rooms, manage gifts/offers, analytics |

  ### 3.2 Core Modules (Backend APIs)

  #### **FR-1: Authentication & Users**

  **API Endpoints:**
  ```
  POST /auth/otp-send → {mobile} → Send OTP
  POST /auth/otp-verify → {mobile, otp} → JWT token
  POST /users → {mobile, name} → Create/update profile
  GET /users/me/coins → Balance + expiry
  ```

  **Example:** Mobile `+91-9876543210` → OTP `123456` → token → coins `{balance: 250, expiry: "2026-02-05"}`

  ---

  #### **FR-2: Rooms (Group Buying)**

  **Entities:**
  - **Room**: id, name, size(3/4), status(LOCKED/ACTIVE/UNLOCKED), unlockMinOrders(3), startAt/endAt
  - **RoomMember**: roomId, userId, status(PENDING/ORDERED/CONFIRMED)

  **APIs:**
  ```
  POST /rooms → Create room (creator auto-joins)
  POST /rooms/:id/join → Join (check size)
  POST /rooms/:id/order/:orderId → Link order → check unlock
  WS /rooms/:id → Realtime: {ordered: 2/4, value: ₹4500, unlocked: false}
  ```

  **Unlock Logic:** `if(orderedCount >= minOrders && totalValue >= minValue) → status=UNLOCKED`

  **Cron:** Check expiry every min → EXPIRED if past endAt.

  ---

  #### **FR-3: Catalog & Products**

  **Entities:**
  - **Category**: id, name(telugu/english), parentId
  - **Product**: id, vendorId, title, price, offerPrice, stock, variants(sizes/colors)
  - **GiftSKU**: id, title, stock, cost(₹0), eligibleCategories

  **APIs:**
  ```
  GET /products?category=shirts&price_lt=1000
  POST /products → Vendor add product
  GET /gifts/eligible?cartValue=2500 → [{id:1, title:"Belt", stock:50}]
  ```

  **Bulk Upload:** CSV → validate → import 100+ products.

  ---

  #### **FR-4: Orders & Checkout**

  **Entities:**
  - **Order**: id, userId, roomId?, items[], totalAmount, status(PENDING→DELIVERED), razorpayOrderId

  **APIs:**
  ```
  POST /checkout → Create Razorpay order → redirect
  POST /orders/confirm → Webhook verify → update status
  POST /orders/:id/gift → Add gift if eligible
  ```

  **Flow:** Cart → Razorpay → Success webhook → link to room → check unlock → notify Bow.

  ---

  #### **FR-5: Coins & Referrals**

  **Entities:**
  - **CoinLedger**: id, userId, amount(+earn/-spend), source(order/review), expiresAt

  **APIs:**
  ```
  POST /referrals/share → Generate link
  POST /referrals/claim → New user claims → pending
  POST /coins/redeem → Spend on checkout/banner
  ```

  **Rules:** 1st order delivery → credit referrer+referee. Expiry: 3 months cron notify.

  ---

  #### **FR-6: Vendors & Monetization**

  **Membership Tiers:**
  - **Basic**: 100 SKUs, weekly payout (₹0)
  - **Pro**: 1k SKUs, analytics (₹999/mo)
  - **Premium**: Unlimited + featured (₹4999/mo)

  **APIs:**
  ```
  POST /vendors/register → KYC docs upload
  POST /vendors/coins→banner → Spend coins on slot
  ```

  **Penalties:** 3 strikes → suspend (late dispatch, returns).

  ---

  #### **FR-7: Bow AI (Phase 2)**

  **APIs:**
  ```
  POST /bow/chat → {message:"shirts under 999"} → curated products
  POST /bow/tryon → {photoBase64} → outfit suggestions (resize+rules)
  ```

  **Simple:** Rule‑based + collaborative filtering (Prisma queries).

  ---

  #### **FR-8: Admin Console**

  **APIs:**
  ```
  POST /admin/rooms → Create weekly offer rooms
  POST /admin/gifts → Add SKU, stock, threshold
  GET /admin/analytics → DAU, room unlock %, AOV, top vendors
  ```

  ---

  ## 4. Non‑Functional Requirements

  ### 4.1 Performance
  | Metric | Target |
  |--------|--------|
  | API Latency | <200ms P95 |
  | Concurrent Users | 10k (scales horizontal) |
  | Rooms Realtime | <1s update |

  ### 4.2 Scalability
  - **1M MAU**: Horizontal pods (Railway auto‑scale)
  - **DB**: Postgres read replicas (Supabase Pro)

  ### 4.3 Security
  - JWT auth (mobile refresh tokens)
  - Rate limit: 100 req/min/user
  - Photo try‑on: On‑device resize, consent

  ### 4.4 Reliability
  - 99.5% uptime
  - Webhooks idempotent (Razorpay)
  - Backups: Supabase daily

  ---

  ## 5. API Contracts (OpenAPI ready)

  **Base URL:** `https://risbow-backend.up.railway.app/api/v1`

  ### Auth
  ```json
  POST /auth/otp-send
  Response: {"message": "OTP sent"}
  ```

  ### Rooms
  ```json
  GET /rooms?status=active
  POST /rooms
  Response: {
    "id": "room_123",
    "name": "Friends Room-4",
    "status": "LOCKED",
    "progress": {"ordered": 1, "needed": 3}
  }
  ```

  ### Checkout
  ```json
  POST /checkout
  Body: {"items": [...], "roomId": "...", "useCoins": 50}
  Response: {"razorpayOrderId": "order_abc", "amount": 2500}
  ```

  ---

  ## 6. Data Models (Prisma Schema)

  ```prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }

  model User {
    id            String   @id @default(cuid())
    mobile        String   @unique
    name          String?
    email         String?  @unique
    coinsBalance  Int      @default(0)
    referralCode  String   @unique
    referredBy    String?
    rooms         RoomMember[]
    orders        Order[]
    createdAt     DateTime @default(now())
  }

  model Room {
    id              String       @id @default(cuid())
    name            String
    size            Int
    status          RoomStatus   @default(LOCKED)
    offerId         String
    startAt         DateTime
    endAt           DateTime
    unlockMinOrders Int
    unlockMinValue  Int
    members         RoomMember[]
    createdById     String
    createdBy       User         @relation(fields: [createdById], references: [id])
    createdAt       DateTime     @default(now())
  }

  enum RoomStatus {
    LOCKED
    ACTIVE
    UNLOCKED
    EXPIRED
  }

  model RoomMember {
    roomId String
    userId String
    status MemberStatus @default(PENDING)
    room   Room         @relation(fields: [roomId], references: [id])
    user   User         @relation(fields: [userId], references: [id])
    
    @@id([roomId, userId])
  }

  enum MemberStatus {
    PENDING
    ORDERED
    CONFIRMED
    CANCELLED
  }

  model Order {
    id              String      @id @default(cuid())
    userId          String
    roomId          String?
    items           Json
    totalAmount     Int
    status          OrderStatus @default(PENDING)
    razorpayOrderId String?
    user            User        @relation(fields: [userId], references: [id])
    createdAt       DateTime    @default(now())
    updatedAt       DateTime    @updatedAt
  }

  enum OrderStatus {
    PENDING
    CONFIRMED
    SHIPPED
    DELIVERED
    CANCELLED
  }

  model Product {
    id          String   @id @default(cuid())
    vendorId    String
    title       String
    description String?
    price       Int
    offerPrice  Int?
    stock       Int      @default(0)
    categoryId  String
    variants    Json?
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }

  model Category {
    id       String  @id @default(cuid())
    name     String
    nameTE   String?
    parentId String?
  }

  model GiftSKU {
    id                 String   @id @default(cuid())
    title              String
    stock              Int      @default(0)
    cost               Int      @default(0)
    eligibleCategories Json?
    createdAt          DateTime @default(now())
  }

  model CoinLedger {
    id        String   @id @default(cuid())
    userId    String
    amount    Int
    source    String
    expiresAt DateTime?
    createdAt DateTime @default(now())
  }

  model Vendor {
    id        String   @id @default(cuid())
    name      String
    mobile    String   @unique
    email     String?
    kycStatus String   @default("PENDING")
    tier      String   @default("BASIC")
    createdAt DateTime @default(now())
  }
  ```

  ---

  ## 7. AI Development Prompts

  **Example for Cursor/Gemini:**

  ```
  "Create NestJS Users module with:
  - Prisma models: User, CoinLedger  
  - JWT auth (OTP flow)
  - /users/me/coins endpoint
  - Referral claim logic
  Include tests + validation"
  ```

  ---

  ## 8. Deployment & Cost

  | Service | Free Tier | ₹/mo Scale |
  |---------|-----------|------------|
  | **Supabase** | 500MB DB | ₹500 |
  | **Railway** | $5 credit | ₹1k |
  | **Total** | ₹0 | **₹2k** |

  ---

  ## 9. Testing Criteria

  - **Unit**: 80% coverage (Jest)
  - **API**: Postman collection (all endpoints)
  - **Load**: 10k users (Artillery)
  - **E2E**: Cypress (admin flows)

  ---

  ## 10. Success Metrics

  | KPI | Target |
  |-----|--------|
  | **Room Unlock Rate** | >30% |
  | **Referral Conversion** | 15% |
  | **AOV** | ₹1500+ |
  | **Retention D30** | 25% |

  ---

  ## 11. Development Timeline

  | Phase | Duration | Deliverables |
  |-------|----------|--------------|
  | **Phase 1** | Week 1-2 | Auth, Users, Products, Basic Catalog |
  | **Phase 2** | Week 3-4 | Rooms, Orders, Checkout, Razorpay |
  | **Phase 3** | Week 5-6 | Coins, Referrals, Vendors, Gifts |
  | **Phase 4** | Week 7-8 | Admin Console, Analytics, Bow AI (Basic) |
  | **Testing** | Week 9-10 | Unit/API/Load tests, Bug fixes |
  | **Deployment** | Week 11 | Railway deployment, Documentation |

  ---

  **AI‑Ready:** Copy sections → paste to Cursor → generates modules. Backend complete in 11 weeks → UI designer Figma → Flutter integration.

  ---

  ## 12. Notes & Considerations

  ### 12.1 Future Enhancements
  - Live streaming for product demos
  - AR try-on for clothes
  - Multi-language support (Hindi, Kannada, Tamil)
  - Voice commerce integration
  - Social media integration for sharing

  ### 12.2 Risk Mitigation
  - **Budget overrun**: Start with free tiers, optimize queries
  - **Scale issues**: Horizontal scaling + caching (Redis)
  - **Payment failures**: Retry logic + customer support flow
  - **Vendor quality**: Rating system + penalties
  - **Coin abuse**: Rate limiting + fraud detection

  ### 12.3 Compliance
  - GST invoicing for vendors
  - User data privacy (GDPR-ready)
  - Payment gateway compliance (PCI DSS via Razorpay)
  - Terms of service + Privacy policy
