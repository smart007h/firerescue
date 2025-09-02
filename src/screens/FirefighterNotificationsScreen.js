import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { Text, Card, Badge, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabaseClient';
import { getCurrentUser } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to debug RLS access
const debugBookingAccess = async (bookingId) => {
  try {
    console.log('=== DEBUGGING RLS ACCESS ===');
    console.log('Booking ID:', bookingId);
    
    const { data, error } = await supabase
      .rpc('debug_training_booking_access', { booking_id: bookingId });
    
    if (error) {
      console.error('Debug function error:', error);
    } else {
      console.log('RLS Debug Results:', data);
    }
    
    // Also check current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', {
      userId: session?.user?.id,
      email: session?.user?.email,
      hasSession: !!session
    });
    
    console.log('=== END RLS DEBUG ===');
  } catch (error) {
    console.error('Debug error:', error);
  }
};

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
    } else if (activeView === 'certificates') {
      loadCertificateApplications();
    }
  }, [activeView, stationId]);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      console.log('=== CHECKING AUTH STATE ===');

      // Since RLS is disabled, skip authentication checks and proceed
      console.log('RLS disabled - proceeding without auth validation');
      setIsAuthenticated(true);
      await loadFirefighterData();
      setLoading(false);
      return;

    } catch (error) {
      console.error('Error in checkAuthState:', error);
      handleAuthError();
    }
  };

  const handleAuthError = async () => {
    try {
      console.log('=== HANDLING AUTH ERROR ===');
      
      // Clear all authentication data
      await Promise.all([
        AsyncStorage.removeItem('stationId'),
        AsyncStorage.removeItem('supabase-session'),
        supabase.auth.signOut()
      ]);

      console.log('Authentication data cleared');
      
      // Show clear message to user
      Alert.alert(
        'Authentication Error',
        'Your session has expired. You will be redirected to login.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Force navigation to login
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome', params: { fromSessionExpired: true } }]
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleAuthError:', error);
      // If all else fails, force logout
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
        console.log('Using stored station ID:', storedStationId);
        setStationId(storedStationId);
        return;
      }

      const { data: userData, error: userError } = await getCurrentUser();
      console.log('User data for firefighter lookup:', {
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
      console.log('Looking up firefighter data for user ID:', userData.user.id);
      const { data: firefighterData, error: firefighterError } = await supabase
        .from('firefighters')
        .select('station_id, id')
        .eq('id', userData.user.id)
        .maybeSingle();

      console.log('Firefighter lookup result:', {
        hasData: !!firefighterData,
        stationId: firefighterData?.station_id,
        firefighterId: firefighterData?.id,
        error: firefighterError,
        userIdMatch: firefighterData?.id === userData.user.id
      });

      if (firefighterError) {
        console.error('Error getting firefighter data:', firefighterError);
        return;
      }

      if (firefighterData?.station_id) {
        console.log('Setting station ID:', firefighterData.station_id);
        console.log('Firefighter ID matches user ID:', firefighterData.id === userData.user.id);
        setStationId(firefighterData.station_id);
        await AsyncStorage.setItem('stationId', firefighterData.station_id);
      } else {
        console.log('No station ID found in firefighter data');
        console.log('This user may not be a firefighter or firefighter record may not exist');
      }
    } catch (error) {
      console.error('Error in loadFirefighterData:', error);
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadStationBookings()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStationBookings = async () => {
    if (!stationId) {
      console.log('No station ID available, skipping booking load');
      return;
    }

    try {
      console.log('Loading bookings for station:', stationId);
      
      const { data, error } = await supabase
        .from('training_bookings')
        .select('*')
        .eq('station_id', stationId)
        .order('training_date', { ascending: true });

      console.log('Raw booking query result:', { 
        dataCount: data?.length, 
        error,
        stationId 
      });

      if (error) {
        console.error('Error loading station bookings:', error);
        Alert.alert('Error', `Failed to load training bookings: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No bookings found for station:', stationId);
        setBookings([]);
        return;
      }

      // Sort bookings by status (pending first) and date
      const sortedBookings = data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.training_date) - new Date(b.training_date);
      });

      console.log('Loaded bookings:', sortedBookings.map(booking => ({
        id: booking.id,
        idType: typeof booking.id,
        status: booking.status,
        company: booking.company_name
      })));

      setBookings(sortedBookings);
    } catch (error) {
      console.error('Error in loadStationBookings:', error);
      Alert.alert('Error', `Failed to load training bookings: ${error.message}`);
    }
  };


  const loadCertificateApplications = async () => {
    try {
      console.log('🔍 === CERTIFICATE APPLICATIONS DEBUG ===');
      console.log('Loading certificate applications for station:', stationId);
      
      if (!stationId) {
        console.log('❌ No station ID available, skipping certificate loading');
        setCertificates([]);
        return;
      }

      console.log('✅ Station ID found:', stationId);

      // Load applications filtered by station ID
      console.log(`🔍 Querying applications for station ${stationId}...`);
      
      const { data, error } = await supabase
        .from('certificate_applications')
        .select('*')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });
      
      if (error) {
        // If station_id column doesn't exist, fall back to loading all applications
        if (error.code === '42703') {
          console.log('⚠️ station_id column not found! Loading all applications as fallback');
          console.log('� To fix this: Execute the SQL script in add-station-column.sql');
          
          const { data: allData, error: fallbackError } = await supabase
            .from('certificate_applications')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (fallbackError) throw fallbackError;
          setCertificates(allData || []);
          return;
        }
        throw error;
      }

      console.log('✅ Station-specific query successful!');
      console.log(`📊 Found ${data?.length || 0} applications for station ${stationId}`);
      
      if (data?.length === 0) {
        console.log('⚠️ No applications found for this station.');
        console.log(`   Station ${stationId} has no assigned applications yet.`);
      } else {
        console.log('📋 Applications loaded for station:', data.map(app => ({
          id: app.id,
          applicant: app.applicant_name,
          location: app.premises_location,
          station: app.station_id
        })));
      }

      setCertificates(data || []);

    } catch (error) {
      console.error('❌ Error loading certificate applications:', error);
      Alert.alert('Error', 'Failed to load certificate applications. Check console for details.');
      setCertificates([]);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleBookingPress = (booking) => {
    console.log('Selected booking:', booking);
    console.log('Booking ID type:', typeof booking.id);
    console.log('Booking ID value:', booking.id);
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleCertificatePress = (certificate) => {
    console.log('Selected certificate:', certificate);
    console.log('Certificate ID type:', typeof certificate.id);
    console.log('Certificate ID value:', certificate.id);
    setSelectedCertificate(certificate);
    setShowCertificateDetails(true);
  };

  const handleUpdateCertificateStatus = async (certificateId, newStatus, rejectionReason = null) => {
    try {
      console.log('Updating certificate status:', { certificateId, newStatus, rejectionReason });
      
      // First check if the certificate exists
      const { data: existingCertificate, error: checkError } = await supabase
        .from('certificate_applications')
        .select('id, status')
        .eq('id', certificateId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking certificate existence:', checkError);
        throw checkError;
      }

      if (!existingCertificate) {
        console.error('Certificate not found with ID:', certificateId);
        Alert.alert('Error', 'Certificate application not found. It may have been deleted.');
        setShowCertificateDetails(false);
        await loadCertificateApplications();
        return;
      }

      console.log('Found existing certificate:', existingCertificate);

      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      
      console.log('Attempting to update certificate with ID:', certificateId, 'to status:', newStatus);
      
      const { data, error, count } = await supabase
        .from('certificate_applications')
        .update(updateData)
        .eq('id', certificateId);

      console.log('Certificate update result:', { data, error, count });

      if (error) {
        console.error('Certificate update error:', error);
        throw error;
      }

      console.log('Certificate update successful, affected rows:', count);

      Alert.alert('Success', `Certificate application ${newStatus} successfully`);
      setShowCertificateDetails(false);
      loadCertificateApplications(); // Refresh the list
    } catch (error) {
      console.error('Error updating certificate status:', error);
      Alert.alert('Error', `Failed to update certificate status: ${error.message}`);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      console.log('=== BOOKING UPDATE DEBUG ===');
      console.log('Updating booking status:', { bookingId, newStatus });
      
      // Validate inputs
      if (!bookingId) {
        console.error('No booking ID provided');
        Alert.alert('Error', 'Invalid booking ID');
        return;
      }

      if (!newStatus) {
        console.error('No new status provided');
        Alert.alert('Error', 'Invalid status');
        return;
      }

      // Force refresh the session to ensure proper authentication context
      console.log('Refreshing authentication session...');
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        Alert.alert('Authentication Error', 'Please log out and log back in.');
        return;
      }

      if (!session?.user?.id) {
        console.error('No valid session after refresh');
        Alert.alert('Authentication Error', 'Session expired. Please log out and log back in.');
        
        // Navigate to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }]
        });
        return;
      }

      console.log('Session refreshed successfully:', {
        userId: session.user.id,
        email: session.user.email
      });

      // Check if current user is a firefighter 
      const { data: firefighterData, error: firefighterError } = await supabase
        .from('firefighters')
        .select('id, station_id')
        .eq('id', session.user.id)
        .maybeSingle();

      console.log('Firefighter check:', {
        firefighterData,
        firefighterError,
        isFirefighter: !!firefighterData
      });

      if (firefighterError) {
        console.error('Error checking firefighter status:', firefighterError);
        Alert.alert('Error', 'Unable to verify firefighter permissions.');
        return;
      }

      if (!firefighterData) {
        console.error('Current user is not a firefighter');
        Alert.alert('Error', 'You do not have firefighter permissions.');
        return;
      }

      // Try direct update
      console.log('Attempting update for booking ID:', bookingId, 'to status:', newStatus);
      
      const { error: updateError } = await supabase
        .from('training_bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      console.log('Update result:', { error: updateError });

      if (updateError) {
        console.error('Update failed:', updateError);
        
        if (updateError.code === 'PGRST116') {
          Alert.alert(
            'Update Failed', 
            'The booking update was blocked. This could be due to:\n• Session authentication issues\n• The booking may have been deleted\n• Database permissions\n\nPlease try refreshing the page or logging out and back in.'
          );
        } else {
          Alert.alert('Error', `Update failed: ${updateError.message}`);
        }
        return;
      }

      console.log('Update successful!');
      console.log('=== END BOOKING UPDATE DEBUG ===');

      await loadStationBookings();
      setShowBookingDetails(false);
      Alert.alert('Success', `Booking ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', `Failed to update booking status: ${error.message}`);
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
      <View style={styles.bookTrainingButtonContainer}>
        <Button
          mode="contained"
          icon="plus"
          style={styles.bookTrainingButton}
          labelStyle={styles.bookTrainingButtonLabel}
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
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {selectedBooking.company_name}
                    </Text>
                  </View>
                )}

                {selectedBooking.notes && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={20} color="#4A5568" />
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue} numberOfLines={3}>
                      {selectedBooking.notes}
                    </Text>
                  </View>
                )}

                {selectedBooking.status === 'pending' && selectedBooking.id && (
                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      onPress={() => {
                        console.log('Approve button pressed for booking:', selectedBooking.id);
                        handleUpdateBookingStatus(selectedBooking.id, 'confirmed');
                      }}
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                    >
                      Approve
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => {
                        console.log('Reject button pressed for booking:', selectedBooking.id);
                        handleUpdateBookingStatus(selectedBooking.id, 'cancelled');
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
                      <Text style={styles.infoValue} numberOfLines={2}>{certificate.premises_address}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="business-outline" size={16} color="#718096" />
                      <Text style={styles.infoLabel}>Use:</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>{certificate.use_of_premises}</Text>
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
                  <Text style={styles.detailValue} numberOfLines={2}>{selectedCertificate.applicant_name}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue} numberOfLines={3}>{selectedCertificate.premises_address}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="map-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{selectedCertificate.premises_location}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="business-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Use:</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{selectedCertificate.use_of_premises}</Text>
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
                    <Text style={[styles.detailValue, { color: '#DC3545' }]} numberOfLines={4}>
                      {selectedCertificate.rejection_reason}
                    </Text>
                  </View>
                )}

                {selectedCertificate.status === 'pending' && selectedCertificate.id && (
                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      onPress={() => {
                        console.log('Approve certificate button pressed for:', selectedCertificate.id);
                        handleUpdateCertificateStatus(selectedCertificate.id, 'approved');
                      }}
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                    >
                      Approve
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => {
                        console.log('Reject certificate button pressed for:', selectedCertificate.id);
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
        {/* Temporary fix button for auth issues */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            backgroundColor: '#FF6B6B',
            padding: 8,
            borderRadius: 6
          }}
          onPress={() => {
            Alert.alert(
              'Authentication Issue Detected',
              'Your session has expired. You need to log out and log back in.\n\nThis will fix the booking update issue.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Logout & Fix', 
                  onPress: handleAuthError,
                  style: 'destructive'
                }
              ]
            );
          }}
        >
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
            FIX AUTH
          </Text>
        </TouchableOpacity>
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
    minHeight: 60,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 28,
  },
  mainButtonsContainer: {
    padding: 16,
    gap: 16,
    flex: 1,
    justifyContent: 'center',
  },
  mainButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    minHeight: 120,
    justifyContent: 'center',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  mainButtonSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
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
    minHeight: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    padding: 4,
    borderRadius: 4,
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#4A5568',
  },
  viewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    flex: 1,
    marginRight: 8,
    flexWrap: 'wrap',
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
    overflow: 'hidden',
  },
  bookingHeader: {
    marginBottom: 12,
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
    flexWrap: 'wrap',
    lineHeight: 24,
  },
  bookingDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  bookingDate: {
    fontSize: 14,
    color: '#718096',
    marginLeft: 4,
    flexShrink: 1,
  },
  bookingDetails: {
    marginTop: 8,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    minHeight: 24,
  },
  detailText: {
    fontSize: 14,
    color: '#4A5568',
    marginLeft: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
    borderRadius: 4,
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#4A5568',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#2D3748',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  bookingInfo: {
    marginTop: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    minHeight: 28,
  },
  infoLabel: {
    fontSize: 13,
    color: '#718096',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
    minWidth: 60,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    color: '#2D3748',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  bookingFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
  },
  bookTrainingButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  bookTrainingButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  bookTrainingButtonLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

module.exports = FirefighterNotificationsScreen;