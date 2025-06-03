import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  FlatList,
} from 'react-native';
import { supabase } from '../config/supabaseClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Icons from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

// Use a simpler conditional approach for icons
const IconComponent = Platform.OS === 'web' ? Icons.FontAwesome : Icons.Ionicons;

export default function IncidentTrackingScreen() {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [firefighters, setFirefighters] = useState([]);
  const [firefighterLocation, setFirefighterLocation] = useState(null);
  const [incidentLocation, setIncidentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [responseStatus, setResponseStatus] = useState(null);
  const [isFirefighter, setIsFirefighter] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const { incidentId } = route.params;
  const mapRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log('Loading incident with ID:', incidentId);
    loadInitialData();
  }, [incidentId]);

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      if (!latitude || !longitude) {
        setLocationAddress('Location not available');
        return;
      }
      
      // First try to use the location field if it's already in address format
      if (incident?.location && !incident.location.includes(',')) {
        setLocationAddress(incident.location);
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

  const loadInitialData = async () => {
    try {
      console.log('Starting to load initial data');
      setLoading(true);
      setError(null);
      
      // Get current session and refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's a session error, log it but don't immediately navigate away
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Try to refresh the session before giving up
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          console.error('Failed to refresh session:', refreshError);
          // Only navigate away if we're sure the session is invalid
          if (refreshError && refreshError.message.includes('JWT')) {
          setError('Session expired. Please login again.');
          navigation.navigate('Welcome');
          return;
          }
        }
      }

      // If we have a session or successfully refreshed, continue loading incident data
      // Load incident details with station information
      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select(`
          *,
          incident_responses (
            id,
            status,
            firefighter_id
          )
        `)
        .eq('id', incidentId)
        .single();

      if (incidentError) {
        if (incidentError.message.includes('JWT')) {
          // Token expired, try to refresh and retry
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshedSession) {
            setError('Session expired. Please login again.');
            navigation.navigate('Welcome');
            return;
          }
          // Retry the query with new session
          const { data: retryData, error: retryError } = await supabase
            .from('incidents')
            .select(`
              *,
              incident_responses (
                id,
                status,
                firefighter_id
              )
            `)
            .eq('id', incidentId)
            .single();

          if (retryError) {
            console.error('Error loading incident data:', retryError);
            setError('Failed to load incident data. Please try again.');
            return;
          }
          
          incidentData = retryData;
        } else {
          console.error('Error loading incident data:', incidentError);
          setError('Failed to load incident data. Please try again.');
          return;
        }
      }

      if (!incidentData) {
        setError('Incident not found');
        return;
      }

      // If we have a station_id, fetch the station details separately
      if (incidentData.station_id) {
        try {
          const { data: stationData, error: stationError } = await supabase
            .from('firefighters')
            .select('station_id, station_name, station_address')
            .eq('station_id', incidentData.station_id)
            .single();
          
          if (!stationError && stationData) {
            incidentData.station = stationData;
          }
        } catch (stationError) {
          console.error('Error fetching station details:', stationError);
          // Continue without station details
        }
      }

      setIncident(incidentData);

      // Parse incident location and get address
      if (incidentData.location) {
        try {
          const [lat, lng] = incidentData.location.split(',').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            setIncidentLocation({ latitude: lat, longitude: lng });
            await getAddressFromCoordinates(lat, lng);
          }
        } catch (locationError) {
          console.error('Error parsing location:', locationError);
          setLocationAddress('Location not available');
        }
      }

      // Load chat messages
      const { data: chatMessages, error: chatError } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!sender_id (
            full_name,
            role
          )
        `)
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (chatError) {
        console.error('Error loading chat messages:', chatError);
      } else {
        setMessages(chatMessages || []);
      }

      // Set response status from incident data
      if (incidentData.incident_responses?.[0]) {
        setResponseStatus(incidentData.incident_responses[0].status);
      }

      // Check if user is firefighter
      const { data: firefighter, error: firefighterError } = await supabase
        .from('firefighters')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (firefighterError) {
        console.error('Error checking firefighter status:', firefighterError);
      } else {
        setIsFirefighter(!!firefighter);
        if (firefighter) {
          // Start location updates for firefighters
          startLocationUpdates();
        }
      }

    } catch (err) {
      console.error('Error loading incident data:', err);
      setError(err.message || 'Failed to load incident data');
    } finally {
      setLoading(false);
    }
  };

  const startLocationUpdates = async () => {
    if (!isFirefighter) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      return await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          const { latitude, longitude, speed, heading } = location.coords;
          
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
              .from('firefighter_locations')
              .upsert({
                firefighter_id: user.id,
                incident_id: incidentId,
                latitude,
                longitude,
                speed,
                heading,
                timestamp: new Date().toISOString()
              });

            setFirefighterLocation({ latitude, longitude });
          } catch (error) {
            console.error('Error updating location:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error starting location updates:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error(userError.message);
      if (!user) {
        setError('No authenticated user found');
        return;
      }
      
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          incident_id: incidentId,
          sender_id: user.id,
          message: newMessage.trim(),
          created_at: new Date().toISOString()
        });

      if (messageError) throw new Error(messageError.message);

      setNewMessage('');
      
      // Reload messages to get the latest
      const { data: updatedMessages, error: updateError } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!sender_id (
            full_name,
            role
          )
        `)
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (updateError) {
        console.error('Error reloading messages:', updateError);
      } else {
        setMessages(updatedMessages || []);
        
        // Scroll to bottom
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const handleApproveIncident = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('incident_responses')
        .update({ status: 'approved' })
        .eq('incident_id', incidentId)
        .eq('firefighter_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error approving incident:', error);
      setError(error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500'; // Orange for pending
      case 'in_progress':
        return '#4CAF50'; // Green for in progress
      case 'approved':
        return '#2196F3'; // Blue for approved
      case 'rejected':
        return '#F44336'; // Red for rejected
      case 'completed':
        return '#9C27B0'; // Purple for completed
      default:
        return '#f3f4f6'; // Light gray for unknown status
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Response';
      case 'in_progress':
        return 'In Progress';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const handleBackPress = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: firefighter, error: firefighterError } = await supabase
            .from('firefighters')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          if (firefighterError) {
            console.error('Error checking firefighter status:', firefighterError);
            navigation.navigate('UserMain');
          } else if (firefighter) {
            navigation.navigate('FirefighterMain');
          } else {
            navigation.navigate('UserMain');
          }
        } else {
          navigation.navigate('Welcome');
        }
      } catch (error) {
        console.error('Error in handleBackPress:', error);
        navigation.navigate('Welcome');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <IconComponent 
              name={Platform.OS === 'web' ? 'arrow-left' : 'arrow-back'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Incident Tracking</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading incident details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <IconComponent 
              name={Platform.OS === 'web' ? 'arrow-left' : 'arrow-back'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Incident Tracking</Text>
            <Text style={styles.headerSubtitle}>Error</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadInitialData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <IconComponent 
              name={Platform.OS === 'web' ? 'arrow-left' : 'arrow-back'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Incident Tracking</Text>
            <Text style={styles.headerSubtitle}>Not Found</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Incident not found</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleBackPress}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <IconComponent 
            name={Platform.OS === 'web' ? 'arrow-left' : 'arrow-back'} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Incident Tracking</Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(incident?.status) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusText(incident?.status)}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('IncidentChat', { incidentId })}
        >
          <IconComponent name="chatbubble-ellipses" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.webMapPlaceholder}>
              <IconComponent name="map" size={40} color="#666" />
              <Text style={styles.webMapText}>Map view is not available on web</Text>
            </View>
          ) : (
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
              {/* Incident Location Marker */}
              {incidentLocation && (
                <Marker
                  coordinate={incidentLocation}
                  title="Incident Location"
                  pinColor="red"
                />
              )}
              
              {/* Firefighter Markers */}
              {firefighters.map(firefighter => (
                <Marker
                  key={firefighter.id}
                  coordinate={{
                    latitude: firefighter.latitude,
                    longitude: firefighter.longitude,
                  }}
                  title={`Firefighter ${firefighter.name}`}
                  pinColor="#2563eb"
                />
              ))}

              {/* Firefighter Location Marker */}
              {firefighterLocation && (
                <Marker
                  coordinate={firefighterLocation}
                  title="Firefighter Location"
                  pinColor="blue"
                />
              )}
            </MapView>
          )}
        </View>

        {/* Incident Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <IconComponent name="warning" size={24} color="#DC3545" />
            <Text style={styles.cardTitle}>{incident?.incident_type}</Text>
          </View>

          <View style={styles.detailRow}>
            <IconComponent name="time-outline" size={20} color="#666" />
            <Text style={styles.detailText}>
              Reported: {new Date(incident?.created_at).toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <IconComponent name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{locationAddress}</Text>
          </View>

          {/* Station Information */}
          {incident.station && (
          <View style={styles.stationCard}>
            <View style={styles.cardHeader}>
              <IconComponent name="business" size={24} color="#DC3545" />
              <Text style={styles.cardTitle}>Assigned Station</Text>
            </View>
            <View style={styles.stationContent}>
                <Text style={styles.stationName}>{incident.station.station_name}</Text>
                <Text style={styles.stationAddress}>{incident.station.station_address}</Text>
              <View style={styles.stationStatus}>
                <IconComponent name="time" size={16} color="#666" />
                <Text style={styles.stationStatusText}>
                  Estimated arrival time: 10-15 minutes
                </Text>
              </View>
            </View>
          </View>
          )}

          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{incident?.description}</Text>
          </View>
        </View>

        {/* Media Preview */}
        {incident?.media_urls?.length > 0 && (
          <View style={styles.mediaCard}>
            <View style={styles.cardHeader}>
              <IconComponent name="images" size={24} color="#DC3545" />
              <Text style={styles.cardTitle}>Media</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {incident.media_urls.map((media, index) => (
                <View key={index} style={styles.mediaItem}>
                  {media.type === 'image' ? (
                    <Image
                      source={{ uri: media.url }}
                      style={styles.mediaPreview}
                    />
                  ) : (
                    <View style={styles.videoPreview}>
                      <IconComponent name="play-circle" size={30} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#DC3545',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  chatButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 200,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  webMapText: {
    marginTop: 8,
    color: '#666',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  descriptionContainer: {
    marginTop: 16,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  messagesList: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  messageTime: {
    fontSize: 12,
    color: '#rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  stationContent: {
    marginTop: 12,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  stationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
  },
  stationStatusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  mediaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaItem: {
    marginRight: 12,
  },
  mediaPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  videoPreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 