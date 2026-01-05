-- Update test user to ADMIN role
UPDATE "User" 
SET role = 'ADMIN' 
WHERE mobile = '9999999999';

-- Verify the update
SELECT id, mobile, name, role FROM "User" WHERE mobile = '9999999999';
