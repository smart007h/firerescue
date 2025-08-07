const { createClient } = require('@supabase/supabase-js');

// Use environment variables for security
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIncidents() {
  console.log('=== Checking all incidents in database ===');
  
  const { data: incidents, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching incidents:', error);
    return;
  }
  
  console.log('Total incidents found:', incidents?.length || 0);
  console.log('\n=== Incident Details ===');
  
  incidents?.forEach((incident, index) => {
    console.log(`\nIncident ${index + 1}:`);
    console.log(`  ID: ${incident.id}`);
    console.log(`  Type: ${incident.incident_type || incident.type || 'Unknown'}`);
    console.log(`  Status: ${incident.status}`);
    console.log(`  Reported by: ${incident.reported_by}`);
    console.log(`  Dispatcher: ${incident.dispatcher_id || 'None'}`);
    console.log(`  Station: ${incident.station_id || 'None'}`);
    console.log(`  Created: ${incident.created_at}`);
    console.log(`  Updated: ${incident.updated_at || 'Not set'}`);
    console.log(`  Location: ${incident.location || 'No location'}`);
    console.log(`  Description: ${(incident.description || '').substring(0, 100)}...`);
  });
  
  console.log('\n=== Status Summary ===');
  const statusCounts = {};
  incidents?.forEach(incident => {
    const status = incident.status || 'undefined';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Check specific dispatcher assignments
  console.log('\n=== Dispatcher Assignment Details ===');
  const dispatcherAssignments = {};
  incidents?.forEach(incident => {
    const dispatcher = incident.dispatcher_id || 'unassigned';
    if (!dispatcherAssignments[dispatcher]) {
      dispatcherAssignments[dispatcher] = { total: 0, by_status: {} };
    }
    dispatcherAssignments[dispatcher].total++;
    const status = incident.status || 'undefined';
    dispatcherAssignments[dispatcher].by_status[status] = 
      (dispatcherAssignments[dispatcher].by_status[status] || 0) + 1;
  });
  
  Object.entries(dispatcherAssignments).forEach(([dispatcher, details]) => {
    console.log(`\n  Dispatcher: ${dispatcher}`);
    console.log(`    Total incidents: ${details.total}`);
    Object.entries(details.by_status).forEach(([status, count]) => {
      console.log(`      ${status}: ${count}`);
    });
  });
}

checkIncidents().catch(console.error);
