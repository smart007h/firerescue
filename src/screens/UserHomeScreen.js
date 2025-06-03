import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Text, IconButton, Card, Badge, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { getRandomStations } from '../services/trainingBookings';

const UserHomeScreen = () => {
  const navigation = useNavigation();
  const [nearbyStations, setNearbyStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearestStation, setNearestStation] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadRandomStations();
    loadUserProfile();
  }, []);

  const loadRandomStations = async () => {
    try {
      console.log('Loading random stations...');
      setLoading(true);
      
      const { data: stations, error } = await getRandomStations(3);
      
      if (error) {
        console.error('Error fetching random stations:', error);
        throw error;
      }

      console.log('Fetched random stations:', stations);

      if (!stations || stations.length === 0) {
        console.log('No stations found in database');
        return;
      }

      // Fetch active incidents for all stations
      const { data: activeIncidents, error: incidentsError } = await supabase
        .from('incidents')
        .select('station_id')
        .eq('status', 'active');

      if (incidentsError) {
        console.error('Error fetching incidents:', incidentsError);
        throw incidentsError;
      }

      const activeStationIds = new Set(activeIncidents?.map(incident => incident.station_id) || []);

      // Add status for each station
      const stationsWithStatus = stations.map(station => {
        const hasActiveIncident = activeStationIds.has(station.station_id);
        const stationStatus = hasActiveIncident ? 'Busy' : 'Available';

        return {
          ...station,
          status: stationStatus
        };
      });

      console.log('Processed stations:', stationsWithStatus);
      setNearbyStations(stationsWithStatus);
    } catch (error) {
      console.error('Error loading stations:', error);
      Alert.alert('Error', 'Failed to load nearby stations');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (profileData) {
          setProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  const handleStationSearch = (query) => {
    setSearchQuery(query);
  };

  const filteredStations = searchQuery
    ? nearbyStations.filter(station => 
        station.station_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : nearbyStations;

  const handleEmergencyCall = async () => {
    try {
      if (!userLocation) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for emergency calls.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      }

      // Get nearest station
      const { data: stations, error } = await supabase
        .from('firefighters')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (!stations || stations.length === 0) {
        Alert.alert('Error', 'No fire stations available.');
        return;
      }

      // Calculate distances and find nearest
      const stationsWithDistance = stations.map(station => {
        const [stationLat, stationLng] = station.station_location.split(',').map(Number);
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          stationLat,
          stationLng
        );
        return { ...station, distance };
      });

      const nearest = stationsWithDistance.reduce((prev, curr) => 
        prev.distance < curr.distance ? prev : curr
      );

      setNearestStation(nearest);

      // Create emergency call record
      const { data: { user } } = await supabase.auth.getUser();
      const { data: emergencyCall, error: callError } = await supabase
        .from('emergency_calls')
        .insert({
          caller_id: user.id,
          station_id: nearest.id,
          caller_location: `${userLocation.latitude},${userLocation.longitude}`,
          status: 'pending'
        })
        .select()
        .single();

      if (callError) throw callError;

      // Make the actual phone call
      if (nearest.phone_number) {
        const phoneUrl = `tel:${nearest.phone_number}`;
        const canOpen = await Linking.canOpenURL(phoneUrl);
        
        if (canOpen) {
          await Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Cannot make phone call on this device');
        }
      } else {
        Alert.alert('Error', 'No phone number available for the nearest station');
      }

    } catch (error) {
      console.error('Emergency call error:', error);
      Alert.alert('Error', 'Failed to initiate emergency call');
    }
  };

  const handleProfilePress = async () => {
    if (profile) {
      navigation.navigate('Profile', { profile });
    } else {
      try {
        // Try to load profile again if it's not available
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          if (profileData) {
            setProfile(profileData);
            navigation.navigate('Profile', { profile: profileData });
          } else {
            Alert.alert('Error', 'Profile not found');
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      }
    }
  };

  const handleCallStation = async (phone) => {
    if (!phone) {
      Alert.alert('Error', 'No phone number available for this station');
      return;
    }

    try {
      const phoneUrl = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Cannot make phone call on this device');
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      Alert.alert('Error', 'Failed to initiate phone call');
    }
  };

  const handleGridItemPress = (item) => {
    switch (item) {
      case 'Reports History':
        navigation.navigate('UserReportHistory');
        break;
      // ... other cases remain the same
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton 
          icon="menu" 
          size={20} 
          onPress={() => navigation.openDrawer()}
          color="#000" 
        />
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/logo.jpeg')} 
            style={styles.logo}
          />
          <Text style={styles.logoText}>GHANA NATIONAL{'\n'}FIRE SERVICE</Text>
        </View>
        <IconButton
          icon="account-circle"
          size={24}
          onPress={handleProfilePress}
          style={styles.profileButton}
        />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search nearby stations....."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleStationSearch}
          />
        </View>

        {/* Quick Action Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: '#DC3545' }]}
            onPress={handleEmergencyCall}
          >
            <View style={styles.gridItemContent}>
              <Ionicons name="call" size={32} color="#FFFFFF" />
              <Text style={styles.gridItemText}>Emergency{'\n'}contacts</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: '#3949AB' }]}>
            <View style={styles.gridItemContent}>
              <Ionicons name="document-text" size={32} color="#FFFFFF" />
              <Text style={styles.gridItemText}>Certificate{'\n'}Application</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: '#9E8E41' }]}
            onPress={() => navigation.navigate('SafetyGuidelines')}
          >
            <View style={styles.gridItemContent}>
              <Ionicons name="shield" size={32} color="#FFFFFF" />
              <Text style={styles.gridItemText}>Safety{'\n'}Guidelines</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: '#8E44AD' }]}
            onPress={() => {
              console.log('Grid Report History button pressed');
              navigation.navigate('UserReportHistory');
            }}
          >
            <View style={styles.gridItemContent}>
              <Ionicons name="time" size={32} color="#FFFFFF" />
              <Text style={styles.gridItemText}>Reports{'\n'}History</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Nearby Stations */}
        <View style={styles.stationsContainer}>
          <View style={styles.stationsHeader}>
            <Text style={styles.stationsTitle}>Featured Fire Stations</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading stations...</Text>
            </View>
          ) : nearbyStations.length > 0 ? (
            nearbyStations.map((station, index) => (
              <View key={station.id || index} style={[
                styles.stationItem,
                index === nearbyStations.length - 1 && { borderBottomWidth: 0 }
              ]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stationName}>{station.station_name}</Text>
                  <View style={styles.stationDetails}>
                    <Text style={styles.stationAddress}>{station.station_address}</Text>
                    <Text style={styles.stationRegion}>{station.station_region}</Text>
                  </View>
                  <View style={styles.distanceContainer}>
                    <Badge
                      style={[
                        styles.statusBadge,
                        { backgroundColor: station.status === 'Available' ? '#4CAF50' : '#FFC107' }
                      ]}
                    >
                      {station.status}
                    </Badge>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => handleCallStation(station.station_contact)}
                >
                  <Ionicons name="call" size={20} color="#4CAF50" />
                  <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.noStationsText}>No stations available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFE6E6',
    height: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 4,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E53935',
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileButton: {
    margin: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    elevation: 2,
    height: 36,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 13,
    color: '#2D3748',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridItemContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  gridItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stationsContainer: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 90,
  },
  stationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  stationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  stationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 8,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  stationDetails: {
    marginTop: 4,
  },
  stationAddress: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 2,
  },
  stationRegion: {
    fontSize: 14,
    color: '#718096',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  callButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '500',
  },
  noStationsText: {
    textAlign: 'center',
    color: '#4A5568',
    padding: 20,
    fontStyle: 'italic',
    fontSize: 14,
  },
});

export default UserHomeScreen;
