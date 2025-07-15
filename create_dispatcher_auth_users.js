const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with your existing configuration
const supabaseUrl = 'https://agpxjkmubrrtkxfhjmjm.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncHhqa211YnJydGt4ZmhqbWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjMwNDEyMywiZXhwIjoyMDU3ODgwMTIzfQ.mZaThLJYeK-AbiOo6DigPcq2rnQChFv0rxF73OgmP2E';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Dispatcher data - Ghana Fire Station Dispatchers
const dispatchers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Kwame Asante',
    email: 'dispatch.accracentral@gmail.com',
    phone: '+233 24 123 4567',
    station_id: 'FS001',
    latitude: 5.6034,
    longitude: -0.1870,
    password: 'FireStation101!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Ama Osei',
    email: 'dispatch.kumasi@gmail.com',
    phone: '+233 20 234 5678',
    station_id: 'FS002',
    latitude: 6.6885,
    longitude: -1.6244,
    password: 'FireStation102!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Kofi Mensah',
    email: 'dispatch.takoradi@gmail.com',
    phone: '+233 26 345 6789',
    station_id: 'FS003',
    latitude: 4.9020,
    longitude: -1.7608,
    password: 'FireStation103!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Fatima Abdul',
    email: 'dispatch.tamale@gmail.com',
    phone: '+233 27 456 7890',
    station_id: 'FS004',
    latitude: 9.4035,
    longitude: -0.8423,
    password: 'FireStation104!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Yaw Darko',
    email: 'dispatch.tema@gmail.com',
    phone: '+233 28 567 8901',
    station_id: 'FS005',
    latitude: 5.6833,
    longitude: -0.0167,
    password: 'FireStation105!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Efua Addo',
    email: 'dispatch.capecoast@gmail.com',
    phone: '+233 29 678 9012',
    station_id: 'FS006',
    latitude: 5.1053,
    longitude: -1.2466,
    password: 'FireStation106!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007',
    name: 'Kwesi Boateng',
    email: 'dispatch.koforidua@gmail.com',
    phone: '+233 30 789 0123',
    station_id: 'FS007',
    latitude: 6.1043,
    longitude: -0.2613,
    password: 'FireStation107!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440008',
    name: 'Abena Sarpong',
    email: 'dispatch.sunyani@gmail.com',
    phone: '+233 31 890 1234',
    station_id: 'FS008',
    latitude: 7.3399,
    longitude: -2.3268,
    password: 'FireStation108!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009',
    name: 'Kweku Agyeman',
    email: 'dispatch.ho@gmail.com',
    phone: '+233 32 901 2345',
    station_id: 'FS009',
    latitude: 6.6038,
    longitude: 0.4710,
    password: 'FireStation109!'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Aisha Mohammed',
    email: 'dispatch.bolgatanga@gmail.com',
    phone: '+233 33 012 3456',
    station_id: 'FS010',
    latitude: 10.7854,
    longitude: -0.8513,
    password: 'FireStation110!'
  }
];

async function createDispatcherAuthUsers() {
  console.log('🚀 Starting dispatcher auth user creation...\n');
  
  const createdUsers = [];
  
  for (const dispatcher of dispatchers) {
    try {
      console.log(`Creating auth user for: ${dispatcher.name} (${dispatcher.email})`);
      
      // Create Supabase Auth user with predefined UUID
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: dispatcher.email,
        password: dispatcher.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: dispatcher.name,
          role: 'dispatcher',
          phone: dispatcher.phone
        },
        user_id: dispatcher.id // Use the predefined UUID
      });
      
      if (authError) {
        console.error(`❌ Error creating auth user for ${dispatcher.name}:`, authError.message);
        continue;
      }
      
      const userId = authData.user.id;
      console.log(`✅ Created auth user with ID: ${userId}`);
      
      // Store user info for SQL script
      createdUsers.push({
        ...dispatcher,
        auth_user_id: userId
      });
      
    } catch (error) {
      console.error(`❌ Unexpected error for ${dispatcher.name}:`, error.message);
    }
  }
  
  console.log('\n📋 SUMMARY:');
  console.log(`Created ${createdUsers.length} auth users out of ${dispatchers.length} dispatchers\n`);
  
  // Output the SQL INSERT statements with actual UUIDs
  console.log('📝 SQL INSERT STATEMENTS (copy these to create_dispatchers_with_auth.sql):\n');
  console.log('INSERT INTO dispatchers (');
  console.log('    id,');
  console.log('    email,');
  console.log('    full_name,');
  console.log('    phone,');
  console.log('    station_id,');
  console.log('    password,');
  console.log('    latitude,');
  console.log('    longitude,');
  console.log('    created_at,');
  console.log('    updated_at');
  console.log(') VALUES');
  
  createdUsers.forEach((user, index) => {
    const comma = index < createdUsers.length - 1 ? ',' : ';';
    console.log(`-- ${user.name} (${user.station_id})`);
    console.log(`('${user.auth_user_id}',`);
    console.log(` '${user.email}',`);
    console.log(` '${user.name}',`);
    console.log(` '${user.phone}',`);
    console.log(` '${user.station_id}',`);
    console.log(` '${user.password}',`);
    console.log(` ${user.latitude},`);
    console.log(` ${user.longitude},`);
    console.log(` NOW(),`);
    console.log(` NOW())${comma}`);
    console.log('');
  });
  
  // Output login credentials
  console.log('🔐 LOGIN CREDENTIALS FOR DISPATCHERS:');
  console.log('=====================================');
  createdUsers.forEach(user => {
    console.log(`${user.name}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  UUID: ${user.auth_user_id}`);
    console.log('');
  });
  
  console.log('✅ Migration completed!');
  console.log('📝 Next steps:');
  console.log('1. Copy the SQL INSERT statements above to create_dispatchers_with_auth.sql');
  console.log('2. Replace the placeholder UUIDs with the actual UUIDs shown above');
  console.log('3. Run the SQL script in Supabase');
  console.log('4. Test dispatcher login in your app');
}

// Run the migration
createDispatcherAuthUsers().catch(console.error); 