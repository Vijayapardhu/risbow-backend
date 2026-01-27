# Supabase Optional Configuration Fix

## Problem

The application was failing to start with the error:
```
Error: supabaseUrl is required.
```

This occurred because `SupabaseService` was trying to create a Supabase client even when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` were not set.

## Solution

Made Supabase **optional** - the application can start without Supabase credentials, but authentication features (OTP, password reset) will return appropriate errors when used.

## Changes Made

### 1. SupabaseService (`src/shared/supabase.service.ts`)
- ✅ Made client initialization optional
- ✅ Only creates client if credentials are provided
- ✅ Added `isAuthEnabled()` method to check if Supabase is configured
- ✅ All methods check if Supabase is enabled before use
- ✅ Returns `null` from `getClient()` if not configured

### 2. AuthService (`src/auth/auth.service.ts`)
- ✅ Now uses `SupabaseService` instead of creating its own client
- ✅ Checks if Supabase is enabled before using OTP/auth features
- ✅ Returns `SERVICE_UNAVAILABLE` errors when Supabase is not configured
- ✅ Replaced `console.log/error` with proper `Logger`

## Behavior

### When Supabase is Configured
- ✅ OTP sending/verification works
- ✅ Password reset works
- ✅ User registration creates Supabase auth user

### When Supabase is NOT Configured
- ✅ Application starts successfully
- ✅ Warning logged: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set. Supabase Auth integration disabled."
- ❌ OTP endpoints return: `503 SERVICE_UNAVAILABLE` with message about configuration
- ❌ Password reset returns: `503 SERVICE_UNAVAILABLE`
- ✅ User registration still works (creates user in database, skips Supabase auth)

## Environment Variables

### Required for OTP/Auth Features
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional
If not set, the application will start but OTP/auth features will be disabled.

## Migration Notes

- **No breaking changes** - existing code continues to work
- **Backward compatible** - if Supabase is configured, everything works as before
- **Graceful degradation** - application works without Supabase, just without OTP/auth

## Testing

1. **Without Supabase credentials:**
   ```bash
   # Application should start successfully
   npm start
   # Should see: "Supabase Auth integration disabled"
   ```

2. **With Supabase credentials:**
   ```bash
   # Set environment variables
   export SUPABASE_URL=...
   export SUPABASE_SERVICE_ROLE_KEY=...
   npm start
   # Should see: "✅ Supabase Auth client initialized"
   ```

3. **Test OTP endpoint without credentials:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/otp-send \
     -H "Content-Type: application/json" \
     -d '{"mobile": "+1234567890"}'
   # Should return: 503 SERVICE_UNAVAILABLE
   ```

## Related Files

- `src/shared/supabase.service.ts` - Optional Supabase service
- `src/auth/auth.service.ts` - Uses SupabaseService for auth
- `src/shared/shared.module.ts` - Provides SupabaseService globally

## Next Steps

If you want to use OTP/Auth features:
1. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Azure App Service
2. Restart the application
3. OTP/auth features will be enabled automatically

If you don't need OTP/Auth:
- Application works fine without Supabase
- All other features (file uploads, orders, etc.) use Azure services
