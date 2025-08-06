const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - USING ENVIRONMENT VARIABLES FOR SECURITY
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

// For now, let's use the anon key and see what we can access
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function synchronizeIncidentStatuses() {
  try {
    console.log('=== Incident Status Synchronization ===');
    console.log('This script will help identify and fix status inconsistencies');
    
    // First, let's check if we can access the incidents table
    console.log('\n1. Checking incidents table access...');
    
    const { data: incidents, error: fetchError } = await supabase
      .from('incidents')
      .select('id, status, dispatcher_id, reported_by, created_at, updated_at')
      .limit(5); // Just get a few to test access
    
    if (fetchError) {
      console.error('Cannot access incidents table:', fetchError.message);
      console.log('\nThis might be due to Row Level Security policies.');
      console.log('To fix status synchronization issues, you may need to:');
      console.log('1. Run this script with proper authentication');
      console.log('2. Or manually update incidents through the Supabase dashboard');
      console.log('3. Or update the RLS policies to allow this operation');
      return;
    }
    
    console.log(`Found ${incidents?.length || 0} incidents (showing first 5)`);
    
    // Show current status distribution
    const { data: allIncidents, error: allError } = await supabase
      .from('incidents')
      .select('id, status, dispatcher_id, reported_by');
    
    if (allError) {
      console.error('Error getting all incidents:', allError.message);
      return;
    }
    
    console.log('\n2. Current status distribution:');
    const statusCounts = {};
    allIncidents?.forEach(incident => {
      const status = incident.status || 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // Check for potential issues
    console.log('\n3. Checking for potential issues:');
    
    const issuesFound = [];
    
    // Check for incidents with null status
    const nullStatusIncidents = allIncidents?.filter(i => !i.status) || [];
    if (nullStatusIncidents.length > 0) {
      issuesFound.push(`${nullStatusIncidents.length} incidents with null status`);
    }
    
    // Check for incidents assigned to ama osei (FS001) that might need status updates
    const amaOseiIncidents = allIncidents?.filter(i => i.dispatcher_id === 'FS001') || [];
    console.log(`   Incidents assigned to Ama Osei (FS001): ${amaOseiIncidents.length}`);
    
    amaOseiIncidents.forEach(incident => {
      console.log(`     - ID: ${incident.id}, Status: ${incident.status || 'null'}`);
    });
    
    // Check for very old in_progress incidents (likely should be resolved)
    const { data: oldIncidents, error: oldError } = await supabase
      .from('incidents')
      .select('id, status, created_at, dispatcher_id')
      .eq('status', 'in_progress')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // More than 24 hours old
    
    if (!oldError && oldIncidents?.length > 0) {
      issuesFound.push(`${oldIncidents.length} incidents in_progress for more than 24 hours`);
    }
    
    if (issuesFound.length === 0) {
      console.log('   No obvious issues found!');
    } else {
      console.log('   Issues found:');
      issuesFound.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('\n4. Recommendations:');
    console.log('   - If civilians see "in_progress" but dispatchers see "resolved", the incident status needs updating');
    console.log('   - All incidents assigned to Ama Osei that are complete should have status "resolved"');
    console.log('   - Check the DispatcherDashboard and DispatchIncidentHistoryScreen for status updates');
    
    // If we find incidents that should be resolved, show SQL to fix them
    if (amaOseiIncidents.some(i => i.status === 'in_progress')) {
      console.log('\n5. To manually resolve Ama Osei incidents that should be resolved:');
      console.log('   Run this SQL in your Supabase dashboard:');
      console.log(`   UPDATE incidents SET status = 'resolved', updated_at = NOW() WHERE dispatcher_id = 'FS001' AND status = 'in_progress';`);
    }
    
  } catch (error) {
    console.error('Error in synchronization script:', error);
  }
}

// Create a function to update incident status (for manual use)
async function updateIncidentStatus(incidentId, newStatus) {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', incidentId)
      .select();
    
    if (error) {
      console.error('Error updating incident:', error);
      return false;
    }
    
    console.log('Successfully updated incident:', data);
    return true;
  } catch (error) {
    console.error('Error in updateIncidentStatus:', error);
    return false;
  }
}

// Run the synchronization check
synchronizeIncidentStatuses().catch(console.error);

// Export the update function for manual use
module.exports = { updateIncidentStatus };
