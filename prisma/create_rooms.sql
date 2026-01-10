INSERT INTO "Room" (id, name, size, status, "offerId", "startAt", "endAt", "unlockMinOrders", "unlockMinValue", "isSystemRoom", "createdAt")
VALUES 
  ('room-flash-1', 'Flash Sale Room', 10, 'ACTIVE', 'flash-sale-jan', NOW(), NOW() + INTERVAL '1 day', 5, 2500, true, NOW()),
  ('room-weekend-1', 'Weekend Bonanza', 20, 'LOCKED', 'weekend-deal', NOW() + INTERVAL '1 day', NOW() + INTERVAL '7 days', 10, 5000, true, NOW()),
  ('room-premium-1', 'Premium Members Only', 5, 'ACTIVE', 'premium-exclusive', NOW(), NOW() + INTERVAL '7 days', 3, 10000, true, NOW()),
  ('room-newyear-1', 'New Year Sale Room', 50, 'UNLOCKED', 'new-year-2026', NOW(), NOW() + INTERVAL '14 days', 25, 15000, true, NOW())
ON CONFLICT (id) DO NOTHING;
