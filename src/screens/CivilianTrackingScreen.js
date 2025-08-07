import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../config/supabaseClient';

export default function CivilianTrackingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { incidentId, incident, returnTo } = route.params;

  const [loading, setLoading] = useState(true);
  const [incidentLocation, setIncidentLocation] = useState(null);
  const [dispatcherLocation, setDispatcherLocation] = useState(null);
  const [incidentData, setIncidentData] = useState(incident || null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrackingData = async () => {
    try {
      setLoading(true);

      // Load incident data if not provided
      if (!incidentData) {
        const { data: fetchedIncident, error: incidentError } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single();

        if (incidentError) {
          console.error('Error loading incident:', incidentError);
          Alert.alert('Error', 'Failed to load incident data');
          return;
        }

        setIncidentData(fetchedIncident);
      }

      const currentIncident = incidentData || incident;

      // Parse incident location
      if (currentIncident?.location) {
        const coords = currentIncident.location.split(',');
        if (coords.length === 2) {
          const location = {
            latitude: parseFloat(coords[0].trim()),
            longitude: parseFloat(coords[1].trim()),
          };
          setIncidentLocation(location);
        }
      }

      // Load dispatcher location if assigned
      if (currentIncident?.dispatcher_id) {
        const { data: dispatcherLoc, error: dispatcherError } = await supabase
          .from('dispatcher_locations')
          .select('latitude, longitude')
          .eq('dispatcher_id', currentIncident.dispatcher_id)
          .maybeSingle();

        if (!dispatcherError && dispatcherLoc) {
          setDispatcherLocation({
            latitude: parseFloat(dispatcherLoc.latitude),
            longitude: parseFloat(dispatcherLoc.longitude),
          });
        }
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      Alert.alert('Error', 'Failed to load tracking information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTrackingData();
  };

  const handleBackPress = () => {
    if (returnTo === 'UserReportHistory') {
      navigation.navigate('UserReportHistory');
    } else if (returnTo === 'CivilianIncidentDetails') {
      navigation.navigate('CivilianIncidentDetails', { incidentId, incident: incidentData });
    } else {
      navigation.goBack();
    }
  };

  const handleOpenChat = () => {
    if (incidentData?.status === 'resolved' || incidentData?.status === 'cancelled') {
      Alert.alert('Chat Not Available', 'Chat is no longer available for resolved or cancelled incidents. You can only view details.');
    } else if (incidentData?.dispatcher_id) {
      navigation.navigate('IncidentChat', { 
        incidentId,
        returnTo: 'CivilianTrackingScreen',
        incident: incidentData
      });
    } else {
      Alert.alert('Chat Not Available', 'Chat will be available once a dispatcher is assigned.');
    }
  };

  useEffect(() => {
    loadTrackingData();
  }, [incidentId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  const currentIncident = incidentData || incident;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Track My Emergency</Text>
          <Text style={styles.headerSubtitle}>
            {currentIncident?.incident_type || 'Emergency'} • {currentIncident?.status || 'Active'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color="#2563eb" 
            style={refreshing ? { opacity: 0.5 } : {}}
          />
        </TouchableOpacity>
      </View>

      {/* Map */}
      {incidentLocation ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: incidentLocation.latitude,
            longitude: incidentLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {/* Incident Location */}
          <Marker
            coordinate={incidentLocation}
            title="Your Emergency Location"
            pinColor="red"
          />

          {/* Dispatcher Location */}
          {dispatcherLocation && (
            <Marker
              coordinate={dispatcherLocation}
              title="Emergency Responder"
              pinColor="blue"
            />
          )}

          {/* Route between locations */}
          {dispatcherLocation && (
            <Polyline
              coordinates={[dispatcherLocation, incidentLocation]}
              strokeColor="#2563eb"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.noLocationContainer}>
          <Ionicons name="location-outline" size={64} color="#9ca3af" />
          <Text style={styles.noLocationText}>Location information not available</Text>
        </View>
      )}

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <Text style={styles.statusTitle}>Emergency Status</Text>
        </View>

        {currentIncident?.dispatcher_id ? (
          <View style={styles.statusContent}>
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.statusText}>Dispatcher assigned</Text>
            </View>
            
            {dispatcherLocation && (
              <View style={styles.statusRow}>
                <Ionicons name="location" size={20} color="#2563eb" />
                <Text style={styles.statusText}>Responder location visible on map</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.chatButton,
                (currentIncident?.status === 'resolved' || currentIncident?.status === 'cancelled') && styles.disabledButton
              ]}
              onPress={handleOpenChat}
              disabled={currentIncident?.status === 'resolved' || currentIncident?.status === 'cancelled'}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
              <Text style={styles.chatButtonText}>
                {(currentIncident?.status === 'resolved' || currentIncident?.status === 'cancelled') ? 'Chat Closed' : 'Chat with Dispatcher'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusContent}>
            <View style={styles.statusRow}>
              <Ionicons name="time" size={20} color="#f59e0b" />
              <Text style={styles.statusText}>Waiting for dispatcher assignment</Text>
            </View>
            <Text style={styles.statusSubtext}>
              A dispatcher will be assigned to your emergency shortly.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  noLocationText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  statusContent: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#374151',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
});
