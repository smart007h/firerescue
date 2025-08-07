const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - Use environment variables for security
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Will need this for schema changes
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMissingColumnsFix() {
  console.log('🔧 Applying missing columns fix...\n');

  try {
    // Since we can't run DDL with anon key, let's provide the SQL commands to run manually
    console.log('📋 SQL Commands to run in Supabase Dashboard SQL Editor:');
    console.log('================================================');
    console.log(`
-- Add missing columns to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS location_address text;

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Create index on coordinates for spatial queries
CREATE INDEX IF NOT EXISTS idx_incidents_coordinates ON incidents(latitude, longitude);

-- Add comments for documentation
COMMENT ON COLUMN incidents.latitude IS 'Latitude coordinate of the incident location';
COMMENT ON COLUMN incidents.longitude IS 'Longitude coordinate of the incident location';
COMMENT ON COLUMN incidents.location_address IS 'Human-readable address of the incident location';
    `);
    console.log('================================================\n');

    console.log('🔍 After running the above SQL, check if columns exist...');
    
    // Try to query with the new columns to verify they exist
    const { data, error } = await supabase
      .from('incidents')
      .select('id, location, location_address, latitude, longitude')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Columns still missing. Please run the SQL commands above in Supabase Dashboard.');
        console.log('\n📝 Steps to apply the fix:');
        console.log('1. Open your Supabase Dashboard');
        console.log('2. Go to SQL Editor');
        console.log('3. Paste and run the SQL commands shown above');
        console.log('4. Re-run this script to verify the fix');
      } else {
        console.error('❌ Other error:', error);
      }
    } else {
      console.log('✅ Columns exist! Now let\'s check the data...');
      
      // Check incidents without location_address
      const { data: incidentsToFix, error: checkError } = await supabase
        .from('incidents')
        .select('id, location, location_address')
        .is('location_address', null)
        .not('location', 'is', null);

      if (checkError) {
        console.error('❌ Error checking incidents:', checkError);
      } else {
        console.log(`📊 Found ${incidentsToFix?.length || 0} incidents needing location_address`);
        
        if (incidentsToFix && incidentsToFix.length > 0) {
          console.log('\n🔧 Fixing location addresses for existing incidents...');
          await fixLocationAddresses(incidentsToFix);
        }
      }
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

async function fixLocationAddresses(incidents) {
  console.log('Processing incidents for location address updates...');
  
  let fixed = 0;
  let errors = 0;
  
  for (const incident of incidents.slice(0, 5)) { // Process first 5 to avoid rate limits
    try {
      let locationAddress = 'Location not available';
      
      // Try to parse coordinates from location field
      if (incident.location && incident.location.includes(',')) {
        const [lat, lng] = incident.location.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          // For now, just set a placeholder. In production, you'd use reverse geocoding
          locationAddress = `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          
          // Also update the separate latitude/longitude columns
          const { error: updateError } = await supabase
            .from('incidents')
            .update({
              location_address: locationAddress,
              latitude: lat,
              longitude: lng
            })
            .eq('id', incident.id);
          
          if (updateError) {
            console.error(`❌ Error updating incident ${incident.id}:`, updateError);
            errors++;
          } else {
            console.log(`✅ Updated incident ${incident.id}`);
            fixed++;
          }
        }
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing incident ${incident.id}:`, error);
      errors++;
    }
  }
  
  console.log(`\n📊 Results: ${fixed} fixed, ${errors} errors`);
}

async function updateReportIncidentScreen() {
  console.log('\n🔧 Fixing ReportIncidentScreen.js to include location_address...');
  
  console.log('📝 The ReportIncidentScreen.js needs to be updated to include location_address when creating incidents.');
  console.log('\n💡 Required changes:');
  console.log('1. Add location_address field to the incident creation');
  console.log('2. Add latitude and longitude fields separately');
  console.log('3. Ensure proper address is captured from reverse geocoding');
  
  console.log('\n📋 Code changes needed in handleSubmit function:');
  console.log(`
// In ReportIncidentScreen.js handleSubmit function, update the incident creation:
const { data: incidentData, error: incidentError } = await supabase
  .from('incidents')
  .insert({
    reported_by: user.id,
    incident_type: formData.incidentType,
    description: formData.description,
    location: \`\${formData.location.latitude},\${formData.location.longitude}\`,
    location_address: locationAddress, // Add this line
    latitude: formData.location.latitude, // Add this line
    longitude: formData.location.longitude, // Add this line
    coordinates: formData.coordinates,
    status: 'pending',
    media_urls: [],
    station_id: nearestStation.station_id
  })
  .select()
  .single();
  `);
}

// Main execution
applyMissingColumnsFix()
  .then(() => updateReportIncidentScreen())
  .then(() => {
    console.log('\n🏁 Fix process completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Run the SQL commands in Supabase Dashboard');
    console.log('2. Update ReportIncidentScreen.js with the code changes shown above');
    console.log('3. Test creating new incidents');
    console.log('4. Check that new incidents appear in report history');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
