import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, FlatList, Animated } from 'react-native';
import { Text, Card, Button, IconButton, DataTable, Badge, Searchbar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAddressFromCoordinates } from '../services/locationService';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const FirefighterIncidentScreen = ({ route, navigation }) => {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incident, setIncident] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [reporter, setReporter] = useState(null);
  const [dispatcher, setDispatcher] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(route.params?.initialFilter || 'all');
  const [formattedLocation, setFormattedLocation] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const incidentId = route.params?.incidentId;
  const passedIncidentData = route.params?.incidentData;
  const [showScrollButton, setShowScrollButton] = useState(false);
  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const SUPABASE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/assign-incident`;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
      
      // Set up real-time subscription for incident updates when viewing all incidents
      const incidentSubscription = supabase
        .channel('incident_updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'incidents',
          },
          (payload) => {
            console.log('Real-time incident update received:', payload);
            
            if (payload.eventType === 'UPDATE') {
              // Update the specific incident in the list
              setIncidents(prevIncidents => 
                prevIncidents.map(incident => 
                  incident.id === payload.new.id 
                    ? { ...incident, ...payload.new }
                    : incident
                )
              );
            } else if (payload.eventType === 'INSERT') {
              // Add new incident to the list
              const newIncident = payload.new;
              setIncidents(prevIncidents => [newIncident, ...prevIncidents]);
            } else if (payload.eventType === 'DELETE') {
              // Remove deleted incident from the list
              setIncidents(prevIncidents => 
                prevIncidents.filter(incident => incident.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      // Cleanup subscription on unmount
      return () => {
        console.log('Cleaning up incident subscription');
        supabase.removeChannel(incidentSubscription);
      };
    }
  }, [incidentId, passedIncidentData]);

  useEffect(() => {
    filterIncidents();
  }, [selectedStatus, searchQuery, incidents]);

  // Add this useFocusEffect to reset filter state on focus/param change
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.initialFilter) {
        setSelectedStatus(route.params.initialFilter);
      }
      
      // Refresh incidents when screen comes into focus (e.g., returning from details screen)
      if (route.params?.refresh) {
        console.log('Refreshing incidents due to navigation param');
        loadAllIncidents();
        // Clear the refresh param to avoid infinite refreshes
        navigation.setParams({ refresh: undefined });
      }
      
      // Optionally, reset searchQuery or other state here if needed
    }, [route.params?.initialFilter, route.params?.refresh])
  );

  const filterIncidents = () => {
    let filtered = [...incidents];

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'resolved') {
        filtered = filtered.filter(incident => 
          incident.status && ['resolved', 'cancelled', 'completed', 'rejected'].includes(incident.status)
        );
        // If resolvedToday is set, filter for only today's resolved incidents
        if (route.params?.resolvedToday) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = filtered.filter(incident => {
            if (!incident.resolved_at) return false;
            const resolvedDate = new Date(incident.resolved_at);
            return resolvedDate >= today;
          });
        }
      } else {
        filtered = filtered.filter(incident => incident.status === selectedStatus);
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(incident => 
        (incident.incident_type && incident.incident_type.toLowerCase().includes(query)) ||
        (incident.description && incident.description.toLowerCase().includes(query)) ||
        (incident.location && incident.location.toLowerCase().includes(query))
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
    
    // Let AuthContext and AppNavigator handle the navigation instead of manual reset
    await signOut();
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
      if (session.expires_at * 1000 < Date.now()) {
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
        .maybeSingle();

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
      setLoadingProgress(0);
      const stationId = await AsyncStorage.getItem('stationId');
      if (!stationId) throw new Error('No station ID found');
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) return;
      
      setLoadingProgress(20);
      // Query with optimized selection and limit for better performance
      const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select(`
          id,
          incident_type,
          location,
          description,
          created_at,
          status,
          updated_at,
          reported_by,
          dispatcher_id,
          incident_responses!left (id, status, response_time, firefighter_id)
        `)
        .eq('station_id', stationId)
        .order('updated_at', { ascending: false })
        .limit(50); // Limit initial load for better performance
      if (incidentsError) throw new Error(incidentsError.message || 'Failed to load incidents');
      if (!incidents) { setIncidents([]); return; }
      
      setLoadingProgress(40);
      
      // Reduce logging for better performance
      console.log('Loaded incidents:', incidents.length);
      
      const transformedData = incidents.map((incident, index) => {
        if (!incident.id) {
          console.error(`Incident at index ${index} has no id`);
        }
        
        // Safely extract incident response data
        const firstResponse = incident.incident_responses && incident.incident_responses.length > 0 
          ? incident.incident_responses[0] 
          : null;
        
        return {
          ...incident,
          responseStatus: firstResponse?.status || 'pending',
          responseId: firstResponse?.id || null,
          responseTime: firstResponse?.response_time || null
        };
      });

      setLoadingProgress(60);

      // Format locations in smaller batches for faster response
      const BATCH_SIZE = 3;
      const incidentsWithFormattedLocations = [];
      
      for (let i = 0; i < transformedData.length; i += BATCH_SIZE) {
        const batch = transformedData.slice(i, i + BATCH_SIZE);
        const formattedBatch = await Promise.all(
          batch.map(async (incident) => {
            try {
              if (incident.location) {
                // Reduce timeout to 1 second for faster response
                const formatLocationWithTimeout = (location, timeout = 1000) => {
                  return Promise.race([
                    formatLocation(location),
                    new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Timeout')), timeout)
                    )
                  ]);
                };
                
                try {
                  const formattedLocation = await formatLocationWithTimeout(incident.location);
                  return { ...incident, formattedLocation };
                } catch (timeoutError) {
                  // Quick fallback without logging
                  return { ...incident, formattedLocation: incident.location };
                }
              }
              return incident;
            } catch (error) {
              return incident;
            }
          })
        );
        incidentsWithFormattedLocations.push(...formattedBatch);
        // Update progress as we process batches
        setLoadingProgress(60 + (30 * (i + BATCH_SIZE) / transformedData.length));
      }
      
      // Filter out any incidents without valid IDs
      const validIncidents = incidentsWithFormattedLocations.filter(incident => incident && incident.id);
      console.log('Valid incidents loaded:', validIncidents.length);
      
      setIncidents(validIncidents);
      setFilteredIncidents(validIncidents);
      setLoadingProgress(100);
      // Scroll to top after reload
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingProgress(0);
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

      // Load incident data and related data in parallel for better performance
      const [incidentResult, reporterResult, dispatcherResult] = await Promise.allSettled([
        supabase
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
            dispatcher_id,
            incident_responses (
              id,
              status,
              response_time,
              firefighter_id
            )
          `)
          .eq('id', incidentId)
          .single(),
        
        // We'll fetch reporter details after we know if we need them
        Promise.resolve(null),
        
        // We'll fetch dispatcher details after we know if we need them  
        Promise.resolve(null)
      ]);

      if (incidentResult.status === 'rejected') {
        console.error('Error fetching incident:', incidentResult.reason);
        throw new Error(incidentResult.reason?.message || 'Failed to load incident details');
      }
      
      const incidentData = incidentResult.value?.data;
      if (!incidentData) {
        throw new Error('Incident not found');
      }

      setIncident(incidentData);

      // Format location and fetch related data in parallel
      const parallelTasks = [];
      
      // Format location
      if (incidentData.location) {
        parallelTasks.push(
          formatAndSetLocation(incidentData.location).catch(error => {
            console.error('Error formatting location:', error);
            setFormattedLocation(incidentData.location || 'Location not available');
          })
        );
      }

      // Fetch reporter details if needed
      if (incidentData.reported_by) {
        parallelTasks.push(
          supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('id', incidentData.reported_by)
            .maybeSingle()
            .then(({ data: reporterData, error: reporterError }) => {
              if (!reporterError && reporterData) {
                setReporter(reporterData);
              }
            })
            .catch(error => console.error('Error fetching reporter details:', error))
        );
      }

      // Fetch dispatcher details if assigned and incident is active (not resolved)
      if (incidentData.dispatcher_id && incidentData.status !== 'resolved' && incidentData.status !== 'cancelled') {
        parallelTasks.push(
          supabase
            .from('dispatchers')
            .select('dispatcher_id, name, phone, email, role, type')
            .eq('dispatcher_id', incidentData.dispatcher_id)
            .maybeSingle()
            .then(({ data: dispatcherData, error: dispatcherError }) => {
              if (!dispatcherError && dispatcherData) {
                setDispatcher(dispatcherData);
              }
            })
            .catch(error => console.error('Error fetching dispatcher details:', error))
        );
      }

      // Execute all parallel tasks
      await Promise.allSettled(parallelTasks);

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

  const getFallbackDispatcherInfo = async (stationId) => {
    try {
      // Try to get dispatcher info for this station/region
      const { data: station, error: stationError } = await supabase
        .from('firefighters')
        .select('station_name, station_region, station_address')
        .eq('station_id', stationId)
        .maybeSingle();

      if (stationError) {
        console.error('Error fetching station info:', stationError);
        return 'A dispatcher will be assigned shortly.';
      }

      if (!station) {
        return 'A dispatcher will be assigned shortly.';
      }

      // Try to get available dispatchers for this region
      const { data: dispatchers, error: dispatcherError } = await supabase
        .from('dispatchers')
        .select('name, type, role, phone, email, region')
        .or(`region.ilike.%${station.station_region}%,region.is.null`)
        .eq('is_active', true)
        .limit(1);

      if (dispatcherError) {
        console.error('Error fetching dispatcher info:', dispatcherError);
        return `Station: ${station.station_name}\nRegion: ${station.station_region}\nA dispatcher will be assigned shortly.`;
      }

      if (dispatchers && dispatchers.length > 0) {
        const dispatcher = dispatchers[0];
        return `Station: ${station.station_name}\nRegion: ${station.station_region}\n\nAvailable Dispatcher:\nName: ${dispatcher.name}\nType: ${dispatcher.type || dispatcher.role || 'Dispatcher'}\nContact: ${dispatcher.phone || dispatcher.email || 'Contact pending'}`;
      }

      return `Station: ${station.station_name}\nRegion: ${station.station_region}\nA dispatcher will be assigned shortly.`;
    } catch (error) {
      console.error('Error in getFallbackDispatcherInfo:', error);
      return 'A dispatcher will be assigned shortly.';
    }
  };

  const handleApproveIncident = async (incidentId) => {
    try {
      const isSessionValid = await checkAndRefreshSession();
      if (!isSessionValid) return;
      const stationDataStr = await AsyncStorage.getItem('stationData');
      if (!stationDataStr) throw new Error('No station data found');
      const stationData = JSON.parse(stationDataStr);
      const firefighterId = stationData.id;
      const stationId = stationData.station_id;
      if (!firefighterId) throw new Error('No firefighter ID found in station data');
      // Update incident status
      const { error: incidentError } = await supabase
        .from('incidents')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', incidentId);
      if (incidentError) throw incidentError;
      // Check for existing response
      const { data: existingResponse, error: responseError } = await supabase
        .from('incident_responses')
        .select('id')
        .eq('incident_id', incidentId)
        .eq('firefighter_id', firefighterId)
        .maybeSingle();
      if (responseError) throw responseError;
      if (existingResponse) {
        const { error: updateError } = await supabase
          .from('incident_responses')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', existingResponse.id)
          .eq('firefighter_id', firefighterId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('incident_responses')
          .insert([{ incident_id: incidentId, firefighter_id: firefighterId, status: 'in_progress', response_time: new Date().toISOString() }]);
        if (insertError) throw insertError;
      }
      // Fetch incident details for location
      const { data: incidentDetails, error: fetchError } = await supabase
        .from('incidents')
        .select('id, location, station_id')
        .eq('id', incidentId)
        .single();
      if (fetchError) throw fetchError;
      let incident_lat = null, incident_lng = null;
      if (incidentDetails && incidentDetails.location) {
        const coords = incidentDetails.location.split(',');
        if (coords.length === 2) {
          incident_lat = parseFloat(coords[0]);
          incident_lng = parseFloat(coords[1]);
        }
      }
      // Call the assign-incident Edge Function
      let assignmentSuccess = false;
      let assignmentMessage = '';
      let assignedDispatcher = null;
      try {
        const response = await fetch(SUPABASE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            incident_id: incidentId,
            incident_lat,
            incident_lng,
            station_id: stationId
          })
        });
        const result = await response.json();
        console.log('Edge Function response:', result);
        
        if (response.ok && result.assigned_dispatcher) {
          assignmentSuccess = true;
          assignedDispatcher = result.assigned_dispatcher;
          
          // Create detailed message with dispatcher info
          const dispatcherName = assignedDispatcher.name || 'Unknown Dispatcher';
          const dispatcherType = assignedDispatcher.type || assignedDispatcher.role || 'Dispatcher';
          const dispatcherContact = assignedDispatcher.phone || assignedDispatcher.email || 'No contact available';
          
          assignmentMessage = `Incident approved and successfully assigned to dispatcher:\n\nName: ${dispatcherName}\nType: ${dispatcherType}\nContact: ${dispatcherContact}`;
        } else if (response.ok && result.dispatcher) {
          // Alternative response structure
          assignmentSuccess = true;
          assignedDispatcher = result.dispatcher;
          
          const dispatcherName = assignedDispatcher.name || 'Unknown Dispatcher';
          const dispatcherType = assignedDispatcher.type || assignedDispatcher.role || 'Dispatcher';
          const dispatcherContact = assignedDispatcher.phone || assignedDispatcher.email || 'No contact available';
          
          assignmentMessage = `Incident approved and successfully assigned to dispatcher:\n\nName: ${dispatcherName}\nType: ${dispatcherType}\nContact: ${dispatcherContact}`;
        } else {
          // If assignment failed, try to get available dispatcher info for this station/region
          const fallbackMessage = await getFallbackDispatcherInfo(stationId);
          assignmentMessage = result.error ? 
            `Incident approved, but assignment failed: ${result.error}\n\n${fallbackMessage}` : 
            `Incident approved, but dispatcher assignment failed.\n\n${fallbackMessage}`;
        }
      } catch (assignError) {
        console.error('Edge Function error:', assignError);
        // Try to get fallback dispatcher info
        const fallbackMessage = await getFallbackDispatcherInfo(stationId);
        assignmentMessage = `Incident approved, but failed to assign dispatcher due to network error.\n\n${fallbackMessage}`;
      }
      // Show the alert and reload the list after user dismisses
      Alert.alert(
        'Incident Approval',
        assignmentMessage,
        [
          {
            text: 'OK',
            onPress: async () => {
              await loadAllIncidents();
              if (flatListRef.current) {
                flatListRef.current.scrollToOffset({ offset: 0, animated: true });
              }
            }
          }
        ]
      );
    } catch (error) {
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
    
    // If location is already a readable address (contains letters), return it quickly
    if (/[a-zA-Z]/.test(location) && !location.includes(',')) {
      return location;
    }
    
    try {
      // Quick check for coordinate format
      if (location.includes(',') && /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(location.trim())) {
        const coords = location.split(',').map(coord => parseFloat(coord.trim()));
        const [lat, lng] = coords;
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          try {
            // Use shorter timeout for location service
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);
            
            const formattedAddress = await getAddressFromCoordinates(lat, lng);
            clearTimeout(timeoutId);
            
            return formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          } catch (error) {
            // Quick fallback to coordinates
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }
        }
      }
      
      return location;
    } catch (error) {
      return location;
    }
  };

  const formatAndSetLocation = async (location) => {
    try {
      const formatted = await formatLocation(location);
      setFormattedLocation(formatted);
    } catch (error) {
      console.error('Error in formatAndSetLocation:', error);
      setFormattedLocation(location || 'Location not available');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllIncidents();
  };

  const renderIncidentItem = ({ item }) => {
    console.log('Rendering incident item:', item);
    
    // Safety check: ensure item and item.id exist
    if (!item || !item.id) {
      console.error('Invalid incident item:', item);
      return null; // Skip rendering this item
    }
    
    // Additional debugging for the specific incident causing issues
    if (item.id === "f8c8e85c-7b09-4765-aae8-200e91b9967b") {
      console.log('Rendering problematic incident:', JSON.stringify(item, null, 2));
      console.log('Item keys:', Object.keys(item));
      console.log('Item.incident_responses:', item.incident_responses);
      console.log('Item.responseId:', item.responseId);
      console.log('Item.responseStatus:', item.responseStatus);
    }
    
    return (
    <TouchableOpacity
      style={[styles.incidentCard]}
      onPress={() => {
        try {
          console.log(`Navigating to FirefighterIncidentDetails for incident: ${item.id}`);
          // Navigate to the FirefighterIncidentDetails screen specifically for firefighters
          navigation.navigate('FirefighterIncidentDetails', { 
            incidentId: item.id,
            fromList: true
          });
        } catch (navigationError) {
          console.error('Navigation error:', navigationError);
          Alert.alert('Error', 'Unable to open incident details. Please try again.');
        }
      }}
    >
      <View style={styles.headerRow}>
        <View style={styles.incidentTypeContainer}>
          <View style={[styles.incidentIconContainer, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons
              name={getIncidentIcon(item.incident_type)}
              size={28}
              color="#fff"
            />
          </View>
          <Text style={styles.incidentType} numberOfLines={2} ellipsizeMode="tail">
            {item.incident_type || 'Unknown Type'}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { 
            backgroundColor: getStatusColor(item.status),
          }]}>
            <Text style={styles.statusText} numberOfLines={1}>
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

      {/* Action buttons disabled - incidents are now view-only */}
      {/* {(!item.status || item.status === 'pending') && (
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
      )} */}
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
          .maybeSingle();

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
            {incidentId ? 'Loading incident details...' : `Loading incidents... ${Math.round(loadingProgress)}%`}
          </Text>
          {!incidentId && loadingProgress > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${loadingProgress}%` }]} />
            </View>
          )}
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
                    paddingHorizontal: 4,
                    minWidth: 60,
                  },
                  labelStyle: {
                    color: selectedStatus === 'all' ? '#fff' : '#666',
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center',
                  }
                },
                { 
                  value: 'pending', 
                  label: 'Pending',
                  style: {
                    backgroundColor: selectedStatus === 'pending' ? '#DC3545' : '#fff',
                    flex: 1,
                    paddingHorizontal: 4,
                    minWidth: 70,
                  },
                  labelStyle: {
                    color: selectedStatus === 'pending' ? '#fff' : '#666',
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center',
                  }
                },
                { 
                  value: 'in_progress', 
                  label: 'Progress',
                  style: {
                    backgroundColor: selectedStatus === 'in_progress' ? '#DC3545' : '#fff',
                    flex: 1,
                    paddingHorizontal: 4,
                    minWidth: 75,
                  },
                  labelStyle: {
                    color: selectedStatus === 'in_progress' ? '#fff' : '#666',
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center',
                  }
                },
                { 
                  value: 'resolved', 
                  label: 'Resolved',
                  style: {
                    backgroundColor: selectedStatus === 'resolved' ? '#DC3545' : '#fff',
                    flex: 1,
                    paddingHorizontal: 4,
                    minWidth: 75,
                  },
                  labelStyle: {
                    color: selectedStatus === 'resolved' ? '#fff' : '#666',
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center',
                  }
                }
              ]}
              style={[styles.statusFilter, { 
                borderRadius: 8,
                marginHorizontal: 0,
                paddingHorizontal: 2,
                height: 40,
              }]}
              theme={{
                colors: {
                  secondaryContainer: 'transparent',
                  onSecondaryContainer: '#666',
                  outline: '#DC3545',
                },
                roundness: 8,
              }}
              density="small"
              showSelectedCheck={false}
            />
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={filteredIncidents}
          renderItem={renderIncidentItem}
          keyExtractor={(item, index) => item?.id || `incident-${index}`}
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

  // Safely extract incident response data
  const incidentResponse = incident.incident_responses && incident.incident_responses.length > 0 
    ? incident.incident_responses[0] 
    : null;
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
            navigation.navigate('FirefighterIncidents');
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

            {dispatcher && incident.status !== 'resolved' && incident.status !== 'cancelled' && (
              <View style={styles.reporterSection}>
                <Text style={styles.reporterTitle}>Assigned Dispatcher</Text>
                <Text style={styles.reporterName}>{dispatcher.name || 'N/A'}</Text>
                {dispatcher.role && (
                  <Text style={styles.reporterContact}>Type: {dispatcher.role}</Text>
                )}
                {dispatcher.type && !dispatcher.role && (
                  <Text style={styles.reporterContact}>Type: {dispatcher.type}</Text>
                )}
                <Text style={styles.reporterContact}>{dispatcher.phone || dispatcher.email || 'No contact provided'}</Text>
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

            {/* Action buttons disabled - incidents are now view-only */}
            {/* {incident.status === 'pending' && (
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
            )} */}
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
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC3545',
    borderRadius: 2,
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
    overflow: 'hidden', // Prevent content overflow
  },
  headerRow: {
    padding: 16,
    flexDirection: 'column', // Changed to column to prevent overlap
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 12, // Add consistent spacing
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 8, // Add space between type and status
  },
  incidentIconContainer: {
    width: 48, // Reduced size for better proportions
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0, // Prevent shrinking
  },
  incidentType: {
    fontSize: 18, // Reduced font size to prevent overflow
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1, // Allow text to wrap
    flexWrap: 'wrap',
    lineHeight: 24, // Better line spacing
  },
  statusContainer: {
    alignSelf: 'flex-end', // Align to the right
    width: '100%', // Full width for better alignment
  },
  statusBadge: {
    paddingHorizontal: 12, // Reduced padding
    paddingVertical: 6,
    borderRadius: 16, // More rounded
    alignSelf: 'flex-end', // Align to right side
    minWidth: 100, // Reduced minimum width
    maxWidth: 140, // Prevent badge from being too wide
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 14, // Smaller, more readable size
    fontWeight: '600',
    textAlign: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 12, // Reduced top padding
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 14, // More consistent spacing
    alignItems: 'flex-start', // Better alignment for multi-line text
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  detailContent: {
    flex: 1,
    minWidth: 0, // Allows text to wrap properly
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22, // Improved line spacing
    flexWrap: 'wrap',
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
    marginTop: 8,
  },
  statusFilter: {
    backgroundColor: '#fff',
    marginTop: 0,
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
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 8,
    overflow: 'hidden',
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
