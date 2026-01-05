# RISBOW Flutter Integration Guide

## 🚀 Quick Start

### Backend URL
```
Development: http://localhost:3000
Production: https://your-domain.railway.app
```

### API Base URL
```
http://localhost:3000/api/v1
```

### Swagger Documentation
```
http://localhost:3000/api/docs
```

---

## 🔐 Authentication Flow

### 1. Send OTP
```dart
POST /api/v1/auth/otp-send

// Request
{
  "mobile": "9999999999"
}

// Response (201 Created)
{
  "message": "OTP sent successfully"
}
```

### 2. Verify OTP & Login
```dart
POST /api/v1/auth/otp-verify

// Request
{
  "mobile": "9999999999",
  "otp": "123456"
}

// Response (200 OK)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "mobile": "9999999999",
    "name": null,
    "email": null,
    "role": "CUSTOMER",  // or VENDOR, WHOLESALER, ADMIN, SUPER_ADMIN
    "coinsBalance": 0,
    "referralCode": "ABC123",
    "createdAt": "2026-01-05T07:43:16.840Z"
  }
}
```

### 3. Store Token
```dart
// Save JWT token for authenticated requests
SharedPreferences prefs = await SharedPreferences.getInstance();
await prefs.setString('token', response.access_token);
await prefs.setString('user', jsonEncode(response.user));
```

### 4. Authenticated Requests
```dart
// Add token to all API requests
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer $token'
}
```

---

## 👤 User Roles

```dart
enum UserRole {
  CUSTOMER,      // Regular shoppers
  VENDOR,        // Product sellers
  WHOLESALER,    // Bulk suppliers
  ADMIN,         // Platform admins
  SUPER_ADMIN    // System admins
}
```

### Role-Based UI
```dart
Widget buildDashboard(User user) {
  switch (user.role) {
    case 'CUSTOMER':
      return CustomerHomePage();
    case 'VENDOR':
      return VendorDashboard();
    case 'WHOLESALER':
      return WholesalerPanel();
    case 'ADMIN':
      return AdminDashboard();
    case 'SUPER_ADMIN':
      return SuperAdminConsole();
    default:
      return CustomerHomePage();
  }
}
```

---

## 📦 API Endpoints by Module

### Authentication
```dart
POST   /auth/otp-send          // Send OTP
POST   /auth/otp-verify        // Verify OTP & Login
```

### Users
```dart
GET    /users/me               // Get current user profile
POST   /users                  // Update user profile
GET    /users/me/coins         // Get coins balance
```

### Products
```dart
GET    /products               // List all products
GET    /products/:id           // Get product details
POST   /products               // Create product (VENDOR+)
PUT    /products/:id           // Update product (VENDOR+)
DELETE /products/:id           // Delete product (VENDOR+)
POST   /products/bulk          // Bulk upload (VENDOR+)
GET    /wholesale/products     // Wholesale products (WHOLESALER+)
```

### Rooms (Social Shopping)
```dart
GET    /rooms                  // List active rooms
GET    /rooms/:id              // Get room details
POST   /rooms                  // Create room
POST   /rooms/:id/join         // Join room
POST   /rooms/:id/order/:orderId  // Link order to room
```

### Orders
```dart
GET    /orders                 // List user orders
POST   /orders/checkout        // Create Razorpay order
POST   /orders/confirm         // Confirm payment
POST   /orders/:id/gift        // Add gift to order
GET    /gifts/eligible         // Check eligible gifts
```

### Vendors
```dart
POST   /vendors/register       // Register as vendor
GET    /vendors                // List vendors
POST   /vendors/banner         // Purchase banner slot
```

### Referrals
```dart
POST   /referrals/claim        // Claim referral reward
GET    /referrals/stats        // Get referral statistics
```

### Coins
```dart
POST   /coins/credit           // Credit coins (ADMIN only)
POST   /coins/debit            // Debit coins (ADMIN only)
GET    /users/me/coins         // Get balance & ledger
```

### Admin (ADMIN & SUPER_ADMIN only)
```dart
GET    /admin/analytics        // System analytics
POST   /admin/rooms            // Bulk create rooms
PATCH  /admin/banner/:id/approve    // Approve banner
PATCH  /admin/vendor/:id/verify     // Verify vendor
```

---

## 📱 Flutter Data Models

### User Model
```dart
class User {
  final String id;
  final String mobile;
  final String? name;
  final String? email;
  final String role;
  final int coinsBalance;
  final String referralCode;
  final String? referredBy;
  final DateTime createdAt;

  User({
    required this.id,
    required this.mobile,
    this.name,
    this.email,
    required this.role,
    required this.coinsBalance,
    required this.referralCode,
    this.referredBy,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      mobile: json['mobile'],
      name: json['name'],
      email: json['email'],
      role: json['role'],
      coinsBalance: json['coinsBalance'],
      referralCode: json['referralCode'],
      referredBy: json['referredBy'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

### Product Model
```dart
class Product {
  final String id;
  final String title;
  final String? description;
  final int price;
  final int stock;
  final String? imageUrl;
  final String categoryId;
  final DateTime createdAt;

  Product({
    required this.id,
    required this.title,
    this.description,
    required this.price,
    required this.stock,
    this.imageUrl,
    required this.categoryId,
    required this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      price: json['price'],
      stock: json['stock'],
      imageUrl: json['imageUrl'],
      categoryId: json['categoryId'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

### Room Model
```dart
class Room {
  final String id;
  final String name;
  final int size;
  final String status; // LOCKED, UNLOCKED, EXPIRED
  final int unlockMinOrders;
  final int unlockMinValue;
  final DateTime createdAt;

  Room({
    required this.id,
    required this.name,
    required this.size,
    required this.status,
    required this.unlockMinOrders,
    required this.unlockMinValue,
    required this.createdAt,
  });

  factory Room.fromJson(Map<String, dynamic> json) {
    return Room(
      id: json['id'],
      name: json['name'],
      size: json['size'],
      status: json['status'],
      unlockMinOrders: json['unlockMinOrders'],
      unlockMinValue: json['unlockMinValue'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

### Order Model
```dart
class Order {
  final String id;
  final String userId;
  final int totalAmount;
  final String status; // PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
  final String? roomId;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.userId,
    required this.totalAmount,
    required this.status,
    this.roomId,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      userId: json['userId'],
      totalAmount: json['totalAmount'],
      status: json['status'],
      roomId: json['roomId'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

---

## 🔧 API Service Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api/v1';

  // Get stored token
  static Future<String?> getToken() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  // Generic API request
  static Future<dynamic> request(
    String endpoint, {
    String method = 'GET',
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = {'Content-Type': 'application/json'};

    if (requiresAuth) {
      final token = await getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    http.Response response;

    switch (method) {
      case 'POST':
        response = await http.post(url, headers: headers, body: jsonEncode(body));
        break;
      case 'PUT':
        response = await http.put(url, headers: headers, body: jsonEncode(body));
        break;
      case 'DELETE':
        response = await http.delete(url, headers: headers);
        break;
      default:
        response = await http.get(url, headers: headers);
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    } else {
      throw Exception('API Error: ${response.body}');
    }
  }

  // Authentication
  static Future<void> sendOTP(String mobile) async {
    await request('/auth/otp-send',
        method: 'POST', body: {'mobile': mobile}, requiresAuth: false);
  }

  static Future<Map<String, dynamic>> verifyOTP(String mobile, String otp) async {
    return await request('/auth/otp-verify',
        method: 'POST',
        body: {'mobile': mobile, 'otp': otp},
        requiresAuth: false);
  }

  // User
  static Future<User> getProfile() async {
    final data = await request('/users/me');
    return User.fromJson(data);
  }

  // Products
  static Future<List<Product>> getProducts() async {
    final data = await request('/products');
    return (data as List).map((json) => Product.fromJson(json)).toList();
  }

  // Rooms
  static Future<List<Room>> getRooms() async {
    final data = await request('/rooms');
    return (data as List).map((json) => Room.fromJson(json)).toList();
  }

  static Future<void> joinRoom(String roomId) async {
    await request('/rooms/$roomId/join', method: 'POST');
  }

  // Orders
  static Future<Map<String, dynamic>> checkout(Map<String, dynamic> orderData) async {
    return await request('/orders/checkout', method: 'POST', body: orderData);
  }

  static Future<void> confirmOrder(Map<String, dynamic> paymentData) async {
    await request('/orders/confirm', method: 'POST', body: paymentData);
  }
}
```

---

## 💳 Razorpay Integration

### 1. Add Dependency
```yaml
dependencies:
  razorpay_flutter: ^1.3.4
```

### 2. Checkout Flow
```dart
import 'package:razorpay_flutter/razorpay_flutter.dart';

class CheckoutPage extends StatefulWidget {
  @override
  _CheckoutPageState createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  late Razorpay _razorpay;

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    // Confirm order with backend
    await ApiService.confirmOrder({
      'razorpayOrderId': response.orderId,
      'razorpayPaymentId': response.paymentId,
      'razorpaySignature': response.signature,
    });
    
    // Show success message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment Successful!')),
    );
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment Failed: ${response.message}')),
    );
  }

  Future<void> startCheckout() async {
    // Create order on backend
    final orderResponse = await ApiService.checkout({
      'items': [
        {'productId': 'prod_123', 'quantity': 2}
      ],
      'roomId': 'room_456' // Optional
    });

    // Open Razorpay
    var options = {
      'key': 'YOUR_RAZORPAY_KEY',
      'amount': orderResponse['amount'],
      'order_id': orderResponse['razorpayOrderId'],
      'name': 'RISBOW',
      'description': 'Order Payment',
      'prefill': {
        'contact': '9999999999',
        'email': 'user@example.com'
      }
    };

    _razorpay.open(options);
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }
}
```

---

## 🎯 Test Credentials

```dart
// Development/Testing
Mobile: 9999999999
OTP: 123456
Role: ADMIN (already configured)

// This user has ADMIN role for testing admin features
```

---

## 🔄 WebSocket (Rooms Real-time Updates)

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class RoomSocket {
  late IO.Socket socket;

  void connect(String roomId) {
    socket = IO.io('http://localhost:3000', <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
    });

    socket.connect();

    socket.on('connect', (_) {
      print('Connected to room socket');
      socket.emit('joinRoom', roomId);
    });

    socket.on('roomUpdate', (data) {
      print('Room updated: $data');
      // Update UI with new room status
    });

    socket.on('disconnect', (_) => print('Disconnected'));
  }

  void disconnect() {
    socket.disconnect();
  }
}
```

---

## 📊 Example Screens to Build

### Customer App
1. **Splash Screen** → Check auth → Redirect
2. **Login Screen** → OTP flow
3. **Home Screen** → Product grid, Rooms, Offers
4. **Product Details** → Add to cart, Join room
5. **Cart Screen** → Checkout
6. **Rooms Screen** → Active rooms, Join
7. **Orders Screen** → Order history
8. **Profile Screen** → User details, Coins, Referrals

### Vendor App
1. **Vendor Dashboard** → Sales stats
2. **Products Screen** → Manage products
3. **Orders Screen** → Fulfill orders
4. **Analytics Screen** → Revenue charts
5. **Banner Ads** → Purchase slots

---

## 🚀 Deployment

### Backend
Already deployed or deploy to Railway:
```bash
railway up
```

### Flutter App
Update API base URL in production:
```dart
static const String baseUrl = 'https://your-domain.railway.app/api/v1';
```

---

## 📝 Summary

✅ **Backend Ready**: 30+ API endpoints
✅ **Authentication**: OTP-based JWT
✅ **5 User Roles**: Customer, Vendor, Wholesaler, Admin, Super Admin
✅ **Payment**: Razorpay integrated
✅ **Real-time**: WebSocket for rooms
✅ **Documentation**: Swagger UI available

**Start Building!** 🎉
