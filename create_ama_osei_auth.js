const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with your existing configuration
const supabaseUrl = 'https://agpxjkmubrrtkxfhjmjm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncHhqa211YnJydGt4ZmhqbWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjMwNDEyMywiZXhwIjoyMDU3ODgwMTIzfQ.mZaThLJYeK-AbiOo6DigPcq2rnQChFv0rxF73OgmP2E';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Ama Osei's details
const amaOsei = {
  name: 'Ama Osei',
  email: 'dispatch.kumasi@gmail.com',
  phone: '+233 20 234 5678',
  station_id: 'FS002',
  latitude: 6.6885,
  longitude: -1.6244,
  password: 'FireStation102!'
};

async function createAmaOseiAuthUser() {
  console.log('🚀 Creating auth user for Ama Osei (Kumasi)...\n');
  
  try {
    console.log(`Creating auth user for: ${amaOsei.name} (${amaOsei.email})`);
    
    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: amaOsei.email,
      password: amaOsei.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: amaOsei.name,
        role: 'dispatcher',
        phone: amaOsei.phone
      }
    });
    
    if (authError) {
      console.error(`❌ Error creating auth user for ${amaOsei.name}:`, authError.message);
      return;
    }
    
    const userId = authData.user.id;
    console.log(`✅ Created auth user with ID: ${userId}`);
    
    console.log('\n📝 SQL UPDATE STATEMENT (copy this to create_existing_dispatcher_auth.sql):\n');
    console.log('UPDATE dispatchers');
    console.log('SET');
    console.log(`    id = '${userId}',`);
    console.log(`    email = '${amaOsei.email}',`);
    console.log(`    name = '${amaOsei.name}',`);
    console.log(`    phone = '${amaOsei.phone}',`);
    console.log(`    station_id = '${amaOsei.station_id}',`);
    console.log(`    dispatcher_id = 'FS002DISP01',`);
    console.log(`    region = 'Ashanti Region',`);
    console.log(`    password = '${amaOsei.password}',`);
    console.log(`    is_active = true,`);
    console.log(`    latitude = ${amaOsei.latitude},`);
    console.log(`    longitude = ${amaOsei.longitude},`);
    console.log(`    updated_at = NOW()`);
    console.log(`WHERE email = '${amaOsei.email}'`);
    console.log(`   OR station_id = '${amaOsei.station_id}'`);
    console.log(`   OR name LIKE '%Ama%'`);
    console.log(`   OR name LIKE '%Osei%';`);
    
    console.log('\n🔐 LOGIN CREDENTIALS FOR AMA OSEI:');
    console.log('=====================================');
    console.log(`Name: ${amaOsei.name}`);
    console.log(`Email: ${amaOsei.email}`);
    console.log(`Password: ${amaOsei.password}`);
    console.log(`UUID: ${userId}`);
    console.log(`Station: ${amaOsei.station_id} (Kumasi)`);
    console.log(`Region: Ashanti Region`);
    console.log(`Coordinates: ${amaOsei.latitude}, ${amaOsei.longitude}`);
    
    console.log('\n✅ Migration completed!');
    console.log('📝 Next steps:');
    console.log('1. Copy the SQL UPDATE statement above to create_existing_dispatcher_auth.sql');
    console.log('2. Replace the placeholder UUID with the actual UUID shown above');
    console.log('3. Run the SQL script in Supabase');
    console.log('4. Test Ama Osei login in your app');
    
  } catch (error) {
    console.error(`❌ Unexpected error for ${amaOsei.name}:`, error.message);
  }
}

// Run the migration
createAmaOseiAuthUser().catch(console.error); 