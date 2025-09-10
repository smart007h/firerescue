import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoPlayer from '../components/VideoPlayer';

const IncidentDetailsScreen = ({ route, navigation }) => {
  const { incident, incidentId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [incidentDetails, setIncidentDetails] = useState(incident || null);
  const [incidentMedia, setIncidentMedia] = useState([]);
  const [locationAddress, setLocationAddress] = useState('');
  const [isCivilianUser, setIsCivilianUser] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('');

  // Get the actual incident ID - either from the incident object or the incidentId parameter
  const actualIncidentId = incident?.id || incidentId;

  useEffect(() => {
    if (actualIncidentId) {
      loadIncidentDetails();
    } else {
      console.error('No incident ID provided to IncidentDetailsScreen');
      Alert.alert('Error', 'No incident ID provided', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [actualIncidentId]);

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

  const checkAndRefreshSession = async () => {
    try {
      console.log('Quick auth check...');
      
      // Ultra-fast check: if station data exists, assume firefighter is authenticated
      const hasStationData = await AsyncStorage.getItem('stationData');
      if (hasStationData) {
        console.log('Station data found - firefighter authenticated');
        setIsCivilianUser(false);
        return true;
      }

      // Only for users without station data, treat as civilian (no auth needed)
      console.log('No station data - civilian user');
      setIsCivilianUser(true);
      return true;
      
    } catch (error) {
      console.error('Error in quick auth check:', error);
      // If anything fails, default to civilian mode (safe fallback)
      setIsCivilianUser(true);
      return true;
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
        
        // Quick session check (optimized for firefighters)
        const isSessionValid = await checkAndRefreshSession();
        if (!isSessionValid) {
          throw new Error('Session invalid or expired');
        }

        // Fetch the incident details
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', actualIncidentId)
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

        // SECURITY: Only check civilian access restrictions (skip for firefighters)
        if (isCivilianUser) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (user && data.reported_by !== user.id) {
            Alert.alert('Access Denied', 'You can only view incidents you reported');
            navigation.goBack();
            return;
          }
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
        
        // Load incident media
        await loadIncidentMedia(data.id);
        
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

  const loadIncidentMedia = async (incidentId) => {
    try {
      // Fetch media from incident_media table
      const { data: mediaData, error: mediaError } = await supabase
        .from('incident_media')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (mediaError) {
        console.error('Error fetching incident media:', mediaError);
      } else {
        setIncidentMedia(mediaData || []);
      }
    } catch (error) {
      console.error('Error loading incident media:', error);
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
        .eq('id', actualIncidentId);

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
    navigation.navigate('IncidentTracking', { incidentId: actualIncidentId });
  };

  const handleChatPress = () => {
    navigation.navigate('IncidentChat', { incidentId: actualIncidentId });
  };

  const isTrackingAvailable = () => {
    return incidentDetails?.status === 'pending' || incidentDetails?.status === 'in_progress';
  };

  const isChatAvailable = () => {
    // Chat is available if there's a dispatcher assigned or if incident is active
    return incidentDetails && (
      incidentDetails.dispatcher_id || 
      incidentDetails.status === 'pending' || 
      incidentDetails.status === 'in_progress'
    );
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC3545" />
          <Text style={styles.loadingText}>Loading incident details...</Text>
        </View>
      ) : !incidentDetails ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Incident not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
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

          {/* Media Images and Videos */}
          {(() => {
            // Consolidate all media sources to avoid duplicates
            // Priority: incidentMedia (newest) > media_urls (legacy) > media (oldest)
            let allMedia = [];
            
            // First, add media from incident_media table (preferred source)
            if (incidentMedia && incidentMedia.length > 0) {
              incidentMedia.forEach((media, index) => {
                // Clean up the URL by removing spaces and fixing formatting
                let mediaUrl = media.public_url || media.file_url;
                
                // If public_url has issues, construct URL from file_path
                if (!mediaUrl || mediaUrl.includes(' ')) {
                  mediaUrl = `${supabase.supabaseUrl}/storage/v1/object/public/incident-media/${media.file_path}`;
                } else {
                  mediaUrl = mediaUrl.replace(/\s+/g, '').trim();
                }
                
                allMedia.push({
                  key: `media-${index}`,
                  url: mediaUrl,
                  type: media.file_type,
                  source: 'incident_media',
                  originalData: media
                });
              });
            }
            // Only use legacy formats if no media from incident_media table
            else {
              // Add legacy media_urls if no incident_media
              if (incidentDetails.media_urls && incidentDetails.media_urls.length > 0) {
                incidentDetails.media_urls.forEach((urlItem, index) => {
                  // Handle both string URLs and object formats
                  let rawUrl;
                  if (typeof urlItem === 'string') {
                    rawUrl = urlItem;
                  } else if (urlItem && typeof urlItem === 'object') {
                    rawUrl = urlItem.url || urlItem.uri || urlItem;
                  } else {
                    rawUrl = urlItem;
                  }
                  
                  // Clean the URL to remove any spaces or formatting issues
                  const cleanedUrl = typeof rawUrl === 'string' ? rawUrl.replace(/\s+/g, '').trim() : rawUrl;
                  
                  allMedia.push({
                    key: `legacy-${index}`,
                    url: cleanedUrl,
                    type: 'image',
                    source: 'media_urls',
                    originalData: { urlItem, rawUrl }
                  });
                });
              }
              // Fallback to oldest .media format if no other sources
              else if (incidentDetails.media && incidentDetails.media.length > 0) {
                incidentDetails.media.forEach((mediaItem, index) => {
                  const rawImageUrl = mediaItem.uri || mediaItem;
                  const cleanedImageUrl = typeof rawImageUrl === 'string' ? rawImageUrl.replace(/\s+/g, '').trim() : rawImageUrl;
                  
                  allMedia.push({
                    key: `old-${index}`,
                    url: cleanedImageUrl,
                    type: 'image',
                    source: 'media',
                    originalData: { mediaItem, rawImageUrl }
                  });
                });
              }
            }
            
            console.log('Consolidated media (IncidentDetails):', allMedia);
            
            return allMedia.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Incident Media</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {allMedia.map((mediaItem) => {
                    const isVideo = mediaItem.type === 'video' || 
                                  mediaItem.type?.startsWith('video/') || 
                                  mediaItem.originalData?.mime_type?.startsWith('video/');
                    if (isVideo) {
                      return (
                        <TouchableOpacity 
                          key={mediaItem.key} 
                          style={styles.mediaContainer}
                          onPress={() => {
                            setSelectedVideoUrl(mediaItem.url);
                            setSelectedVideoTitle(mediaItem.originalData?.file_name || 'Incident Video');
                            setVideoModalVisible(true);
                          }}
                        >
                          <View style={[styles.mediaImage, styles.videoContainer]}>
                            <Ionicons name="play-circle" size={50} color="#fff" />
                            <Text style={styles.videoLabel}>Video</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    } else {
                      return (
                        <TouchableOpacity 
                          key={mediaItem.key} 
                          style={styles.mediaContainer}
                          onPress={() => {
                            setSelectedImageUrl(mediaItem.url);
                            setImageModalVisible(true);
                          }}
                        >
                          <Image
                            source={{ uri: mediaItem.url }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error(`${mediaItem.source} image load error:`, error, 'URL:', mediaItem.url, 'Original:', mediaItem.originalData);
                            }}
                            onLoad={() => {
                              console.log(`${mediaItem.source} image loaded successfully:`, mediaItem.url);
                            }}
                          />
                        </TouchableOpacity>
                      );
                    }
                  })}
                </ScrollView>
              </View>
            ) : null;
          })()}

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
              <Text style={styles.trackingButtonText}>🗺️ Track Incident</Text>
            </TouchableOpacity>
          )}

          {isChatAvailable() && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={handleChatPress}
            >
              <Text style={styles.chatButtonText}>💬 Chat with Dispatcher</Text>
            </TouchableOpacity>
          )}

          {!incidentDetails?.dispatcher_id && incidentDetails?.status === 'pending' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                ⏳ Waiting for dispatcher assignment. You'll be able to chat once a dispatcher is assigned to your incident.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      )}
      
      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalOverlay}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              {selectedImageUrl && (
                <Image
                  source={{ uri: selectedImageUrl }}
                  style={styles.fullImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('Full image load error:', error);
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
      
      {/* Video Player Modal */}
      <VideoPlayer
        visible={videoModalVisible}
        videoUri={selectedVideoUrl}
        title={selectedVideoTitle}
        onClose={() => {
          setVideoModalVisible(false);
          setSelectedVideoUrl(null);
          setSelectedVideoTitle('');
        }}
      />
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: '#FFF9C4',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB74D',
    marginTop: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  mediaContainer: {
    marginRight: 12,
  },
  videoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});

export default IncidentDetailsScreen;