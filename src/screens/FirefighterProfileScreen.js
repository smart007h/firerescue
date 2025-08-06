const React = require('react');
const { useState, useEffect } = React;
const { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, RefreshControl } = require('react-native');
const { SafeAreaView } = require('react-native-safe-area-context');
const { Ionicons } = require('@expo/vector-icons');
const { supabase } = require('../config/supabaseClient');
const { useNavigation } = require('@react-navigation/native');
const { useAuth } = require('../context/AuthContext');
import { getAddressFromCoordinates } from '../services/locationService';

import AsyncStorage from '@react-native-async-storage/async-storage';

function FirefighterProfileScreen() {
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    completedIncidents: 0,
  });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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

  const loadData = async () => {
    try {
      // Get station data from AsyncStorage
      const stationData = await AsyncStorage.getItem('stationData');
      console.log('Retrieved stationData from AsyncStorage:', stationData);
      if (!stationData) {
        console.log('No station data found in AsyncStorage');
        await handleSessionExpiration();
        return;
      }

      const parsedStationData = JSON.parse(stationData);
      console.log('Parsed station data:', parsedStationData);
      
      // Ensure we have the right data structure
      const station = {
        station_id: parsedStationData.station_id || parsedStationData?.id,
        station_name: parsedStationData.station_name || parsedStationData.name || 'Unknown Station',
        station_region: parsedStationData.station_region || parsedStationData.region || 'Unknown Region',
        station_email: parsedStationData.station_email || parsedStationData.email || 'No email',
        station_contact: parsedStationData.station_contact || parsedStationData.phone || 'No contact',
        station_address: parsedStationData.station_address || parsedStationData.address || 'No address',
        is_active: parsedStationData.is_active !== undefined ? parsedStationData.is_active : true,
      };
      
      setStation(station);
      console.log('Processed station object:', station);

      // Load stats for the station
      await loadStats(station.station_id);

      // Get recent incidents
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('station_id', station.station_id);

      if (error) {
        console.error('Error fetching incidents:', error);
        throw error;
      }

      // Calculate statistics
      const stats = {
        totalIncidents: incidents ? incidents.length : 0,
        activeIncidents: incidents ? incidents.filter(i => i.status === 'pending' || i.status === 'in_progress').length : 0,
        completedIncidents: incidents ? incidents.filter(i => i.status === 'resolved' || i.status === 'completed').length : 0,
      };
      setStats(stats);

      // Get recent incidents
      const recent = incidents
        ? await Promise.all(incidents
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map(async (incident) => {
              try {
                const formattedLocation = await formatLocation(incident.location);
                return { ...incident, formattedLocation };
              } catch (error) {
                return { ...incident, formattedLocation: incident.location };
              }
            })
          )
        : [];
      setRecentIncidents(recent);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load station information: ' + error.message);
      // Don't automatically expire session on error, let user retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async (stationId) => {
    try {
      // Get total incidents
      const { data: incidents, error: incidentsError } = await supabase
        .from('incidents')
        .select('*')
        .eq('station_id', stationId);

      if (incidentsError) throw incidentsError;

      // Calculate statistics from the fetched incidents
      const totalIncidents = incidents ? incidents.length : 0;
      const activeIncidents = incidents ? incidents.filter(i => 
        i.status === 'pending' || i.status === 'in_progress'
      ).length : 0;
      const completedIncidents = incidents ? incidents.filter(i => 
        i.status === 'resolved' || i.status === 'completed'
      ).length : 0;

      console.log('Station Stats:', {
        totalIncidents,
        activeIncidents,
        completedIncidents
      });

      setStats({
        totalIncidents,
        activeIncidents,
        completedIncidents,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Failed to load statistics');
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
            const formattedAddress = await getAddressFromCoordinates(lat, lng);
            return formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          } catch (error) {
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }
        }
      }
      
      return location;
    } catch (error) {
      return location;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      console.log('Firefighter logged out successfully');
      // Don't navigate manually - let AuthContext and AppNavigator handle it
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#FF3B30';
      case 'in_progress':
        return '#FF9500';
      case 'resolved':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const StatsSection = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={[styles.statNumber, { color: '#DC3545' }]}>{stats.totalIncidents}</Text>
        <Text style={styles.statLabel}>Total{'\n'}Incidents</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{stats.activeIncidents}</Text>
        <Text style={styles.statLabel}>Active{'\n'}Incidents</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.completedIncidents}</Text>
        <Text style={styles.statLabel}>Completed{'\n'}Incidents</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Loading station information...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#DC3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!station) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="business" size={48} color="#DC3545" />
        <Text style={styles.errorText}>Station information not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Station Profile</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Station Header */}
        <View style={styles.profileHeader}>
          <Image
            source={require('../assets/images/logo.jpeg')}
            style={styles.profileImage}
          />
          <Text style={styles.name}>{station.station_name}</Text>
          <Text style={styles.rank}>{station.station_region}</Text>
        </View>

        {/* Stats Section */}
        <StatsSection />

        {/* Station Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Station Information</Text>
          <View style={styles.detailRow}>
            <Ionicons name="id-card" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Station ID</Text>
              <Text style={styles.detailValue}>{station.station_id}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Station Email</Text>
              <Text style={styles.detailValue}>{station.station_email}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Contact Number</Text>
              <Text style={styles.detailValue}>{station.station_contact}</Text>
            </View>
          </View>
        </View>

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Details</Text>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{station.station_address}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="map" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Region</Text>
              <Text style={styles.detailValue}>{station.station_region}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[
                styles.detailValue,
                { color: station.is_active ? '#4CAF50' : '#DC3545' }
              ]}>
                {station.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Incidents */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Incidents</Text>
          {recentIncidents.map((incident,idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.incidentCard}
            >
              <View style={styles.incidentHeader}>
                <Text style={styles.incidentType}>{incident.type}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(incident.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {incident.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.incidentDetails}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.incidentLocation}>{incident.formattedLocation || incident.location}</Text>
              </View>
              <Text style={styles.incidentDate}>
                {new Date(incident.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={24} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#DC3545',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#DC3545',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  rank: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  incidentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  incidentLocation: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  incidentDate: {
    fontSize: 12,
    color: '#666666',
  },
});

module.exports = FirefighterProfileScreen;