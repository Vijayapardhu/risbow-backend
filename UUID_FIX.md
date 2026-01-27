# UUID ESM Module Fix

## Problem

The application was failing to start with the following error:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module /home/magapu/risbow-backend/node_modules/uuid/dist-node/index.js from /home/magapu/risbow-backend/dist/upload/upload.service.js not supported.
```

## Root Cause

- The `uuid` package version `^13.0.0` is an ES Module only
- When TypeScript compiles to CommonJS, `import` statements are converted to `require()`
- ES Modules cannot be loaded using `require()` in CommonJS modules
- This caused both local development and Azure deployment to fail

## Solution

Replaced all `uuid` package usage with Node.js's built-in `crypto.randomUUID()`:

### Files Changed

1. **`src/upload/upload.service.ts`**
   - Changed: `import { v4 as uuidv4 } from 'uuid';` → `import { randomUUID } from 'crypto';`
   - Replaced all `uuidv4()` calls with `randomUUID()`

2. **`src/common/middleware/correlation-id.middleware.ts`**
   - Changed: `import { v4 as uuidv4 } from 'uuid';` → `import { randomUUID } from 'crypto';`
   - Replaced `uuidv4()` with `randomUUID()`

3. **`src/vendor-products/dto/variation.dto.ts`**
   - Removed unused `uuid` import

## Benefits

1. **No External Dependency**: Uses Node.js built-in module (available since Node.js 14.17.0)
2. **Better Performance**: Native implementation is faster
3. **No ESM/CommonJS Issues**: Works seamlessly with CommonJS compilation
4. **Compatible with Node.js 22**: Fully supported in our target runtime

## Verification

- ✅ Build completes successfully: `npm run build`
- ✅ No linter errors
- ✅ All UUID generation now uses `crypto.randomUUID()`

## Note

The `uuid` package is still in `package.json` but is no longer used. It can be removed in a future cleanup if no other dependencies require it.

## Related Files Using crypto.randomUUID()

These files already use the correct approach:
- `src/cart/buy-later.service.ts`
- `src/orders/orders.service.ts`
- `src/catalog/buy-later.service.ts`
- `src/admin/admin-commission.controller.ts`
- `src/vendor-orders/packing-proof.service.ts`
