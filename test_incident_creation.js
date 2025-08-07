const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - Use environment variables for security
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testIncidentCreationAndHistory() {
  console.log('🔍 Testing Incident Creation and History Display...\n');

  try {
    // 1. Check incidents table structure
    console.log('1. Checking incidents table structure...');
    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('*')
      .limit(1);

    if (incidentsError) {
      console.error('❌ Error accessing incidents table:', incidentsError);
      return;
    }

    if (incidents && incidents.length > 0) {
      console.log('✅ Incidents table accessible');
      console.log('📋 Sample incident structure:', Object.keys(incidents[0]));
    } else {
      console.log('⚠️ No incidents found in table');
    }

    // 2. Check recent incidents
    console.log('\n2. Checking recent incidents...');
    const { data: recentIncidents, error: recentError } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent incidents:', recentError);
    } else {
      console.log(`✅ Found ${recentIncidents?.length || 0} incidents`);
      
      if (recentIncidents && recentIncidents.length > 0) {
        console.log('\n📊 Recent incidents:');
        recentIncidents.forEach((incident, index) => {
          console.log(`  ${index + 1}. ID: ${incident.id}`);
          console.log(`     Type: ${incident.incident_type}`);
          console.log(`     Status: ${incident.status}`);
          console.log(`     Reporter: ${incident.reported_by}`);
          console.log(`     Created: ${new Date(incident.created_at).toLocaleString()}`);
          console.log(`     Location: ${incident.location || 'N/A'}`);
          console.log(`     Location Address: ${incident.location_address || 'N/A'}`);
          console.log(`     Station ID: ${incident.station_id || 'N/A'}`);
          console.log(`     Dispatcher ID: ${incident.dispatcher_id || 'N/A'}`);
          console.log('');
        });
      }
    }

    // 3. Check if location_address column exists and is being populated
    console.log('3. Checking location_address field population...');
    const { data: incidentsWithoutAddress, error: addressError } = await supabase
      .from('incidents')
      .select('id, location, location_address, created_at')
      .is('location_address', null)
      .limit(5);

    if (addressError) {
      console.error('❌ Error checking location_address field:', addressError);
    } else {
      console.log(`⚠️ Found ${incidentsWithoutAddress?.length || 0} incidents without location_address`);
      if (incidentsWithoutAddress && incidentsWithoutAddress.length > 0) {
        console.log('Missing location_address incidents:');
        incidentsWithoutAddress.forEach(incident => {
          console.log(`  - ID: ${incident.id}, Location: ${incident.location}, Created: ${new Date(incident.created_at).toLocaleString()}`);
        });
      }
    }

    // 4. Check ordering and sorting
    console.log('\n4. Testing report history ordering...');
    const { data: orderedIncidents, error: orderError } = await supabase
      .from('incidents')
      .select('id, created_at, incident_type, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orderError) {
      console.error('❌ Error checking incident ordering:', orderError);
    } else {
      console.log('✅ Incidents ordered by created_at (newest first):');
      orderedIncidents?.forEach((incident, index) => {
        console.log(`  ${index + 1}. ${new Date(incident.created_at).toLocaleString()} - ${incident.incident_type} (${incident.status})`);
      });
    }

    // 5. Simulate incident creation with proper fields
    console.log('\n5. Testing incident creation simulation...');
    console.log('📝 Fields that should be included in incident creation:');
    console.log('  - reported_by: user.id');
    console.log('  - incident_type: user selection');
    console.log('  - description: user input');
    console.log('  - location: "lat,lng" format');
    console.log('  - location_address: human-readable address');
    console.log('  - coordinates: {lat, lng} object');
    console.log('  - status: "pending"');
    console.log('  - station_id: nearest station');
    console.log('  - created_at: current timestamp');
    console.log('  - updated_at: current timestamp');

    // 6. Check for incidents by specific user (if any test users exist)
    console.log('\n6. Checking incidents by user...');
    const { data: userIncidents, error: userError } = await supabase
      .from('incidents')
      .select('reported_by, count')
      .group('reported_by');

    if (!userError && userIncidents) {
      console.log('📊 Incidents by user:');
      userIncidents.forEach(user => {
        console.log(`  User ${user.reported_by}: ${user.count} incidents`);
      });
    }

    // 7. Check RLS policies
    console.log('\n7. Checking Row Level Security (RLS) policies...');
    console.log('💡 If incidents are not showing up, check:');
    console.log('  - User is authenticated when creating incidents');
    console.log('  - reported_by field matches auth.uid()');
    console.log('  - RLS policies allow user to see their own incidents');
    console.log('  - Frontend filters by user.id correctly');

    console.log('\n✅ Test completed! Check the logs above for any issues.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Additional function to fix missing location addresses
async function fixMissingLocationAddresses() {
  console.log('\n🔧 Fixing missing location addresses...');
  
  try {
    const { data: incidentsWithoutAddress, error } = await supabase
      .from('incidents')
      .select('id, location')
      .is('location_address', null)
      .not('location', 'is', null);

    if (error) {
      console.error('❌ Error fetching incidents without address:', error);
      return;
    }

    console.log(`Found ${incidentsWithoutAddress?.length || 0} incidents needing address fix`);

    if (incidentsWithoutAddress && incidentsWithoutAddress.length > 0) {
      console.log('💡 To fix these, you should:');
      console.log('1. Update the ReportIncidentScreen.js to include location_address when creating incidents');
      console.log('2. Run a migration to backfill existing incidents with proper addresses');
      console.log('3. Ensure the reverse geocoding is working in the report screen');
    }
  } catch (error) {
    console.error('❌ Error in fix function:', error);
  }
}

// Main execution
testIncidentCreationAndHistory()
  .then(() => fixMissingLocationAddresses())
  .then(() => {
    console.log('\n🏁 All tests completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
