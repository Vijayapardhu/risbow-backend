INSERT INTO "User" (id, mobile, email, name, password, role, status, "coinsBalance", "referralCode", "createdAt", "updatedAt")
VALUES (
  'telecaller-001',
  '7777777777',
  'telecaller@risbow.com',
  'Telecaller Agent',
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  'TELECALLER',
  'ACTIVE',
  0,
  'REF-TELE-001',
  NOW(),
  NOW()
)
ON CONFLICT (mobile) DO NOTHING;
