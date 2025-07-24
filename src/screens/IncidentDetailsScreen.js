import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IncidentDetailsScreen = ({ route, navigation }) => {
  const { incident } = route.params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [incidentDetails, setIncidentDetails] = useState(incident);
  const [locationAddress, setLocationAddress] = useState('');

  useEffect(() => {
    loadIncidentDetails();
  }, [incident.id]);

  useEffect(() => {
    // Convert coordinates to address when incident details are loaded
    if (incidentDetails?.coordinates) {
      convertCoordinatesToAddress(incidentDetails.coordinates);
    }
  }, [incidentDetails]);

  const convertCoordinatesToAddress = async (coordinates) => {
    try {
      if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
        setLocationAddress('Location not available');
        return;
      }

      const { latitude, longitude } = coordinates;
      
      // First try to use the location field if it's already in address format
      if (incidentDetails.location && !incidentDetails.location.includes(',')) {
        setLocationAddress(incidentDetails.location);
        return;
      }
      
      // Use reverse geocoding to get address from coordinates
      // Add a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'FireRescueApp/1.0',
              'Accept-Language': 'en',
              'Accept': 'application/json'
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 403) {
            // If we get a 403, wait and retry once
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retryResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              { 
                headers: {
                  'User-Agent': 'FireRescueApp/1.0',
                  'Accept-Language': 'en',
                  'Accept': 'application/json'
                }
              }
            );
            
            if (!retryResponse.ok) {
              throw new Error(`Failed to fetch address: ${retryResponse.status}`);
            }
            
            const data = await retryResponse.json();
            setLocationAddress(data.display_name || 'Address not available');
            return;
          }
          throw new Error(`Failed to fetch address: ${response.status}`);
        }
        
        const data = await response.json();
        setLocationAddress(data.display_name || 'Address not available');
      } catch (fetchError) {
        console.error('Error fetching address:', fetchError);
        
        // Fallback to a simpler format if geocoding fails
        setLocationAddress(`Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error converting coordinates to address:', error);
      setLocationAddress('Error getting address');
    }
  };

  const loadIncidentDetails = async () => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    // First check if we have a valid Supabase client
    if (!supabase) {
      Alert.alert('Error', 'Database connection not initialized');
      return;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setLoading(true);
        
        // First try to get the session to ensure we're authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Authentication error');
        }

        if (!session) {
          throw new Error('No active session');
        }

        // Now fetch the incident details
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incident.id)
          .single();

        if (error) {
          console.error(`Attempt ${attempt} failed:`, error);
          if (attempt === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }

        if (!data) {
          throw new Error('No incident data found');
        }

        // If we have a station_id, fetch the station details
        if (data.station_id) {
          try {
            const { data: stationData, error: stationError } = await supabase
              .from('firefighters')
              .select('station_name, station_address, station_contact')
              .eq('station_id', data.station_id)
              .single();
            
            if (!stationError && stationData) {
              data.assigned_station = stationData;
            }
          } catch (stationError) {
            console.error('Error fetching station details:', stationError);
            // Continue without station details
          }
        }

        setIncidentDetails(data);
        return; // Success, exit the retry loop
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          let errorMessage = 'Failed to load incident details. ';
          if (error.message === 'Authentication error') {
            errorMessage += 'Please log in again.';
          } else if (error.message === 'No active session') {
            errorMessage += 'Your session has expired. Please log in again.';
          } else {
            errorMessage += 'Please check your internet connection and try again.';
          }

          Alert.alert(
            'Connection Error',
            errorMessage,
            [
              {
                text: 'Retry',
                onPress: () => loadIncidentDetails()
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      } finally {
        if (attempt === maxRetries) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadIncidentDetails();
  }, []);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('incidents')
        .update({ status: newStatus })
        .eq('id', incident.id);

      if (error) throw error;
      await loadIncidentDetails();
    } catch (error) {
      console.error('Error updating incident status:', error);
      Alert.alert('Error', 'Failed to update incident status');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#FF3B30';
      case 'in_progress':
        return '#FF9500';
      case 'resolved':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const handleTrackingPress = () => {
    navigation.navigate('IncidentTracking', { incidentId: incident.id });
  };

  const isTrackingAvailable = () => {
    return incidentDetails?.status === 'pending' || incidentDetails?.status === 'in_progress';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
        </TouchableOpacity>
        <Text style={styles.title}>Incident Details</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.incidentType}>
              {incidentDetails.incident_type ? incidentDetails.incident_type.charAt(0).toUpperCase() + incidentDetails.incident_type.slice(1) : 'Unknown Type'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(incidentDetails.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {(incidentDetails.status || '').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailText}>{locationAddress || 'Loading address...'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailText}>
              {new Date(incidentDetails.created_at).toLocaleString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(incidentDetails.priority) },
              ]}
            >
              <Text style={styles.priorityText}>
                {(incidentDetails.priority || '').toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Assigned Station</Text>
          {incidentDetails.station_id ? (
            <View style={styles.stationContainer}>
              <View style={styles.stationHeader}>
                <Text style={styles.stationName}>
                  {incidentDetails.assigned_station?.station_name || 'Loading station...'}
                </Text>
              </View>
              <View style={styles.stationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    {incidentDetails.assigned_station?.station_address || 'Address not available'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    {incidentDetails.assigned_station?.station_contact || 'Contact not available'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.noStationText}>No station assigned yet</Text>
          )}

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{incidentDetails.description}</Text>

          <Text style={styles.sectionTitle}>Status Actions</Text>
          <View style={styles.statusActions}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                incidentDetails.status === 'active' && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusUpdate('active')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  incidentDetails.status === 'active' && styles.statusButtonTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                incidentDetails.status === 'in_progress' && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusUpdate('in_progress')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  incidentDetails.status === 'in_progress' && styles.statusButtonTextActive,
                ]}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                incidentDetails.status === 'resolved' && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusUpdate('resolved')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  incidentDetails.status === 'resolved' && styles.statusButtonTextActive,
                ]}
              >
                Resolved
              </Text>
            </TouchableOpacity>
          </View>

          {isTrackingAvailable() && (
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={handleTrackingPress}
            >
              <Text style={styles.trackingButtonText}>Track Incident</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  incidentType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#000000',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    textAlign: 'center',
    color: '#000000',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  stationContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 8,
  },
  stationDetails: {
    marginTop: 20,
  },
  noStationText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default IncidentDetailsScreen;