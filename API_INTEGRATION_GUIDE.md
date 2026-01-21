# RISBOW API Integration Guide

This guide provides a step-by-step walkthrough for integrating the RISBOW Backend API into your frontend application (Flutter, Next.js, or React).

## 📚 Base URL
- **Local:** `http://localhost:3000/api/v1`
- **Production:** `https://api.risbow.com/api/v1`

---

## 🔐 1. Authentication Flow

RISBOW supports primarily **Email/Password** for Admins/Web and **Phone/OTP** for Mobile App users.

### A. Email & Password (Login)
Used for Admin Panel and Web Store.

1.  **Login Request:**
    `POST /auth/login`
    ```json
    { "email": "user@example.com", "password": "securepassword" }
    ```
2.  **Handle Response:**
    Store the `accessToken` in `localStorage` or `SecureStorage`.
    ```json
    {
      "accessToken": "eyJ...",
      "user": { "id": "uuid", "role": "CUSTOMER", ... }
    }
    ```
3.  **Authenticated Requests:**
    Add header: `Authorization: Bearer <accessToken>`

### B. Register New User
1.  **Register:**
    `POST /auth/register`
    ```json
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "password": "Password@123",
      "dateOfBirth": "1990-01-01",
      "gender": "Male"
    }
    ```

---

## 🛍️ 2. Product Discovery

### Browse Categories
- **Get All Categories:** `GET /catalog/categories`
- **Get Tree Structure:** `GET /catalog/categories/tree` (Useful for navigation menus)

### Browse Products
- **List Products:** `GET /products`
  - Query Params: `?page=1&limit=20&category=electronics&search=iphone`
- **Product Details:** `GET /products/:id`
  - Returns full details including `variations`, `specifications`, and `images`.

---

## 🛒 3. Cart & Checkout Lifecycle

This is the most critical flow.

### Step 1: Manage Cart
- **Add Item:** `POST /cart/items`
  ```json
  { "productId": "prod_123", "quantity": 1, "variantId": "var_456" }
  ```
- **View Cart:** `GET /cart`
  - Returns items, subtotal, and tax estimates.

### Step 2: Prepare for Checkout
Before placing an order, gather necessary details.

1.  **Select Address:**
    - List: `GET /users/me/addresses`
    - Add: `POST /users/me/addresses`

2.  **Check Coupons (Optional):**
    - List: `GET /users/me/coupons`
    - Validate: `POST /coupons/validate` `{ "code": "SALE50", "cartTotal": 1000 }`
    - Apply: `POST /checkout/apply-coupon` `{ "code": "SALE50" }`

3.  **Select Free Gift (If eligible):**
    - Check: `GET /gifts/eligible`
    - Select: `POST /checkout/select-gift` `{ "giftId": "gift_123" }`

### Step 3: Place Order
1.  **Initiate Checkout:**
    `POST /checkout`
    ```json
    {
      "shippingAddressId": "addr_123",
      "paymentMode": "ONLINE" // or "COD"
    }
    ```

2.  **Handle Payment (If ONLINE):**
    - The response includes `razorpayOrderId`.
    - Open Razorpay SDK on frontend with this ID.
    - On success, Webhook will update order status on backend.
    - **Verify Payment (Manual):** `POST /payments/verify`

---

## 👤 4. User Profile & Settings

- **Get Profile:** `GET /users/me`
- **Update Profile:** `PATCH /users/me`
- **Order History:** `GET /users/me/orders`

---

## 🚨 Error Handling

The API uses standard HTTP status codes:

- `200/201`: Success
- `400`: **Bad Request** - Validation failed (check `message` for array of errors).
- `401`: **Unauthorized** - Invalid or missing token. log user out.
- `403`: **Forbidden** - User does not have permission (e.g., Customer accessing Admin API).
- `404`: **Not Found** - Resource does not exist.
- `500`: **Internal Server Error** - Something went wrong on server.

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password is too short"],
  "error": "Bad Request"
}
```

---

## 🖼️ Images & Media
All images are hosted on Supabase Storage or an external CDN.
- URLs returned by API are full public URLs.
- For uploads, use `POST /upload/image` (Multipart/Form-data).
