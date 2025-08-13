import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Modal, TouchableOpacity, FlatList } from 'react-native';
import { Text, Card, Button, Badge, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import { getStationBookings, updateBookingStatus } from '../services/trainingBookings';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FirefighterTrainingApprovalScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationId, setStationId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load stationId from AsyncStorage on mount
  useEffect(() => {
    const fetchStationId = async () => {
      try {
        const storedStationId = await AsyncStorage.getItem('stationId');
        if (storedStationId) {
          setStationId(String(storedStationId));
        } else {
          setErrorMsg('No station ID found. Please log in again.');
          Alert.alert('Error', 'No station ID found. Please log in again.');
          // Don't manually reset navigation - let AuthContext handle logout flow
          navigation.goBack(); // Just go back to previous screen
        }
      } catch (error) {
        setErrorMsg('Failed to load station information.');
        console.error('Error loading station ID:', error);
        Alert.alert('Error', 'Failed to load station information.');
      }
    };
    fetchStationId();
  }, []);

  // Fetch bookings when stationId changes
  useEffect(() => {
    if (stationId) {
      loadBookings();
    }
  }, [stationId]);

  // Fetch bookings for the station
  const loadBookings = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await getStationBookings(stationId);
      if (error) throw error;
      // Sort bookings: pending first, then by date
      const sortedBookings = data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.training_date) - new Date(b.training_date);
      });
      setBookings(sortedBookings);
    } catch (error) {
      setErrorMsg('Failed to load training bookings');
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load training bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull-to-refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // Approve/Reject booking
  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const { error } = await updateBookingStatus(bookingId, newStatus);
      if (error) throw error;
      loadBookings();
      Alert.alert('Success', `Booking ${newStatus === 'confirmed' ? 'confirmed' : 'cancelled'} successfully`);
    } catch (error) {
      setErrorMsg('Failed to update booking status');
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  // Status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'confirmed': return '#4CAF50';
      case 'cancelled': return '#DC3545';
      case 'completed': return '#2196F3';
      default: return '#757575';
    }
  };

  // Date/time formatting
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  };
  const formatTime = (timeString) => timeString.substring(0, 5);

  // Booking details modal
  const renderBookingDetailsModal = () => (
    <Modal
      visible={showBookingDetails}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBookingDetails(false)}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Booking Details</Text>
            <TouchableOpacity onPress={() => setShowBookingDetails(false)}>
              <Ionicons name="close" size={24} color="#4A5568" />
            </TouchableOpacity>
          </View>
          {selectedBooking && (
            <ScrollView style={{ maxHeight: 350 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Company:</Text>
              <Text style={{ marginBottom: 8 }}>{selectedBooking.company_name || 'N/A'}</Text>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Date:</Text>
              <Text style={{ marginBottom: 8 }}>{formatDate(selectedBooking.training_date)}</Text>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Time:</Text>
              <Text style={{ marginBottom: 8 }}>{formatTime(selectedBooking.training_time)}</Text>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Participants:</Text>
              <Text style={{ marginBottom: 8 }}>{selectedBooking.num_participants}</Text>
              <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Status:</Text>
              <Text style={{ marginBottom: 8 }}>{selectedBooking.status}</Text>
              {selectedBooking.notes && (
                <>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Notes:</Text>
                  <Text style={{ marginBottom: 8 }}>{selectedBooking.notes}</Text>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </SafeAreaView>
    );
  }

  // Render error state
  if (errorMsg && !loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC3545" />
        <Text style={styles.loadingText}>{errorMsg}</Text>
      </SafeAreaView>
    );
  }

  // Render main content
  return (
    <SafeAreaView style={styles.container}>
      {renderBookingDetailsModal()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Training Bookings</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#DC3545',
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingVertical: 6,
              marginLeft: 8,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 2,
            }}>
              <Ionicons name="person-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>
                {bookings.filter(b => b.status === 'pending').length} Pending
              </Text>
            </View>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#757575" />
              <Text style={styles.emptyText}>No training bookings found for your station</Text>
            </View>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id} style={styles.bookingCard}>
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View>
                      <Text style={styles.companyName}>{booking.company_name}</Text>
                      <Text style={styles.bookingDate}>
                        {formatDate(booking.training_date)} at {formatTime(booking.training_time)}
                      </Text>
                    </View>
                    {/* Pill-shaped status badge */}
                    <View style={{
                      backgroundColor: booking.status === 'pending' ? '#FFF7CC' : booking.status === 'confirmed' ? '#D1FADF' : booking.status === 'cancelled' ? '#FFE6E6' : '#E0E7FF',
                      borderRadius: 20,
                      paddingHorizontal: 18,
                      paddingVertical: 6,
                      alignSelf: 'flex-start',
                      shadowColor: '#000',
                      shadowOpacity: 0.08,
                      shadowRadius: 2,
                      elevation: 2,
                    }}>
                      <Text style={{
                        color: booking.status === 'pending' ? '#92400e' : booking.status === 'confirmed' ? '#027A48' : booking.status === 'cancelled' ? '#B42318' : '#1e40af',
                        fontWeight: 'bold',
                        fontSize: 16,
                        letterSpacing: 1,
                      }}>
                        {booking.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={20} color="#4A5568" />
                      <Text style={styles.detailText}>
                        {booking.num_participants} participants
                      </Text>
                    </View>
                    {booking.notes && (
                      <View style={styles.detailRow}>
                        <Ionicons name="document-text-outline" size={20} color="#4A5568" />
                        <Text style={styles.detailText}>{booking.notes}</Text>
                      </View>
                    )}
                  </View>
                  {/* Pill-shaped action buttons with icons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: '#34C759',
                          borderRadius: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8,
                          paddingVertical: 12,
                          elevation: 2,
                        }}
                        onPress={() => handleStatusUpdate(booking.id, 'confirmed')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Approve</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: '#FF3B30',
                          borderRadius: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8,
                          paddingVertical: 12,
                          elevation: 2,
                        }}
                        onPress={() => handleStatusUpdate(booking.id, 'cancelled')}
                      >
                        <Ionicons name="close-circle-outline" size={22} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Reject</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#007AFF',
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 12,
                        elevation: 2,
                      }}
                      onPress={() => {
                        setSelectedBooking(booking);
                        setShowBookingDetails(true);
                      }}
                    >
                      <Ionicons name="eye-outline" size={22} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Details</Text>
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  bookingHeader: {
    marginBottom: 12,
  },
  companyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  statusBadge: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  bookingDate: {
    fontSize: 14,
    color: '#718096',
  },
  bookingDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    borderColor: '#DC3545',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  badge: {
    backgroundColor: '#DC3545',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallActionButton: {
    minWidth: 70,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  smallButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default FirefighterTrainingApprovalScreen; 