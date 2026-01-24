# RISBOW: Implementation Checklist

### A. Money Safety Checklist
- [x] All prices resolved server-side (`PriceResolverService`).
- [x] All money stored in integers (paise).
- [x] No floating point math used in core calculations.
- [x] Financial snapshots created at checkout (`OrderFinancialSnapshot`).
- [ ] Financial snapshots marked immutable (Needs DB constraint or logic lock).
- [x] Amount verification in Payment Gateway (`PaymentsService`).
- [x] Idempotent payment verification (Signature + Status Check).
- [x] Multiple settlement window support (`SettlementService`).

---

### B. Inventory Safety Checklist
- [x] Redis-based stock reservation during checkout.
- [x] Atomic stock deduction (`updateMany` with condition `stock >= qty`).
- [x] Variant-level locking support.
- [x] No negative inventory possibility (Enforced in DB).
- [ ] Automatic release of stale Redis reservations (TTL exists, but cleanup job?).
- [x] Restocking only after QC Passed.

---

### C. Order Lifecycle Checklist
- [x] Valid state transitions only (`PENDING` -> `CONFIRMED` -> `PAID`...).
- [ ] Illegal state jump prevention (e.g. `PENDING` -> `DELIVERED`).
- [x] Transition audit logs (`AuditLog` table).
- [x] Admin override tracking.
- [x] Replacement-only policy enforced in `ReturnsService`.

---

### D. Abandoned Checkout & Telecaller Checklist
- [ ] Automated Cart -> AbandonedCheckout Lead generation.
- [x] Dynamic risk scoring implementation (`RecoveryService`).
- [x] Agent assignment logic with load balancing.
- [ ] Lock expiration for Telecaller leads (Prevent single agent hoarding).
- [x] Conversion attribution logic (Performance dashboard).

---

### E. Cron & Background Jobs Checklist
- [x] Idempotent execution (Process once per period).
- [ ] Distributed locking (BullMQ handles some, but cron needs Redis lock).
- [x] Retry safety (No double-charging on failure).
- [x] Audit logs for background worker actions.
- [x] Failure recovery (Alerting on job failure).
