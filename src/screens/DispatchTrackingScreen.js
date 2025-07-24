const React = require('react');
const { useEffect, useState, useRef } = React;
const { View, ActivityIndicator, StyleSheet, Platform, Text, TouchableOpacity } = require('react-native');
const MapView = require('react-native-maps').default || require('react-native-maps');
const { Marker, Polyline, PROVIDER_GOOGLE } = require('react-native-maps');
const { useRoute, useNavigation } = require('@react-navigation/native');
const { supabase } = require('../config/supabaseClient');
const { Ionicons } = require('@expo/vector-icons');
const { Audio } = require('expo-av');
const { useAuth } = require('../context/AuthContext');

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
  const { user: currentUser } = useAuth ? useAuth() : { user: null };

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