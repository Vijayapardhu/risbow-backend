# Backend Missing Features Analysis

## Date: 2026-01-19

This document outlines the missing or incomplete features in the Risbow backend based on the SRS requirements and Prisma schema.

---

## ❌ CRITICAL MISSING FEATURES

### 1. **Cart Management Module** ⚠️ HIGH PRIORITY
**Status**: Model exists in Prisma schema but NO implementation

**Missing:**
- ❌ Cart Controller
- ❌ Cart Service
- ❌ Cart Module
- ❌ No CRUD endpoints for cart operations

**Required Endpoints:**
```
GET    /users/me/cart          - Get user's cart with items
POST   /cart/items             - Add item to cart
PATCH  /cart/items/:id         - Update cart item quantity
DELETE /cart/items/:id         - Remove item from cart
DELETE /cart                   - Clear entire cart
POST   /cart/sync              - Sync cart from local storage
```

**Impact:** Users cannot add products to cart or manage cart items

---

### 2. **Review/Rating System** ⚠️ HIGH PRIORITY
**Status**: Model exists in Prisma schema but NO implementation

**Missing:**
- ❌ Review Controller
- ❌ Review Service
- ❌ Review Module
- ❌ No endpoints for product/vendor reviews

**Required Endpoints:**
```
GET    /products/:id/reviews     - Get product reviews
POST   /products/:id/reviews     - Create product review
GET    /vendors/:id/reviews      - Get vendor reviews
POST   /vendors/:id/reviews      - Create vendor review
PATCH  /reviews/:id              - Update review
DELETE /reviews/:id              - Delete review
POST   /reviews/:id/helpful      - Mark review as helpful
POST   /reviews/:id/report       - Report review
```

**Impact:** No user feedback mechanism, affects trust and product quality

---

### 3. **Refund Management System** ⚠️ HIGH PRIORITY
**Status**: Model exists in Prisma schema but NO implementation

**Missing:**
- ❌ Refund Controller
- ❌ Refund Service
- ❌ Refund Module
- ❌ No refund request/processing endpoints

**Required Endpoints:**
```
POST   /orders/:id/refund-request    - Request refund
GET    /users/me/refunds             - Get user refunds
GET    /admin/refunds                - Get all refunds (admin)
PATCH  /admin/refunds/:id/approve    - Approve refund
PATCH  /admin/refunds/:id/reject     - Reject refund
POST   /admin/refunds/:id/process    - Process refund payment
```

**Impact:** No mechanism to handle returns/refunds (critical for e-commerce)

---

### 4. **Payment Processing Module** ⚠️ CRITICAL
**Status**: Empty module exists, no actual implementation

**Current State:**
```typescript
// src/payments/payments.module.ts
@Module({})
export class PaymentsModule { }  // EMPTY!
```

**Missing:**
- ❌ Payment Controller
- ❌ Payment Service
- ❌ Razorpay integration
- ❌ Payment webhook handler
- ❌ Payment verification
- ❌ COD handling

**Required Endpoints:**
```
POST   /payments/create-order        - Create Razorpay order
POST   /payments/verify              - Verify payment signature
POST   /payments/webhook             - Razorpay webhook handler
GET    /payments/:id/status          - Check payment status
POST   /payments/:id/refund          - Initiate payment refund
```

**Impact:** CANNOT PROCESS PAYMENTS - Platform is non-functional

---

### 5. **Banner Management** ⚠️ MEDIUM PRIORITY
**Status**: Model exists but limited implementation

**Missing:**
- ❌ Banner image upload handling
- ❌ Banner scheduling logic
- ❌ Banner analytics (impressions, clicks)
- ❌ No public API to fetch active banners

**Required Endpoints:**
```
GET    /banners/active              - Get active banners for slot
POST   /admin/banners               - Create banner (with image upload)
GET    /admin/banners               - List all banners
PATCH  /admin/banners/:id           - Update banner
POST   /admin/banners/:id/analytics - Track banner performance
```

**Impact:** Marketing campaigns cannot be displayed

---

### 6. **Coupon/Discount System** ⚠️ MEDIUM PRIORITY
**Status**: Model exists, basic admin CRUD exists but NO application logic

**Missing:**
- ❌ Coupon validation in checkout
- ❌ Coupon application to orders
- ❌ Usage tracking
- ❌ User-facing coupon endpoints

**Required Endpoints:**
```
GET    /coupons/available           - Get available coupons for user
POST   /coupons/validate            - Validate coupon code
POST   /checkout/apply-coupon       - Apply coupon to checkout
GET    /users/me/coupons            - Get user's available coupons
```

**Impact:** Cannot offer discounts or run promotions

---

### 7. **Weekly Offers Module** ⚠️ MEDIUM PRIORITY
**Status**: Model exists but NO implementation

**Missing:**
- ❌ WeeklyOffer Controller
- ❌ WeeklyOffer Service
- ❌ No CRUD endpoints

**Required Endpoints:**
```
GET    /offers/weekly/active        - Get active weekly offers
GET    /admin/offers/weekly         - List all weekly offers
POST   /admin/offers/weekly         - Create weekly offer
PATCH  /admin/offers/weekly/:id     - Update offer
DELETE /admin/offers/weekly/:id     - Delete offer
```

**Impact:** Core feature "weekly offers" not functional

---

### 8. **Gift SKU Module** ⚠️ MEDIUM PRIORITY
**Status**: Model exists, minimal implementation

**Current Implementation:** Basic CRUD in admin service
**Missing:**
- ❌ Dedicated Gift module/controller
- ❌ Gift eligibility check in checkout
- ❌ Gift inventory management
- ❌ Gift selection in checkout flow

**Required Endpoints:**
```
GET    /gifts/eligible              - Get eligible gifts based on cart
POST   /checkout/select-gift        - Select gift for order
GET    /admin/gifts/inventory       - Manage gift inventory
POST   /admin/gifts/restock         - Restock gifts
```

**Impact:** "₹2k+ Gifts" USP not working

---

### 9. **Platform Configuration** ⚠️ LOW PRIORITY
**Status**: Model exists but basic implementation

**Missing:**
- ❌ Frontend-friendly config API
- ❌ Feature flags
- ❌ Dynamic app configuration

**Required Endpoints:**
```
GET    /config/app                  - Get app configuration
GET    /config/features             - Get feature flags
```

---

## ⚠️ INCOMPLETE FEATURES

### 10. **Address Management**
**Status**: Partially implemented
**Issues:**
- ✅ Basic CRUD exists
- ❌ No default address handling logic
- ❌ No address validation
- ❌ Deprecated fields (title, mobile, street) not cleaned up

### 11. **Vendor Management**
**Status**: Partially implemented
**Issues:**
- ✅ Registration and approval flow exists
- ❌ No vendor dashboard endpoints
- ❌ No vendor earnings/payout management
- ❌ No vendor performance metrics
- ❌ SKU limit enforcement not implemented

### 12. **Order Management**
**Status**: Partially implemented
**Issues:**
- ✅ Basic order creation exists
- ❌ No order status update flow
- ❌ No tracking integration
- ❌ No order cancellation
- ❌ Limited admin order management

### 13. **Notification System**
**Status**: Service exists but limited
**Issues:**
- ✅ Notification service exists
- ❌ No push notification integration
- ❌ No email notifications
- ❌ No SMS integration
- ❌ No notification preferences

---

## 🔄 MISSING INTEGRATIONS

### 14. **SMS Provider Integration** ⚠️ CRITICAL
**Required for:** OTP authentication
**Status:** Not implemented
**Impact:** Authentication won't work in production

### 15. **Razorpay Integration** ⚠️ CRITICAL
**Required for:** Payment processing
**Status:** Not implemented
**Impact:** Cannot accept payments

### 16. **File Upload/Storage** ⚠️ HIGH PRIORITY
**Required for:** Product images, profile pictures, documents
**Status:** No implementation
**Needed:**
- Image upload endpoints
- Cloud storage integration (AWS S3/Cloudinary)
- Image optimization/resizing

### 17. **Courier/Shipping Integration** ⚠️ MEDIUM PRIORITY
**Required for:** Order fulfillment
**Status:** Not implemented
**Missing:**
- AWB generation
- Tracking integration
- Shipping rate calculation

---

## 📊 MISSING ANALYTICS

### 18. **User Analytics** ⚠️ MEDIUM PRIORITY
**Missing:**
- User behavior tracking
- Conversion funnel
- User journey analytics
- Cart abandonment tracking

### 19. **Product Analytics** ⚠️ MEDIUM PRIORITY
**Missing:**
- Product view tracking
- Product performance metrics
- Search analytics
- Recommendation engine

### 20. **Revenue Analytics** ⚠️ MEDIUM PRIORITY
**Missing:**
- Sales reports
- Revenue forecasting
- Profit margin analysis
- Commission tracking

---

## 🔐 MISSING SECURITY FEATURES

### 21. **Security Hardening**
**Missing:**
- ❌ Password reset flow incomplete
- ❌ Email verification
- ❌ Two-factor authentication
- ❌ IP-based rate limiting
- ❌ Request validation middleware
- ❌ CORS configuration for production
- ❌ API key management for third-party services

---

## 📱 MISSING WEBSOCKET FEATURES

### 22. **Real-time Features**
**Status:** WebSocket gateway might exist but no implementation
**Missing:**
- Real-time room status updates
- Real-time order tracking
- Live chat support
- Real-time notifications

---

## 🧪 MISSING TESTING

### 23. **Test Coverage**
**Current State:** No test files found
**Missing:**
- Unit tests
- Integration tests
- E2E tests
- Load testing

---

## 📄 MISSING DOCUMENTATION

### 24. **API Documentation**
**Missing:**
- Complete Swagger/OpenAPI documentation
- API usage examples
- Postman collection (exists but might be outdated)
- Integration guides

---

## PRIORITY MATRIX

### 🔴 CRITICAL (Implement Immediately)
1. Payment Processing Module (Razorpay)
2. Cart Management
3. SMS Provider Integration
4. Refund Management

### 🟡 HIGH PRIORITY (Implement in Phase 1)
5. Review/Rating System
6. File Upload/Storage
7. Complete Order Management
8. Gift SKU Module
9. Coupon Application Logic

### 🟢 MEDIUM PRIORITY (Implement in Phase 2)
10. Banner Management
11. Weekly Offers
12. Vendor Dashboard
13. Notification System
14. Shipping Integration
15. Analytics

### 🔵 LOW PRIORITY (Implement in Phase 3)
16. Real-time Features
17. Advanced Analytics
18. Two-factor Authentication
19. Performance Optimization

---

## RECOMMENDED IMMEDIATE ACTIONS

1. **Implement Payment Module**
   - Integrate Razorpay
   - Add payment verification
   - Handle webhooks

2. **Implement Cart Module**
   - Create cart controller/service
   - Add cart management endpoints
   - Sync with checkout

3. **Implement Refund Module**
   - Create refund request flow
   - Add admin approval workflow
   - Integrate with payment gateway

4. **Complete SMS Integration**
   - Add OTP service provider
   - Implement OTP sending
   - Add OTP verification

5. **Add File Upload**
   - Integrate storage provider
   - Add image upload endpoints
   - Add image optimization

---

## ESTIMATED DEVELOPMENT TIME

**Critical Features (Phase 1):** 3-4 weeks
- Payment Module: 1 week
- Cart Module: 3-4 days
- Refund Module: 4-5 days
- SMS Integration: 2-3 days
- File Upload: 2-3 days

**High Priority Features (Phase 2):** 2-3 weeks
**Medium Priority Features (Phase 3):** 3-4 weeks

**Total Estimated Time:** 8-11 weeks for complete implementation

---

## CONCLUSION

The backend has a solid foundation with good architecture, but **approximately 40-50% of critical e-commerce features are missing or incomplete**. The most critical gaps are:

1. **Payment processing** - Platform cannot function without this
2. **Cart management** - Core shopping feature missing
3. **Refund system** - Required for customer trust
4. **Third-party integrations** - SMS, Razorpay, File Storage

The existing code is well-structured, making it relatively straightforward to add these missing features following the established patterns.
