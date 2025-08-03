const React = require('react');
const { useEffect, useState, useRef } = React;
const { View, ActivityIndicator, StyleSheet, Platform, Text, TouchableOpacity, Alert } = require('react-native');
const MapView = require('react-native-maps').default || require('react-native-maps');
const { Marker, Polyline, PROVIDER_GOOGLE } = require('react-native-maps');
const { useRoute, useNavigation } = require('@react-navigation/native');
const { supabase } = require('../config/supabaseClient');
const { Ionicons } = require('@expo/vector-icons');
const { Audio } = require('expo-av');

function DispatchTrackingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { incidentId } = route.params;
  const [incident, setIncident] = useState(null);
  const [incidentLocation, setIncidentLocation] = useState(null);
  const [dispatcherLocation, setDispatcherLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const notificationSound = useRef();

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      console.log('Loading incident with ID:', incidentId, 'Type:', typeof incidentId);
      
      // Load incident details - handle both UUID and text ID formats
      let incidentData = null;
      let incidentError = null;
      
      // First try: assume it's a UUID
      if (incidentId.length === 36 && incidentId.includes('-')) {
        const result = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single();
        incidentData = result.data;
        incidentError = result.error;
      } else {
        // Second try: assume it's a custom incident_id field
        const result = await supabase
          .from('incidents')
          .select('*')
          .eq('incident_id', incidentId)
          .single();
        incidentData = result.data;
        incidentError = result.error;
        
        // If that fails, try as text search on id field
        if (incidentError) {
          const result2 = await supabase
            .from('incidents')
            .select('*')
            .eq('id', incidentId.toString())
            .single();
          incidentData = result2.data;
          incidentError = result2.error;
        }
      }

      if (incidentError) {
        console.error('Error loading incident:', incidentError);
        Alert.alert('Error', `Failed to load incident details. ID: ${incidentId}`);
        return;
      }

      if (incidentData) {
        console.log('Incident data:', incidentData);
        setIncident(incidentData);
        
        if (incidentData.latitude && incidentData.longitude) {
          const location = {
            latitude: parseFloat(incidentData.latitude),
            longitude: parseFloat(incidentData.longitude)
          };
          console.log('Setting incident location:', location);
          setIncidentLocation(location);
        }

        // Get dispatcher location if dispatcher is assigned
        if (incidentData.dispatcher_id) {
          console.log('Loading dispatcher location for:', incidentData.dispatcher_id);
          
          // Check if incident has valid coordinates
          const hasValidCoordinates = incidentData.latitude && incidentData.longitude && 
                                    !isNaN(parseFloat(incidentData.latitude)) && 
                                    !isNaN(parseFloat(incidentData.longitude));
          
          if (!hasValidCoordinates) {
            console.warn('Incident has invalid coordinates, using default location');
          }
          
          // Use default coordinates if incident coordinates are invalid
          const defaultLat = hasValidCoordinates ? parseFloat(incidentData.latitude) : 5.6037; // Accra, Ghana
          const defaultLng = hasValidCoordinates ? parseFloat(incidentData.longitude) : -0.1870;
          
          // First, check if there's an existing location
          const { data: existingLocation, error: checkError } = await supabase
            .from('dispatcher_locations')
            .select('id')
            .eq('dispatcher_id', incidentData.dispatcher_id)
            .maybeSingle(); // Use maybeSingle to avoid errors when no record exists

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking dispatcher location:', checkError);
          }

          // Insert or update based on whether location exists
          const dispatcherLocationData = {
            dispatcher_id: incidentData.dispatcher_id,
            latitude: defaultLat,
            longitude: defaultLng
          };

          if (existingLocation?.id) {
            // Update existing location
            const { error: updateError } = await supabase
              .from('dispatcher_locations')
              .update(dispatcherLocationData)
              .eq('id', existingLocation.id);
            
            if (updateError) {
              console.error('Error updating dispatcher location:', updateError);
            } else {
              console.log('Successfully updated dispatcher location');
            }
          } else {
            // Insert new location
            const { error: insertError } = await supabase
              .from('dispatcher_locations')
              .insert(dispatcherLocationData);
            
            if (insertError) {
              console.error('Error creating dispatcher location:', insertError);
            } else {
              console.log('Successfully created dispatcher location');
            }
          }

          // Now try to get the location
          const { data: locationData, error: locationError } = await supabase
            .from('dispatcher_locations')
            .select('latitude, longitude')
            .eq('dispatcher_id', incidentData.dispatcher_id)
            .maybeSingle();

          if (locationError) {
            console.error('Error loading dispatcher location:', locationError);
          } else if (locationData) {
            const dispatcherLoc = {
              latitude: parseFloat(locationData.latitude),
              longitude: parseFloat(locationData.longitude)
            };
            console.log('Setting dispatcher location:', dispatcherLoc);
            setDispatcherLocation(dispatcherLoc);
          } else {
            console.log('No location data found for dispatcher');
          }
        } else {
          console.log('No dispatcher assigned yet');
        }
      }
    } catch (error) {
      console.error('Error in loadTrackingData:', error);
      Alert.alert('Error', 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = () => {
    if (incident) {
      navigation.navigate('IncidentChat', { incidentId: incident.id });
    }
  };

  // Simple direct line between points instead of using Google Directions API
  const updateRoute = () => {
    if (!incidentLocation || !dispatcherLocation) return;
    
    // Create a simple straight line between dispatcher and incident
    setRouteCoordinates([
      {
        latitude: dispatcherLocation.latitude,
        longitude: dispatcherLocation.longitude
      },
      {
        latitude: incidentLocation.latitude,
        longitude: incidentLocation.longitude
      }
    ]);
  };

  // Update route whenever dispatcher location changes
  useEffect(() => {
    updateRoute();
  }, [dispatcherLocation]);

  // Set up real-time subscription for dispatcher location updates
  useEffect(() => {
    // Temporarily disable real-time updates to avoid errors
    // TODO: Re-enable once the subscription issues are resolved
    console.log('Real-time updates temporarily disabled');
    return;
    
    if (!incident?.dispatcher_id) return;

    console.log('Setting up real-time updates for dispatcher:', incident.dispatcher_id);
    
    // Create a unique channel name
    const channelName = `dispatcher-updates-${Date.now()}`;
    
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dispatcher_locations',
          filter: `dispatcher_id=eq.${incident.dispatcher_id}`,
        },
        (payload) => {
          console.log('Received dispatcher location update:', payload);
          if (payload?.new?.latitude && payload?.new?.longitude) {
            const newLocation = {
              latitude: parseFloat(payload.new.latitude),
              longitude: parseFloat(payload.new.longitude)
            };
            console.log('Updating dispatcher location to:', newLocation);
            setDispatcherLocation(newLocation);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to dispatcher location updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to dispatcher location updates');
        }
      });

    return () => {
      console.log('Cleaning up dispatcher location subscription');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [incident?.dispatcher_id]);

  // Initial load
  useEffect(() => {
    loadTrackingData();
  }, [incidentId]);

  useEffect(() => {
    // Load notification sound
    (async () => {
      notificationSound.current = new Audio.Sound();
      try {
        await notificationSound.current.loadAsync(require('../assets/sounds/notification.mp3.wav'));
      } catch (e) { /* handle error */ }
    })();
    return () => {
      if (notificationSound.current) notificationSound.current.unloadAsync();
    };
  }, []);

  // ...existing code...

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={{ marginTop: 16 }}>Loading tracking map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: incidentLocation?.latitude || 0,
          longitude: incidentLocation?.longitude || 0,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* Incident Marker */}
        {incidentLocation && (
          <Marker
            coordinate={incidentLocation}
            title="Incident"
            pinColor="red"
          />
        )}
        {/* Dispatcher Marker */}
        {dispatcherLocation && (
          <Marker
            coordinate={dispatcherLocation}
            title="Dispatcher"
            pinColor="blue"
          />
        )}
        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF3B30"
            strokeWidth={8}
          />
        )}
      </MapView>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={handleOpenChat}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: 'red',
            borderRadius: 10,
            width: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 30,
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
module.exports = DispatchTrackingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chatButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: '#2563eb',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 20,
  },
});

module.exports = DispatchTrackingScreen;