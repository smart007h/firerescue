import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const FirefighterIncidentDetailsScreen = ({ route, navigation }) => {
  const { incidentId } = route.params;
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [reporter, setReporter] = useState(null);
  const [dispatcher, setDispatcher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadIncidentDetails();
  }, [incidentId]);

  const loadIncidentDetails = async () => {
    try {
      setLoading(true);

      // Load incident details
      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();

      if (incidentError) throw incidentError;

      setIncident(incidentData);

      // Load reporter details if available
      if (incidentData.reported_by) {
        const { data: reporterData } = await supabase
          .from('profiles')
          .select('full_name, phone_number')
          .eq('id', incidentData.reported_by)
          .single();
        
        setReporter(reporterData);
      }

      // Load dispatcher details if assigned and incident is active (not resolved)
      if (incidentData.dispatcher_id && incidentData.status !== 'resolved' && incidentData.status !== 'cancelled') {
        const { data: dispatcherData } = await supabase
          .from('dispatchers')
          .select('full_name, phone_number')
          .eq('id', incidentData.dispatcher_id)
          .single();
        
        setDispatcher(dispatcherData);
      }

    } catch (error) {
      console.error('Error loading incident details:', error);
      Alert.alert('Error', 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdatingStatus(true);

      let finalStatus = newStatus;
      let alertMessage = '';

      // When firefighter approves, automatically set to in_progress and assign to dispatcher
      if (newStatus === 'approved') {
        finalStatus = 'in_progress';
        alertMessage = 'Incident approved and assigned to dispatcher (Status: IN PROGRESS)';
        
        // Here you could add logic to automatically assign to a dispatcher
        // For now, we'll just update the status
      } else {
        alertMessage = `Incident status has been changed to ${newStatus.toUpperCase()}`;
      }

      const { error } = await supabase
        .from('incidents')
        .update({ 
          status: finalStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId);

      if (error) throw error;

      // Update local state
      setIncident(prev => ({ ...prev, status: finalStatus }));

      Alert.alert(
        'Status Updated',
        alertMessage,
        [{ 
          text: 'OK',
          onPress: () => {
            // Navigate back and trigger refresh
            navigation.navigate('FirefighterIncidents', { refresh: true });
          }
        }]
      );

    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update incident status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const confirmStatusUpdate = (newStatus) => {
    let confirmMessage = '';
    
    if (newStatus === 'approved') {
      confirmMessage = 'Are you sure you want to approve this incident? It will be assigned to a dispatcher and marked as IN PROGRESS.';
    } else {
      confirmMessage = `Are you sure you want to change the incident status to ${newStatus.toUpperCase()}?`;
    }

    Alert.alert(
      'Confirm Action',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => handleStatusUpdate(newStatus),
          style: 'destructive'
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return '#4CAF50';
      case 'in_progress':
        return '#FF9800';
      case 'pending':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getIncidentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'fire':
        return 'flame';
      case 'medical emergency':
        return 'medical';
      case 'rescue':
        return 'people';
      case 'hazmat':
        return 'warning';
      default:
        return 'alert-circle';
    }
  };

  const formatLocation = (incident) => {
    // Priority: location_address > formatted coordinates > raw location > fallback
    if (incident.location_address && incident.location_address.trim()) {
      return incident.location_address;
    }
    
    if (incident.location && incident.location.includes(',')) {
      const [lat, lng] = incident.location.split(',');
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        return `Coordinates: ${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
      }
    }
    
    return incident.location || 'Location not available';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#DC3545" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading incident details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#DC3545" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#DC3545" />
          <Text style={styles.errorText}>Incident not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#DC3545" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Incident Overview Card */}
        <View style={styles.card}>
          <View style={styles.incidentHeader}>
            <View style={[styles.iconContainer, { backgroundColor: getStatusColor(incident.status) }]}>
              <Ionicons
                name={getIncidentIcon(incident.incident_type)}
                size={32}
                color="#fff"
              />
            </View>
            <View style={styles.incidentInfo}>
              <Text style={styles.incidentType}>{incident.incident_type}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
                <Text style={styles.statusText}>{incident.status?.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Reported At:</Text>
              <Text style={styles.detailValue}>
                {new Date(incident.created_at).toLocaleString()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>
                {formatLocation(incident)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>
                {incident.description || 'No description provided'}
              </Text>
            </View>

            {incident.station_id && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Assigned Station:</Text>
                <Text style={styles.detailValue}>Station {incident.station_id}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Reporter Information */}
        {reporter && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reporter Information</Text>
            <View style={styles.reporterInfo}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{reporter.full_name || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{reporter.phone_number || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Dispatcher Information - only shown for active incidents */}
        {dispatcher && incident.status !== 'resolved' && incident.status !== 'cancelled' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Assigned Dispatcher</Text>
            <View style={styles.dispatcherInfo}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{dispatcher.full_name || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{dispatcher.phone_number || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Media Images */}
        {incident.media_urls && incident.media_urls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Incident Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {incident.media_urls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Status Update Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Incident Actions</Text>
          <View style={styles.actionButtons}>
            {incident.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => confirmStatusUpdate('approved')}
                disabled={updatingStatus}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Approve & Assign to Dispatcher</Text>
              </TouchableOpacity>
            )}

            {incident.status === 'in_progress' && (
              <View style={styles.inProgressMessage}>
                <Ionicons name="time" size={24} color="#FF9800" />
                <Text style={styles.inProgressMessageText}>
                  Incident is in progress with dispatcher
                </Text>
              </View>
            )}

            {incident.status === 'resolved' && (
              <View style={styles.resolvedMessage}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.resolvedMessageText}>
                  Incident has been resolved by dispatcher
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
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
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#DC3545',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerBackButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentType: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  reporterInfo: {
    gap: 12,
  },
  dispatcherInfo: {
    gap: 12,
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  inProgressButton: {
    backgroundColor: '#FF9800',
  },
  resolvedButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  inProgressMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    gap: 8,
  },
  inProgressMessageText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: '600',
  },
  resolvedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 8,
  },
  resolvedMessageText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FirefighterIncidentDetailsScreen;
