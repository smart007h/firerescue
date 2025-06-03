import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Badge, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import { getStationBookings, updateBookingStatus } from '../services/trainingBookings';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TrainingBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationId, setStationId] = useState(null);

  useEffect(() => {
    loadStationId();
  }, []);

  useEffect(() => {
    if (stationId) {
      loadBookings();
    }
  }, [stationId]);

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

  const loadStationId = async () => {
    try {
      // First check if we have a valid session
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      if (!sessionStr) {
        console.log('No session found, redirecting to login');
        await handleSessionExpiration();
        return;
      }

      const session = JSON.parse(sessionStr);
      if (session.expires_at < new Date().getTime()) {
        console.log('Session expired, redirecting to login');
        await handleSessionExpiration();
        return;
      }

      // Get the station code from AsyncStorage
      const stationCode = await AsyncStorage.getItem('stationId');
      if (!stationCode) {
        console.log('No station ID found in AsyncStorage');
        // Try to get it from stationData
        const stationDataStr = await AsyncStorage.getItem('stationData');
        if (stationDataStr) {
          const stationData = JSON.parse(stationDataStr);
          if (stationData.station_id) {
            // Store the station ID and continue
            await AsyncStorage.setItem('stationId', stationData.station_id);
            setStationId(stationData.station_id);
            return;
          }
        }
        // If we still don't have a station ID, redirect to login
        await handleSessionExpiration();
        return;
      }

      // Use the station code directly
      setStationId(stationCode);
    } catch (error) {
      console.error('Error loading station ID:', error);
      Alert.alert('Error', 'Failed to load station information. Please log in again.');
      await handleSessionExpiration();
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await getStationBookings(stationId);
      
      if (error) throw error;
      
      // Sort bookings by date and status (pending first)
      const sortedBookings = data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.training_date) - new Date(b.training_date);
      });

      setBookings(sortedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load training bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const { error } = await updateBookingStatus(bookingId, newStatus);
      if (error) throw error;
      
      // Refresh the bookings list
      loadBookings();
      
      Alert.alert(
        'Success',
        `Booking ${newStatus === 'confirmed' ? 'confirmed' : 'cancelled'} successfully`
      );
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', 'Failed to update booking status');
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
    return timeString.substring(0, 5); // Format as HH:mm
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </SafeAreaView>
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
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Training Bookings</Text>
            <Badge style={styles.badge}>
              {bookings.filter(b => b.status === 'pending').length} Pending
            </Badge>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#757575" />
              <Text style={styles.emptyText}>No training bookings found</Text>
            </View>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id} style={styles.bookingCard}>
                <Card.Content>
                  <View style={styles.bookingHeader}>
                    <View style={styles.companyInfo}>
                      <Text style={styles.companyName}>{booking.company_name}</Text>
                      <Badge
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(booking.status) }
                        ]}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </View>
                    <Text style={styles.bookingDate}>
                      {formatDate(booking.training_date)} at {formatTime(booking.training_time)}
                    </Text>
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

                  {booking.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <Button
                        mode="contained"
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => handleStatusUpdate(booking.id, 'confirmed')}
                      >
                        Confirm
                      </Button>
                      <Button
                        mode="outlined"
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => handleStatusUpdate(booking.id, 'cancelled')}
                      >
                        Cancel
                      </Button>
                    </View>
                  )}
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
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
});

export default TrainingBookingsScreen; 