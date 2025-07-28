import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { Text, Card, Badge, ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabaseClient';
import { getUserBookings, cancelBooking } from '../services/trainingBookings';
import { getCurrentUser } from '../services/auth';

const UserNotificationsScreen = () => {
  const navigation = useNavigation();
  const [activeView, setActiveView] = useState(null); // 'callLogs' or 'bookings'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [callLogs, setCallLogs] = useState([]);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      const loadData = async () => {
        try {
          setLoading(true);
          await Promise.all([loadBookings(), loadCallLogs()]);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      };
      loadData();
    }
  }, [userId]);

  const loadUserId = async () => {
    try {
      const { data: userData, error: userError } = await getCurrentUser();
      if (userError) throw userError;
      
      if (!userData?.user?.id) {
        console.log('No user ID found');
        navigation.replace('Login');
        return;
      }

      console.log('Found user ID:', userData.user.id);
      setUserId(userData.user.id);
    } catch (error) {
      console.error('Error loading user ID:', error);
      setLoading(false);
      navigation.replace('Login');
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      console.log('Loading bookings for user ID:', userId);
      
      const { data, error } = await getUserBookings(userId);
      
      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
      
      console.log('Fetched bookings:', data);
      
      // Sort bookings by date and status (pending first)
      const sortedBookings = data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.training_date) - new Date(b.training_date);
      });

      console.log('Sorted bookings:', sortedBookings);
      setBookings(sortedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load training bookings');
    }
  };

  const loadCallLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', userId)
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
    loadBookings();
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const { error } = await cancelBooking(bookingId);
      if (error) throw error;
      
      // Refresh the bookings list
      loadBookings();
      
      Alert.alert('Success', 'Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking');
    }
  };

  const handleBookingPress = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleBookTraining = () => {
    setShowBookingDetails(false);
    navigation.navigate('BookTraining');
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

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending': return 'Waiting for station confirmation';
      case 'confirmed': return 'Booking confirmed by station';
      case 'cancelled': return 'Booking cancelled';
      case 'completed': return 'Training session completed';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'completed': return 'checkmark-done-circle-outline';
      default: return 'help-circle-outline';
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

  const formatCallTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
                  <Ionicons
                    name={getStatusIcon(selectedBooking.status)}
                    size={24}
                    color={getStatusColor(selectedBooking.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(selectedBooking.status) }]}>
                    {selectedBooking.status.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="business-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Station:</Text>
                  <Text style={styles.detailValue}>
                    {selectedBooking.firefighters?.station_name || 'Unknown Station'}
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

                <View style={styles.detailRow}>
                  <Ionicons name="information-circle-outline" size={20} color="#4A5568" />
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>
                    {getStatusMessage(selectedBooking.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                {selectedBooking.status === 'pending' && (
                  <Button
                    mode="outlined"
                    onPress={() => {
                      handleCancelBooking(selectedBooking.id);
                      setShowBookingDetails(false);
                    }}
                    style={styles.cancelButton}
                    textColor="#DC3545"
                  >
                    Cancel Booking
                  </Button>
                )}
                <Button
                  mode="contained"
                  onPress={handleBookTraining}
                  style={styles.bookButton}
                >
                  Book Another Training
                </Button>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderBookings = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Training Sessions</Text>
        <Badge style={styles.badge}>
          {bookings.filter(b => b.status === 'pending').length} Pending
        </Badge>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#757575" />
          <Text style={styles.emptyText}>No training bookings found</Text>
          <Button
            mode="contained"
            onPress={handleBookTraining}
            style={styles.bookButton}
          >
            Book Training
          </Button>
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
                    {booking.firefighters?.station_name || 'Unknown Station'}
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
    </View>
  );

  const renderMainButtons = () => (
    <View style={styles.mainButtonsContainer}>
      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: '#2196F3' }]}
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
        <Text style={styles.mainButtonText}>My Bookings</Text>
        <Text style={styles.mainButtonSubtext}>View and manage your training bookings</Text>
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
        <Badge style={styles.badge}>
          {callLogs.length} Total
        </Badge>
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
                      name={log.type === 'incoming' ? 'call-received' : 'call-made'}
                      size={20}
                      color={log.type === 'incoming' ? '#4CAF50' : '#2196F3'}
                    />
                    <Text style={styles.callLogType}>
                      {log.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                    </Text>
                  </View>
                  <Text style={styles.callLogTime}>
                    {formatCallTime(log.created_at)}
                  </Text>
                </View>
                <View style={styles.callLogDetails}>
                  <Text style={styles.callLogNumber}>{log.phone_number}</Text>
                  {log.duration && (
                    <Text style={styles.callLogDuration}>
                      Duration: {Math.floor(log.duration / 60)}m {log.duration % 60}s
                    </Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradientBg}>
        {activeView === null ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>User Notifications</Text>
            </View>
            {renderMainButtons()}
          </>
        ) : activeView === 'callLogs' ? (
          renderCallLogs()
        ) : (
          renderBookings()
        )}
        {renderBookingDetails()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    position: 'relative',
  },
  gradientBg: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #F7FAFC 0%, #FFE6E6 100%)',
    paddingBottom: 0,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC3545',
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: '#FFE6E6',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionText: {
    marginLeft: 16,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#DC3545',
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
  callLogCard: {
    marginBottom: 8,
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
  callLogType: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  callLogTime: {
    fontSize: 12,
    color: '#718096',
  },
  callLogDetails: {
    marginTop: 4,
  },
  callLogNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  callLogDuration: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  bookButton: {
    backgroundColor: '#DC3545',
    marginTop: 8,
  },
  mainButtonsContainer: {
    padding: 16,
    gap: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButton: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
    textShadowColor: '#00000022',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mainButtonSubtext: {
    color: '#FFFFFF',
    opacity: 0.9,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 2,
  },
  viewContainer: {
    flex: 1,
    backgroundColor: '#F7FAFC',
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
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1A202C',
  },
});

export default UserNotificationsScreen; 