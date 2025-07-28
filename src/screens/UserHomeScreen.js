import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Alert, Linking, Modal } from 'react-native';
import { Text, IconButton, Card, Badge, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker } from 'react-native-maps';
import { 
  getCurrentLocation, 
  getAddressFromCoordinates, 
  findNearestStation,
  calculateDistance 
} from '../services/locationService';

const UserHomeScreen = () => {
  const navigation = useNavigation();
  const [nearbyStations, setNearbyStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearestStation, setNearestStation] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [allNearbyStations, setAllNearbyStations] = useState([]);

  // Google Places API configuration
  const googlePlacesQuery = {
    key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    language: 'en',
    components: 'country:gh',
    types: '(cities)',
  };

  useEffect(() => {
    loadUserProfile();
    handleGetCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      loadNearbyStations(userLocation);
    }
  }, [userLocation]);

  const handleLocationSelect = (data, details = null) => {
    if (details) {
      const location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: details.formatted_address,
      };

      setSelectedLocation(location);
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Find nearest station for selected location
      findNearestStation(location.latitude, location.longitude);
    }
  };

  const confirmLocation = () => {
    if (selectedLocation) {
      setUserLocation(selectedLocation);
      setShowLocationModal(false);
      Alert.alert('Success', 'Location updated successfully!');
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

  const handleStationSearch = (query) => {
    setSearchQuery(query);
  };

  // Filter among allNearbyStations, show up to 3 closest matches
  const filteredStations = searchQuery
    ? allNearbyStations.filter(station =>
        (station.station_name && station.station_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (station.station_address && station.station_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (station.station_region && station.station_region.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 3)
    : nearbyStations;

  const handleEmergencyCall = async () => {
    try {
      if (!userLocation) {
        Alert.alert('Location Required', 'Please set your location first to find the nearest fire station.');
        setShowLocationModal(true);
        return;
      }

      if (!nearestStation) {
        Alert.alert('Error', 'No fire stations available.');
        return;
      }

      // Create emergency call record
      const { data: { user } } = await supabase.auth.getUser();
      const { data: emergencyCall, error: callError } = await supabase
        .from('emergency_calls')
        .insert({
          caller_id: user.id,
          station_id: nearestStation.station_id,
          caller_location: `${userLocation.latitude},${userLocation.longitude}`,
          status: 'pending'
        })
        .select()
        .single();

      if (callError) throw callError;

      // Make the actual phone call
      if (nearestStation.station_contact) {
        const phoneUrl = `tel:${nearestStation.station_contact}`;
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
      navigation.navigate('UserProfile', { profile });
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
            navigation.navigate('UserProfile', { profile: profileData });
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

  const handleGetCurrentLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        throw new Error('Invalid location coordinates received');
      }
      
      setUserLocation(coords);
      setMapRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Get address for the location
      const address = await getAddressFromCoordinates(coords.latitude, coords.longitude);
      setSelectedLocation({
        ...coords,
        address,
      });

      // Find nearest station based on current location
      const nearest = await findNearestStation(coords.latitude, coords.longitude);
      setNearestStation(nearest);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        error.message || 'Failed to get location. Please try again.'
      );
    }
  };

  // Fetch all stations and find the 3 closest to the user
  const loadNearbyStations = async (userCoords) => {
    setLoading(true);
    try {
      // Fetch all active stations
      const { data: stations, error } = await supabase
        .from('firefighters')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (!stations || stations.length === 0) {
        setNearbyStations([]);
        setAllNearbyStations([]);
        return;
      }

      // Fetch active incidents for all stations
      const { data: activeIncidents, error: incidentsError } = await supabase
        .from('incidents')
        .select('station_id')
        .eq('status', 'active');

      if (incidentsError) throw incidentsError;
      const activeStationIds = new Set(activeIncidents?.map(incident => incident.station_id) || []);

      // Calculate distance and status for each station
      const stationsWithDistance = stations.map(station => {
        const hasActiveIncident = activeStationIds.has(station.station_id);
        const stationStatus = hasActiveIncident ? 'Busy' : 'Available';
        const distance = (station.latitude && station.longitude)
          ? calculateDistance(userCoords.latitude, userCoords.longitude, station.latitude, station.longitude)
          : null;
        return {
          ...station,
          status: stationStatus,
          distance
        };
      });

      // Sort by distance
      const sortedStations = stationsWithDistance
        .filter(station => station.distance !== null && !isNaN(station.distance))
        .sort((a, b) => a.distance - b.distance);

      setAllNearbyStations(sortedStations);
      setNearbyStations(sortedStations.slice(0, 3));
    } catch (error) {
      console.error('Error loading nearby stations:', error);
      Alert.alert('Error', 'Failed to load nearby stations');
    } finally {
      setLoading(false);
    }
  };

  const renderLocationModal = () => (
    <Modal
      visible={showLocationModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowLocationModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Your Location</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>Search for a location:</Text>
            <GooglePlacesAutocomplete
              placeholder="Enter address, landmark, or area"
              onPress={handleLocationSelect}
              query={googlePlacesQuery}
              styles={{
                container: styles.autocompleteContainer,
                textInput: styles.autocompleteInput,
                listView: styles.autocompleteListView,
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              nearbyPlacesAPI="GooglePlacesSearch"
              debounce={300}
            />
          </View>

          {mapRegion && (
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>Selected Location:</Text>
              <MapView
                style={styles.map}
                region={mapRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title="Selected Location"
                    description={selectedLocation.address}
                  />
                )}
                {nearestStation && nearestStation.latitude && nearestStation.longitude && (
                  <Marker
                    coordinate={{
                      latitude: nearestStation.latitude,
                      longitude: nearestStation.longitude,
                    }}
                    title={nearestStation.station_name}
                    description="Nearest Fire Station"
                    pinColor="red"
                  />
                )}
              </MapView>
            </View>
          )}

          {selectedLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                <Ionicons name="location" size={16} color="#DC3545" />
                {selectedLocation.address}
              </Text>
              {nearestStation && (
                <Text style={styles.nearestStationText}>
                  Nearest Station: {nearestStation.station_name} 
                  ({nearestStation.distance?.toFixed(1)} km away)
                </Text>
              )}
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, !selectedLocation && styles.disabledButton]}
              onPress={confirmLocation}
              disabled={!selectedLocation}
            >
              <Text style={styles.confirmButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
        {/* Location Status */}
        <View style={styles.locationStatusContainer}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => setShowLocationModal(true)}
          >
            <Ionicons 
              name={userLocation ? "location" : "location-outline"} 
              size={20} 
              color={userLocation ? "#4CAF50" : "#666"} 
            />
            <Text style={[styles.locationText, userLocation && styles.locationActive]}>
              Current Location
            </Text>
          </TouchableOpacity>
          {userLocation && selectedLocation && selectedLocation.address && (
            <Text style={styles.locationSubtext}>{selectedLocation.address}</Text>
          )}
        </View>

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

        {/* Quick Action Grid - move back above stations */}
        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={[styles.gridItem, { backgroundColor: '#DC3545' }]}
            onPress={handleEmergencyCall}
          >
            <View style={styles.gridItemContent}>
              <Ionicons name="call" size={32} color="#FFFFFF" />
              <Text style={styles.gridItemText}>{`Emergency
contacts`}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: '#3949AB' }]}> 
            <View style={styles.gridItemContent}>
              <Ionicons name="document-text" size={32} color="#FFFFFF" />
              <Text style={styles.gridItemText}>{`Certificate
Application`}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridItem, { backgroundColor: '#9E8E41' }]}
            onPress={() => navigation.navigate('SafetyGuidelines')}
          >
            <View style={styles.gridItemContent}>
              <Ionicons name="shield" size={32} color="#FFFFFF" />
              <Text style={styles.gridItemText}>{`Safety
Guidelines`}</Text>
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
              <Text style={styles.gridItemText}>{`Reports
History`}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Nearby Stations */}
        <View style={styles.stationsContainer}>
          <View style={styles.stationsHeader}>
            <Text style={styles.stationsTitle}>Nearby Stations</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading stations...</Text>
            </View>
          ) : userLocation && filteredStations.length > 0 ? (
            filteredStations.map((station, index, arr) => (
              <View key={station.id || index} style={[
                styles.stationItem,
                index === arr.length - 1 && { borderBottomWidth: 0 }
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
                    <Text style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                      {station.distance?.toFixed(2)} km away
                    </Text>
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

      {renderLocationModal()}
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
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileButton: {
    margin: 0,
  },
  locationStatusContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  locationActive: {
    color: '#4CAF50',
    fontWeight: '600',
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  locationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  autocompleteContainer: {
    flex: 0,
  },
  autocompleteInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  autocompleteListView: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
  },
  mapSection: {
    marginBottom: 20,
  },
  map: {
    height: 200,
    borderRadius: 12,
  },
  locationInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  nearestStationText: {
    fontSize: 12,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#DC3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  locationSubtext: {
    fontSize: 12,
    color: '#999',
    marginLeft: 28,
    marginTop: 2,
  },
});

export default UserHomeScreen;
