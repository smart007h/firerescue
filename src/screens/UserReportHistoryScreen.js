import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Card, Badge, Title, Menu, Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getStations } from '../services/trainingBookings';
import DateTimePicker from '@react-native-community/datetimepicker';

const UserReportHistoryScreen = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const navigation = useNavigation();
  const [stations, setStations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [stationMenuVisible, setStationMenuVisible] = useState(false);

  useEffect(() => {
    loadReports();
    getStations().then(({ data }) => setStations(data || []));
  }, []);

  const getAddressFromCoordinates = async (latitude, longitude) => {
    const maxRetries = 3;
    const timeout = 10000; // 10 seconds timeout

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Request permissions before reverse geocoding
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission denied');
        }
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeout);
        });
        const geocodePromise = Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        const [address] = await Promise.race([geocodePromise, timeoutPromise]);
        if (address) {
          const formattedAddress = [
            address.street,
            address.city,
            address.region,
            address.country
          ].filter(Boolean).join(', ');
          return formattedAddress;
        }
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          console.error('All attempts failed to get address');
          return 'Location not available';
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    return 'Location not available';
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }

      console.log('Fetched reports:', data); // Add this line for debugging

      // Process each report to get location addresses
      const reportsWithAddresses = await Promise.all(
        (data || []).map(async (report) => {
          let locationAddress = 'Location not available';
          
          if (report.location) {
            try {
              const [lat, lng] = report.location.split(',').map(Number);
              if (!isNaN(lat) && !isNaN(lng)) {
                locationAddress = await getAddressFromCoordinates(lat, lng);
              }
            } catch (locationError) {
              console.error('Error parsing location:', locationError);
            }
          }

          return {
            ...report,
            location_address: locationAddress
          };
        })
      );

      console.log('Processed reports:', reportsWithAddresses); // Add this line for debugging
      setReports(reportsWithAddresses || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load report history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDescription = (reportId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500'; // Orange for pending
      case 'in_progress':
        return '#4CAF50'; // Green for in progress
      case 'approved':
        return '#2196F3'; // Blue for approved
      case 'rejected':
        return '#F44336'; // Red for rejected
      case 'completed':
        return '#9C27B0'; // Purple for completed
      default:
        return '#f3f4f6'; // Light gray for unknown status
    }
  };

  const getIncidentIcon = (type) => {
    if (!type) return 'warning';
    
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

  const renderDescription = (description, reportId) => {
    const words = description.split(' ');
    const isExpanded = expandedDescriptions[reportId];
    
    if (words.length <= 10) {
      return <Text style={styles.description}>{description}</Text>;
    }

    const displayText = isExpanded 
      ? description 
      : words.slice(0, 10).join(' ') + '...';

    return (
      <View>
        <Text style={styles.description}>{displayText}</Text>
        <TouchableOpacity 
          onPress={() => toggleDescription(reportId)}
          style={styles.readMoreButton}
        >
          <Text style={styles.readMoreText}>
            {isExpanded ? 'Read Less' : 'Read More'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderReportItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('IncidentDetails', { 
          incident: item
        });
      }}
    >
      <Card style={styles.reportCard}>
        <Card.Content>
          <View style={styles.reportHeader}>
            <View style={styles.reportTypeContainer}>
              <Ionicons 
                name={getIncidentIcon(item.incident_type)} 
                size={24} 
                color="#DC3545" 
              />
              <Text style={styles.reportType}>
                {item.incident_type ? item.incident_type.charAt(0).toUpperCase() + item.incident_type.slice(1) : 'Unknown Type'}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status || 'pending') }
            ]}>
              <Text style={styles.statusText}>
                {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.reportDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.detailText} numberOfLines={2}>
                {item.location_address || 'Location not available'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.detailText}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          </View>

          {renderDescription(item.description || 'No description provided', item.id)}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Extract unique statuses from reports
  const uniqueStatuses = Array.from(new Set(reports.map(r => r.status || 'pending')));

  // Filtering logic
  const filteredReports = reports.filter(report => {
    let statusMatch = !statusFilter || report.status === statusFilter;
    let stationMatch = !stationFilter || report.station_id === stationFilter;
    let dateMatch = true;
    if (dateFilter) {
      const reportDate = new Date(report.created_at);
      dateMatch = reportDate.toDateString() === new Date(dateFilter).toDateString();
    }
    return statusMatch && stationMatch && dateMatch;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading reports...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('UserHome')}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Report History</Text>
          <Text style={styles.headerSubtitle}>View your past incident reports</Text>
        </View>
      </View>

      {/* Filter Controls */}
      <View style={{ flexDirection: 'row', margin: 12, gap: 8, alignItems: 'center' }}>
        {/* Status Dropdown */}
        <Menu
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          anchor={<Button mode="outlined" onPress={() => setStatusMenuVisible(true)}>{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'Status'}</Button>}
        >
          <Menu.Item onPress={() => setStatusFilter('')} title="All" />
          {uniqueStatuses.map(status => (
            <Menu.Item key={status} onPress={() => { setStatusFilter(status); setStatusMenuVisible(false); }} title={status.charAt(0).toUpperCase() + status.slice(1)} />
          ))}
        </Menu>
        {/* Station Dropdown */}
        <Menu
          visible={stationMenuVisible}
          onDismiss={() => setStationMenuVisible(false)}
          anchor={<Button mode="outlined" onPress={() => setStationMenuVisible(true)}>{stationFilter ? (stations.find(s => s.station_id === stationFilter)?.station_name || 'Station') : 'Station'}</Button>}
        >
          <Menu.Item onPress={() => setStationFilter('')} title="All" />
          {stations.map(station => (
            <Menu.Item key={station.station_id} onPress={() => { setStationFilter(station.station_id); setStationMenuVisible(false); }} title={station.station_name} />
          ))}
        </Menu>
        {/* Date Picker */}
        <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
          {dateFilter ? new Date(dateFilter).toLocaleDateString() : 'Date'}
        </Button>
        {showDatePicker && (
          <DateTimePicker
            value={dateFilter ? new Date(dateFilter) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDateFilter(selectedDate);
            }}
          />
        )}
        {dateFilter && (
          <Button mode="text" onPress={() => setDateFilter(null)} style={{ marginLeft: 4 }}>Clear</Button>
        )}
      </View>

      {/* Filtered FlatList */}
      <FlatList
        data={filteredReports}
        renderItem={renderReportItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={64} color="#666" />
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#DC3545',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
  },
  headerContent: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: 16,
  },
  reportCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  reportDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  readMoreButton: {
    marginTop: 4,
  },
  readMoreText: {
    color: '#DC3545',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default UserReportHistoryScreen; 