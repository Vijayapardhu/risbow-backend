# RISBOW: Process Flows

This document outlines the step-by-step logic for critical business flows in the RISBOW backend.

---

### 1. Cart → Checkout → Payment → Order Confirmation

1.  **Cart Validation**: Backend verifies all items are in stock and active.
2.  **Pricing Resolution**: `PriceResolverService` computes the latest price for each item (server-side).
3.  **Inventory Reservation**: `InventoryService` creates a 15-minute lock in Redis for the requested quantities.
4.  **Order Intent**: `CheckoutService` creates an `Order` in `PENDING` state and a `Payment` in `PENDING` state.
5.  **Payment Initiation**: Razorpay order ID is generated with the exact paise amount computed by the server.
6.  **Payment Verification**:
    *   Client sends `razorpay_signature`.
    *   Backend verifies signature using HMAC-SHA256.
    *   Backend checks if order status is still `PENDING` (idempotency).
7.  **Atomic Confirmation**: Within a single DB transaction:
    *   Update `Order` to `CONFIRMED`.
    *   Update `Payment` to `SUCCESS`.
    *   Atomically deduct stock from `Product` / `ProductVariant` (Decrement where stock >= quantity).
    *   Debit `User` coins if used (Atomic check-and-set).
    *   Clear `CartItem`s.
8.  **Post-Confirmation**: Trigger asynchronous events (WhatsApp notification, Telecaller attribution, Room unlock check).

---

### 2. Abandoned Checkout → Telecaller Recovery

1.  **Abandonment Detection**: (GAP: CURRENTLY MANUAL/SYNC) A cron job should scan for `Cart`s not updated in > 30 mins with items present.
2.  **Lead Creation**: Create an `AbandonedCheckout` record with a dynamic `abandonRiskScore` (0-100).
3.  **Risk Scoring**:
    *   40%: Hesitation patterns (signals from Bow AI).
    *   30%: Cart Value (High value = High risk).
    *   20%: Technical friction (Payment failure history).
4.  **Escalation Sequence**:
    *   **T+15m**: Simple Push notification.
    *   **T+60m**: Automated WhatsApp nudge.
    *   **T+240m**: Assign to `TELECALLER` agent.
5.  **Agent Logic**: `TELECALLER` uses the dashboard to view assigned leads.
6.  **Conversion**: If user completes the order using the `abandonedCheckoutId`, the order is linked and the Telecaller's performance index increments.

---

### 3. Order → Delivery → Settlement

1.  **Delivery Confirmation**: Admin/Logistics updates order to `DELIVERED`. `deliveredAt` is timestamped.
2.  **Return Window**: A 7-day (configurable) countdown starts.
3.  **Settlement Generation**: `SettlementService` cron job scans for `DELIVERED` orders where `deliveredAt` + 7 days <= Now.
4.  **Vendor Credit**:
    *   Calculate net earnings using `OrderFinancialSnapshot`.
    *   Atomically increment `Vendor.pendingEarnings`.
    *   Mark `OrderSettlement` as `SETTLED`.
5.  **Payout Request**: Vendor requests a payout of `pendingEarnings`.
6.  **Payout Execution**: Admin approves and marks as `PAID`. `pendingEarnings` are decremented.

---

### 4. Return → Replacement Flow (NO REFUNDS)

1.  **Request Eligibility**: User requests return for a `DELIVERED` order within the window.
2.  **Evidence & Approval**: User uploads images/videos. Admin reviews and marks as `APPROVED`.
3.  **Replacement Order**:
    *   System creates a new `Order` with `totalAmount: 0`.
    *   Linked via `replacementOrder` table to the original.
    *   Status is set to `CONFIRMED`.
4.  **Stock Handling**:
    *   Replacement order deducts stock immediately.
    *   Original returned item is restocked ONLY AFTER `QC_PASSED` status.
5.  **Completion**: Replacement order follows normal fulfillment (Packed -> Shipped -> Delivered).
