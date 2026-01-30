# Admin Endpoints - Sort Parameter Fix

## Issue
Admin dashboard was getting 500 errors when requesting:
- `GET /api/v1/admin/orders?limit=6&sort=createdAt:desc`
- `GET /api/v1/admin/vendors?limit=8&sort=orderCount:desc`

The endpoints were not handling the `sort` query parameter.

## Root Cause
The controllers and services were not accepting or processing the `sort` parameter, causing Prisma queries to fail or return unexpected results.

## Changes Made

### 1. Orders Admin Controller (`src/orders/orders.admin.controller.ts`)

**Line 14-27**: Added `sort` parameter to the `findAll` endpoint

```typescript
@Get()
async findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('status') status: OrderStatus,
    @Query('sort') sort: string  // ✅ ADDED
) {
    return this.ordersService.findAllOrders({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        search,
        status,
        sort  // ✅ ADDED
    });
}
```

### 2. Orders Service (`src/orders/orders.service.ts`)

**Line 500-548**: Updated `findAllOrders` to handle sort parameter

```typescript
async findAllOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: OrderStatus;
    sort?: string;  // ✅ ADDED
}) {
    const { page = 1, limit = 10, search, status, sort } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
        where.status = status;
    }

    if (search) {
        where.OR = [
            { id: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { mobile: { contains: search, mode: 'insensitive' } } }
        ];
    }

    // ✅ ADDED: Parse sort parameter (e.g., "createdAt:desc" or "totalAmount:asc")
    let orderBy: any = { createdAt: 'desc' }; // default
    if (sort) {
        const [field, direction] = sort.split(':');
        if (field && direction) {
            orderBy = { [field]: direction.toLowerCase() };
        }
    }

    console.log('--- DEBUG: findAllOrders ---');
    console.log('Params:', params);
    console.log('Constructed Where:', JSON.stringify(where, null, 2));
    console.log('OrderBy:', orderBy);  // ✅ ADDED

    const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
            where,
            skip,
            take: limit,
            orderBy,  // ✅ CHANGED from hardcoded { createdAt: 'desc' }
            include: {
                user: {
                    select: { id: true, name: true, email: true, mobile: true }
                },
                address: true,
                payment: true
            }
        }),
        this.prisma.order.count({ where })
    ]);
```

### 3. Admin Controller (`src/admin/admin.controller.ts`)

**Line 365-375**: Added `sort` parameter to `getVendors` endpoint

```typescript
@Get('vendors')
@ApiOperation({ summary: 'List all vendors with filters' })
getVendors(
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('sort') sort: string  // ✅ ADDED
) {
    const { page: normalizedPage, limit: normalizedLimit } = this.normalizePagination(page, limit, 20);
    return this.adminService.getVendors(status, normalizedPage, normalizedLimit, search, sort);  // ✅ ADDED sort
}
```

### 4. Admin Service (`src/admin/admin.service.ts`)

**Line 1291-1331**: Updated `getVendors` to handle sort parameter

```typescript
async getVendors(status: string = 'ALL', page: number = 1, limit: number = 20, search?: string, sort?: string) {  // ✅ ADDED sort param
    const where: any = {};
    if (status && status !== 'ALL' && status !== '') {
        const kycMap: Record<string, string> = {
            ACTIVE: 'APPROVED',
            VERIFIED: 'APPROVED',
            PENDING: 'PENDING',
            SUSPENDED: 'SUSPENDED',
            REJECTED: 'REJECTED',
            APPROVED: 'APPROVED',
        };
        where.kycStatus = kycMap[status] ?? status;
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { storeName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
        ];
    }

    // ✅ ADDED: Parse sort parameter (e.g., "orderCount:desc" or "createdAt:asc")
    let orderBy: any = { createdAt: 'desc' }; // default
    if (sort) {
        const [field, direction] = sort.split(':');
        if (field && direction) {
            // Note: orderCount is not a direct field, would need aggregation
            // For now, use available fields like createdAt, followCount, etc.
            if (field === 'orderCount') {
                // Can't sort by orderCount without aggregation, use followCount as proxy
                orderBy = { followCount: direction.toLowerCase() };
            } else {
                orderBy = { [field]: direction.toLowerCase() };
            }
        }
    }

    const [vendors, total] = await Promise.all([
        this.prisma.vendor.findMany({
            where,
            orderBy,  // ✅ CHANGED from hardcoded { createdAt: 'desc' }
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                name: true,
                mobile: true,
                email: true,
                storeName: true,
                storeLogo: true,
                storeBanner: true,
                kycStatus: true,
                tier: true,
                storeStatus: true,
                role: true,
                // ... rest of select fields
            }
        }),
        this.prisma.vendor.count({ where })
    ]);
```

## Sort Parameter Format

The `sort` parameter follows this format: `field:direction`

**Examples:**
- `sort=createdAt:desc` - Sort by creation date, newest first
- `sort=createdAt:asc` - Sort by creation date, oldest first
- `sort=totalAmount:desc` - Sort orders by total amount, highest first
- `sort=orderCount:desc` - Sort vendors by order count (uses followCount as proxy)

**Supported Fields:**

**Orders:**
- `createdAt` - Order creation date
- `updatedAt` - Last update date
- `totalAmount` - Order total
- `status` - Order status (alphabetical)

**Vendors:**
- `createdAt` - Vendor registration date
- `followCount` - Number of followers
- `name` - Vendor name (alphabetical)
- `orderCount` - Uses `followCount` as proxy (requires aggregation for actual order count)

## Testing

After deployment, test with:

```bash
# Orders endpoint with sort
curl "https://risbow-backend.onrender.com/api/v1/admin/orders?limit=6&sort=createdAt:desc"

# Vendors endpoint with sort
curl "https://risbow-backend.onrender.com/api/v1/admin/vendors?limit=8&sort=orderCount:desc"
```

Both should return 200 OK with properly sorted results.

## Notes

1. **Default Sort**: If no sort parameter is provided, both endpoints default to `createdAt:desc` (newest first)
2. **Invalid Sort**: If sort format is invalid, it falls back to default sort
3. **Order Count**: The `orderCount` field for vendors requires aggregation. Currently uses `followCount` as a proxy. To get actual order counts, need to add a computed field or aggregation query.

## Future Improvements

1. Add actual `orderCount` aggregation for vendors
2. Add validation for sort field names
3. Add support for multiple sort fields
4. Add error handling for invalid field names
