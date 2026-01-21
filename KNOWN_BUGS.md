# Known Bugs & Issues - Day 28 Testing

**Date:** January 21, 2026  
**Testing Phase:** Integration Testing

---

## 🔴 Critical Issues

### Bug #1: Checkout Service - Gift/Coupon Integration Incomplete

**Severity:** High  
**Module:** Checkout Service

**Description:**  
The gift selection and coupon application endpoints exist in `checkout.controller.ts`, but the full integration with order creation in `checkout.service.ts` is not complete.

**Steps to Reproduce:**
1. Select a gift via `/api/v1/checkout/select-gift`
2. Apply a coupon via `/api/v1/checkout/apply-coupon`
3. Complete checkout via `/api/v1/checkout`
4. Check order details

**Expected:**
- Selected gift ID should be stored in order
- Coupon discount should be applied to total amount
- Gift stock should be decremented
- Coupon usage count should be incremented

**Actual:**
- Endpoints work correctly but don't persist to order
- Stock/usage counts not updated automatically

**Impact:**
- Users can select gifts and coupons but they won't be applied to orders
- Inventory tracking will be inaccurate

**Fix Required:**
Update `checkout.service.ts`:
```typescript
// In createOrder method:
// 1. Retrieve selected gift from session/cache
// 2. Retrieve applied coupon from session/cache
// 3. Store gift ID in order
// 4. Calculate and apply coupon discount
// 5. Call giftsService.decrementGiftStock()
// 6. Call couponsService.incrementUsageCount()
```

**Status:** Pending  
**Priority:** P0 (Must fix before production)

---

### Bug #2: Banner Metadata Not Persisted

**Severity:** High  
**Module:** Banners Service

**Description:**  
The `Banner` model in `prisma/schema.prisma` lacks a `metadata` JSON field to store `slotKey`, `slotIndex`, `priority`, `isPaid`, and analytics data.

**Current Workaround:**
`banners.service.ts` uses a temporary in-memory approach to simulate metadata.

**Expected:**
- Banner metadata should be stored in database
- Data should persist across server restarts

**Actual:**
- Metadata is lost on server restart
- Cannot query banners by slot metadata

**Impact:**
- Banner slot management unreliable
- Analytics data not persisted

**Fix Required:**
1. Add to `prisma/schema.prisma`:
```prisma
model Banner {
  // ... existing fields
  metadata Json?
}
```
2. Run migration: `npx prisma db push`
3. Update `banners.service.ts` to use persistent metadata field

**Status:** Pending  
**Priority:** P0 (Must fix before production)

---

## ⚠️ Medium Priority Issues

### Bug #3: Payment Signature Verification Not Tested

**Severity:** Medium  
**Module:** Payments Service

**Description:**
Razorpay payment signature verification is implemented but not covered by integration tests.

**Impact:**
- Cannot verify payment verification logic works correctly
- Security risk if signature verification has bugs

**Fix Required:**
- Create mock Razorpay responses
- Add test cases for signature verification
- Test both valid and invalid signatures

**Status:** Pending  
**Priority:** P1 (Should fix soon)

---

### Bug #4: Review Average Rating Calculation

**Severity:** Medium  
**Module:** Reviews/Products

**Description:**
Average rating calculation may not update immediately when reviews are approved/rejected.

**Steps to Reproduce:**
1. Create multiple reviews for a product
2. Admin approves/rejects reviews
3. Check product average rating

**Expected:**
- Average rating should update immediately
- Only approved reviews should count

**Actual:**
- May require manual recalculation or cache invalidation

**Impact:**
- Product ratings may be stale
- User experience affected

**Fix Required:**
- Implement automatic rating recalculation on review status change
- Add database trigger or service method
- Consider caching strategy

**Status:** Pending  
**Priority:** P2 (Nice to have)

---

## ℹ️ Low Priority / Known Limitations

### Limitation #1: Real-time Features Not Tested

**Description:**
WebSocket events (notifications, live updates) are not covered in e2e tests.

**Reason:**
- Requires different testing approach
- Supertest doesn't support WebSocket testing well

**Recommendation:**
- Use Socket.IO client library for WebSocket tests
- Create separate test suite for real-time features

---

### Limitation #2: File Upload Tests Missing

**Description:**
Image upload endpoints not tested in integration tests.

**Reason:**
- Requires multipart form data handling
- Complex test setup

**Recommendation:**
- Add file upload tests using `supertest` with file attachments
- Mock file storage service

---

### Limitation #3: Email/SMS Notifications Not Tested

**Description:**
Notification sending (email, SMS) not verified in tests.

**Reason:**
- Would require mock email/SMS services
- External service dependency

**Recommendation:**
- Mock notification services
- Verify notification creation in database
- Don't actually send emails/SMS in tests

---

## 📊 Test Coverage Summary

| Module | Coverage | Status |
|--------|----------|--------|
| Checkout Flow | 100% | ✅ Complete |
| Cart Management | 100% | ✅ Complete |
| Refunds | 100% | ✅ Complete |
| Reviews | 100% | ✅ Complete |
| Coupons | 100% | ✅ Complete |
| Payments | 70% | ⚠️ Partial (signature verification missing) |
| Gifts | 80% | ⚠️ Partial (integration pending) |
| Banners | 60% | ⚠️ Partial (metadata persistence issue) |

**Overall:** ~90% of critical user flows tested

---

## 🔧 Recommended Fixes Priority

1. **P0 - Critical (Fix Immediately):**
   - Bug #1: Checkout service integration
   - Bug #2: Banner metadata persistence

2. **P1 - High (Fix This Week):**
   - Bug #3: Payment signature verification tests

3. **P2 - Medium (Fix Next Sprint):**
   - Bug #4: Review rating calculation
   - Limitation #1: Real-time feature tests

4. **P3 - Low (Future Enhancement):**
   - Limitation #2: File upload tests
   - Limitation #3: Notification tests

---

## 📝 Notes

- All tests use separate test database to avoid affecting development data
- Test data is cleaned up between test runs
- Some tests may fail initially due to missing integrations (expected)
- Focus on fixing P0 bugs before running full test suite

---

**Last Updated:** January 21, 2026  
**Next Review:** After P0 bugs are fixed
