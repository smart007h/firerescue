import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { Text, Card, Badge, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabaseClient';
import { getCurrentUser } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FirefighterNotificationsScreen = () => {
  const navigation = useNavigation();
  const [activeView, setActiveView] = useState(null); // 'bookings' or 'certificates'
  const [bookings, setBookings] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationId, setStationId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showCertificateDetails, setShowCertificateDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(() => {
    if (activeView === 'bookings' && stationId) {
      loadStationBookings();
    } else if (activeView === 'certificates' && stationId) {
      loadCertificateApplications();
    }
  }, [activeView, stationId]);

  const checkAuthState = async () => {
    try {
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

        // Navigate to welcome screen instead of login selection
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome', params: { fromLogout: true } }]
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
        routes: [{ name: 'Welcome', params: { fromLogout: true } }]
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
        // Don't manually reset navigation - let AuthContext and AppNavigator handle the logout flow
        console.log('Auth signed out - letting AppNavigator handle navigation');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const loadFirefighterData = async () => {
    try {
      const storedStationId = await AsyncStorage.getItem('stationId');
      
      if (storedStationId) {
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
    if (!stationId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('training_bookings')
        .select('*')
        .eq('station_id', stationId)
        .order('training_date', { ascending: true });

      if (error) {
        console.error('Error loading station bookings:', error);
        Alert.alert('Error', `Failed to load training bookings: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setBookings([]);
        return;
      }

      // Sort bookings by status (pending first) and date
      const sortedBookings = data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.training_date) - new Date(b.training_date);
      });

      setBookings(sortedBookings);
    } catch (error) {
      console.error('Error in loadStationBookings:', error);
      Alert.alert('Error', `Failed to load training bookings: ${error.message}`);
    }
  };


  const loadCertificateApplications = async () => {
    try {
      // Load all certificate applications (for now, until we implement station-based filtering)
      const { data, error } = await supabase
        .from('certificate_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading certificates:', error);
        throw error;
      }

      setCertificates(data || []);
    } catch (error) {
      console.error('Error loading certificate applications:', error);
      Alert.alert('Error', 'Failed to load certificate applications');
      setCertificates([]);
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

  const handleCertificatePress = (certificate) => {
    setSelectedCertificate(certificate);
    setShowCertificateDetails(true);
  };

  const handleUpdateCertificateStatus = async (certificateId, newStatus, rejectionReason = null) => {
    try {
      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      
      const { error } = await supabase
        .from('certificate_applications')
        .update(updateData)
        .eq('id', certificateId);

      if (error) throw error;

      Alert.alert('Success', `Certificate application ${newStatus} successfully`);
      setShowCertificateDetails(false);
      loadCertificateApplications(); // Refresh the list
    } catch (error) {
      console.error('Error updating certificate status:', error);
      Alert.alert('Error', 'Failed to update certificate status');
    }
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
        style={[styles.mainButton, { backgroundColor: '#4CAF50' }]}
        onPress={() => navigation.navigate('FirefighterTrainingApproval')}
      >
        <Ionicons name="calendar-outline" size={32} color="#FFFFFF" />
        <Text style={styles.mainButtonText}>Bookings</Text>
        <Text style={styles.mainButtonSubtext}>Review and manage training bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: '#FF9500' }]}
        onPress={() => setActiveView('certificates')}
      >
        <Ionicons name="document-text-outline" size={32} color="#FFFFFF" />
        <Text style={styles.mainButtonText}>Certificates</Text>
        <Text style={styles.mainButtonSubtext}>Review and approve certificate applications</Text>
      </TouchableOpacity>
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

      {/* Add Book Training button for firefighters */}
      <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
        <Button
          mode="contained"
          icon="plus"
          style={{ backgroundColor: '#007AFF', borderRadius: 8 }}
          labelStyle={{ color: '#fff', fontWeight: 'bold' }}
          onPress={() => navigation.navigate('BookTraining')}
        >
          Book Training
        </Button>
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

  const renderCertificates = () => (
    <View style={styles.viewContainer}>
      <View style={styles.viewHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setActiveView(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#4A5568" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.viewTitle}>Certificate Applications</Text>
        <Badge style={styles.badge}>
          {certificates.filter(c => c.status === 'pending').length} Pending
        </Badge>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {certificates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#757575" />
            <Text style={styles.emptyText}>No certificate applications found</Text>
          </View>
        ) : (
          certificates.map((certificate) => (
            <TouchableOpacity
              key={certificate.id}
              onPress={() => handleCertificatePress(certificate)}
            >
              <Card style={styles.bookingCard}>
                <Card.Content>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.companyName}>
                      {certificate.applicant_name}
                    </Text>
                    <View style={styles.bookingDateContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#718096" />
                      <Text style={styles.bookingDate}>
                        {formatDateTime(certificate.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingInfo}>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={16} color="#718096" />
                      <Text style={styles.infoLabel}>Address:</Text>
                      <Text style={styles.infoValue}>{certificate.premises_address}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="business-outline" size={16} color="#718096" />
                      <Text style={styles.infoLabel}>Use:</Text>
                      <Text style={styles.infoValue}>{certificate.use_of_premises}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="layers-outline" size={16} color="#718096" />
                      <Text style={styles.infoLabel}>Storeys:</Text>
                      <Text style={styles.infoValue}>{certificate.number_of_storeys}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="cash-outline" size={16} color="#718096" />
                      <Text style={styles.infoLabel}>Cost:</Text>
                      <Text style={styles.infoValue}>GH₵{certificate.final_cost}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <View style={[styles.statusContainer, { backgroundColor: `${getCertificateStatusColor(certificate.status)}15` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getCertificateStatusColor(certificate.status) }]} />
                      <Text style={[styles.statusText, { color: getCertificateStatusColor(certificate.status) }]}>
                        {certificate.status.toUpperCase()}
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

  const renderCertificateDetails = () => (
    <Modal
      visible={showCertificateDetails}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCertificateDetails(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Certificate Application Details</Text>
            <TouchableOpacity
              onPress={() => setShowCertificateDetails(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#4A5568" />
            </TouchableOpacity>
          </View>

          {selectedCertificate && (
            <ScrollView style={styles.modalScroll}>
              <View style={styles.detailSection}>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusText, { color: getCertificateStatusColor(selectedCertificate.status) }]}>
                    {selectedCertificate.status.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Applicant:</Text>
                  <Text style={styles.detailValue}>{selectedCertificate.applicant_name}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{selectedCertificate.premises_address}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="map-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{selectedCertificate.premises_location}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="business-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Use:</Text>
                  <Text style={styles.detailValue}>{selectedCertificate.use_of_premises}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="layers-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Storeys:</Text>
                  <Text style={styles.detailValue}>{selectedCertificate.number_of_storeys}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Review Fee:</Text>
                  <Text style={styles.detailValue}>GH₵{selectedCertificate.review_fee}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Final Cost:</Text>
                  <Text style={styles.detailValue}>GH₵{selectedCertificate.final_cost}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Submitted:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedCertificate.created_at)}</Text>
                </View>

                {selectedCertificate.floors && (
                  <View style={styles.detailRow}>
                    <Ionicons name="list-outline" size={20} color="#4A5568" />
                    <Text style={styles.detailLabel}>Floors:</Text>
                    <Text style={styles.detailValue}>
                      {selectedCertificate.floors.length} floor(s) defined
                    </Text>
                  </View>
                )}

                {selectedCertificate.rejection_reason && (
                  <View style={styles.detailRow}>
                    <Ionicons name="warning-outline" size={20} color="#DC3545" />
                    <Text style={styles.detailLabel}>Rejection Reason:</Text>
                    <Text style={[styles.detailValue, { color: '#DC3545' }]}>
                      {selectedCertificate.rejection_reason}
                    </Text>
                  </View>
                )}

                {selectedCertificate.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      onPress={() => handleUpdateCertificateStatus(selectedCertificate.id, 'approved')}
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                    >
                      Approve
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => {
                        Alert.prompt(
                          'Rejection Reason',
                          'Please provide a reason for rejection:',
                          (reason) => {
                            if (reason) {
                              handleUpdateCertificateStatus(selectedCertificate.id, 'rejected', reason);
                            }
                          }
                        );
                      }}
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

  const getCertificateStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'under_review': return '#2196F3';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#DC3545';
      default: return '#757575';
    }
  };

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
      ) : activeView === 'bookings' ? (
        renderBookings()
      ) : (
        renderCertificates()
      )}

      {renderBookingDetails()}
      {renderCertificateDetails()}
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

module.exports = FirefighterNotificationsScreen;