const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - Use environment variables for security
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addLocationAddressColumn() {
  console.log('🔧 Adding location_address column to incidents table...\n');

  try {
    // First, let's check the current table structure
    console.log('1. Checking current incidents table structure...');
    const { data: currentIncidents, error: checkError } = await supabase
      .from('incidents')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Error accessing incidents table:', checkError);
      return;
    }

    if (currentIncidents && currentIncidents.length > 0) {
      console.log('📋 Current columns:', Object.keys(currentIncidents[0]));
      
      if (currentIncidents[0].hasOwnProperty('location_address')) {
        console.log('✅ location_address column already exists!');
        return;
      }
    }

    console.log('\n2. Adding location_address column...');
    
    // Note: Direct DDL operations require special permissions or need to be done through Supabase dashboard
    // For now, let's provide instructions for manual addition
    
    console.log('⚠️  The location_address column needs to be added manually.');
    console.log('');
    console.log('📋 Please follow these steps:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard (https://supabase.com/dashboard)');
    console.log('2. Navigate to your project');
    console.log('3. Go to Table Editor');
    console.log('4. Select the "incidents" table');
    console.log('5. Click "Add Column" or use the SQL Editor');
    console.log('');
    console.log('🔧 SQL Command to run:');
    console.log('');
    console.log('ALTER TABLE incidents ADD COLUMN location_address TEXT;');
    console.log('');
    console.log('Or through the UI:');
    console.log('- Column name: location_address');
    console.log('- Type: text');
    console.log('- Nullable: true (allow null values)');
    console.log('- Default: (leave empty)');
    console.log('');
    console.log('💡 Alternative: Use the SQL file created at add_location_address_column.sql');

  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

// Run the migration check
addLocationAddressColumn()
  .then(() => {
    console.log('\n🏁 Migration check completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
