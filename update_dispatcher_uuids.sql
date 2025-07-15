-- Update Kumasi dispatcher UUID
UPDATE dispatchers
SET id = '18408857-ec38-4352-8941-ae741b81ea3e'
WHERE email = 'dispatch.kumasi@gmail.com';

-- Update Bolgatanga dispatcher UUID
UPDATE dispatchers
SET id = '18408857-ec38-4352-8941-ae741b81ea3e'
WHERE email = 'dispatch.bolgatanga@gmail.com';

-- Verification: Show updated dispatchers
SELECT id, email, name FROM dispatchers WHERE email IN ('dispatch.kumasi@gmail.com', 'dispatch.bolgatanga@gmail.com'); 