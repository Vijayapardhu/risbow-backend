-- CORRECTED SQL to Add Vendor Manually
-- Removed "store_name" as it does not exist in the schema.

INSERT INTO "Vendor" (
  "id",
  "name",
  "mobile",
  "email",
  "gstNumber",
  "kycStatus",
  "role",
  "createdAt"
) VALUES (
  'ven_' || substring(md5(random()::text), 1, 10), -- Random ID
  'Super Electronics',                             -- Vendor Name (and Store Name)
  '9876543210',                                    -- Mobile
  'vendor@example.com',                            -- Email
  'GSTIN12345678',                                 -- GST
  'APPROVED',                                      -- Status
  'RETAILER',                                      -- Role
  NOW()
);
