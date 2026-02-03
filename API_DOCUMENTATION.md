# RISBOW Backend API Documentation

> **Version:** 1.0.0  
> **Base URL:** `https://api.risbow.com/api/v1` (Production)  
> **Local URL:** `http://localhost:3001/api/v1` (Development)  
> **Last Updated:** February 3, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Public Endpoints](#public-endpoints)
6. [User Endpoints](#user-endpoints)
7. [Vendor Endpoints](#vendor-endpoints)
8. [Admin Endpoints](#admin-endpoints)
9. [Webhook Endpoints](#webhook-endpoints)

---

## Overview

### Summary Statistics

| Category | Endpoint Count |
|----------|---------------|
| **Total Endpoints** | **~450+** |
| Public (No Auth) | ~80 |
| User Auth Required | ~150 |
| Vendor Auth Required | ~60 |
| Admin Auth Required | ~160 |

### API Conventions

- All endpoints are prefixed with `/api/v1`
- Request/Response bodies use JSON format
- Dates are in ISO 8601 format
- Pagination uses `page` and `limit` query parameters
- IDs are CUID strings

---

## Authentication

### JWT Token Authentication

The API uses JWT (JSON Web Token) for authentication with **RS256** algorithm.

#### Headers

```
Authorization: Bearer <access_token>
```

#### Token Types

| Token | Expiry | Purpose |
|-------|--------|---------|
| Access Token | 15 minutes | API access |
| Refresh Token | 7 days | Get new access token |

### User Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | Regular app users |
| `VENDOR` | Shop owners |
| `WHOLESALER` | Bulk sellers |
| `TELECALLER` | Sales agents |
| `ADMIN` | Platform administrators |
| `SUPER_ADMIN` | Full system access |

---

## Rate Limiting

Global rate limit: **100 requests per minute** (configurable)

### Endpoint-Specific Limits

| Endpoint Pattern | Limit |
|-----------------|-------|
| `/auth/otp-send` | 3/min |
| `/auth/login` | 5/min |
| `/auth/register` | 5/min |
| `/checkout` | 2/min |
| `/admin/auth/login` | 5/min |

---

## Error Handling

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Public Endpoints

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health status |

---

### Authentication (`/auth`)

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/auth/otp-send` | Send OTP to phone/email | 3/min |
| POST | `/auth/otp-verify` | Verify OTP code | 5/min |
| POST | `/auth/register` | Register new user | 5/min |
| POST | `/auth/login` | User login | 5/min |
| POST | `/auth/refresh` | Refresh access token | 10/min |
| POST | `/auth/forgot-password` | Request password reset | 3/min |
| POST | `/auth/reset-password` | Reset password with token | 3/min |

#### POST `/auth/otp-send`

Send OTP to phone number.

**Request Body:**
```json
{
  "mobile": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

#### POST `/auth/otp-verify`

Verify OTP and get tokens.

**Request Body:**
```json
{
  "mobile": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "user": {
    "id": "clxyz123",
    "name": "John Doe",
    "mobile": "+919876543210",
    "role": "CUSTOMER"
  }
}
```

#### POST `/auth/register`

Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "mobile": "+919876543210",
  "email": "john@example.com",
  "referralCode": "ABC123"
}
```

---

### Catalog (`/catalog`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/catalog` | List products with filters |
| GET | `/catalog/nearby` | Products near location |
| GET | `/catalog/:id` | Product details |
| GET | `/catalog/:id/reviews` | Product reviews |

#### GET `/catalog`

List products with filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `category` | string | Category ID |
| `search` | string | Search query |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `sort` | string | Sort field (price, createdAt, rating) |
| `order` | string | Sort order (asc, desc) |
| `lat` | number | Latitude for nearby |
| `lng` | number | Longitude for nearby |
| `radius` | number | Search radius in km |

**Response:**
```json
{
  "data": [
    {
      "id": "prod_123",
      "title": "Product Name",
      "price": 999.00,
      "mrp": 1299.00,
      "discount": 23,
      "images": ["https://..."],
      "rating": 4.5,
      "reviewCount": 120,
      "vendor": {
        "id": "vend_123",
        "name": "Shop Name"
      }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

### Categories (`/categories`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List all categories |
| GET | `/categories/tree` | Category hierarchy |
| GET | `/categories/:id` | Category details |

---

### Vendors (`/vendors`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendors/nearby` | Vendors near location |
| GET | `/vendors/:id` | Vendor details |
| GET | `/vendors/:id/products` | Vendor products |
| GET | `/vendors/:id/reviews` | Vendor reviews |

---

### Search (`/search`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search` | Full-text search |
| GET | `/search/suggestions` | Autocomplete suggestions |
| GET | `/search/trending` | Trending searches |

---

### Banners (`/banners`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/banners` | Active banners |
| POST | `/banners/track` | Track impression/click |

---

### Rooms (`/rooms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rooms` | List active rooms |
| GET | `/rooms/:id` | Room details |
| GET | `/rooms/:id/products` | Room products |
| GET | `/rooms/:id/participants` | Room participants |

---

### Stories & Reels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stories` | Story feed |
| GET | `/reels` | Reel feed |
| GET | `/reels/:id` | Reel details |

---

### Clearance (`/clearance`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/clearance` | Clearance products |
| GET | `/clearance/categories/:id` | By category |

---

### CMS (`/cms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cms/pages/:slug` | Get page content |
| GET | `/cms/menus/:location` | Get menu |

---

### Blog (`/blog`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/blog` | List blog posts |
| GET | `/blog/:slug` | Post details |
| GET | `/blog/categories` | Blog categories |

---

### Coupons (`/coupons`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/coupons/validate` | Validate coupon code |

---

## User Endpoints

> **Authentication Required:** Bearer Token

---

### Profile (`/users/me`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update profile |
| PATCH | `/users/me/password` | Change password |

#### GET `/users/me`

**Response:**
```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "mobile": "+919876543210",
  "avatar": "https://...",
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "coinBalance": 500,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Orders (`/orders`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List my orders |
| GET | `/orders/:id` | Order details |
| POST | `/orders` | Create order |
| PATCH | `/orders/:id/cancel` | Cancel order |
| GET | `/orders/:id/track` | Track order |
| POST | `/orders/:id/return` | Request return |
| POST | `/orders/:id/feedback` | Submit feedback |

#### GET `/orders`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | Filter by status |

**Response:**
```json
{
  "data": [
    {
      "id": "ord_123",
      "orderNumber": "ORD-2024-00001",
      "status": "DELIVERED",
      "total": 1299.00,
      "items": [
        {
          "productId": "prod_123",
          "title": "Product Name",
          "quantity": 2,
          "price": 649.50
        }
      ],
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

---

### Wishlist (`/users/me/wishlist`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me/wishlist` | Get wishlist |
| POST | `/users/me/wishlist` | Add to wishlist |
| DELETE | `/users/me/wishlist/:productId` | Remove item |

---

### Addresses (`/users/me/addresses`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me/addresses` | List addresses |
| POST | `/users/me/addresses` | Add address |
| PATCH | `/users/me/addresses/:id` | Update address |
| DELETE | `/users/me/addresses/:id` | Delete address |
| POST | `/users/me/addresses/:id/default` | Set as default |

#### POST `/users/me/addresses`

**Request Body:**
```json
{
  "name": "John Doe",
  "mobile": "+919876543210",
  "addressLine1": "123 Main Street",
  "addressLine2": "Apartment 4B",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "type": "HOME",
  "isDefault": true
}
```

---

### Cart (`/cart`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get cart |
| DELETE | `/cart` | Clear cart |
| POST | `/cart/items` | Add item |
| PATCH | `/cart/items/:id` | Update quantity |
| DELETE | `/cart/items/:id` | Remove item |
| POST | `/cart/sync` | Sync from local storage |

#### GET `/cart`

**Response:**
```json
{
  "id": "cart_123",
  "items": [
    {
      "id": "item_123",
      "product": {
        "id": "prod_123",
        "title": "Product Name",
        "price": 999.00,
        "image": "https://..."
      },
      "quantity": 2,
      "subtotal": 1998.00
    }
  ],
  "subtotal": 1998.00,
  "discount": 200.00,
  "deliveryFee": 50.00,
  "total": 1848.00,
  "appliedCoupon": {
    "code": "SAVE10",
    "discount": 200.00
  }
}
```

---

### Checkout (`/checkout`)

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/checkout` | Create session | 2/min |
| GET | `/checkout/delivery-options` | Delivery options |
| POST | `/checkout/apply-coupon` | Apply coupon |
| DELETE | `/checkout/remove-coupon` | Remove coupon |
| POST | `/checkout/confirm` | Confirm order (Idempotent) |

---

### Payments (`/payments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/create-order` | Create Razorpay order |
| POST | `/payments/verify` | Verify payment |
| GET | `/payments/history` | Payment history |
| GET | `/payments/:id` | Payment details |

#### POST `/payments/create-order`

**Request Body:**
```json
{
  "orderId": "ord_123",
  "amount": 1848.00
}
```

**Response:**
```json
{
  "razorpayOrderId": "order_xyz",
  "amount": 184800,
  "currency": "INR",
  "keyId": "rzp_test_xxx"
}
```

---

### Coins (`/coins`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/coins/balance` | Get balance |
| GET | `/coins/transactions` | Transaction history |
| POST | `/coins/redeem` | Redeem coins |

---

### Notifications (`/users/me/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me/notifications` | List notifications |
| PUT | `/users/me/notifications/read-all` | Mark all read |

---

### Devices (`/users/me/devices`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/me/devices` | Register FCM token |

---

### Support (`/support`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/support/tickets` | Create ticket |
| GET | `/support/tickets` | My tickets |
| GET | `/support/tickets/:id` | Ticket details |
| POST | `/support/tickets/:id/reply` | Reply to ticket |
| POST | `/support/tickets/:id/close` | Close ticket |

---

### Returns (`/returns`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/returns` | Create return request |
| GET | `/returns` | My returns |
| GET | `/returns/:id` | Return details |
| POST | `/returns/:id/cancel` | Cancel return |

---

### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/products/:id/reviews` | Create review |
| PATCH | `/reviews/:id` | Update review |
| DELETE | `/reviews/:id` | Delete review |
| POST | `/reviews/:id/helpful` | Mark helpful |

---

### Rooms (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rooms` | Create room |
| POST | `/rooms/:id/join` | Join room |
| POST | `/rooms/:id/leave` | Leave room |
| POST | `/rooms/:id/purchase` | Purchase in room |
| POST | `/rooms/:id/boost` | Boost room |

---

### Stories & Reels (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/stories` | Create story |
| DELETE | `/stories/:id` | Delete story |
| POST | `/stories/:id/view` | Mark viewed |
| POST | `/reels` | Create reel |
| DELETE | `/reels/:id` | Delete reel |
| POST | `/reels/:id/like` | Like reel |
| POST | `/reels/:id/comments` | Add comment |

---

### BOW AI (`/bow`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bow/chat` | Chat with AI assistant |
| POST | `/bow/visual-search` | Search by image |
| GET | `/bow/visual-search/history` | Search history |
| GET | `/bow/personalization` | Personalized feed |

---

### Buy Later (`/buy-later`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/buy-later` | Add to list |
| GET | `/buy-later` | Get list |
| PUT | `/buy-later/:id` | Update entry |
| DELETE | `/buy-later/:id` | Remove from list |

---

### Referrals (`/referrals`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/referrals/me` | My referral stats |
| GET | `/referrals/share-link` | Get shareable link |
| POST | `/referrals/claim` | Claim reward |
| GET | `/referrals/history` | Referral history |

---

### Upload (`/upload`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload/image` | Upload single image |
| POST | `/upload/images` | Upload multiple |
| POST | `/upload/document` | Upload document |
| DELETE | `/upload` | Delete file |

---

## Vendor Endpoints

> **Authentication Required:** Bearer Token + VENDOR Role

---

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendors/dashboard` | Dashboard stats |
| GET | `/vendors/analytics/overview` | Analytics overview |
| GET | `/vendors/analytics/sales` | Sales analytics |
| GET | `/vendors/analytics/products` | Product analytics |

---

### Products (`/vendor/products`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/products` | List my products |
| POST | `/vendor/products` | Create product |
| GET | `/vendor/products/:id` | Product details |
| PATCH | `/vendor/products/:id` | Update product |
| DELETE | `/vendor/products/:id` | Delete product |
| POST | `/vendor/products/:id/images` | Upload images |
| PATCH | `/vendor/products/:id/stock` | Update stock |
| POST | `/vendor/products/:id/variants` | Add variant |
| POST | `/vendor/products/bulk-upload` | Bulk upload CSV |

#### POST `/vendor/products`

**Request Body:**
```json
{
  "title": "Product Name",
  "description": "Product description",
  "categoryId": "cat_123",
  "price": 999.00,
  "mrp": 1299.00,
  "sku": "SKU-001",
  "stock": 100,
  "images": ["https://..."],
  "attributes": {
    "color": "Red",
    "size": "Large"
  }
}
```

---

### Orders (`/vendor/orders`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/orders` | List orders |
| GET | `/vendor/orders/:id` | Order details |
| PATCH | `/vendor/orders/:id/status` | Update status |
| POST | `/vendor/orders/:id/ship` | Mark shipped |
| POST | `/vendor/orders/:id/cancel` | Cancel order |
| GET | `/vendor/orders/stats` | Order statistics |

---

### Store (`/vendor/store`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/store` | Store details |
| PATCH | `/vendor/store` | Update store |
| POST | `/vendor/store/logo` | Upload logo |
| POST | `/vendor/store/cover` | Upload cover |
| GET | `/vendor/store/hours` | Business hours |
| PATCH | `/vendor/store/hours` | Update hours |

---

### Payouts (`/vendor/payouts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/payouts` | List payouts |
| GET | `/vendor/payouts/balance` | Current balance |
| POST | `/vendor/payouts/request` | Request payout |
| GET | `/vendor/payouts/history` | Payout history |

---

### Coupons (`/vendor/coupons`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/coupons` | My coupons |
| POST | `/vendor/coupons` | Create coupon |
| PATCH | `/vendor/coupons/:id` | Update coupon |
| DELETE | `/vendor/coupons/:id` | Delete coupon |

---

### Memberships (`/vendor/memberships`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/memberships/plans` | Available plans |
| GET | `/vendor/memberships/current` | Current plan |
| POST | `/vendor/memberships/subscribe` | Subscribe |
| POST | `/vendor/memberships/cancel` | Cancel subscription |

---

### Documents (`/vendor/documents`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/documents` | List documents |
| POST | `/vendor/documents` | Upload document |
| DELETE | `/vendor/documents/:id` | Delete document |

---

### Banner Campaigns (`/banner-campaigns`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/banner-campaigns` | Create campaign |
| GET | `/banner-campaigns` | My campaigns |
| GET | `/banner-campaigns/:id` | Campaign details |
| DELETE | `/banner-campaigns/:id` | Cancel campaign |
| GET | `/banner-campaigns/:id/stats` | Campaign stats |

---

### Followers (`/vendor/followers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendor/followers` | Follower list |
| GET | `/vendor/followers/count` | Follower count |

---

### Discipline (`/vendors/discipline`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendors/discipline/history` | Discipline history |
| GET | `/vendors/discipline/strikes` | Active strikes |

---

### BOW Coins (`/vendors/bow-coins`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendors/bow-coins/balance` | Coin balance |
| GET | `/vendors/bow-coins/transactions` | Transactions |

---

## Admin Endpoints

> **Authentication Required:** Admin JWT + Permissions

---

### Admin Authentication (`/admin/auth`)

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/admin/auth/login` | Admin login | 5/min |
| POST | `/admin/auth/setup-mfa` | Setup MFA |
| POST | `/admin/auth/verify-mfa` | Verify MFA |
| POST | `/admin/auth/disable-mfa` | Disable MFA (requires MFA) |
| POST | `/admin/auth/refresh` | Refresh token |
| POST | `/admin/auth/logout` | Logout |

---

### Dashboard (`/admin/dashboard`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Dashboard overview |
| GET | `/admin/dashboard/kpis` | Key metrics |
| GET | `/admin/dashboard/order-funnel` | Order funnel |
| GET | `/admin/dashboard/revenue-intelligence` | Revenue data |
| GET | `/admin/dashboard/action-items` | Action items |
| GET | `/admin/dashboard/customer-signals` | Customer signals |
| GET | `/admin/dashboard/system-health` | System health |
| GET | `/admin/dashboard/stats` | Statistics |
| GET | `/admin/dashboard/top-products` | Top products |

---

### Users (`/admin/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users |
| GET | `/admin/users/:id` | User details |
| PATCH | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |
| POST | `/admin/users/:id/suspend` | Suspend user |
| POST | `/admin/users/:id/activate` | Activate user |
| POST | `/admin/users/:id/ban` | Ban user |
| POST | `/admin/users/:id/force-logout` | Force logout |
| GET | `/admin/users/:id/orders` | User orders |
| GET | `/admin/users/:id/activity` | User activity |
| POST | `/admin/users/:id/send-notification` | Send notification |
| GET | `/admin/users/export/csv` | Export users CSV |

---

### Orders (`/admin/orders`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/orders` | List all orders |
| GET | `/admin/orders/:id` | Order details |
| PATCH | `/admin/orders/:id/status` | Update status |
| PATCH | `/admin/orders/:id/payment-status` | Update payment status |
| GET | `/admin/orders/:id/available-drivers` | Available drivers |
| POST | `/admin/orders/:id/assign-driver` | Assign driver |
| GET | `/admin/orders/export/csv` | Export orders CSV |

---

### Vendors (`/admin/vendors`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/vendors` | List vendors |
| GET | `/admin/vendors/:id` | Vendor details |
| POST | `/admin/vendors/:id/approve` | Approve vendor |
| POST | `/admin/vendors/:id/reject` | Reject vendor |
| POST | `/admin/vendors/:id/verify-kyc` | Verify KYC |
| POST | `/admin/vendors/:id/suspend` | Suspend vendor |

---

### Products (`/admin/products`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/products` | List products |
| GET | `/admin/products/:id` | Product details |
| PATCH | `/admin/products/:id` | Update product |
| DELETE | `/admin/products/:id` | Delete product |
| POST | `/admin/products/:id/approve` | Approve product |
| POST | `/admin/products/:id/reject` | Reject product |
| POST | `/admin/products/:id/feature` | Feature product |
| POST | `/admin/products/:id/flag` | Flag product |
| GET | `/admin/products/pending` | Pending approval |
| GET | `/admin/products/flagged` | Flagged products |

---

### Categories (`/admin/categories`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/categories` | List categories |
| POST | `/admin/categories` | Create category |
| GET | `/admin/categories/:id` | Category details |
| PATCH | `/admin/categories/:id` | Update category |
| DELETE | `/admin/categories/:id` | Delete category |

---

### Banners (`/admin/banners`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/banners` | List banners |
| POST | `/admin/banners` | Create banner |
| GET | `/admin/banners/:id` | Banner details |
| PATCH | `/admin/banners/:id` | Update banner |
| DELETE | `/admin/banners/:id` | Delete banner |
| POST | `/admin/banners/:id/publish` | Publish banner |
| POST | `/admin/banners/:id/unpublish` | Unpublish banner |

---

### Settings (`/admin/settings`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/settings` | All settings |
| PATCH | `/admin/settings` | Update settings |
| GET | `/admin/settings/:key` | Get setting |
| PUT | `/admin/settings/:key` | Set setting |

---

### Reports (`/admin/reports`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/reports/sales` | Sales report |
| GET | `/admin/reports/users` | User report |
| GET | `/admin/reports/vendors` | Vendor report |
| GET | `/admin/reports/products` | Product report |
| GET | `/admin/reports/custom` | Custom report |
| POST | `/admin/reports/schedule` | Schedule report |

---

### Analytics (`/admin/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics/overview` | Overview |
| GET | `/admin/analytics/revenue` | Revenue analytics |
| GET | `/admin/analytics/users` | User analytics |
| GET | `/admin/analytics/products` | Product analytics |
| GET | `/admin/analytics/vendors` | Vendor analytics |
| GET | `/admin/analytics/retention` | Retention metrics |
| GET | `/admin/analytics/cohorts` | Cohort analysis |

---

### Audit (`/admin/audit`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/audit` | Audit logs |
| GET | `/admin/audit/:id` | Log details |
| GET | `/admin/audit/user/:userId` | User audit logs |

---

### Returns (`/admin/returns`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/returns` | List returns |
| GET | `/admin/returns/:id` | Return details |
| POST | `/admin/returns/:id/approve` | Approve return |
| POST | `/admin/returns/:id/reject` | Reject return |
| POST | `/admin/returns/:id/complete` | Complete return |

---

### Refunds (`/admin/refunds`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/refunds` | List refunds |
| GET | `/admin/refunds/:id` | Refund details |
| POST | `/admin/refunds/:id/process` | Process refund |
| POST | `/admin/refunds/:id/approve` | Approve refund |
| POST | `/admin/refunds/:id/reject` | Reject refund |

---

### Support (`/admin/support`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/support` | All tickets |
| GET | `/admin/support/:id` | Ticket details |
| POST | `/admin/support/:id/assign` | Assign ticket |
| POST | `/admin/support/:id/reply` | Admin reply |
| POST | `/admin/support/:id/resolve` | Resolve ticket |
| GET | `/admin/support/stats` | Support stats |

---

### Drivers (`/admin/drivers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/drivers` | List drivers |
| POST | `/admin/drivers` | Add driver |
| GET | `/admin/drivers/:id` | Driver details |
| PATCH | `/admin/drivers/:id` | Update driver |
| DELETE | `/admin/drivers/:id` | Remove driver |
| GET | `/admin/drivers/:id/deliveries` | Driver deliveries |

---

### Employees (`/admin/employees`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/admin/employees` | List employees | SUPER_ADMIN |
| POST | `/admin/employees` | Add employee | SUPER_ADMIN |
| GET | `/admin/employees/:id` | Employee details | SUPER_ADMIN |
| PATCH | `/admin/employees/:id` | Update employee | SUPER_ADMIN |
| DELETE | `/admin/employees/:id` | Remove employee | SUPER_ADMIN |
| PATCH | `/admin/employees/:id/permissions` | Update permissions | SUPER_ADMIN |

---

### Notifications (`/admin/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/notifications` | List notifications |
| POST | `/admin/notifications` | Create notification |
| POST | `/admin/notifications/broadcast` | Broadcast to all |
| POST | `/admin/notifications/segment` | Send to segment |
| GET | `/admin/notifications/stats` | Notification stats |

---

### Strikes (`/admin/strikes`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/strikes` | List strikes |
| POST | `/admin/strikes` | Issue strike |
| GET | `/admin/strikes/:id` | Strike details |
| DELETE | `/admin/strikes/:id` | Remove strike |
| GET | `/admin/strikes/vendor/:vendorId` | Vendor strikes |

---

### Moderation (`/admin/moderation`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/moderation` | Moderation queue |
| POST | `/admin/moderation/:id/approve` | Approve content |
| POST | `/admin/moderation/:id/reject` | Reject content |
| GET | `/admin/moderation/stats` | Moderation stats |

---

### Inventory (`/admin/inventory`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/inventory` | Inventory overview |
| GET | `/admin/inventory/low-stock` | Low stock items |
| POST | `/admin/inventory/adjust` | Adjust stock |
| GET | `/admin/inventory/movements` | Stock movements |

---

### Coins (`/admin/coins`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/coins/config` | Coin configuration |
| PATCH | `/admin/coins/config` | Update config (MFA) |
| GET | `/admin/coins/transactions` | All transactions |
| POST | `/admin/coins/bulk-credit` | Bulk credit |
| GET | `/admin/coins/stats` | Coin statistics |

---

### Rooms (`/admin/rooms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/rooms` | List rooms |
| GET | `/admin/rooms/:id` | Room details |
| PATCH | `/admin/rooms/:id` | Update room |
| DELETE | `/admin/rooms/:id` | Delete room |
| POST | `/admin/rooms/:id/feature` | Feature room |
| GET | `/admin/rooms/stats` | Room statistics |

---

### CMS (`/admin/cms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/cms/pages` | List pages |
| POST | `/admin/cms/pages` | Create page |
| PATCH | `/admin/cms/pages/:id` | Update page |
| DELETE | `/admin/cms/pages/:id` | Delete page |
| GET | `/admin/cms/menus` | List menus |
| POST | `/admin/cms/menus` | Create menu |
| PATCH | `/admin/cms/menus/:id` | Update menu |
| DELETE | `/admin/cms/menus/:id` | Delete menu |

---

### Blog (`/admin/blog`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/blog/posts` | List posts |
| POST | `/admin/blog/posts` | Create post |
| PATCH | `/admin/blog/posts/:id` | Update post |
| DELETE | `/admin/blog/posts/:id` | Delete post |
| POST | `/admin/blog/posts/:id/publish` | Publish post |
| GET | `/admin/blog/categories` | Blog categories |

---

### Subscriptions (`/admin/subscriptions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/subscriptions/plans` | List plans |
| POST | `/admin/subscriptions/plans` | Create plan |
| PATCH | `/admin/subscriptions/plans/:id` | Update plan |
| DELETE | `/admin/subscriptions/plans/:id` | Delete plan |
| GET | `/admin/subscriptions` | List subscriptions |
| POST | `/admin/subscriptions/:id/cancel` | Cancel subscription |

---

### Commissions (`/admin/commissions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/commissions/rules` | List rules |
| POST | `/admin/commissions/rules` | Create rule |
| PATCH | `/admin/commissions/rules/:id` | Update rule |
| DELETE | `/admin/commissions/rules/:id` | Delete rule |
| GET | `/admin/commissions/calculate` | Calculate commissions |

---

### Local Promotions (`/admin/local-promotions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/local-promotions` | List promotions |
| POST | `/admin/local-promotions` | Create promotion |
| PATCH | `/admin/local-promotions/:id` | Update promotion |
| DELETE | `/admin/local-promotions/:id` | Delete promotion |

---

### Referral Rules (`/admin/referrals/reward-rules`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/referrals/reward-rules` | List rules |
| POST | `/admin/referrals/reward-rules` | Create rule |
| PATCH | `/admin/referrals/reward-rules/:id` | Update rule |
| DELETE | `/admin/referrals/reward-rules/:id` | Delete rule |

---

### BOW AI (`/admin/bow`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/bow/config` | AI configuration |
| PATCH | `/admin/bow/config` | Update config |
| GET | `/admin/bow/sessions` | AI sessions |
| GET | `/admin/bow/analytics` | Usage analytics |

---

### Metrics (`/admin/metrics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/metrics/cache` | Cache metrics |
| GET | `/admin/metrics/queues` | Queue statistics |

---

### Recovery (`/admin/recovery`)

> **Requires:** SUPER_ADMIN + MFA

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/recovery/backup` | Create backup |
| POST | `/admin/recovery/restore` | Restore backup |
| GET | `/admin/recovery/backups` | List backups |
| DELETE | `/admin/recovery/backups/:id` | Delete backup |

---

## Webhook Endpoints

### Razorpay Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/webhook/razorpay` | Razorpay events |

**Supported Events:**
- `payment.captured`
- `payment.failed`
- `refund.processed`
- `order.paid`

---

## Appendix

### Order Status Flow

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
                   ↓
                CANCELLED
```

### Payment Status

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting payment |
| `PAID` | Payment received |
| `FAILED` | Payment failed |
| `REFUNDED` | Full refund |
| `PARTIAL_REFUND` | Partial refund |

### User Status

| Status | Description |
|--------|-------------|
| `ACTIVE` | Normal access |
| `PENDING` | Email verification pending |
| `SUSPENDED` | Temporarily disabled |
| `BANNED` | Permanently blocked |

---

## Changelog

### v1.0.0 (February 2026)
- Initial API documentation
- RS256 JWT implementation
- Global rate limiting
- 450+ endpoints documented

---

> **Need Help?** Contact **hello@risbow.org** or open an issue in the repository.
