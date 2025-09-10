const React = require('react');
const { useState, useEffect } = React;
const { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Image } = require('react-native');
const { supabase } = require('../lib/supabase');
const VideoPlayer = require('../components/VideoPlayer').default;

import AsyncStorage from '@react-native-async-storage/async-storage';

const DispatchIncidentDetailsScreen = ({ route, navigation }) => {
  const { incident, onStatusChange } = route.params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [incidentDetails, setIncidentDetails] = useState(incident);
  const [incidentMedia, setIncidentMedia] = useState([]);
  const [locationAddress, setLocationAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [reporterProfile, setReporterProfile] = useState(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('');

  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
    } catch (e) {}
    return null;
  };

  useEffect(() => {
    if (incidentDetails && incidentDetails.location && incidentDetails.location.includes(',')) {
      const [lat, lng] = incidentDetails.location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setAddressLoading(true);
        getAddressFromCoords(lat, lng)
          .then(address => {
            setLocationAddress(address || incidentDetails.location);
            setAddressLoading(false);
          })
          .catch(() => {
            setLocationAddress(incidentDetails.location);
            setAddressLoading(false);
          });
      } else {
        setLocationAddress(incidentDetails.location);
      }
    } else if (incidentDetails && incidentDetails.location) {
      setLocationAddress(incidentDetails.location);
    } else {
      setLocationAddress('Location not available');
    }
  }, [incidentDetails?.location]);

  useEffect(() => {
    // Fetch reporter profile if reported_by is present
    const fetchReporterProfile = async () => {
      if (incidentDetails && incidentDetails.reported_by) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', incidentDetails.reported_by)
          .single();
        if (!error && data) setReporterProfile(data);
      }
    };
    fetchReporterProfile();
  }, [incidentDetails?.reported_by]);

  const loadIncidentDetails = async () => {
    try {
      setLoading(true);
      await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incident.id)
        .single();

      if (error) {
        if (error.message && error.message.toLowerCase().includes('jwt')) {
          Alert.alert('Connection Error', 'Failed to load incident details. Your session has expired. Please log in again.', [
            { text: 'Retry', onPress: loadIncidentDetails },
            { text: 'Cancel', style: 'cancel' },
          ]);
          return;
        }
        throw error;
      }
      setIncidentDetails(data);
      
      // Load incident media from the incident_media table
      await loadIncidentMedia(incident.id);
    } catch (error) {
      console.error('Error loading incident details:', error);
      Alert.alert('Error', 'Failed to load incident details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadIncidentMedia = async (incidentId) => {
    try {
      const { data, error } = await supabase
        .from('incident_media')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading incident media:', error);
        return;
      }

      console.log('Loaded incident media:', data?.length || 0, 'files');
      setIncidentMedia(data || []);
    } catch (error) {
      console.error('Error in loadIncidentMedia:', error);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      await supabase.auth.getSession();
      
      // Prepare update data
      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // Add resolved_at timestamp if resolving
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incident.id);

      if (error) {
        if (error.message && error.message.toLowerCase().includes('jwt')) {
          Alert.alert('Connection Error', 'Failed to update incident status. Your session has expired. Please log in again.', [
            { text: 'Retry', onPress: () => handleStatusUpdate(newStatus) },
            { text: 'Cancel', style: 'cancel' },
          ]);
          return;
        }
        throw error;
      }
      
      await loadIncidentDetails();
      
      Alert.alert('Success', `Incident ${newStatus === 'resolved' ? 'resolved' : 'updated'} successfully`);
      
      if (newStatus === 'resolved') {
        // Call the callback to refresh dashboard
        if (typeof onStatusChange === 'function') {
          onStatusChange();
        }
        
        // Navigate back to dashboard after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating incident status:', error);
      Alert.alert('Error', 'Failed to update incident status');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackIncident = () => {
    navigation.navigate('DispatchTrackingScreen', { incidentId: incident.id });
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

  // Utility to update dispatcher_id to the correct UUID
  const updateDispatcherIdToUUID = async (incidentId, dispatcherEmail) => {
    // Fetch the dispatcher user by email
    const { data: dispatcherUser, error: userError } = await supabase
      .from('dispatchers')
      .select('id, email')
      .eq('email', dispatcherEmail)
      .single();
    if (userError || !dispatcherUser) {
      console.error('Dispatcher not found or error:', userError);
      return false;
    }
    // Update the incident with the correct dispatcher UUID
    const { error: updateError } = await supabase
      .from('incidents')
      .update({ dispatcher_id: dispatcherUser.id })
      .eq('id', incidentId);
    if (updateError) {
      console.error('Failed to update dispatcher_id to UUID:', updateError);
      return false;
    }
    return true;
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
          <RefreshControl refreshing={refreshing} onRefresh={loadIncidentDetails} />
        }
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.incidentType}>{incidentDetails.incident_type}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(incidentDetails.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {(incidentDetails.status || 'Unknown').toUpperCase()
              }</Text>
            </View>
          </View>

          {/* Incident Type */}
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>Type: {incidentDetails.incident_type || 'Not specified'}</Text>
          </View>

          {/* Station Information */}
          {incidentDetails.station_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>Station: {incidentDetails.station_id}</Text>
            </View>
          )}

          {/* Date/Time Incident was sent by user */}
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>
              Reported: {incidentDetails.created_at ? new Date(incidentDetails.created_at).toLocaleString() : 'N/A'}
            </Text>
          </View>

          {/* Date/Time Station approved */}
          {incidentDetails.approved_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>
                Approved: {new Date(incidentDetails.approved_at).toLocaleString()}
              </Text>
            </View>
          )}

          {/* Reporter Information (from profile) */}
          {reporterProfile && (
            <>
              {reporterProfile.full_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>Reporter: {reporterProfile.full_name}</Text>
                </View>
              )}
              {reporterProfile.phone && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>Phone: {reporterProfile.phone}</Text>
                </View>
              )}
              {reporterProfile.email && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>Email: {reporterProfile.email}</Text>
                </View>
              )}
            </>
          )}

          {/* Priority row: only show if priority is set and not unknown */}
          {incidentDetails.priority && incidentDetails.priority.toLowerCase() !== 'unknown' && (
          <View style={styles.detailRow}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(incidentDetails.priority) },
              ]}
            >
              <Text style={styles.priorityText}>
                  {incidentDetails.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailText}>{addressLoading ? 'Loading address...' : locationAddress}</Text>
          </View>

          {/* If you have address field, show it here */}
          {incidentDetails.address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>Address: {incidentDetails.address}</Text>
            </View>
          )}

          {/* Additional incident details */}
          {incidentDetails.severity && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>Severity: {incidentDetails.severity}</Text>
            </View>
          )}

          {incidentDetails.emergency_level && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>Emergency Level: {incidentDetails.emergency_level}</Text>
            </View>
          )}

          {incidentDetails.additional_info && (
          <View style={styles.detailRow}>
              <Text style={styles.detailText}>Additional Info: {incidentDetails.additional_info}</Text>
          </View>
          )}

          {/* Description Section */}
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 16, marginBottom: 4 }}>Description</Text>
          {(() => {
            const words = incidentDetails.description ? incidentDetails.description.split(' ') : [];
            if (words.length > 15 && !showFullDescription) {
              return (
                <>
                  <Text style={styles.description}>{words.slice(0, 15).join(' ')}...</Text>
                  <TouchableOpacity onPress={() => setShowFullDescription(true)}>
                    <Text style={{ color: '#007AFF', marginTop: 4 }}>Read more</Text>
                  </TouchableOpacity>
                </>
              );
            } else {
              return <Text style={styles.description}>{incidentDetails.description}</Text>;
            }
          })()}

          {/* Media Previews - Support both old and new formats */}
          {((incidentDetails.media && Array.isArray(incidentDetails.media) && incidentDetails.media.length > 0) ||
            (incidentDetails.media_urls && Array.isArray(incidentDetails.media_urls) && incidentDetails.media_urls.length > 0) ||
            (incidentMedia && incidentMedia.length > 0)) && (
            <View style={{ marginVertical: 12 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 16 }}>Media Attachments:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {/* Display media from incident_media table (new format) */}
                {incidentMedia && incidentMedia.map((media, idx) => (
                  <View key={`db-${idx}`} style={{ marginRight: 12 }}>
                    {media.file_type === 'image' ? (
                      <TouchableOpacity onPress={() => console.log('View image:', media.public_url)}>
                        <Image 
                          source={{ uri: media.public_url }} 
                          style={{ width: 200, height: 120, borderRadius: 8 }} 
                          resizeMode="cover" 
                        />
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' }}>
                          {media.file_name}
                        </Text>
                      </TouchableOpacity>
                    ) : media.file_type === 'video' ? (
                      <TouchableOpacity onPress={() => {
                        setSelectedVideoUrl(media.public_url);
                        setSelectedVideoTitle(media.file_name || 'Incident Video');
                        setVideoModalVisible(true);
                      }}>
                        <View style={{ 
                          width: 200, 
                          height: 120, 
                          backgroundColor: '#000', 
                          borderRadius: 8, 
                          justifyContent: 'center', 
                          alignItems: 'center' 
                        }}>
                          <Text style={{ color: '#fff', fontSize: 16 }}>▶️</Text>
                          <Text style={{ color: '#fff', marginTop: 8 }}>Video</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' }}>
                          {media.file_name}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ 
                        width: 200, 
                        height: 120, 
                        backgroundColor: '#f0f0f0', 
                        borderRadius: 8, 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }}>
                        <Text style={{ color: '#666', marginTop: 8 }}>File</Text>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          {media.file_name}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Display media from media_urls column (legacy format) */}
                {incidentDetails.media_urls && incidentDetails.media_urls.map((media, idx) => (
                  <View key={`url-${idx}`} style={{ marginRight: 12 }}>
                    {media.type === 'image' ? (
                      <TouchableOpacity onPress={() => console.log('View image:', media.url)}>
                        <Image 
                          source={{ uri: media.url }} 
                          style={{ width: 200, height: 120, borderRadius: 8 }} 
                          resizeMode="cover" 
                        />
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' }}>
                          Legacy Image
                        </Text>
                      </TouchableOpacity>
                    ) : media.type === 'video' ? (
                      <TouchableOpacity onPress={() => {
                        setSelectedVideoUrl(media.url);
                        setSelectedVideoTitle('Incident Video');
                        setVideoModalVisible(true);
                      }}>
                        <View style={{ 
                          width: 200, 
                          height: 120, 
                          backgroundColor: '#000', 
                          borderRadius: 8, 
                          justifyContent: 'center', 
                          alignItems: 'center' 
                        }}>
                          <Text style={{ color: '#fff', fontSize: 16 }}>▶️</Text>
                          <Text style={{ color: '#fff', marginTop: 8 }}>Video</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' }}>
                          Legacy Video
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ 
                        width: 200, 
                        height: 120, 
                        backgroundColor: '#f0f0f0', 
                        borderRadius: 8, 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }}>
                        <Text style={{ color: '#666', marginTop: 8 }}>File</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Display media from legacy .media property (oldest format) */}
                {incidentDetails.media && incidentDetails.media.map((media, idx) => (
                  <View key={`legacy-${idx}`} style={{ marginRight: 12 }}>
                    {media.type && media.type.startsWith('image') ? (
                      <Image 
                        source={{ uri: media.url }} 
                        style={{ width: 200, height: 120, borderRadius: 8 }} 
                        resizeMode="cover" 
                      />
                    ) : media.type && media.type.startsWith('video') ? (
                      <View style={{ 
                        width: 200, 
                        height: 120, 
                        backgroundColor: '#000', 
                        borderRadius: 8, 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }}>
                        <Text style={{ color: '#fff', marginTop: 8 }}>Video</Text>
                      </View>
                    ) : (
                      <View style={{ 
                        width: 200, 
                        height: 120, 
                        backgroundColor: '#f0f0f0', 
                        borderRadius: 8, 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }}>
                        <Text style={{ color: '#666', marginTop: 8 }}>File</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Update Status</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                incidentDetails.status === 'in_progress' && styles.actionButtonActive,
              ]}
              onPress={() => handleStatusUpdate('in_progress')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  incidentDetails.status === 'in_progress' && styles.actionButtonTextActive,
                ]}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                incidentDetails.status === 'resolved' && styles.actionButtonActive,
              ]}
              onPress={() => handleStatusUpdate('resolved')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  incidentDetails.status === 'resolved' && styles.actionButtonTextActive,
                ]}
              >
                Resolved
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Track Button */}
          <TouchableOpacity
            style={styles.trackButton}
            onPress={handleTrackIncident}
          >
            <Text style={styles.trackButtonText}>Track Incident</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
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
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  description: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
    lineHeight: 24,
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 4,
  },
  actionButtonActive: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    textAlign: 'center',
    color: '#000000',
  },
  actionButtonTextActive: {
    color: '#FFFFFF',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  trackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

module.exports = DispatchIncidentDetailsScreen;