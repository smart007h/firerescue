import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, FlatList, Animated } from 'react-native';
import { Text, Card, Button, IconButton, DataTable, Badge, Searchbar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FirefighterIncidentScreen = ({ route, navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incident, setIncident] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [reporter, setReporter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(route.params?.initialFilter || 'all');
  const [formattedLocation, setFormattedLocation] = useState('');
  const incidentId = route.params?.incidentId;
  const passedIncidentData = route.params?.incidentData;
  const [showScrollButton, setShowScrollButton] = useState(false);
  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (incidentId) {
      if (passedIncidentData) {
        console.log('Using passed incident data');
        setIncident(passedIncidentData);
        setLoading(false);
        
        if (passedIncidentData.reported_by) {
          loadReporterDetails(passedIncidentData.reported_by);
        }
        // Format location for passed incident data
        if (passedIncidentData.location) {
          formatAndSetLocation(passedIncidentData.location);
        }
      } else {
        loadIncidentDetails();
      }
    } else {
      loadAllIncidents();
    }
  }, [incidentId, passedIncidentData]);

  useEffect(() => {
    filterIncidents();
  }, [selectedStatus, searchQuery, incidents]);

  const filterIncidents = () => {
    let filtered = [...incidents];

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'resolved') {
        filtered = filtered.filter(incident => 
          ['resolved', 'cancelled', 'completed', 'rejected'].includes(incident.status)
        );
      } else {
        filtered = filtered.filter(incident => incident.status === selectedStatus);
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(incident => 
        incident.incident_type.toLowerCase().includes(query) ||
        incident.description.toLowerCase().includes(query) ||
        incident.location.toLowerCase().includes(query)
      );
    }

    setFilteredIncidents(filtered);
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

  const loadAllIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stationId = await AsyncStorage.getItem('stationId');
      console.log('Loading incidents for station:', stationId);
      
      if (!stationId) {
        throw new Error('No station ID found');
      }

      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        return;
      }

      console.log('Querying incidents table...');
      const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select(`
          *,
          incident_responses!left (
            id,
            status,
            response_time,
            firefighter_id
          )
        `)
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

      if (incidentsError) {
        console.error('Error fetching incidents:', incidentsError);
        throw new Error(incidentsError.message || 'Failed to load incidents');
      }

      if (!incidents) {
        console.log('No incidents found');
        setIncidents([]);
        return;
      }

      const transformedData = incidents.map(incident => ({
        ...incident,
        responseStatus: incident.incident_responses?.[0]?.status || 'pending',
        responseId: incident.incident_responses?.[0]?.id,
        responseTime: incident.incident_responses?.[0]?.response_time
      }));

      // Format locations for all incidents
      const incidentsWithFormattedLocations = await Promise.all(
        transformedData.map(async (incident) => {
          if (incident.location) {
            const formattedLocation = await formatLocation(incident.location);
            return { ...incident, formattedLocation };
          }
          return incident;
        })
      );

      setIncidents(incidentsWithFormattedLocations);
      setFilteredIncidents(incidentsWithFormattedLocations);
    } catch (err) {
      console.error('Error in loadAllIncidents:', err);
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadIncidentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        return;
      }

      if (!incidentId) {
        throw new Error('No incident ID provided');
      }

      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select(`
          id,
          incident_type,
          location,
          description,
          created_at,
          media_urls,
          status,
          reported_by,
          incident_responses (
            id,
            status,
            response_time,
            firefighter_id
          )
        `)
        .eq('id', incidentId)
        .single();

      if (incidentError) {
        console.error('Error fetching incident:', incidentError);
        throw new Error(incidentError.message || 'Failed to load incident details');
      }
      
      if (!incidentData) {
        throw new Error('Incident not found');
      }

      setIncident(incidentData);

      // Format the location
      if (incidentData.location) {
        formatAndSetLocation(incidentData.location);
      }

      if (incidentData.reported_by) {
        const { data: reporterData, error: reporterError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', incidentData.reported_by)
          .single();

        if (reporterError) {
          console.error('Error fetching reporter details:', reporterError);
        } else if (reporterData) {
          setReporter(reporterData);
        }
      }
    } catch (err) {
      console.error('Error in loadIncidentDetails:', err);
      setError(err.message || 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectIncident = async (incidentId) => {
    try {
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        return;
      }

      // Update incident status to cancelled
      const { error: incidentError } = await supabase
        .from('incidents')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId);

      if (incidentError) throw incidentError;

      Alert.alert('Success', 'Incident has been rejected');
      await loadIncidentDetails();
    } catch (error) {
      console.error('Error rejecting incident:', error);
      Alert.alert('Error', error.message || 'Failed to reject incident');
    }
  };

  const handleApproveIncident = async (incidentId) => {
    try {
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) {
        return;
      }

      // Get current firefighter's ID from stationData
      const stationDataStr = await AsyncStorage.getItem('stationData');
      if (!stationDataStr) {
        throw new Error('No station data found');
      }
      const stationData = JSON.parse(stationDataStr);
      const firefighterId = stationData.id;

      if (!firefighterId) {
        throw new Error('No firefighter ID found in station data');
      }

      console.log('Approving incident with firefighter ID:', firefighterId);

      // Update incident status
      const { error: incidentError } = await supabase
        .from('incidents')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId);

      if (incidentError) throw incidentError;

      // Check for existing response
      const { data: existingResponse, error: responseError } = await supabase
        .from('incident_responses')
        .select('id')
        .eq('incident_id', incidentId)
        .eq('firefighter_id', firefighterId)
        .single();

      if (responseError && responseError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw responseError;
      }

      if (existingResponse) {
        // Update existing response
        const { error: updateError } = await supabase
          .from('incident_responses')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResponse.id)
          .eq('firefighter_id', firefighterId);

        if (updateError) throw updateError;
      } else {
        // Create new response
        const { error: insertError } = await supabase
          .from('incident_responses')
          .insert([{
            incident_id: incidentId,
            firefighter_id: firefighterId,
            status: 'in_progress',
            response_time: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('Error inserting incident response:', insertError);
          throw insertError;
        }
      }
      
      await loadAllIncidents();
      Alert.alert('Success', 'Incident approved successfully');
    } catch (error) {
      console.error('Error approving incident:', error);
      Alert.alert('Error', error.message || 'Failed to approve incident');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500'; // Orange for pending
      case 'in_progress':
        return '#2196F3'; // Blue for in progress
      case 'resolved':
        return '#4CAF50'; // Green for resolved
      case 'cancelled':
        return '#DC3545'; // Red for cancelled
      case 'completed':
        return '#4CAF50'; // Green for completed
      case 'rejected':
        return '#DC3545'; // Red for rejected
      default:
        return '#FFA500'; // Default orange
    }
  };

  const getStatusBackgroundColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFF3E0'; // Light orange background
      case 'in_progress':
        return '#E3F2FD'; // Light blue background
      case 'resolved':
        return '#E8F5E9'; // Light green background
      case 'cancelled':
        return '#FFEBEE'; // Light red background
      case 'completed':
        return '#E8F5E9'; // Light green background
      case 'rejected':
        return '#FFEBEE'; // Light red background
      default:
        return '#FFF3E0'; // Default light orange
    }
  };

  const formatLocation = async (location) => {
    if (!location) return 'Location not available';
    
    // If location is already a readable address, return it
    if (!location.includes(',')) return location;
    
    try {
      // Split coordinates
      const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
      
      // Mock location names based on coordinates
      // This is a temporary solution until we integrate with a proper geocoding service
      const mockLocations = {
        'Mountain View': { lat: 37.3861, lng: -122.0839 },
        'Palo Alto': { lat: 37.4419, lng: -122.1430 },
        'Sunnyvale': { lat: 37.3688, lng: -122.0363 },
        'San Jose': { lat: 37.3382, lng: -121.8863 },
        'Santa Clara': { lat: 37.3541, lng: -121.9552 },
        'Cupertino': { lat: 37.3229, lng: -122.0322 },
        'Redwood City': { lat: 37.4852, lng: -122.2364 },
        'Menlo Park': { lat: 37.4538, lng: -122.1817 },
      };

      // Find the closest city based on coordinates
      let closestCity = null;
      let shortestDistance = Infinity;

      Object.entries(mockLocations).forEach(([city, coords]) => {
        const distance = Math.sqrt(
          Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
        );
        if (distance < shortestDistance) {
          shortestDistance = distance;
          closestCity = city;
        }
      });

      // Return a more natural-sounding location
      if (closestCity) {
        const landmarks = [
          'near Downtown',
          'by the Shopping Center',
          'near the Park',
          'in the Business District',
          'by the Community Center',
          'near the Library',
          'in the Residential Area',
          'by the Transit Center'
        ];
        const randomLandmark = landmarks[Math.floor(Math.random() * landmarks.length)];
        return `${closestCity}, ${randomLandmark}`;
      }

      // Fallback to a more natural coordinate format if no city match
      return `Location in ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E area`;
    } catch (error) {
      console.error('Error formatting location:', error);
      // Fallback to original location if there's an error
      return location;
    }
  };

  const formatAndSetLocation = async (location) => {
    try {
      const formatted = await formatLocation(location);
      setFormattedLocation(formatted);
    } catch (error) {
      console.error('Error formatting location:', error);
      setFormattedLocation(location);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllIncidents();
  };

  const renderIncidentItem = ({ item }) => {
    console.log('Rendering incident item:', item);
    return (
    <TouchableOpacity
      style={[styles.incidentCard]}
      onPress={() => {
        // Navigate to the FirefighterIncidentDetails screen in the main stack
        navigation.navigate('FirefighterIncidentDetails', { 
          incidentId: item.id,
          fromList: true
        });
      }}
    >
      <View style={styles.headerRow}>
        <View style={styles.incidentTypeContainer}>
          <View style={[styles.incidentIconContainer, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons
              name={getIncidentIcon(item.incident_type)}
              size={32}
              color="#fff"
            />
          </View>
          <Text style={styles.incidentType}>{item.incident_type || 'Unknown Type'}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { 
            backgroundColor: getStatusColor(item.status),
            minWidth: 120,
            alignItems: 'center',
          }]}>
            <Text style={styles.statusText}>
              {(item.status || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.detailRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={24} color="#666" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailText}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : 'Time not available'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="location-outline" size={24} color="#666" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailText}>
              {item.formattedLocation || item.location || 'Location not available'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text-outline" size={24} color="#666" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailText} numberOfLines={2}>
              {item.description || 'No description available'}
            </Text>
          </View>
        </View>
      </View>

      {(!item.status || item.status === 'pending') && (
        <View style={styles.actionButtonsContainer}>
          <Button
            mode="contained"
            onPress={() => handleApproveIncident(item.id)}
            style={[styles.actionButton, styles.approveButton]}
            labelStyle={styles.actionButtonLabel}
          >
            Approve
          </Button>
          <Button
            mode="contained"
            onPress={() => handleRejectIncident(item.id)}
            style={[styles.actionButton, styles.rejectButton]}
            labelStyle={styles.actionButtonLabel}
          >
            Reject
          </Button>
        </View>
      )}
    </TouchableOpacity>
  )};

  const getIncidentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'fire':
        return 'flame';
      case 'medical emergency':
        return 'medical';
      case 'traffic accident':
        return 'car';
      case 'natural disaster':
        return 'warning';
      case 'hazardous material':
        return 'alert-circle';
      case 'rescue operation':
        return 'people';
      default:
        return 'warning';
    }
  };

  const loadReporterDetails = async (reporterId) => {
    try {
      if (reporterId) {
        const { data: reporterData, error: reporterError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', reporterId)
          .single();

        if (reporterError) {
          console.error('Error fetching reporter details:', reporterError);
          // Don't throw here, just log the error since reporter details are optional
        } else if (reporterData) {
          setReporter(reporterData);
        }
      }
    } catch (err) {
      console.error('Error loading reporter details:', err);
      // Don't set error state here, just log the error
    }
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollButton(offsetY > 200); // Show button when scrolled past 200 pixels
  };

  const scrollToTop = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {incidentId ? 'Incident Details' : 'All Incidents'}
          </Text>
        </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
          <Text style={styles.loadingText}>
            {incidentId ? 'Loading incident details...' : 'Loading incidents...'}
          </Text>
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
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
        </View>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#DC3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
            onPress={incidentId ? loadIncidentDetails : loadAllIncidents}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
    </View>
      </SafeAreaView>
    );
  }

  // Show all incidents view when no specific incident is selected
  if (!incidentId) {
    console.log('Rendering incident list view');
    console.log('Current filtered incidents:', filteredIncidents);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Incidents</Text>
        </View>

        <View style={styles.filterContainer}>
          <Searchbar
            placeholder="Search incidents..."
            onChangeText={(text) => {
              console.log('Search query changed:', text);
              setSearchQuery(text);
            }}
            value={searchQuery}
            style={styles.searchBar}
          />
          <View style={styles.segmentedButtonsContainer}>
            <SegmentedButtons
              value={selectedStatus}
              onValueChange={(value) => {
                console.log('Status filter changed:', value);
                setSelectedStatus(value);
              }}
              buttons={[
                { 
                  value: 'all', 
                  label: 'All',
                  style: {
                    backgroundColor: selectedStatus === 'all' ? '#DC3545' : '#fff',
                    flex: 1,
                    paddingHorizontal: 8,
                  },
                  labelStyle: {
                    color: selectedStatus === 'all' ? '#fff' : '#666',
                    fontSize: 14,
                    textAlign: 'center',
                  }
                },
                { 
                  value: 'pending', 
                  label: 'Pending',
                  style: {
                    backgroundColor: selectedStatus === 'pending' ? '#DC3545' : '#fff',
                    flex: 1,
                    paddingHorizontal: 8,
                  },
                  labelStyle: {
                    color: selectedStatus === 'pending' ? '#fff' : '#666',
                    fontSize: 14,
                    textAlign: 'center',
                  }
                },
                { 
                  value: 'in_progress', 
                  label: 'Progress',
                  style: {
                    backgroundColor: selectedStatus === 'in_progress' ? '#DC3545' : '#fff',
                    flex: 1,
                    paddingHorizontal: 8,
                  },
                  labelStyle: {
                    color: selectedStatus === 'in_progress' ? '#fff' : '#666',
                    fontSize: 14,
                    textAlign: 'center',
                  }
                },
                { 
                  value: 'resolved', 
                  label: 'Resolved',
                  style: {
                    backgroundColor: selectedStatus === 'resolved' ? '#DC3545' : '#fff',
                    flex: 1,
                    paddingHorizontal: 8,
                  },
                  labelStyle: {
                    color: selectedStatus === 'resolved' ? '#fff' : '#666',
                    fontSize: 14,
                    textAlign: 'center',
                  }
                }
              ]}
              style={[styles.statusFilter, { 
                borderRadius: 8,
                marginHorizontal: 0,
                paddingHorizontal: 4,
              }]}
              theme={{
                colors: {
                  secondaryContainer: 'transparent',
                  onSecondaryContainer: '#666',
                  outline: '#DC3545',
                },
                roundness: 8,
              }}
              density="medium"
              showSelectedCheck={false}
            />
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={filteredIncidents}
          renderItem={renderIncidentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          refreshing={refreshing}
          onRefresh={() => {
            console.log('Refreshing incidents list');
            handleRefresh();
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: false,
              listener: handleScroll,
            }
          )}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No incidents found</Text>
            </View>
          }
        />

        {showScrollButton && (
          <TouchableOpacity
            style={styles.scrollToTopButton}
            onPress={scrollToTop}
          >
            <Ionicons name="arrow-up" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Incident not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const incidentResponse = incident.incident_responses?.[0];
  const incidentStatus = incident.status || 'pending';

  // Show specific incident details
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Check if we came from the list view
            if (route.params?.fromList) {
              // Go back to the list view
              navigation.goBack();
            } else {
              // If we're in the tab view, navigate to the list
              navigation.navigate('FirefighterIncident');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Details</Text>
      </View>
      <ScrollView style={styles.content}>
        <Card style={styles.incidentCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.incidentType}>{incident.incident_type}</Text>
              <View 
                style={[
                  styles.statusBadge, 
                  { 
                    backgroundColor: getStatusColor(incidentStatus),
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    minWidth: 120,
                    alignItems: 'center',
                  }
                ]}
              >
                <Text style={[styles.statusText, { color: '#fff', fontSize: 16, fontWeight: 'bold' }]}>
                  {incidentStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.detailText}>
                {new Date(incident.created_at).toLocaleString()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={[styles.detailText, { fontSize: 16 }]}>
                {formattedLocation || 'Loading location...'}
              </Text>
            </View>

            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{incident.description}</Text>

            {reporter && (
              <View style={styles.reporterSection}>
                <Text style={styles.reporterTitle}>Reported By</Text>
                <Text style={styles.reporterName}>
                  {reporter.full_name || 'Anonymous'}
                </Text>
                <Text style={styles.reporterContact}>
                  {reporter.phone || 'No contact provided'}
                </Text>
              </View>
            )}

            {incident.media_urls && incident.media_urls.length > 0 && (
              <View style={styles.mediaSection}>
                <Text style={styles.mediaTitle}>Media</Text>
                <ScrollView horizontal style={styles.mediaScroll}>
                  {incident.media_urls.map((url, index) => (
                    <Image
                      key={index}
                      source={{ uri: url }}
                      style={styles.mediaImage}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {incident.status === 'pending' && (
              <View style={styles.actionButtonsContainer}>
                <Button
                  mode="contained"
                  onPress={() => handleApproveIncident(incident.id)}
                  style={[styles.actionButton, styles.approveButton]}
                  labelStyle={styles.actionButtonLabel}
                >
                  Approve
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleRejectIncident(incident.id)}
                  style={[styles.actionButton, styles.rejectButton]}
                  labelStyle={styles.actionButtonLabel}
                >
                  Reject
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#DC3545',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginVertical: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  incidentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incidentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incidentType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusContainer: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 0,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#DC3545',
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  reporterSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reporterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  reporterName: {
    fontSize: 16,
    color: '#333',
  },
  reporterContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mediaSection: {
    marginTop: 24,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  mediaScroll: {
    flexDirection: 'row',
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
  },
  segmentedButtonsContainer: {
    width: '100%',
    paddingHorizontal: 0,
  },
  statusFilter: {
    backgroundColor: '#fff',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  scrollToTopButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  segmentedButtonContainer: {
    marginHorizontal: 16,
  },
});

export default FirefighterIncidentScreen;
