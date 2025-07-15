const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agpxjkmubrrtkxfhjmjm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncHhqa211YnJydGt4ZmhqbWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjMwNDEyMywiZXhwIjoyMDU3ODgwMTIzfQ.mZaThLJYeK-AbiOo6DigPcq2rnQChFv0rxF73OgmP2E';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const missingDispatchers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'dispatch.kumasi@gmail.com',
    password: 'FireStation102!',
    name: 'Ama Osei'
  },
  {
    id: '38e8046f-ae3c-4f52-bb22-fc26fcf00ca4',
    email: 'dispatch.bolgatanga@gmail.com',
    password: 'FireStation110!',
    name: 'Aisha Mohammed'
  }
];

async function createMissingDispatchers() {
  for (const dispatcher of missingDispatchers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: dispatcher.email,
        password: dispatcher.password,
        user_metadata: {
          name: dispatcher.name,
          role: 'dispatcher'
        },
        user_id: dispatcher.id // Set the UUID to match the dispatchers table
      });
      if (error) {
        console.error(`Error creating user for ${dispatcher.email}:`, error.message);
      } else {
        console.log(`Created auth user for ${dispatcher.email}`);
      }
    } catch (err) {
      console.error(`Unexpected error for ${dispatcher.email}:`, err.message);
    }
  }
}

createMissingDispatchers();