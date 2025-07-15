const { createClient } = require('@supabase/supabase-js');

// === FILL THESE IN ===
const supabaseUrl = 'https://agpxjkmubrrtkxfhjmjm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncHhqa211YnJydGt4ZmhqbWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjMwNDEyMywiZXhwIjoyMDU3ODgwMTIzfQ.mZaThLJYeK-AbiOo6DigPcq2rnQChFv0rxF73OgmP2E';
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

async function main() {
  // 1. Get all dispatchers
  const { data: dispatchers, error } = await supabase
    .from('dispatchers')
    .select('*');

  if (error) {
    console.error('Error fetching dispatchers:', error);
    return;
  }

  console.log(`Found ${dispatchers.length} dispatchers to process`);

  for (const dispatcher of dispatchers) {
    console.log(`\nProcessing dispatcher: ${dispatcher.email}`);
    
    // Validate email
    if (!isValidEmail(dispatcher.email)) {
      console.log(`❌ Skipping dispatcher with invalid email: ${dispatcher.email}`);
      continue;
    }

    // Validate id is a UUID
    if (!dispatcher.id || !isUUID(dispatcher.id)) {
      console.log(`❌ Skipping dispatcher with invalid or missing UUID id: ${dispatcher.email}`);
      continue;
    }

    // Set a password
    const password = dispatcher.password || 'TempPassword123!';

    console.log(`Creating Auth user for: ${dispatcher.email} with id: ${dispatcher.id}`);

    // Try to create Auth user directly (no checking)
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: dispatcher.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: dispatcher.full_name || '',
        phone: dispatcher.phone || ''
      },
      id: dispatcher.id
    });

    if (userError) {
      if (userError.message.includes('already been registered') || userError.code === 'email_exists') {
        console.log(`⚠️  User already exists for ${dispatcher.email} - skipping`);
      } else {
        console.error(`❌ Error creating user for ${dispatcher.email}:`, userError.message);
      }
      continue;
    }

    console.log(`✅ Created Auth user for ${dispatcher.email} with id ${dispatcher.id}`);
  }

  console.log('\nMigration completed!');
}

main().catch(console.error);