/**
 * Test script to verify dispatcher dashboard real-time updates
 * 
 * This simulates the incident resolution workflow to ensure the dashboard
 * updates instantly when incidents are resolved.
 */

const { supabase } = require('./src/config/supabaseClient');

async function testDispatcherDashboardRealtime() {
  console.log('🔄 Testing dispatcher dashboard real-time updates...');
  
  try {
    // Find an in_progress incident assigned to a dispatcher
    const { data: incidents, error: fetchError } = await supabase
      .from('incidents')
      .select('*')
      .eq('status', 'in_progress')
      .not('dispatcher_id', 'is', null)
      .limit(1);
    
    if (fetchError) {
      console.error('❌ Error fetching test incident:', fetchError);
      return;
    }
    
    if (!incidents || incidents.length === 0) {
      console.log('⚠️  No in_progress incidents with dispatchers found.');
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
    
    // Set up real-time listener for this specific dispatcher
    console.log('👂 Setting up real-time listener for dispatcher dashboard...');
    
    const channel = supabase
      .channel('test-dispatcher-dashboard')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents',
          filter: `dispatcher_id=eq.${testIncident.dispatcher_id}`,
        },
        (payload) => {
          console.log('🎉 Dashboard real-time update received!');
          console.log('📊 Update details:', {
            event: payload.eventType,
            incident_id: payload.new.id,
            old_status: payload.old.status,
            new_status: payload.new.status,
            dispatcher_id: payload.new.dispatcher_id
          });
          
          if (payload.old.status === 'in_progress' && payload.new.status === 'resolved') {
            console.log('✅ SUCCESS: Incident resolved!');
            console.log('🔄 This should trigger:');
            console.log('   - Removal from DispatcherDashboard (in_progress filter)');
            console.log('   - Addition to DispatchIncidentHistoryScreen (resolved filter)');
            console.log('   - Instant UI update without manual refresh');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Dashboard subscription status:', status);
      });
    
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔄 Simulating incident resolution...');
    console.log('   (This is what happens when dispatcher clicks "Resolved" in DispatchIncidentDetailsScreen)');
    
    // Simulate the resolution (same as DispatchIncidentDetailsScreen.handleStatusUpdate)
    const { error: updateError } = await supabase
      .from('incidents')
      .update({ 
        status: 'resolved',
        updated_at: new Date().toISOString()
      })
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
    
    // Revert for future testing
    console.log('🔄 Reverting status for future tests...');
    await supabase
      .from('incidents')
      .update({ 
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', testIncident.id);
    
    console.log('✅ Test completed! Check logs above for real-time update confirmation.');
    console.log('');
    console.log('🎯 Expected behavior in app:');
    console.log('1. Dispatcher goes to incident details and clicks "Resolved"');
    console.log('2. Incident instantly disappears from dispatcher dashboard');
    console.log('3. Incident appears in dispatcher incident history');
    console.log('4. No manual refresh needed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testDispatcherDashboardRealtime()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test script error:', error);
      process.exit(1);
    });
}

module.exports = { testDispatcherDashboardRealtime };
