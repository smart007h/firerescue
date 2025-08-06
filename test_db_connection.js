const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check incidents table
    console.log('\n1. Checking incidents table...');
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('*')
      .limit(5);
    
    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError);
    } else {
      console.log(`Found ${incidents.length} incidents`);
      if (incidents.length > 0) {
        console.log('Sample incident:', JSON.stringify(incidents[0], null, 2));
      }
    }
    
    // Test 2: Check profiles table
    console.log('\n2. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log(`Found ${profiles.length} profiles`);
    }
    
    // Test 3: Check firefighters table
    console.log('\n3. Checking firefighters table...');
    const { data: firefighters, error: firefightersError } = await supabase
      .from('firefighters')
      .select('*')
      .limit(3);
    
    if (firefightersError) {
      console.error('Error fetching firefighters:', firefightersError);
    } else {
      console.log(`Found ${firefighters.length} firefighters`);
    }
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testDatabaseConnection();
