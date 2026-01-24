# Phase 6 Track 6.1: Open-Box Delivery & QC-Return Protocol

## Proposed Changes

### [Component: Schema]
- **[MODIFY] [schema.prisma](file:///c:/office/risbow-backend/prisma/schema.prisma)**: 
    - Add `OUT_FOR_INSPECTION` and `QC_IN_PROGRESS` to `OrderStatus`.
    - Add `obdOtp` and `obdVerifiedAt` to `Order`.
    - Add `ReturnQCChecklist` model to store return inspection details.

### [Component: Orders]
- **[MODIFY] [orders.service.ts](file:///c:/office/risbow-backend/src/orders/orders.service.ts)**:
    - Add `verifyObdOtp` method.
    - Update `updateOrderStatus` to handle `OUT_FOR_INSPECTION`.

### [Component: Returns]
- **[NEW] [returns-qc.service.ts](file:///c:/office/risbow-backend/src/returns/returns-qc.service.ts)**:
    - Checklist validation logic for return pickups.
