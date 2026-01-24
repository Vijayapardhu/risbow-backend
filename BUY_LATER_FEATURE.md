# Buy Later Feature Implementation

## Overview
Complete implementation of the Buy Later feature with automatic price drop detection, notifications, and cart addition functionality.

## Features Implemented

### 1. Database Schema
- **BuyLater Model**: New model in Prisma schema with fields for:
  - Target price tracking
  - Current price monitoring  
  - Notification status
  - Cart addition status
  - Price drop percentage calculation
  - User and product relationships

### 2. Core Service (`src/cart/buy-later.service.ts`)
- **Add to Buy Later**: Add products with target price
- **Price Tracking**: Monitor current vs target prices
- **List Management**: Get/update/remove buy later items
- **Price Drop Processing**: Automated notifications and cart addition
- **Statistics**: Conversion tracking and analytics

### 3. API Endpoints

#### Cart Integration (`/cart/buy-later`)
- `POST /cart/buy-later` - Add product to buy later
- `GET /cart/buy-later` - Get buy later list

#### Dedicated Buy Later Controller (`/buy-later`)
- `POST /buy-later` - Add to buy later
- `GET /buy-later` - List buy later items
- `PUT /buy-later/:id` - Update buy later entry
- `DELETE /buy-later/:id` - Remove from buy later
- `GET /buy-later/stats` - User statistics
- `GET /buy-later/admin/stats` - Global statistics (admin)
- `POST /buy-later/check-price-drops` - Manual price check (admin)

### 4. Automated Price Drop Detection
- **Cron Job**: Runs every 30 minutes
- **Smart Detection**: Compares current price vs target price
- **Batch Processing**: Efficient bulk checking of all active items
- **Error Handling**: Comprehensive logging and fallback mechanisms

### 5. Notification System Integration
- **Real-time Alerts**: Instant notifications when price drops
- **Detailed Messages**: Includes price drop percentage and new price
- **Notification Types**: 'PRICE_DROP' with 'BUY_LATER' role
- **Multiple Channels**: Supports in-app and push notifications

### 6. Automatic Cart Addition
- **Seamless Integration**: Automatically adds products to cart when price drops
- **Quantity Preservation**: Maintains original desired quantity
- **Stock Validation**: Ensures items are available before adding
- **Duplicate Prevention**: Checks for existing cart items

### 7. Advanced Features
- **Variant Support**: Handles product variants
- **Price Drop Tracking**: Calculates and displays percentage drops
- **Status Management**: Active/inactive/processed states
- **Conversion Analytics**: Tracks buy later to cart conversion rates

## API Usage Examples

### Add Product to Buy Later
```typescript
POST /cart/buy-later
{
  "productId": "product_id_123",
  "variantId": "variant_id_456", // optional
  "targetPrice": 5000, // ₹50 in paise
  "quantity": 2
}
```

### Get Buy Later List
```typescript
GET /buy-later?page=1&limit=10
// Returns paginated list with current prices and drop percentages
```

### Update Buy Later Entry
```typescript
PUT /buy-later/:id
{
  "targetPrice": 4500, // Update target price
  "quantity": 1,
  "isActive": true
}
```

## Price Drop Process Flow

1. **User adds product** with target price
2. **Cron job checks** every 30 minutes for price drops
3. **When price ≤ target price**:
   - Sends notification: "Product dropped by X% to ₹Y. Added to cart!"
   - Adds product to cart automatically
   - Updates buy later entry status
   - Tracks price drop percentage
4. **User receives notification** and finds product in cart

## Technical Implementation Details

### Database Schema
```sql
model BuyLater {
  id                String    @id @default(cuid())
  userId            String
  productId         String
  variantId         String?
  targetPrice       Int       // Target price in paise
  currentPrice      Int       // Price when added
  quantity          Int       @default(1)
  isActive          Boolean   @default(true)
  isNotified        Boolean   @default(false)
  isAddedToCart    Boolean   @default(false)
  priceDropPercent  Float?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### Price Drop Algorithm
```typescript
const currentPrice = product.offerPrice || product.price;
if (currentPrice <= targetPrice) {
  const priceDropPercent = ((originalPrice - currentPrice) / originalPrice) * 100;
  // Trigger notification and cart addition
}
```

### Cron Job Schedule
- **Frequency**: Every 30 minutes
- **Efficiency**: Batch processes all active items
- **Reliability**: Error handling and retry mechanisms
- **Monitoring**: Comprehensive logging

## Benefits

### For Users
- **Never miss a deal**: Automatic notifications for price drops
- **Convenient**: Products automatically added to cart
- **Flexible**: Set target prices and desired quantities
- **Transparent**: See price drop percentages and savings

### For Business
- **Increased conversions**: Buy later items convert to cart items
- **Customer engagement**: Regular price notifications
- **Inventory insights**: Track which products have buy later interest
- **Marketing opportunities**: Target price-drop notifications

### Analytics and Insights
- **Conversion rates**: Track buy later to cart conversion
- **Popular products**: Identify products with high buy later demand
- **Price sensitivity**: Understand customer price expectations
- **Engagement metrics**: Monitor notification effectiveness

## Security and Performance

### Security
- **User isolation**: Users can only access their own buy later items
- **Input validation**: Comprehensive validation for all inputs
- **Rate limiting**: Prevent abuse of buy later functionality

### Performance
- **Efficient queries**: Optimized database queries with proper indexing
- **Batch processing**: Handle multiple items efficiently
- **Caching**: Cache frequently accessed data
- **Scalability**: Designed to handle large numbers of buy later items

## Integration Points

### Existing Features
- **Cart System**: Seamless integration with existing cart functionality
- **Notifications**: Uses existing notification infrastructure
- **Product Catalog**: Leverages existing product data and pricing
- **User Management**: Integrates with existing user system

### Future Enhancements
- **Email notifications**: Optional email alerts for price drops
- **Price prediction**: AI-powered price forecasting
- **Bulk operations**: Add multiple products to buy later
- **Wishlist integration**: Combine with existing wishlist functionality

## Monitoring and Maintenance

### Health Checks
- **Cron job monitoring**: Track price drop job execution
- **Error tracking**: Comprehensive error logging and alerting
- **Performance metrics**: Monitor response times and throughput
- **Database optimization**: Regular query performance analysis

### Analytics Dashboard
- **User statistics**: Track individual user behavior
- **Global metrics**: Monitor overall buy later performance
- **Conversion funnels**: Analyze buy later to purchase journey
- **Revenue impact**: Measure revenue from converted buy later items