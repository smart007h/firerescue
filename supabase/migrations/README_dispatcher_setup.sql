-- Script to create dispatcher authentication users
-- This script should be run after the migration files

-- Step 1: Create auth users for dispatchers (this needs to be done via Supabase Admin API)
-- For each dispatcher, you need to create an auth user with the following:

/*
Example using Supabase Admin API (JavaScript):

const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createDispatcherUser(email, password, fullName, dispatcherId) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    user_metadata: {
      full_name: fullName,
      role: 'dispatcher',
      dispatcher_id: dispatcherId
    },
    email_confirm: true
  });
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  
  return data.user;
}

// Create dispatcher users
await createDispatcherUser('john.dispatcher@firerescue.com', 'SecurePass123!', 'John Dispatcher', 'FS001');
await createDispatcherUser('sarah.commander@firerescue.com', 'SecurePass123!', 'Sarah Commander', 'FS002');
await createDispatcherUser('mike.controller@firerescue.com', 'SecurePass123!', 'Mike Controller', 'FS003');

*/

-- Step 2: After creating auth users, update the dispatchers table with user_ids
-- Run these after you have the auth user IDs:

/*
UPDATE dispatchers 
SET user_id = 'USER_ID_FROM_AUTH_CREATION'
WHERE id = 'FS001';

UPDATE dispatchers 
SET user_id = 'USER_ID_FROM_AUTH_CREATION'
WHERE id = 'FS002';

UPDATE dispatchers 
SET user_id = 'USER_ID_FROM_AUTH_CREATION'
WHERE id = 'FS003';
*/

-- Step 3: Verify the setup
SELECT 
  d.id as dispatcher_id,
  d.name,
  d.email,
  d.user_id,
  p.role,
  p.full_name
FROM dispatchers d
LEFT JOIN profiles p ON p.id = d.user_id
ORDER BY d.id;

-- Step 4: Test dispatcher login functionality
-- Use the created email/password combinations to test login

-- Note: You can also create a simple Node.js script to automate this process
-- Place it in the root directory as 'create-dispatcher-users.js'
