# Role-Based Access Control (RBAC) - Implementation Guide

## Overview
Added role-based access control to the RISBOW admin dashboard. Only users with `ADMIN` or `SUPER_ADMIN` roles can access the dashboard.

---

## Changes Made

### 1. Database Schema
**File**: `prisma/schema.prisma`

Added `role` field to User model:
```prisma
model User {
  id            String   @id @default(cuid())
  mobile        String   @unique
  name          String?
  email         String?  @unique
  role          UserRole @default(CUSTOMER)  // NEW
  // ... other fields
}

enum UserRole {
  CUSTOMER      // Regular shoppers
  VENDOR        // Product sellers (Retailers)
  WHOLESALER    // Bulk product suppliers
  ADMIN         // Platform administrators
  SUPER_ADMIN   // System administrators
}
```

### 2. Frontend Access Control
**File**: `public/js/app.js`

Added role validation in two places:

**A. On Login (verifyOTP function)**
```javascript
// Check if user has admin role
if (state.user.role !== 'ADMIN' && state.user.role !== 'SUPER_ADMIN') {
    UI.showError('Access Denied: You do not have permission to access the admin dashboard.');
    this.logout();
    return;
}
```

**B. On Page Load (DOMContentLoaded)**
```javascript
if (state.token && state.user) {
    // Verify user has admin role
    if (state.user.role === 'ADMIN' || state.user.role === 'SUPER_ADMIN') {
        UI.showScreen('dashboard-screen');
        Dashboard.init();
    } else {
        // Clear invalid session
        Auth.logout();
    }
}
```

---

## User Roles

### CUSTOMER (Default)
- **Purpose**: Regular shoppers and end-users
- **Permissions**:
  - Browse and purchase products
  - Join shopping rooms
  - Place orders and track deliveries
  - Earn and spend coins
  - Use referral codes
- **Dashboard Access**: ❌ No

### VENDOR
- **Purpose**: Product sellers and retailers
- **Permissions**:
  - All CUSTOMER permissions
  - Add and manage their products
  - View their sales analytics
  - Purchase banner advertisements
  - Manage inventory and pricing
- **Dashboard Access**: ⚠️ Limited (Vendor Panel - Future)
- **Note**: Vendors have a separate `Vendor` table for business details

### WHOLESALER
- **Purpose**: Bulk product suppliers (B2B)
- **Permissions**:
  - All VENDOR permissions
  - Set wholesale pricing
  - Define minimum order quantities (MOQ)
  - Manage bulk orders
  - Access B2B marketplace
- **Dashboard Access**: ⚠️ Limited (Wholesaler Panel - Future)

### ADMIN
- **Purpose**: Platform administrators
- **Permissions**:
  - Full access to admin dashboard
  - Manage all products, rooms, and orders
  - Approve vendor registrations
  - Moderate content and reviews
  - View analytics and reports
  - Cannot modify system settings
- **Dashboard Access**: ✅ Full Admin Dashboard

### SUPER_ADMIN
- **Purpose**: System administrators
- **Permissions**:
  - All ADMIN permissions
  - Manage user roles
  - Access system settings
  - Database management
  - Deploy updates
  - Full system control
- **Dashboard Access**: ✅ Full Admin Dashboard + System Settings

---

## How to Grant Admin Access

### Method 1: Using SQL (Recommended for existing users)

1. **Connect to database**:
```bash
docker exec -it risbow-backend-postgres-1 psql -U admin -d risbow
```

2. **Update user role**:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE mobile = '9999999999';
```

3. **Verify**:
```sql
SELECT id, mobile, name, role FROM "User" WHERE mobile = '9999999999';
```

4. **Exit**:
```
\q
```

### Method 2: Using Prisma Studio

1. **Open Prisma Studio**:
```bash
npx prisma studio
```

2. Navigate to the `User` table
3. Find the user by mobile number
4. Change `role` field to `ADMIN` or `SUPER_ADMIN`
5. Save changes

### Method 3: Programmatically (for new users)

Update the auth service to assign roles during registration:

```typescript
// src/auth/auth.service.ts
const user = await this.prisma.user.create({
    data: {
        mobile,
        role: 'ADMIN', // or 'SUPER_ADMIN'
        referralCode: Math.random().toString(36).substring(7).toUpperCase(),
    },
});
```

---

## Testing

### Test Admin Access

1. **Make test user an admin** (already done):
```sql
UPDATE "User" SET role = 'ADMIN' WHERE mobile = '9999999999';
```

2. **Login to dashboard**:
   - Go to: `http://localhost:3000`
   - Mobile: `9999999999`
   - OTP: `123456`
   - Should successfully access dashboard

### Test Access Denial

1. **Create a regular user**:
   - Use a different mobile number
   - Login via mobile app or API

2. **Try to access dashboard**:
   - Should see: "Access Denied: You do not have permission to access the admin dashboard."
   - Should be logged out automatically

---

## Security Considerations

### Current Implementation
✅ Frontend role validation
✅ Session persistence with role check
✅ Auto-logout for unauthorized users
✅ Default role is CUSTOMER

### Recommended Enhancements (Future)

1. **Backend Guards**:
```typescript
// Create an admin guard
@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    }
}

// Apply to admin routes
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('admin/analytics')
getAnalytics() {
    // ...
}
```

2. **Audit Logging**:
   - Log all admin actions
   - Track who made changes
   - Monitor unauthorized access attempts

3. **Role Permissions Matrix**:
   - Define granular permissions per role
   - Implement permission-based access control
   - Create role hierarchy

---

## API Endpoints (Future Enhancement)

### Suggested Admin-Only Endpoints

```typescript
// Admin Management
POST   /api/v1/admin/users/:id/role        // Change user role
GET    /api/v1/admin/users                 // List all users
DELETE /api/v1/admin/users/:id             // Delete user

// System Management
GET    /api/v1/admin/analytics              // System analytics
POST   /api/v1/admin/rooms/bulk             // Bulk create rooms
PATCH  /api/v1/admin/banner/:id/approve     // Approve banners
PATCH  /api/v1/admin/vendor/:id/verify      // Verify vendors
```

---

## Troubleshooting

### Issue: "Access Denied" for admin user

**Solution**:
1. Check user role in database:
```sql
SELECT mobile, role FROM "User" WHERE mobile = 'YOUR_MOBILE';
```

2. If role is CUSTOMER, update it:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE mobile = 'YOUR_MOBILE';
```

3. Clear browser localStorage and login again

### Issue: Dashboard shows but user is not admin

**Solution**:
1. Clear browser cache and localStorage
2. Logout and login again
3. Verify role in database

### Issue: Role field not found

**Solution**:
1. Run Prisma migration:
```bash
npx prisma db push
```

2. Regenerate Prisma client:
```bash
npx prisma generate
```

---

## Summary

✅ **Database**: Added `role` field with `UserRole` enum
✅ **Frontend**: Implemented role-based access control
✅ **Test User**: Updated to ADMIN role
✅ **Security**: Prevents unauthorized dashboard access
✅ **Documentation**: Complete implementation guide

**Next Steps**:
1. Add backend guards for API endpoints
2. Implement audit logging
3. Create admin user management interface
4. Add role-based permissions for specific features
