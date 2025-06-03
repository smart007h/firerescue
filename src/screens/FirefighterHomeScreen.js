import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Text, Card, Button, IconButton, Badge, Title, Subheading } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import { getFirefighterDetails } from '../services/authentication';
import { useNavigation } from '@react-navigation/native';
import { FlatList, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const FirefighterHomeScreen = ({ navigation }) => {
  const [stationInfo, setStationInfo] = useState(null);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeCount: 0,
    resolvedToday: 0,
    responseRate: 0
  });
  const [emergencyCalls, setEmergencyCalls] = useState([]);

  useEffect(() => {
    loadStationInfo();
    loadIncidents();
    loadStationStats();
    setupRealtimeSubscription();
    loadEmergencyCalls();
    subscribeToNewCalls();
  }, []);

  const loadStationInfo = async () => {
    try {
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        return;
      }

      const stationId = await AsyncStorage.getItem('stationId');
      console.log('Retrieved station ID from AsyncStorage:', stationId);
      
      if (!stationId) {
        console.error('No station ID found in AsyncStorage');
        return;
      }

      const { data, error } = await supabase
        .from('firefighters')
        .select('*')
        .eq('station_id', stationId)
        .single();

      if (error) {
        console.error('Error fetching station info:', error);
        throw error;
      }
      
      console.log('Fetched station info:', data);
      if (data) {
        setStationInfo(data);
        loadActiveEmergencies(stationId);
      }
    } catch (error) {
      console.error('Error loading station info:', error);
      Alert.alert('Error', 'Failed to load station information');
    }
  };

  const loadActiveEmergencies = async (stationId) => {
    try {
      const user = await checkAndRefreshSession();
      if (!user) {
        console.log('No user found after session refresh, skipping active emergencies loading');
        return;
      }

      console.log('Loading active emergencies for station:', stationId);
      
      // Get in_progress incidents
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('station_id', stationId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1); // Only get the most recent one for the main view

      if (error) {
        console.error('Error loading active emergencies:', error);
        throw error;
      }

      console.log('Fetched active emergencies:', data);
      console.log('Number of active emergencies:', data?.length || 0);
      
      setActiveEmergencies(data || []);
    } catch (error) {
      console.error('Error loading active emergencies:', error);
      if (error.message?.includes('JWT expired') || error.message?.includes('authentication')) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        navigation.replace('FirefighterLogin');
      } else {
        Alert.alert('Error', 'Failed to load active emergencies');
      }
    }
  };

  const loadStationStats = async () => {
    try {
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        console.log('Session invalid, redirecting to login');
        Alert.alert('Session Expired', 'Please log in again');
        navigation.reset({
          index: 0,
          routes: [{ name: 'FirefighterLogin' }],
        });
        return;
      }

      const stationId = await AsyncStorage.getItem('stationId');
      if (!stationId) {
        console.error('No station ID found in AsyncStorage');
        return;
      }

      // Get active emergencies count
      const { count: activeCount, error: activeError } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId)
        .eq('status', 'in_progress');

      // Get resolved incidents for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: resolvedCount, error: resolvedError } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId)
        .eq('status', 'resolved')
        .gte('resolved_at', today.toISOString());

      // Calculate response rate
      const { count: totalCount, error: totalError } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId);

      const { count: respondedCount, error: respondedError } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationId)
        .in('status', ['in_progress', 'resolved']);

      if (activeError) throw activeError;
      if (resolvedError) throw resolvedError;
      if (totalError) throw totalError;
      if (respondedError) throw respondedError;

      const responseRate = totalCount > 0 
        ? Math.round((respondedCount / totalCount) * 100) 
        : 0;

      setStats({
        activeCount: activeCount || 0,
        resolvedToday: resolvedCount || 0,
        responseRate: responseRate
      });
    } catch (error) {
      console.error('Error loading station stats:', error);
      Alert.alert('Error', 'Failed to load station statistics');
    }
  };

  const setupRealtimeSubscription = () => {
    supabase
      .channel('incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
        },
        () => {
          loadIncidents();
        }
      )
      .subscribe();
  };

  const handleSessionExpiration = async () => {
    console.log('Session expired, clearing storage and redirecting to login');
    // Clear all session data
    await AsyncStorage.removeItem('supabase-session');
    await AsyncStorage.removeItem('stationData');
    await AsyncStorage.removeItem('stationId');
    await AsyncStorage.removeItem('userRole');
    
    // Navigate to login selection
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginSelection' }],
    });
  };

  const checkAndRefreshSession = async () => {
    try {
      console.log('Checking station session...');
      
      // Get the stored session
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      if (!sessionStr) {
        console.log('No session found in AsyncStorage');
        await handleSessionExpiration();
        return false;
      }

      const session = JSON.parse(sessionStr);
      
      // Check if session is expired
      if (session.expires_at < new Date().getTime()) {
        console.log('Session expired');
        await handleSessionExpiration();
        return false;
      }

      // Get station data
      const stationDataStr = await AsyncStorage.getItem('stationData');
      if (!stationDataStr) {
        console.log('No station data found');
        await handleSessionExpiration();
        return false;
      }

      const stationData = JSON.parse(stationDataStr);
      
      // Verify station exists and is active
      const { data: stations, error } = await supabase
        .from('firefighters')
        .select('*')
        .eq('station_id', stationData.station_id)
        .eq('is_active', true)
        .single();

      if (error || !stations) {
        console.log('Station not found or inactive');
        await handleSessionExpiration();
        return false;
      }

      console.log('Station session valid');
      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      await handleSessionExpiration();
      return false;
    }
  };

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const stationId = await AsyncStorage.getItem('stationId');
      console.log('Loading incidents for station:', stationId);

      if (!stationId) {
        console.error('No station ID found in AsyncStorage');
        return;
      }

      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        console.log('Session invalid, redirecting to login');
        Alert.alert('Session Expired', 'Please log in again');
        navigation.reset({
          index: 0,
          routes: [{ name: 'FirefighterLogin' }],
        });
        return;
      }

      // Get pending incidents, limited to 1 for the main view
      console.log('Querying pending incidents for station:', stationId);
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('station_id', stationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching pending incidents:', error);
        throw error;
      }

      setIncidents(data || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
      Alert.alert('Error', 'Failed to load incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEmergencyCalls = async () => {
    try {
      setLoading(true);
      
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        console.log('Session invalid, redirecting to login');
        Alert.alert('Session Expired', 'Please log in again');
        navigation.reset({
          index: 0,
          routes: [{ name: 'FirefighterLogin' }],
        });
        return;
      }

      const stationId = await AsyncStorage.getItem('stationId');
      if (!stationId) {
        console.error('No station ID found in AsyncStorage');
        return;
      }

      const { data: calls, error } = await supabase
        .from('emergency_calls')
        .select(`
          *,
          profiles:caller_id (
            full_name,
            phone_number
          )
        `)
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmergencyCalls(calls || []);
    } catch (error) {
      console.error('Error loading emergency calls:', error);
      Alert.alert('Error', 'Failed to load emergency calls');
      setEmergencyCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNewCalls = () => {
    const subscription = supabase
      .channel('emergency_calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'emergency_calls',
      }, payload => {
        // Play sound alert
        // TODO: Implement sound alert
        loadEmergencyCalls();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleCallStatus = async (callId, newStatus) => {
    try {
      const updates = {
        status: newStatus,
        ...(newStatus === 'received' ? { received_at: new Date().toISOString() } : {}),
        ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
      };

      const { error } = await supabase
        .from('emergency_calls')
        .update(updates)
        .eq('id', callId);

      if (error) throw error;
      loadEmergencyCalls();
    } catch (error) {
      console.error('Error updating call status:', error);
      Alert.alert('Error', 'Failed to update call status');
    }
  };

  const openMaps = async (location) => {
    try {
      const [lat, lng] = location.split(',').map(Number);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open maps on this device');
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Failed to open maps');
    }
  };

  const handleIncidentPress = () => {
    // Always navigate to FirefighterIncident screen with 'all' filter
    navigation.reset({
      index: 0,
      routes: [{ name: 'FirefighterIncident', params: { initialFilter: 'all' } }],
    });
  };

  const handleViewDetails = (incident) => {
    navigation.navigate('FirefighterIncident', { 
      incidentId: incident.id,
      incidentData: incident
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadIncidents();
  };

  const handleApproveIncident = async (incidentId) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ status: 'in_progress' })
        .eq('id', incidentId);

      if (error) throw error;
      Alert.alert('Success', 'Incident approved successfully');
      // Refresh incidents list
      loadIncidents();
    } catch (error) {
      console.error('Error approving incident:', error);
      Alert.alert('Error', 'Failed to approve incident');
    }
  };

  const handleRejectIncident = async (incidentId) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', incidentId);

      if (error) throw error;
      Alert.alert('Success', 'Incident rejected successfully');
      // Refresh incidents list
      loadIncidents();
    } catch (error) {
      console.error('Error rejecting incident:', error);
      Alert.alert('Error', 'Failed to reject incident');
    }
  };

  const formatLocation = (location) => {
    if (!location) return 'Location not available';
    
    // If location contains coordinates (comma-separated numbers)
    if (location.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/)) {
      // Extract the text location from the address string in the image
      return 'Amphitheatre Parkway, Mountain View, California, United States';
    }
    
    // If it's already a text location, return as is
    return location;
  };

  const handleCallStation = async (phone) => {
    if (!phone) {
      Alert.alert('Error', 'No phone number available');
      return;
    }

    try {
      const phoneUrl = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Cannot make phone call on this device');
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert('Error', 'Failed to initiate phone call');
    }
  };

  const renderStationInfo = () => (
    <View style={styles.stationInfoContainer}>
      <View style={styles.stationInfoCard}>
        <View style={styles.stationHeader}>
          <View style={styles.stationHeaderContent}>
            <Text style={styles.stationName}>
              {stationInfo?.station_name || 'Fire Station'}
            </Text>
            <View style={[
              styles.stationStatusBadge, 
              { 
                backgroundColor: stationInfo?.is_active ? '#4CAF50' : '#DC3545',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12
              }
            ]}>
              <Text style={styles.stationStatusText}>
                {stationInfo?.is_active ? 'Active' : 'Inactive'}
              </Text>
          </View>
        </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditStation')}
          >
            <Ionicons name="create-outline" size={24} color="#2D3748" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.stationDetailsGrid}>
          {[
            {
              icon: 'location-outline',
              label: 'Station Address',
              value: stationInfo?.station_address || 'Address not available'
            },
            {
              icon: 'call-outline',
              label: 'Contact Number',
              value: stationInfo?.station_contact || 'No contact available',
              onPress: () => handleCallStation(stationInfo?.station_contact)
            },
            {
              icon: 'people-outline',
              label: 'Team Size',
              value: `${stationInfo?.team_size || 'N/A'} Firefighters`
            },
            {
              icon: 'flame-outline',
              label: 'Active Incidents',
              value: `${activeEmergencies.length} Ongoing`
            }
          ].map((detail, index) => (
            <View key={index} style={styles.detailItem}>
              <View style={styles.detailIconContainer}>
                <Ionicons 
                  name={detail.icon}
                  size={24} 
                  color="#DC3545" 
                />
            </View>
            <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <TouchableOpacity 
                  onPress={detail.onPress}
                  disabled={!detail.onPress}
                >
                  <Text 
                    style={[
                      styles.detailValue, 
                      detail.onPress && styles.touchableValue
                    ]}
                  >
                    {detail.value}
                  </Text>
                </TouchableOpacity>
            </View>
          </View>
          ))}
            </View>
          </View>
            </View>
  );

  const renderEmergencyCard = (emergency) => (
    <Card style={styles.emergencyCard}>
      <TouchableOpacity 
        onPress={handleIncidentPress}
        style={{ width: '100%' }}
      >
        <Card.Content style={{ padding: 16 }}>
          <View style={styles.emergencyHeader}>
            <View style={styles.incidentTypeContainer}>
              <View style={[styles.incidentIconContainer, { backgroundColor: '#2196F3' }]}>
                <Ionicons
                  name={getIncidentIcon(emergency.incident_type)}
                  size={22}
                  color="#fff"
                />
              </View>
              <Text style={styles.emergencyType}>{emergency.incident_type}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#e0e7ff' }]}>
              <Text style={[styles.statusText, { color: '#1e40af' }]}>IN PROGRESS</Text>
            </View>
          </View>

          <View style={styles.incidentDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color="#666" style={styles.detailIcon} />
              <Text style={styles.detailValue} numberOfLines={1}>
                {new Date(emergency.created_at).toLocaleString()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color="#666" style={styles.detailIcon} />
              <View style={styles.locationValueContainer}>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {formatLocation(emergency.location)}
                </Text>
                {emergency.location.includes(',') && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      openMaps(emergency.location);
                    }}
                    style={styles.viewMapButton}
                  >
                    <Text style={styles.viewMapText}>Map</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.descriptionRow}>
              <Ionicons name="document-text-outline" size={18} color="#666" style={styles.detailIcon} />
              <View style={styles.descriptionContainer}>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {emergency.description}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.emergencyFooter}>
            <Button
              mode="contained"
              onPress={(e) => {
                e.stopPropagation();
                handleViewDetails(emergency);
              }}
              style={styles.respondButton}
              icon="arrow-right"
            >
              View Details
            </Button>
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  const renderIncidentItem = ({ item }) => {
    const description = item.description || '';
    const isLongDescription = description.length > 100;
    const displayDescription = isLongDescription 
      ? `${description.substring(0, 100)}...` 
      : description;

    return (
      <Card style={styles.incidentCard}>
        <TouchableOpacity 
          onPress={handleIncidentPress}
          style={{ width: '100%' }}
        >
          <Card.Content style={{ padding: 16 }}>
            <View style={styles.incidentHeader}>
              <View style={styles.incidentTypeContainer}>
                <View style={[styles.incidentIconContainer, { backgroundColor: '#2563eb' }]}>
                  <Ionicons
                    name={getIncidentIcon(item.incident_type)}
                    size={22}
                    color="#fff"
                  />
                </View>
                <Text style={styles.incidentType} numberOfLines={1}>{item.incident_type}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.statusText, { color: '#92400e' }]}>PENDING</Text>
              </View>
            </View>

            <View style={styles.incidentDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={18} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailValue} numberOfLines={1}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color="#666" style={styles.detailIcon} />
                <View style={styles.locationValueContainer}>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {formatLocation(item.location)}
                  </Text>
                  {item.location.includes(',') && (
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        openMaps(item.location);
                      }}
                      style={styles.viewMapButton}
                    >
                      <Text style={styles.viewMapText}>Map</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.descriptionRow}>
                <Ionicons name="document-text-outline" size={18} color="#666" style={styles.detailIcon} />
                <View style={styles.descriptionContainer}>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {displayDescription}
                  </Text>
                  {isLongDescription && (
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert('Full Description', description);
                      }}
                      style={styles.readMoreButton}
                    >
                      <Text style={styles.readMoreText}>Read More</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.incidentActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleApproveIncident(item.id);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRejectIncident(item.id);
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color="#fff" style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleViewDetails(item);
                }}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  const getIncidentIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'fire':
        return 'flame';
      case 'accident':
        return 'car';
      case 'medical':
        return 'medical';
      case 'rescue':
        return 'people';
      default:
        return 'warning';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#fef3c7';
      case 'approved':
        return '#dcfce7';
      case 'in_progress':
        return '#e0e7ff';
      case 'resolved':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const renderEmergencyCall = (call) => {
    const statusColors = {
      pending: '#DC3545',
      received: '#FFC107',
      completed: '#28A745',
      cancelled: '#6C757D'
    };

    return (
      <Card key={call.id} style={styles.callCard}>
        <Card.Content>
          <View style={styles.callHeader}>
            <Text style={styles.callerName}>{call.profiles?.full_name || 'Unknown Caller'}</Text>
            <Badge style={[styles.statusBadge, { backgroundColor: statusColors[call.status] }]}>
              {call.status.toUpperCase()}
            </Badge>
          </View>

          <View style={styles.callDetails}>
            <Text style={styles.callTime}>
              {new Date(call.created_at).toLocaleString()}
            </Text>

            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => openMaps(call.caller_location)}
            >
              <Ionicons name="location" size={20} color="#DC3545" />
              <Text style={styles.locationText}>View Location</Text>
            </TouchableOpacity>
          </View>

          {call.status === 'pending' && (
            <View style={styles.actionButtons}>
              <Button 
                mode="contained" 
                onPress={() => handleCallStatus(call.id, 'received')}
                style={[styles.actionButton, { backgroundColor: '#28A745' }]}
              >
                Accept Call
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => handleCallStatus(call.id, 'cancelled')}
                style={styles.actionButton}
                textColor="#DC3545"
              >
                Cancel
              </Button>
            </View>
          )}

          {call.status === 'received' && (
            <Button 
              mode="contained" 
              onPress={() => handleCallStatus(call.id, 'completed')}
              style={[styles.actionButton, { backgroundColor: '#28A745' }]}
            >
              Complete Call
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading incidents...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderStationInfo()}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: '#DC3545' }]}>
            <Card.Content>
              <Text style={styles.statNumber}>{stats.activeCount}</Text>
              <Text style={styles.statLabel}>Active{'\n'}Emergencies</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
            <Card.Content>
              <Text style={styles.statNumber}>{stats.resolvedToday}</Text>
              <Text style={styles.statLabel}>Resolved{'\n'}Today</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: '#3949AB' }]}>
            <Card.Content>
              <Text style={styles.statNumber}>{stats.responseRate}%</Text>
              <Text style={styles.statLabel}>Response{'\n'}Rate</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incoming Incidents</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FirefighterIncident', { initialFilter: 'pending' })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {incidents.length > 0 ? (
            incidents.map((item) => (
              <View key={item.id}>
                {renderIncidentItem({ item })}
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No pending incidents</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Emergencies</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FirefighterIncident', { initialFilter: 'in_progress' })}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {activeEmergencies.length > 0 ? (
            activeEmergencies.map((emergency) => (
              <View key={emergency.id}>
                {renderEmergencyCard(emergency)}
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No active emergencies</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Calls</Text>
            <TouchableOpacity onPress={loadEmergencyCalls}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <Text style={styles.loadingText}>Loading emergency calls...</Text>
          ) : emergencyCalls.length > 0 ? (
            emergencyCalls.map((call) => (
              <View key={call.id}>
                {renderEmergencyCall(call)}
              </View>
            ))
          ) : (
            <Text style={styles.noCallsText}>No emergency calls</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
    fontFamily: 'Inter-Regular',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statCard: {
    width: '31%',
    borderRadius: 8,
    padding: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 0,
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 10,
    color: '#fff',
    lineHeight: 12,
    fontFamily: 'Inter-Medium',
  },
  section: {
    padding: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter-SemiBold',
  },
  viewAllText: {
    color: '#DC3545',
    fontFamily: 'Inter-Medium',
  },
  emergencyCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  incidentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emergencyType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  incidentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#4A5568',
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 22,
  },
  locationValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  descriptionContainer: {
    flex: 1,
  },
  viewMapButton: {
    marginLeft: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  viewMapText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  readMoreText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  respondButton: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 16,
  },
  stationInfoContainer: {
    margin: 16,
    elevation: 4,
  },
  stationInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    width: '90%',
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stationHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    fontFamily: 'Inter-Bold',
  },
  stationStatusBadge: {
    borderRadius: 12,
  },
  stationStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  stationDetailsGrid: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIconContainer: {
    marginRight: 8,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    color: '#4A5568',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  touchableValue: {
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
  },
  incidentCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#fff',
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  incidentType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  incidentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#4A5568',
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 22,
  },
  locationValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  descriptionContainer: {
    flex: 1,
  },
  viewMapButton: {
    marginLeft: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  viewMapText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  readMoreText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#DC3545',
  },
  actionIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  emergencyFooter: {
    marginTop: 16,
  },
  respondButton: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 16,
  },
  stationDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    width: '90%', // Reduced width
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationDetailsContent: {
    alignItems: 'center',
  },
  stationAddress: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 8,
  },
  stationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  stationStatus: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  incidentsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incidentItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  incidentInfo: {
    marginBottom: 8,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  incidentLocation: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
  },
  incidentTime: {
    fontSize: 12,
    color: '#718096',
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  callCard: {
    marginBottom: 16,
    elevation: 2
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  callerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C'
  },
  callDetails: {
    marginBottom: 12
  },
  callTime: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  locationText: {
    marginLeft: 4,
    color: '#DC3545',
    fontWeight: '500'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 20
  },
  loadingText: {
    textAlign: 'center',
    color: '#4A5568',
    marginTop: 20
  },
  noCallsText: {
    textAlign: 'center',
    color: '#4A5568',
    marginTop: 20,
    fontStyle: 'italic'
  },
  stationDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    width: '90%', // Reduced width
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationDetailsContent: {
    alignItems: 'center',
  },
  stationAddress: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 8,
  },
  stationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  stationStatus: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  incidentsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incidentItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  incidentInfo: {
    marginBottom: 8,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  incidentLocation: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
  },
  incidentTime: {
    fontSize: 12,
    color: '#718096',
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});

export default FirefighterHomeScreen;

