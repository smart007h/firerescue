/**
 * Test script to verify real-time updates for dispatcher dashboard and history
 * 
 * This script simulates resolving an incident and checks if the real-time
 * subscriptions properly update both screens.
 */

const { supabase } = require('./src/config/supabaseClient');

async function testRealtimeUpdates() {
  console.log('🔍 Testing real-time updates for dispatcher dashboard...');
  
  try {
    // First, let's get a test incident that's currently in_progress
    const { data: incidents, error: fetchError } = await supabase
      .from('incidents')
      .select('*')
      .eq('status', 'in_progress')
      .limit(1);
    
    if (fetchError) {
      console.error('❌ Error fetching test incident:', fetchError);
      return;
    }
    
    if (!incidents || incidents.length === 0) {
      console.log('⚠️  No in_progress incidents found for testing.');
      console.log('💡 Create an incident and assign it to a dispatcher first.');
      return;
    }
    
    const testIncident = incidents[0];
    console.log('📋 Found test incident:', {
      id: testIncident.id,
      status: testIncident.status,
      dispatcher_id: testIncident.dispatcher_id,
      incident_type: testIncident.incident_type
    });
    
    // Set up a listener to monitor real-time changes
    console.log('👂 Setting up real-time listener...');
    
    const channel = supabase
      .channel('test-dispatcher-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents',
          filter: `id=eq.${testIncident.id}`,
        },
        (payload) => {
          console.log('🎉 Real-time update received!');
          console.log('📊 Payload:', {
            old_status: payload.old.status,
            new_status: payload.new.status,
            incident_id: payload.new.id
          });
          
          if (payload.new.status === 'resolved') {
            console.log('✅ Test passed! Incident successfully resolved via real-time update.');
            console.log('🔄 This update should:');
            console.log('   - Remove incident from DispatcherDashboard (in_progress filter)');
            console.log('   - Add incident to DispatchIncidentHistoryScreen (all/resolved filters)');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
    
    // Wait a moment for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔄 Updating incident status to "resolved"...');
    
    // Update the incident status to resolved
    const { error: updateError } = await supabase
      .from('incidents')
      .update({ status: 'resolved' })
      .eq('id', testIncident.id);
    
    if (updateError) {
      console.error('❌ Error updating incident:', updateError);
      return;
    }
    
    console.log('📝 Database update complete. Waiting for real-time notification...');
    
    // Wait for real-time update
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clean up
    supabase.removeChannel(channel);
    
    // Optionally, revert the change for testing purposes
    console.log('🔄 Reverting status back to in_progress for future tests...');
    await supabase
      .from('incidents')
      .update({ status: 'in_progress' })
      .eq('id', testIncident.id);
    
    console.log('✅ Test completed! Check the logs above for real-time update confirmation.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testRealtimeUpdates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test script error:', error);
      process.exit(1);
    });
}

module.exports = { testRealtimeUpdates };
