# Circular Dependency Fixes

## Summary

Fixed all circular dependency errors by:
1. Removing `SharedModule` from imports (it's `@Global()`, so doesn't need to be imported)
2. Removing `CommonModule` from imports where it's `@Global()`
3. Using `forwardRef()` to break circular dependencies

## Modules Fixed

### 1. PaymentsModule
- **Issue**: Imported `BowModule` directly, causing circular dependency
- **Fix**: Used `forwardRef(() => BowModule)`
- **Chain**: PaymentsModule ↔ BowModule

### 2. RecommendationsModule
- **Issue**: Imported `SharedModule` (unnecessary since it's `@Global()`)
- **Fix**: Removed `SharedModule` from imports
- **Chain**: RecommendationsModule ↔ CartModule ↔ BowModule

### 3. BuyLaterModule
- **Issue**: Imported `SharedModule` and had circular dependency with `CartModule`
- **Fix**: Removed `SharedModule`, used `forwardRef(() => CartModule)`
- **Chain**: BuyLaterModule ↔ CartModule

### 4. CartModule
- **Issue**: Circular dependencies with `BuyLaterModule` and `RecommendationsModule`
- **Fix**: Used `forwardRef()` for both

### 5. BowModule
- **Issue**: Circular dependencies with `CartModule`, `RecommendationsModule`, and `PaymentsModule`
- **Fix**: Used `forwardRef()` for all three

### 6. OrdersModule
- **Issue**: Circular dependencies with `BowModule` and `RecommendationsModule`
- **Fix**: Used `forwardRef()` for both

### 7. RoomsModule
- **Issue**: Imported `SharedModule` and had circular dependency with `PaymentsModule`
- **Fix**: Removed `SharedModule`, used `forwardRef(() => PaymentsModule)`

### 8. SearchModule
- **Issue**: Imported `SharedModule` and had circular dependencies with `BowModule` and `RecommendationsModule`
- **Fix**: Removed `SharedModule`, used `forwardRef()` for both

### 9. CommonModule
- **Issue**: Imported `SharedModule` (both are `@Global()`)
- **Fix**: Removed `SharedModule` from imports

### 10. CheckoutModule
- **Issue**: Imported `SharedModule` (unnecessary)
- **Fix**: Removed `SharedModule` from imports

### 11. InventoryModule
- **Issue**: Imported `SharedModule` (unnecessary)
- **Fix**: Removed `SharedModule` from imports

### 12. ReturnsModule
- **Issue**: Imported `SharedModule` (unnecessary)
- **Fix**: Removed `SharedModule` from imports

### 13. UploadModule
- **Issue**: Imported `SharedModule` (unnecessary)
- **Fix**: Removed `SharedModule` from imports

### 14. VendorOrdersModule
- **Issue**: Imported `SharedModule` (unnecessary)
- **Fix**: Removed `SharedModule` from imports

### 15. VendorsModule
- **Issue**: Imported `PaymentsModule` directly, causing circular dependency
- **Fix**: Used `forwardRef(() => PaymentsModule)`
- **Chain**: VendorsModule → PaymentsModule → BowModule → CartModule → RecommendationsModule → VendorsModule

### 16. RecommendationsModule (Updated)
- **Issue**: Imported `VendorsModule` directly, completing circular chain
- **Fix**: Used `forwardRef(() => VendorsModule)`

## Key Principles

1. **@Global() Modules Don't Need Imports**
   - `SharedModule` is `@Global()` - remove from all imports
   - `CommonModule` is `@Global()` - remove from imports where not needed

2. **Use forwardRef() for Circular Dependencies**
   - When Module A imports Module B, and Module B imports Module A
   - Use `forwardRef(() => ModuleName)` in the imports array
   - Use `@Inject(forwardRef(() => ServiceName))` in constructor if injecting services

3. **Circular Dependency Chains**
   ```
   AppModule → QueuesModule → BowModule → CartModule → BuyLaterModule → CartModule
                                                      ↓
                                              RecommendationsModule
                                                      ↓
                                                  VendorsModule → PaymentsModule → BowModule
   ```

## Verification

All modules should now:
- ✅ Not import `SharedModule` (it's `@Global()`)
- ✅ Use `forwardRef()` for circular dependencies
- ✅ Have all imports properly defined
- ✅ Start without "undefined module" errors

## Testing

After these fixes, the application should start successfully. If you see any more circular dependency errors:

1. Check which module is failing
2. Identify the circular chain
3. Add `forwardRef()` to break the cycle
4. Remove `SharedModule` imports if present
