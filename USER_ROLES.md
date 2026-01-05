# RISBOW User Roles - Quick Reference

## Role Hierarchy

```
SUPER_ADMIN (Highest Authority)
    ↓
  ADMIN (Platform Management)
    ↓
WHOLESALER (B2B Suppliers)
    ↓
  VENDOR (Product Sellers)
    ↓
CUSTOMER (End Users)
```

---

## Permissions Matrix

| Feature | CUSTOMER | VENDOR | WHOLESALER | ADMIN | SUPER_ADMIN |
|---------|----------|--------|------------|-------|-------------|
| **Shopping** |
| Browse Products | ✅ | ✅ | ✅ | ✅ | ✅ |
| Purchase Products | ✅ | ✅ | ✅ | ✅ | ✅ |
| Join Rooms | ✅ | ✅ | ✅ | ✅ | ✅ |
| Use Coins | ✅ | ✅ | ✅ | ✅ | ✅ |
| Referrals | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Selling** |
| Add Products | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage Inventory | ❌ | ✅ | ✅ | ✅ | ✅ |
| View Sales Analytics | ❌ | ✅ | ✅ | ✅ | ✅ |
| Purchase Banners | ❌ | ✅ | ✅ | ✅ | ✅ |
| **B2B** |
| Wholesale Pricing | ❌ | ❌ | ✅ | ✅ | ✅ |
| Set MOQ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Bulk Orders | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Administration** |
| Admin Dashboard | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage All Products | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve Vendors | ❌ | ❌ | ❌ | ✅ | ✅ |
| View Analytics | ❌ | ❌ | ❌ | ✅ | ✅ |
| Moderate Content | ❌ | ❌ | ❌ | ✅ | ✅ |
| **System** |
| Manage User Roles | ❌ | ❌ | ❌ | ❌ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ❌ | ✅ |
| Database Access | ❌ | ❌ | ❌ | ❌ | ✅ |
| Deploy Updates | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Dashboard Access

| Role | Admin Dashboard | Vendor Panel | Wholesaler Panel |
|------|----------------|--------------|------------------|
| CUSTOMER | ❌ | ❌ | ❌ |
| VENDOR | ❌ | ⚠️ Future | ❌ |
| WHOLESALER | ❌ | ⚠️ Future | ⚠️ Future |
| ADMIN | ✅ | ✅ | ✅ |
| SUPER_ADMIN | ✅ | ✅ | ✅ |

---

## SQL Commands

### Assign Roles

```sql
-- Make user a CUSTOMER (default)
UPDATE "User" SET role = 'CUSTOMER' WHERE mobile = 'PHONE_NUMBER';

-- Make user a VENDOR
UPDATE "User" SET role = 'VENDOR' WHERE mobile = 'PHONE_NUMBER';

-- Make user a WHOLESALER
UPDATE "User" SET role = 'WHOLESALER' WHERE mobile = 'PHONE_NUMBER';

-- Make user an ADMIN
UPDATE "User" SET role = 'ADMIN' WHERE mobile = 'PHONE_NUMBER';

-- Make user a SUPER_ADMIN
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE mobile = 'PHONE_NUMBER';
```

### Check User Role

```sql
SELECT mobile, name, role FROM "User" WHERE mobile = 'PHONE_NUMBER';
```

### List Users by Role

```sql
-- All Admins
SELECT mobile, name, role FROM "User" WHERE role IN ('ADMIN', 'SUPER_ADMIN');

-- All Vendors
SELECT mobile, name, role FROM "User" WHERE role IN ('VENDOR', 'WHOLESALER');

-- All Customers
SELECT mobile, name, role FROM "User" WHERE role = 'CUSTOMER';
```

---

## Default Assignments

| Registration Method | Default Role |
|---------------------|--------------|
| Mobile App (Customer) | CUSTOMER |
| Vendor Registration API | VENDOR |
| Wholesaler Application | WHOLESALER |
| Manual (SQL/Admin) | ADMIN |
| System Setup | SUPER_ADMIN |

---

## Role Upgrade Path

```
CUSTOMER
  ↓ (Apply to become seller)
VENDOR
  ↓ (Meet B2B criteria)
WHOLESALER
  ↓ (Hired by platform)
ADMIN
  ↓ (Promoted by owner)
SUPER_ADMIN
```

---

## Important Notes

1. **Default Role**: All new users are `CUSTOMER` by default
2. **Vendor Table**: Users with `VENDOR` or `WHOLESALER` roles should also have an entry in the `Vendor` table
3. **Admin Access**: Only `ADMIN` and `SUPER_ADMIN` can access the admin dashboard
4. **Role Changes**: Only `SUPER_ADMIN` can change user roles (future feature)
5. **Security**: Frontend validates roles, but backend guards should also be implemented

---

## Future Enhancements

- [ ] Vendor-specific dashboard
- [ ] Wholesaler-specific dashboard  
- [ ] Role-based API guards
- [ ] Permission-based feature flags
- [ ] Audit logging for role changes
- [ ] Self-service vendor registration with approval workflow
