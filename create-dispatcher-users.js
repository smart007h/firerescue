// Script to create dispatcher authentication users
// Run this after setting up your Supabase project and migration files

const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual Supabase URL and service role key
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDispatcherUser(email, password, fullName, dispatcherId) {
  console.log(`Creating dispatcher user: ${email} (${dispatcherId})`);
  
  try {
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
      console.error(`Error creating user ${email}:`, error);
      return null;
    }
    
    console.log(`✅ Created user: ${email} with ID: ${data.user.id}`);
    
    // Update the dispatchers table with the user_id
    const { error: updateError } = await supabaseAdmin
      .from('dispatchers')
      .update({ user_id: data.user.id })
      .eq('id', dispatcherId);
    
    if (updateError) {
      console.error(`Error updating dispatcher ${dispatcherId}:`, updateError);
    } else {
      console.log(`✅ Updated dispatcher ${dispatcherId} with user_id`);
    }
    
    return data.user;
  } catch (err) {
    console.error(`Exception creating user ${email}:`, err);
    return null;
  }
}

async function main() {
  console.log('🚒 Creating Fire Rescue Dispatcher Users...\n');
  
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Please update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this script');
    process.exit(1);
  }
  
  // Create dispatcher users
  const dispatchers = [
    {
      email: 'john.dispatcher@firerescue.com',
      password: 'FireRescue2024!',
      fullName: 'John Dispatcher',
      dispatcherId: 'FS001'
    },
    {
      email: 'sarah.commander@firerescue.com',
      password: 'FireRescue2024!',
      fullName: 'Sarah Commander',
      dispatcherId: 'FS002'
    },
    {
      email: 'mike.controller@firerescue.com',
      password: 'FireRescue2024!',
      fullName: 'Mike Controller',
      dispatcherId: 'FS003'
    }
  ];
  
  for (const dispatcher of dispatchers) {
    await createDispatcherUser(
      dispatcher.email,
      dispatcher.password,
      dispatcher.fullName,
      dispatcher.dispatcherId
    );
    console.log(''); // Add spacing
  }
  
  // Verify the setup
  console.log('🔍 Verifying dispatcher setup...\n');
  const { data: verification, error } = await supabaseAdmin
    .from('dispatchers')
    .select(`
      id,
      name,
      email,
      user_id,
      profiles:user_id (
        role,
        full_name
      )
    `)
    .order('id');
  
  if (error) {
    console.error('Error verifying setup:', error);
  } else {
    console.table(verification);
  }
  
  console.log('\n✅ Dispatcher user creation complete!');
  console.log('\n📝 Login credentials:');
  dispatchers.forEach(d => {
    console.log(`   ${d.email} / ${d.password}`);
  });
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createDispatcherUser };
