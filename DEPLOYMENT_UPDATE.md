# Backend Deployment Update

## Changes Made

### ✅ GST (18%) Support
- **Backend**: All product prices now automatically calculate with 18% GST
- **Frontend**: Admin panel displays prices with GST included
- **API Response**: Includes separate fields:
  - `basePrice`: Original price without GST
  - `priceWithGST`: Price including 18% GST
  - `gstAmount`: Calculated GST amount
  - `gstPercentage`: Always 18%

### ✅ Admin Product Management
- **Endpoint**: `/api/v1/admin/products` (GET, POST, PATCH, DELETE)
- **Authentication**: Requires JWT token with ADMIN or SUPER_ADMIN role
- **Features**:
  - List all products with pagination
  - Search by title or ID
  - View detailed product information
  - Create new products
  - Update existing products
  - Delete products
  - View vendor offers and analytics

### ✅ Enhanced Product Data
Admin endpoint returns enriched product data:
```json
{
  "id": "product-id",
  "title": "Product Name",
  "description": "Product description",
  "basePrice": 1000,
  "priceWithGST": 1180,
  "gstAmount": 180,
  "gstPercentage": 18,
  "lowestPrice": 1180,
  "highestPrice": 1180,
  "totalStock": 50,
  "rating": 4.5,
  "status": "active",
  "vendor": {
    "id": "vendor-id",
    "name": "Vendor Name",
    "email": "vendor@example.com"
  }
}
```

## Deployment Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Environment Variables Required
```env
DATABASE_URL=postgresql://user:password@host:port/database
DIRECT_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
NODE_ENV=production
```

### Deploy to Render
1. Push code to GitHub
2. In Render dashboard, redeploy the backend service
3. Ensure build command: `npm run build`
4. Ensure start command: `node dist/main.js`
5. Set environment variables in Render dashboard

### Testing the Deployment
```bash
# Health check
curl https://your-backend-url/api/v1/health

# Login and get token
curl -X POST https://your-backend-url/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","password":"Admin@123"}'

# Get admin products
curl https://your-backend-url/api/v1/admin/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoints Updated
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/products` | List products with GST | Admin |
| GET | `/admin/products/:id` | Get product details | Admin |
| POST | `/admin/products` | Create product | Admin |
| PATCH | `/admin/products/:id` | Update product | Admin |
| DELETE | `/admin/products/:id` | Delete product | Admin |

## Frontend Integration
The Next.js admin panel now:
- ✅ Uses `/admin/products` endpoint
- ✅ Displays prices with 18% GST included
- ✅ Shows GST breakdown in product details
- ✅ Supports full CRUD operations
- ✅ Includes pagination and search

## Notes
- All prices in the system now include 18% GST by default
- GST calculation is automatic in the backend
- Frontend displays the final price to users
- Tax breakdown is available in detailed views
