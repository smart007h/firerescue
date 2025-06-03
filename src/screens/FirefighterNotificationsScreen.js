import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { Text, Card, Badge, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { supabase } from '../config/supabaseClient';
import { getCurrentUser } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FirefighterNotificationsScreen = () => {
  const navigation = useNavigation();
  const [activeView, setActiveView] = useState(null); // 'callLogs' or 'bookings'
  const [bookings, setBookings] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationId, setStationId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(() => {
    if (stationId) {
      loadData();
    }
  }, [stationId]);

  const checkAuthState = async () => {
    try {
      console.log('=== Checking Authentication State ===');
      setLoading(true);

      // First check AsyncStorage for session
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      if (sessionStr) {
        const storedSession = JSON.parse(sessionStr);
        if (storedSession?.user?.id && new Date(storedSession.expires_at) > new Date()) {
          console.log('Found valid stored session:', storedSession.user.id);
          setIsAuthenticated(true);
          await loadFirefighterData();
          setLoading(false);
          return;
        }
      }

      // If no valid stored session, try to get from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        // Don't immediately logout on error, try to use stored session
        if (sessionStr) {
          console.log('Using stored session despite error');
          setIsAuthenticated(true);
          await loadFirefighterData();
          setLoading(false);
          return;
        }
        handleAuthError();
        return;
      }

      if (!session?.user?.id) {
        console.log('No active session found');
        // Don't immediately logout, try to use stored session
        if (sessionStr) {
          console.log('Using stored session despite no active session');
          setIsAuthenticated(true);
          await loadFirefighterData();
          setLoading(false);
          return;
        }
        handleAuthError();
        return;
      }

      // If we have a valid session, store it and proceed
      console.log('Using active session:', session.user.id);
      await AsyncStorage.setItem('supabase-session', JSON.stringify(session));
      setIsAuthenticated(true);
      await loadFirefighterData();
    } catch (error) {
      console.error('Error in checkAuthState:', error);
      // Don't immediately logout on error, try to use stored session
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      if (sessionStr) {
        console.log('Using stored session after error');
        setIsAuthenticated(true);
        await loadFirefighterData();
      } else {
        handleAuthError();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = async () => {
    try {
      // Try one final time to get the session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        console.log('Final auth check failed - clearing session');
        setIsAuthenticated(false);
        setLoading(false);
        
        // Clear all auth-related data
        await Promise.all([
          AsyncStorage.removeItem('stationId'),
          AsyncStorage.removeItem('supabase-session'),
          supabase.auth.signOut()
        ]);

        // Navigate to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'LoginSelection' }]
        });
      } else {
        // If we somehow got a session, use it
        console.log('Recovered session in handleAuthError');
        setIsAuthenticated(true);
        await loadFirefighterData();
      }
    } catch (error) {
      console.error('Error in handleAuthError:', error);
      // If all else fails, force logout
      await supabase.auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginSelection' }]
      });
    }
  };

  // Add session listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        await loadFirefighterData();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        await AsyncStorage.removeItem('stationId');
        navigation.reset({
          index: 0,
          routes: [{ name: 'LoginSelection' }]
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadFirefighterData = async () => {
    try {
      console.log('=== DEBUG: Loading Firefighter Data ===');
      const storedStationId = await AsyncStorage.getItem('stationId');
      console.log('Stored station ID:', storedStationId);
      
      if (storedStationId) {
        console.log('Using stored station ID');
        setStationId(storedStationId);
        return;
      }

      const { data: userData, error: userError } = await getCurrentUser();
      console.log('User data:', {
        hasUser: !!userData?.user,
        userId: userData?.user?.id,
        error: userError
      });

      if (userError) {
        console.error('Error getting user data:', userError);
        return;
      }

      if (!userData?.user?.id) {
        console.log('No user ID found');
        return;
      }

      // Get firefighter data to get station ID
      const { data: firefighterData, error: firefighterError } = await supabase
        .from('firefighters')
        .select('station_id')
        .eq('id', userData.user.id)
        .single();

      console.log('Firefighter data:', {
        hasData: !!firefighterData,
        stationId: firefighterData?.station_id,
        error: firefighterError
      });

      if (firefighterError) {
        console.error('Error getting firefighter data:', firefighterError);
        return;
      }

      if (firefighterData?.station_id) {
        console.log('Setting station ID:', firefighterData.station_id);
        setStationId(firefighterData.station_id);
        await AsyncStorage.setItem('stationId', firefighterData.station_id);
      } else {
        console.log('No station ID found in firefighter data');
      }
    } catch (error) {
      console.error('Error in loadFirefighterData:', error);
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadStationBookings(), loadStationCallLogs()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStationBookings = async () => {
    try {
      console.log('=== DEBUG: Loading Bookings ===');
      console.log('Current station ID:', {
        value: stationId,
        type: typeof stationId,
        length: stationId?.length,
        matchesPattern: stationId?.match(/^FS[0-9]{3}$/)
      });
      
      // First, let's check ALL bookings in the database
      const { data: allBookings, error: allBookingsError } = await supabase
        .from('training_bookings')
        .select('*')
        .order('training_date', { ascending: true });
      
      console.log('=== ALL BOOKINGS IN DATABASE ===');
      console.log('Total bookings found:', allBookings?.length || 0);
      console.log('All bookings:', JSON.stringify(allBookings, null, 2));
      console.log('Error (if any):', allBookingsError);

      // Get current user for RLS debugging
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', {
        id: user?.id,
        error: userError
      });

      // Get firefighter data for RLS debugging
      const { data: firefighterData, error: firefighterError } = await supabase
        .from('firefighters')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      console.log('Firefighter data:', {
        data: firefighterData,
        error: firefighterError,
        stationMatch: firefighterData?.station_id === stationId
      });

      // Now try the station-specific query
      const { data, error } = await supabase
        .from('training_bookings')
        .select('*')
        .eq('station_id', stationId)
        .order('training_date', { ascending: true });

      console.log('=== STATION SPECIFIC BOOKINGS ===');
      console.log('Query error:', error);
      console.log('Number of bookings found for station:', data?.length || 0);
      console.log('Station bookings:', JSON.stringify(data, null, 2));

      if (error) {
        console.error('Error loading station bookings:', error);
        Alert.alert('Error', `Failed to load training bookings: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No bookings found for station:', stationId);
        console.log('Station ID format check:', {
          isString: typeof stationId === 'string',
          length: stationId?.length,
          value: stationId,
          matchesPattern: stationId?.match(/^FS[0-9]{3}$/)
        });
        setBookings([]);
        return;
      }

      // Sort bookings by status (pending first) and date
      const sortedBookings = data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.training_date) - new Date(b.training_date);
      });

      console.log('Sorted bookings:', JSON.stringify(sortedBookings, null, 2));
      setBookings(sortedBookings);
    } catch (error) {
      console.error('Error in loadStationBookings:', error);
      Alert.alert('Error', `Failed to load training bookings: ${error.message}`);
    }
  };

  const loadStationCallLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error('Error loading call logs:', error);
      Alert.alert('Error', 'Failed to load call logs');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleBookingPress = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('training_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      await loadStationBookings();
      setShowBookingDetails(false);
      Alert.alert('Success', `Booking ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const renderMainButtons = () => (
    <View style={styles.mainButtonsContainer}>
      <TouchableOpacity
        style={styles.mainButton}
        onPress={() => setActiveView('callLogs')}
      >
        <Ionicons name="call-outline" size={32} color="#FFFFFF" />
        <Text style={styles.mainButtonText}>Call Logs</Text>
        <Text style={styles.mainButtonSubtext}>View missed, received, and dialed calls</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: '#4CAF50' }]}
        onPress={() => setActiveView('bookings')}
      >
        <Ionicons name="calendar-outline" size={32} color="#FFFFFF" />
        <Text style={styles.mainButtonText}>Bookings</Text>
        <Text style={styles.mainButtonSubtext}>Review and manage training bookings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCallLogs = () => (
    <View style={styles.viewContainer}>
      <View style={styles.viewHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setActiveView(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#4A5568" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.viewTitle}>Call Logs</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {callLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={48} color="#757575" />
            <Text style={styles.emptyText}>No call logs found</Text>
          </View>
        ) : (
          callLogs.map((log) => (
            <Card key={log.id} style={styles.callLogCard}>
              <Card.Content>
                <View style={styles.callLogHeader}>
                  <View style={styles.callLogInfo}>
                    <Ionicons
                      name={log.call_type === 'emergency' ? 'warning' : 'information-circle'}
                      size={24}
                      color={log.call_type === 'emergency' ? '#DC3545' : '#2196F3'}
                    />
                    <View style={styles.callLogDetails}>
                      <Text style={styles.callLogType}>
                        {log.call_type.toUpperCase()}
                      </Text>
                      <Text style={styles.callLogTime}>
                        {formatDateTime(log.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    style={[
                      styles.callLogBadge,
                      { backgroundColor: log.call_type === 'emergency' ? '#DC3545' : '#2196F3' }
                    ]}
                  >
                    {log.status.toUpperCase()}
                  </Badge>
                </View>
                <Text style={styles.callLogDescription}>{log.description}</Text>
                {log.location && (
                  <View style={styles.callLogLocation}>
                    <Ionicons name="location-outline" size={16} color="#4A5568" />
                    <Text style={styles.locationText}>{log.location}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderBookings = () => (
    <View style={styles.viewContainer}>
      <View style={styles.viewHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setActiveView(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#4A5568" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.viewTitle}>Training Bookings</Text>
        <Badge style={styles.badge}>
          {bookings.filter(b => b.status === 'pending').length} Pending
        </Badge>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#757575" />
            <Text style={styles.emptyText}>No training bookings found</Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              onPress={() => handleBookingPress(booking)}
            >
              <Card style={styles.bookingCard}>
                <Card.Content>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.companyName}>
                      {booking.company_name || 'No Company Name'}
                    </Text>
                    <View style={styles.bookingDateContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#718096" />
                      <Text style={styles.bookingDate}>
                        {formatDate(booking.training_date)} at {formatTime(booking.training_time)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={16} color="#4A5568" />
                      <Text style={styles.detailText}>
                        {booking.num_participants} participants
                      </Text>
                    </View>
                    <View style={[styles.statusContainer, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderBookingDetails = () => (
    <Modal
      visible={showBookingDetails}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBookingDetails(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Booking Details</Text>
            <TouchableOpacity
              onPress={() => setShowBookingDetails(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#4A5568" />
            </TouchableOpacity>
          </View>

          {selectedBooking && (
            <ScrollView style={styles.modalScroll}>
              <View style={styles.detailSection}>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedBooking.status) }]}>
                    {selectedBooking.status.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedBooking.training_date)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>
                    {formatTime(selectedBooking.training_time)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="people-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Participants:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.num_participants}
                  </Text>
                </View>

                {selectedBooking.company_name && (
                  <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={20} color="#4A5568" />
                    <Text style={styles.detailLabel}>Company:</Text>
                    <Text style={styles.detailValue}>
                      {selectedBooking.company_name}
                    </Text>
                  </View>
                )}

                {selectedBooking.notes && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={20} color="#4A5568" />
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue}>
                      {selectedBooking.notes}
                    </Text>
                  </View>
                )}

                {selectedBooking.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      onPress={() => handleUpdateBookingStatus(selectedBooking.id, 'confirmed')}
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                    >
                      Approve
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => handleUpdateBookingStatus(selectedBooking.id, 'cancelled')}
                      style={[styles.actionButton, { backgroundColor: '#DC3545' }]}
                    >
                      Reject
                    </Button>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'confirmed': return '#4CAF50';
      case 'cancelled': return '#DC3545';
      case 'completed': return '#2196F3';
      default: return '#757575';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5);
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Firefighter Notifications</Text>
      </View>

      {activeView === null ? (
        renderMainButtons()
      ) : activeView === 'callLogs' ? (
        renderCallLogs()
      ) : (
        renderBookings()
      )}

      {renderBookingDetails()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A5568',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  mainButtonsContainer: {
    padding: 16,
    gap: 16,
  },
  mainButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  mainButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  viewContainer: {
    flex: 1,
  },
  viewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#4A5568',
  },
  viewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  badge: {
    backgroundColor: '#DC3545',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
  },
  bookingCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  bookingHeader: {
    marginBottom: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  bookingDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bookingDate: {
    fontSize: 14,
    color: '#718096',
    marginLeft: 4,
  },
  bookingDetails: {
    marginTop: 8,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4A5568',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  callLogCard: {
    marginBottom: 12,
    elevation: 1,
  },
  callLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callLogInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callLogDetails: {
    marginLeft: 8,
  },
  callLogType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  callLogTime: {
    fontSize: 14,
    color: '#718096',
  },
  callLogBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  callLogDescription: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
  },
  callLogLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#718096',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#4A5568',
    marginLeft: 8,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#2D3748',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});

export default FirefighterNotificationsScreen; 