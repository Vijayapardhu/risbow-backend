# RISBOW API - Swagger Testing Guide

**Last Updated:** January 21, 2026  
**API Version:** 1.0  
**Swagger UI:** http://localhost:3001/api/docs

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Gift SKU System](#gift-sku-system)
4. [Coupon Management](#coupon-management)
5. [Banner System](#banner-system)
6. [Complete Test Scenarios](#complete-test-scenarios)

---

## 🚀 Getting Started

### Access Swagger UI

```
http://localhost:3001/api/docs
```

### Quick Start Steps

1. **Login** → Get JWT token
2. **Authorize** → Click 🔓 and paste token
3. **Test** → Try any endpoint with pre-filled examples

---

## 🔐 Authentication

### Step 1: Login as Admin

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "admin@risbow.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "admin@risbow.com",
    "role": "ADMIN"
  }
}
```

### Step 2: Authorize

1. Copy the `accessToken` from response
2. Click the **🔓 Authorize** button at top of Swagger UI
3. Paste token in the value field
4. Click **Authorize** then **Close**

✅ You're now authenticated for all protected endpoints!

---

## 🎁 Gift SKU System

### Overview

Free gifts given to customers based on cart categories and eligibility rules.

### Test Flow

#### 1. Create Gift SKU (Admin)

**Endpoint:** `POST /api/v1/admin/gifts`

**Request:**
```json
{
  "title": "Premium Wireless Headphones",
  "stock": 100,
  "cost": 500,
  "eligibleCategories": ["cat_electronics", "cat_mobiles"]
}
```

**Response:**
```json
{
  "id": "gift_clx789xyz",
  "title": "Premium Wireless Headphones",
  "stock": 100,
  "cost": 500,
  "eligibleCategories": ["cat_electronics", "cat_mobiles"],
  "createdAt": "2026-01-21T09:45:00Z"
}
```

**What This Does:**
- Creates a gift that costs ₹500
- Available for Electronics and Mobiles categories
- 100 units in stock

---

#### 2. Check Eligible Gifts (Public)

**Endpoint:** `GET /api/v1/gifts/eligible?categories=cat_electronics,cat_mobiles`

**Response:**
```json
[
  {
    "id": "gift_clx789xyz",
    "title": "Premium Wireless Headphones",
    "stock": 100,
    "cost": 500,
    "eligibleCategories": ["cat_electronics", "cat_mobiles"],
    "isEligible": true,
    "createdAt": "2026-01-21T09:45:00Z"
  }
]
```

**Test Scenarios:**

| Scenario | Categories Param | Expected Result |
|----------|-----------------|-----------------|
| Cart has Electronics | `cat_electronics` | Gift returned |
| Cart has Clothing | `cat_clothing` | Empty array |
| Cart has Electronics + Mobiles | `cat_electronics,cat_mobiles` | Gift returned |
| No categories provided | (empty) | All gifts with no restrictions |

---

#### 3. Select Gift During Checkout

**Endpoint:** `POST /api/v1/checkout/select-gift`

**Request:**
```json
{
  "giftId": "gift_clx789xyz"
}
```

**Response:**
```json
{
  "message": "Gift selected successfully",
  "giftId": "gift_clx789xyz"
}
```

**Business Rules:**
- ✅ One gift per order
- ✅ Must have eligible category in cart
- ✅ Stock must be > 0
- ✅ Stock decremented only after order confirmation

---

#### 4. View Inventory Report (Admin)

**Endpoint:** `GET /api/v1/admin/gifts/inventory`

**Response:**
```json
{
  "totalGifts": 10,
  "outOfStock": 2,
  "lowStock": 3,
  "gifts": [
    {
      "id": "gift_clx123",
      "title": "Premium Headphones",
      "stock": 0,
      "cost": 500,
      "eligibleCategories": ["cat_electronics"]
    },
    {
      "id": "gift_clx456",
      "title": "Power Bank",
      "stock": 5,
      "cost": 300,
      "eligibleCategories": ["cat_electronics"]
    }
  ]
}
```

**Alerts:**
- 🔴 **Out of Stock:** stock = 0
- 🟡 **Low Stock:** stock ≤ 10

---

## 🎟️ Coupon Management

### Overview

Discount codes with validation rules, usage limits, and expiry dates.

### Test Flow

#### 1. Create Coupon (Admin)

**Endpoint:** `POST /api/v1/admin/coupons`

**Example 1: Percentage Discount**
```json
{
  "code": "NEWUSER50",
  "description": "50% off for new users",
  "discountType": "PERCENTAGE",
  "discountValue": 50,
  "minOrderAmount": 500,
  "maxDiscount": 200,
  "validFrom": "2026-01-21T00:00:00Z",
  "validUntil": "2026-02-21T23:59:59Z",
  "usageLimit": 100,
  "isActive": true
}
```

**Example 2: Flat Discount**
```json
{
  "code": "FLAT100",
  "description": "₹100 off on all orders",
  "discountType": "FLAT",
  "discountValue": 100,
  "minOrderAmount": 300,
  "validFrom": "2026-01-21T00:00:00Z",
  "usageLimit": 500,
  "isActive": true
}
```

---

#### 2. Validate Coupon (Public)

**Endpoint:** `POST /api/v1/coupons/validate`

**Request:**
```json
{
  "code": "NEWUSER50",
  "cartTotal": 1200
}
```

**Response (Valid):**
```json
{
  "isValid": true,
  "message": "Coupon applied successfully",
  "discountAmount": 200,
  "finalAmount": 1000,
  "coupon": {
    "id": "coupon_123",
    "code": "NEWUSER50",
    "discountType": "PERCENTAGE",
    "discountValue": 50,
    "maxDiscount": 200
  }
}
```

**Response (Invalid):**
```json
{
  "isValid": false,
  "message": "Minimum order amount of ₹500 required"
}
```

---

#### 3. Discount Calculation Examples

| Cart Total | Coupon | Calculation | Discount | Final Amount |
|-----------|--------|-------------|----------|--------------|
| ₹1200 | NEWUSER50 (50%, max ₹200) | 1200 × 50% = ₹600, capped at ₹200 | ₹200 | ₹1000 |
| ₹600 | NEWUSER50 (50%, max ₹200) | 600 × 50% = ₹300, capped at ₹200 | ₹200 | ₹400 |
| ₹400 | NEWUSER50 (50%, max ₹200) | 400 × 50% = ₹200 | ₹200 | ₹200 |
| ₹500 | FLAT100 | Flat ₹100 | ₹100 | ₹400 |

---

#### 4. Apply Coupon to Checkout

**Endpoint:** `POST /api/v1/checkout/apply-coupon`

**Request:**
```json
{
  "code": "NEWUSER50"
}
```

**Response:**
```json
{
  "message": "Coupon applied successfully",
  "isValid": true,
  "discountAmount": 200,
  "finalAmount": 1000
}
```

---

#### 5. Get User's Available Coupons

**Endpoint:** `GET /api/v1/users/me/coupons`

**Response:**
```json
[
  {
    "id": "coupon_123",
    "code": "NEWUSER50",
    "description": "50% off for new users",
    "discountType": "PERCENTAGE",
    "discountValue": 50,
    "minOrderAmount": 500,
    "maxDiscount": 200,
    "validFrom": "2026-01-21T00:00:00Z",
    "validUntil": "2026-02-21T23:59:59Z",
    "usageLimit": 100,
    "usedCount": 25,
    "isActive": true
  }
]
```

---

## 🖼️ Banner System

### Overview

Promotional banners with slot-based placement, vendor capabilities, and analytics.

### Slot System Explained

```
slotType: "HOME"          → Page identifier (HOME, CATEGORY, SEARCH, etc.)
slotKey: "CAROUSEL"       → Exact placement (CAROUSEL, TOP_BANNER, etc.)
slotIndex: 1              → Position order (0, 1, 2...)
priority: 100             → Display priority (higher = more important)
```

**Example:**
- `HOME / CAROUSEL / 0` = First image in home page carousel
- `HOME / CAROUSEL / 1` = Second image in home page carousel
- `CATEGORY / TOP_BANNER / 0` = Top banner on category page

---

### Test Flow

#### 1. Create System Banner (Admin)

**Endpoint:** `POST /api/v1/admin/banners`

**Request:**
```json
{
  "imageUrl": "https://cdn.example.com/banner.png",
  "redirectUrl": "/category/mobiles",
  "slotType": "HOME",
  "slotKey": "CAROUSEL",
  "slotIndex": 0,
  "priority": 100,
  "startDate": "2026-01-22T00:00:00Z",
  "endDate": "2026-01-30T23:59:59Z",
  "isActive": true
}
```

**Response:**
```json
{
  "id": "banner_abc123",
  "imageUrl": "https://cdn.example.com/banner.png",
  "redirectUrl": "/category/mobiles",
  "slotType": "HOME",
  "startDate": "2026-01-22T00:00:00Z",
  "endDate": "2026-01-30T23:59:59Z",
  "isActive": true,
  "metadata": {
    "slotKey": "CAROUSEL",
    "slotIndex": 0,
    "priority": 100,
    "isPaid": false
  }
}
```

---

## 🧪 Complete Test Scenarios

### Scenario 1: Complete Checkout with Gift + Coupon

**Steps:**

1. **Add items to cart**
   ```
   POST /api/v1/cart/items
   { "productId": "prod_123", "quantity": 2 }
   ```

2. **Check eligible gifts**
   ```
   GET /api/v1/gifts/eligible?categories=cat_electronics
   ```

3. **Select gift**
   ```
   POST /api/v1/checkout/select-gift
   { "giftId": "gift_789" }
   ```

4. **Validate coupon**
   ```
   POST /api/v1/coupons/validate
   { "code": "NEWUSER50", "cartTotal": 1200 }
   ```

5. **Apply coupon**
   ```
   POST /api/v1/checkout/apply-coupon
   { "code": "NEWUSER50" }
   ```

6. **Complete checkout**
   ```
   POST /api/v1/checkout
   {
     "paymentMode": "ONLINE",
     "shippingAddressId": "addr_123"
   }
   ```

**Expected Result:**
- Order created with gift attached
- Coupon discount applied
- Gift stock decremented by 1
- Coupon usedCount incremented by 1

---

## 📊 API Organization in Swagger

APIs are organized into logical groups with emojis for easy navigation:

### 🎁 Promotions & Marketing
- **Gifts** - Free gift management
- **Coupons** - Discount codes
- **Banners** - Promotional banners

### 💳 Shopping Flow
- **Cart** - Shopping cart
- **Checkout** - Order processing
- **Payments** - Payment handling

### 📦 Catalog
- **Products** - Product catalog
- **Catalog** - Categories
- **Vendors** - Vendor management

### 📋 Orders
- **Orders** - Order management
- **Refunds** - Refund processing
- **Returns** - Return requests

### ⚙️ Admin
- **Admin** - Platform management
- **Analytics** - Business insights
- **Audit** - Activity logs

---

## 🔍 Tips for Testing

### 1. Use the "Try it out" Button
Click "Try it out" on any endpoint to enable editing of request parameters.

### 2. Pre-filled Examples
All request bodies have example values pre-filled. Just click "Execute"!

### 3. Response Schemas
Expand the response section to see the complete data structure.

### 4. Error Responses
Check the error response examples to understand failure scenarios.

### 5. Sequential Testing
Follow the test scenarios in order for best results.

---

## ❓ Common Issues

### Issue: 401 Unauthorized
**Solution:** Make sure you're authenticated. Click 🔓 and paste your JWT token.

### Issue: 403 Forbidden
**Solution:** Your user role doesn't have permission. Use an admin account.

### Issue: 404 Not Found
**Solution:** Check if the resource ID exists. Try listing all resources first.

### Issue: 400 Bad Request
**Solution:** Check request body format. Ensure all required fields are provided.

---

**Happy Testing! 🚀**
