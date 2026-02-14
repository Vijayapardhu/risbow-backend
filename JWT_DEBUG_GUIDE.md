# JWT Authentication Debugging Guide

## Current Issue: "Invalid Signature" Errors

The server is showing **"invalid signature"** errors because the **backend hasn't been restarted** after the `.env` file was updated with RS256 keys.

---

## Quick Fix

### Step 1: Stop the Backend Server
```bash
# Press Ctrl+C in the terminal where the server is running
# Or find and kill the process
```

### Step 2: Restart the Backend Server
```bash
cd risbow-backend
npm run start:dev
```

### Step 3: Verify RS256 is Loaded
Look for these log messages when the server starts:
```
[Nest] 12345  - 14/02/2026, 11:xx:xx am     LOG [AdminJwtStrategy] JWT Configuration: RS256 (Asymmetric)
[Nest] 12345  - 14/02/2026, 11:xx:xx am     LOG [AdminJwtStrategy] Using RS256 with public key for verification
[Nest] 12345  - 14/02/2026, 11:xx:xx am     LOG [AdminJwtStrategy] AdminJwtStrategy initialized successfully
```

If you see **"HS256 (Symmetric)"** instead, the keys are not being loaded.

---

## Enhanced Debugging

I've added enhanced logging to help diagnose the issue:

### 1. AdminJwtAuthGuard Logs
Now logs:
- Token presence and length
- Token algorithm (from header)
- Specific error reasons

### 2. AdminJwtStrategy Logs
Now logs on startup:
- Which algorithm is being used (RS256 vs HS256)
- Whether keys are properly loaded
- Initialization status

---

## Common Causes of "Invalid Signature"

### 1. Server Not Restarted (Most Likely) ✅
**Symptom**: Old tokens signed with RS256, server still using HS256
**Fix**: Restart the backend server

### 2. Wrong Keys in .env
**Symptom**: Consistent signature failures even after restart
**Check**:
```bash
# Verify keys are present
grep -E "^JWT_PRIVATE_KEY|^JWT_PUBLIC_KEY" risbow-backend/.env
```

### 3. Token Signed with Different Keys
**Symptom**: Token was created before key change
**Fix**: Clear browser storage and re-login

---

## How to Get Full Debug Logs

### Option 1: Enable Debug Mode
```bash
# Set log level to debug
export LOG_LEVEL=debug
npm run start:dev
```

### Option 2: Check Specific Logs
The enhanced guard now logs:
- Token length and preview
- Token algorithm
- Detailed error messages

### Option 3: Manual Token Verification
Decode your token to check:
```javascript
// In browser console
const token = localStorage.getItem('risbow_access_token');
const header = JSON.parse(atob(token.split('.')[0]));
console.log('Algorithm:', header.alg);
console.log('Token Type:', header.typ);
```

If `alg` is "RS256", the server must use RS256.
If `alg` is "HS256", the server must use HS256.

---

## Verification Checklist

- [ ] Backend server restarted after `.env` change
- [ ] Logs show "RS256 (Asymmetric)" on startup
- [ ] Browser storage cleared (if tokens are old)
- [ ] Admin re-logged in after server restart

---

## Emergency: Force Clear All Sessions

If you need to invalidate all existing tokens:

```sql
-- Run in database to clear all admin sessions
UPDATE "AdminSession" SET "isActive" = false;
```

Then restart the server and have all users re-login.

---

## Files Updated

1. ✅ `risbow-backend/.env` - RS256 keys enabled
2. ✅ `risbow-backend/src/admin/auth/guards/admin-jwt-auth.guard.ts` - Enhanced logging
3. ✅ `risbow-backend/src/admin/auth/strategies/admin-jwt.strategy.ts` - Enhanced logging

---

## Next Steps

1. **Restart the server** (Ctrl+C then `npm run start:dev`)
2. **Check startup logs** for RS256 confirmation
3. **Clear browser localStorage** if needed
4. **Re-login** to get fresh tokens
5. **Monitor logs** for authentication success

The enhanced logging will help diagnose any remaining issues.
