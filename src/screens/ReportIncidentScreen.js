import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  PermissionsAndroid,
  Modal,
  FlatList,
} from 'react-native';
import { supabase } from '../config/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import 'react-native-get-random-values';
import { debounce } from 'lodash';

const INCIDENT_TYPES = [
  'Fire',
  'Medical Emergency',
  'Traffic Accident',
  'Natural Disaster',
  'Hazardous Material',
  'Rescue Operation',
  'Other',
];

const LOCATION_TIMEOUT = 10000; // 10 seconds timeout for location requests

export default function ReportIncidentScreen() {
  const [formData, setFormData] = useState({
    incidentType: '',
    location: null,
    description: '',
    images: [],
    videos: [],
    coordinates: null,
    mediaUrls: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationAvailable, setLocationAvailable] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigation = useNavigation();
  const [nearestStation, setNearestStation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedLocations, setSuggestedLocations] = useState([]);
  const [manualLocation, setManualLocation] = useState('');

  // Memoize the Google Places Autocomplete query
  const googlePlacesQuery = React.useMemo(() => ({
    key: 'AIzaSyC_CmB_EEAwueHYtPM4uAICHok5XUaYR-8',
    language: 'en',
    components: 'country:gh',
    types: '(cities)',  // Limit to cities for faster results
  }), []);

  // Debounce the location search
  const debouncedSearchLocations = React.useCallback(
    debounce((place) => searchLocations(place), 300),
    []
  );

  useEffect(() => {
    console.log('Component mounted');
    if (Platform.OS !== 'web') {
      console.log('Checking initial location permission...');
      checkLocationPermission();
    } else {
      console.log('Web platform detected, skipping location permission');
      setLocationAvailable(false);
    }
  }, []);

  useEffect(() => {
    // Log whenever location data changes
    console.log('Location data updated:', {
      formDataLocation: formData.location,
      locationAddress,
      nearestStation
    });
  }, [formData.location, locationAddress, nearestStation]);

  const checkLocationPermission = async () => {
    try {
      console.log('Starting location permission check...');
      
      // Check if location services are enabled
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      console.log('Location services status:', {
        enabled: serviceEnabled,
        platform: Platform.OS
      });
      
      if (!serviceEnabled) {
        console.log('Location services are disabled');
        setError('Location services are disabled. Please enable them in your device settings.');
        setLocationAvailable(false);
        return false;
      }

      let permissionResult;
      if (Platform.OS === 'android') {
        console.log('Requesting Android location permission...');
        permissionResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'FireRescue needs access to your location to find the nearest fire station.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        console.log('Android permission result:', permissionResult);
      } else {
        console.log('Requesting iOS location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionResult = status;
        console.log('iOS permission status:', status);
      }

      const hasPermission = Platform.OS === 'android' 
        ? permissionResult === PermissionsAndroid.RESULTS.GRANTED
        : permissionResult === 'granted';

      console.log('Final permission status:', {
        hasPermission,
        platform: Platform.OS
      });

      setLocationAvailable(hasPermission);
      if (!hasPermission) {
        setError('Location permission denied');
      }
      return hasPermission;
    } catch (error) {
      console.error('Error in checkLocationPermission:', {
        error,
        platform: Platform.OS,
        message: error.message,
        stack: error.stack
      });
      setError('Error checking location permission: ' + error.message);
      setLocationAvailable(false);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('Getting current location...');
      setLoading(true);
      setError('');

      // Check permissions first
      const permissionResult = await Location.requestForegroundPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Get location with timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Location request timed out')), LOCATION_TIMEOUT)
      );

      const location = await Promise.race([locationPromise, timeoutPromise]);
      
      if (!location || !location.coords) {
        throw new Error('Invalid location data');
      }

      // Get address first
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Format the address with all available components
      const formattedAddress = [
        address?.street,
        address?.city,
        address?.region,
        address?.country
      ].filter(Boolean).join(', ');

      // Update state with both location and address
      setFormData(prev => ({
        ...prev,
        location: { 
          latitude: location.coords.latitude, 
          longitude: location.coords.longitude 
        },
        coordinates: { 
          latitude: location.coords.latitude, 
          longitude: location.coords.longitude 
        }
      }));

      // Set the formatted address
      setLocationAddress(formattedAddress || 'Location selected');

      // Find nearest station
      await findNearestStation(location.coords.latitude, location.coords.longitude);

      setShowLocationModal(false);
      Alert.alert('Success', 'Location has been set');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        error.message || 'Failed to get location. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLocationReceived = async (location) => {
    try {
      console.log('Processing received location...');
      
      if (!location || !location.coords) {
        throw new Error('Invalid location data received');
      }

      // Get the address for the current location
      console.log('Getting address for location...');
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('Received address:', address);

      // Format the address with all available components
      const formattedAddress = [
        address?.street,
        address?.city,
        address?.region,
        address?.country
      ].filter(Boolean).join(', ');

      console.log('Formatted address:', formattedAddress);

      setFormData({
        ...formData,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        coordinates: { 
          latitude: location.coords.latitude, 
          longitude: location.coords.longitude 
        },
      });
      setLocationAddress(formattedAddress || 'Location selected');

      // Find nearest station
      console.log('Finding nearest station...');
      await findNearestStation(location.coords.latitude, location.coords.longitude);
      
      setShowLocationModal(false);
      Alert.alert('Success', 'Current location has been set.');
    } catch (error) {
      console.error('Error processing location:', error);
      Alert.alert('Error', 'Failed to process location: ' + error.message);
    }
  };

  const findNearestStation = async (latitude, longitude) => {
    try {
      // Get all active stations
      const { data: stations, error } = await supabase
        .from('firefighters')
        .select('station_id, station_name, station_address, station_region, latitude, longitude')
        .eq('is_active', true);

      if (error) throw error;
      if (!stations?.length) throw new Error('No fire stations found');

      // Calculate distances and find the nearest station
      let nearestStation = null;
      let minDistance = Infinity;

      stations.forEach(station => {
        if (station.latitude && station.longitude) {
          const distance = calculateDistance(
            latitude,
            longitude,
            station.latitude,
            station.longitude
          );

          // Special handling for Kumasi area
          if (station.station_region.toLowerCase().includes('ashanti')) {
            // If the incident is in Kumasi area, prioritize Kumasi Central Station
            if (isInKumasiArea(latitude, longitude)) {
              if (station.station_id === 'FS002') { // Kumasi Central Station
                nearestStation = station;
                minDistance = distance;
                return;
              }
            }
          }

          if (distance < minDistance) {
            minDistance = distance;
            nearestStation = station;
          }
        }
      });

      if (!nearestStation) {
        throw new Error('No valid fire stations found');
      }

      setNearestStation(nearestStation);
      return nearestStation;
    } catch (error) {
      console.error('Error finding nearest station:', error);
      Alert.alert('Warning', 'Could not determine nearest fire station. The report will still be submitted.');
    }
  };

  // Helper function to check if coordinates are in Kumasi area
  const isInKumasiArea = (latitude, longitude) => {
    // Kumasi area boundaries (approximate)
    const kumasiBounds = {
      north: 6.8,  // North boundary
      south: 6.6,  // South boundary
      east: -1.5,  // East boundary
      west: -1.7   // West boundary
    };

    return (
      latitude >= kumasiBounds.south &&
      latitude <= kumasiBounds.north &&
      longitude >= kumasiBounds.west &&
      longitude <= kumasiBounds.east
    );
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toRad = (value) => {
    return value * Math.PI / 180;
  };

  const handleIncidentTypeSelect = (type) => {
    if (formData.incidentType === type) {
      setFormData({ ...formData, incidentType: '' });
    } else {
      setFormData({ ...formData, incidentType: type });
    }
  };

  const handleLocationSelect = async () => {
    if (Platform.OS === 'web') {
      setError('Location services are not available in web browser');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Get address from coordinates using reverse geocoding
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const locationString = address 
        ? `${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.country || ''}`
        : `${latitude}, ${longitude}`;

      setFormData({
        ...formData,
        location: {
          latitude,
          longitude,
        },
        coordinates: { latitude, longitude },
      });
    } catch (error) {
      setError('Error getting location. Please enter manually.');
    }
  };

  const handleImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        console.log('Selected image:', asset); // Debug log

        // Store the image data directly without converting to blob
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, {
            uri: asset.uri,
            type: 'image',
            mimeType: asset.mimeType || 'image/jpeg',
            base64: asset.base64
          }]
        }));
        Alert.alert('Success', 'Image added successfully');
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Error selecting image. Please try again.');
    }
  };

  const handleVideoUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        console.log('Selected video:', asset); // Debug log

        setFormData(prev => ({
          ...prev,
          videos: [...prev.videos, {
            uri: asset.uri,
            type: 'video',
            mimeType: asset.mimeType || 'video/mp4'
          }]
        }));
        Alert.alert('Success', 'Video added successfully');
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert('Error', 'Error selecting video. Please try again.');
    }
  };

  const removeMedia = (type, index) => {
    if (type === 'image') {
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        videos: prev.videos.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.location || !formData.incidentType || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!nearestStation) {
      Alert.alert('Error', 'Unable to find nearest fire station. Please try again.');
      return;
    }

    setLoading(true);
    let incidentId = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create the incident first without media
      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .insert({
          reported_by: user.id,
          incident_type: formData.incidentType,
          description: formData.description,
          location: `${formData.location.latitude},${formData.location.longitude}`,
          coordinates: formData.coordinates,
          status: 'pending',
          media_urls: [],
          station_id: nearestStation.station_id
        })
        .select()
        .single();

      if (incidentError) {
        console.error('Supabase error creating incident:', incidentError);
        throw incidentError;
      }

      if (!incidentData) {
        throw new Error('No data returned from incident creation');
      }

      incidentId = incidentData.id;

      // Get the firefighter ID from the station
      const { data: firefighter, error: firefighterError } = await supabase
        .from('firefighters')
        .select('id')
        .eq('station_id', nearestStation.station_id)
        .single();

      if (firefighterError) {
        console.error('Supabase error getting firefighter:', firefighterError);
        throw firefighterError;
      }

      if (!firefighter) {
        throw new Error('No firefighter found for the station');
      }

      // Create the incident response record
      const { error: responseError } = await supabase
        .from('incident_responses')
        .insert({
          incident_id: incidentData.id,
          firefighter_id: firefighter.id,
          status: 'pending'
        });

      if (responseError) {
        console.error('Supabase error creating incident response:', responseError);
        throw responseError;
      }

      // Reset loading state and navigate
      setLoading(false);
      
      // Navigate to tracking page with incident and station details
      console.log('Navigating to IncidentTracking with:', {
        incidentId,
        stationInfo: nearestStation
      });
      
      navigation.replace('IncidentTracking', {
        incidentId,
        stationInfo: {
          id: nearestStation.station_id,
          name: nearestStation.station_name,
          address: nearestStation.station_address,
          distance: calculateDistance(
            formData.location.latitude,
            formData.location.longitude,
            nearestStation.latitude,
            nearestStation.longitude
          ).toFixed(2)
        }
      });

      // Upload media in the background if needed
      if (formData.images.length > 0 || formData.videos.length > 0) {
        uploadMedia(incidentId, user.id);
      }
    } catch (error) {
      console.error('Error submitting incident:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to submit incident. Please try again.');
    }
  };

  const uploadMedia = async (incidentId, userId) => {
    const mediaUrls = [];
    
    // Upload images
    for (const image of formData.images) {
      try {
        const fileExt = image.uri.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('incident-media')
          .upload(filePath, {
            uri: image.uri,
            type: image.mimeType,
            name: fileName,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('incident-media')
            .getPublicUrl(filePath);

          mediaUrls.push({
            type: 'image',
            url: publicUrl
          });
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    // Upload videos
    for (const video of formData.videos) {
      try {
        const fileExt = video.uri.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('incident-media')
          .upload(filePath, {
            uri: video.uri,
            type: video.mimeType,
            name: fileName,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('incident-media')
            .getPublicUrl(filePath);

          mediaUrls.push({
            type: 'video',
            url: publicUrl
          });
        }
      } catch (error) {
        console.error('Error uploading video:', error);
      }
    }

    // Update the incident with media URLs if any were uploaded successfully
    if (mediaUrls.length > 0) {
      try {
        await supabase
          .from('incidents')
          .update({ media_urls: mediaUrls })
          .eq('id', incidentId);
      } catch (error) {
        console.error('Error updating incident with media URLs:', error);
      }
    }
  };

  const searchLocations = async (place) => {
    try {
      console.log('Search location selected:', place);
      
      if (!place || !place.geometry || !place.geometry.location) {
        throw new Error('Invalid place data');
      }

      const location = {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng
      };

      console.log('Setting location:', location);

      // Update form data with the selected location
      setFormData(prev => ({
        ...prev,
        location: location,
        coordinates: location
      }));

      // Set the formatted address from the place details
      const displayAddress = place.formatted_address || place.name;
      setLocationAddress(displayAddress);

      // Find the nearest station
      await findNearestStation(location.latitude, location.longitude);

      // Close the modal and show success
      setShowLocationModal(false);
      Alert.alert('Success', 'Location has been set.');
    } catch (error) {
      console.error('Error setting location:', error);
      Alert.alert('Error', 'Failed to set location. Please try again.');
    }
  };

  const selectSuggestedLocation = async (location) => {
    try {
      setFormData({
        ...formData,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        coordinates: { 
          latitude: location.latitude, 
          longitude: location.longitude 
        },
      });
      setLocationAddress(location.address);
      findNearestStation(location.latitude, location.longitude);
      setShowLocationModal(false);
      setSuggestedLocations([]);
    } catch (error) {
      console.error('Error selecting location:', error);
      Alert.alert('Error', 'Failed to set location. Please try again.');
    }
  };

  const renderIncidentTypes = () => (
            <View style={styles.incidentTypeContainer}>
              {INCIDENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.incidentTypeButton,
                    formData.incidentType === type && styles.incidentTypeButtonActive,
                  ]}
                  onPress={() => handleIncidentTypeSelect(type)}
                >
                  <Ionicons
                    name={getIncidentIcon(type)}
                    size={16}
                    color={formData.incidentType === type ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.incidentTypeText,
                      formData.incidentType === type && styles.incidentTypeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
  );

  const renderMediaPreview = () => (
            <View style={styles.mediaContainer}>
      <View style={[styles.mediaButton, styles.imageUploadButton]}>
                {formData.images.length > 0 ? (
          <FlatList
            data={formData.images}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => `image-${index}`}
            renderItem={({ item, index }) => (
              <View style={styles.mediaPreviewItem}>
                <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
                        <TouchableOpacity
                          style={styles.removeMediaButton}
                          onPress={() => removeMedia('image', index)}
                        >
                          <Ionicons name="close-circle" size={16} color="#DC3545" />
                        </TouchableOpacity>
                      </View>
            )}
          />
        ) : (
          <TouchableOpacity
            style={styles.mediaButtonContent}
            onPress={handleImageUpload}
            disabled={loading}
          >
                    <Ionicons name="image" size={20} color="#2563eb" />
                    <Text style={styles.mediaButtonText}>Add Image</Text>
              </TouchableOpacity>
        )}
      </View>

      <View style={[styles.mediaButton, styles.videoUploadButton]}>
                {formData.videos.length > 0 ? (
          <FlatList
            data={formData.videos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => `video-${index}`}
            renderItem={({ item, index }) => (
              <View style={styles.mediaPreviewItem}>
                        <View style={styles.videoPreview}>
                          <Ionicons name="play-circle" size={24} color="#fff" />
                        </View>
                        <TouchableOpacity
                          style={styles.removeMediaButton}
                          onPress={() => removeMedia('video', index)}
                        >
                          <Ionicons name="close-circle" size={16} color="#DC3545" />
                        </TouchableOpacity>
                      </View>
            )}
          />
        ) : (
          <TouchableOpacity
            style={styles.mediaButtonContent}
            onPress={handleVideoUpload}
            disabled={loading}
          >
                    <Ionicons name="videocam" size={20} color="#2563eb" />
                    <Text style={styles.mediaButtonText}>Add Video</Text>
              </TouchableOpacity>
        )}
            </View>
          </View>
  );

  const renderFormContent = () => {
    return [
      <View key="station" style={styles.stationInfo}>
        {nearestStation && (
          <>
            <Text style={styles.stationTitle}>Nearest Fire Station:</Text>
            <Text style={styles.stationText}>{nearestStation.station_name}</Text>
            <Text style={styles.stationText}>{nearestStation.station_address}</Text>
          </>
        )}
      </View>,
      <View key="incidentType" style={styles.formContainer}>
        <Text style={styles.label}>Incident Type *</Text>
        {renderIncidentTypes()}
      </View>,
      <View key="location" style={styles.formContainer}>
        <Text style={styles.label}>Location *</Text>
        <TouchableOpacity
          style={styles.locationDisplayButton}
          onPress={() => setShowLocationModal(true)}
        >
          {locationAddress ? (
            <View style={styles.selectedLocation}>
              <Ionicons name="location" size={20} color="#DC3545" />
              <Text style={styles.selectedLocationText}>{locationAddress}</Text>
            </View>
          ) : (
            <View style={styles.selectLocation}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.selectLocationText}>Select Location</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>,
      <View key="description" style={styles.formContainer}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the incident in detail..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
          editable={!loading}
        />
      </View>,
      <View key="media" style={styles.formContainer}>
        <Text style={styles.label}>Media Upload *</Text>
        <Text style={styles.sectionSubtitle}>Upload at least one image or video</Text>
        {renderMediaPreview()}
      </View>,
      loading && (
        <View key="progress" style={styles.progressContainer}>
              <ActivityIndicator color="#2563eb" size="small" />
              <Text style={styles.progressText}>
                Uploading files... {Math.round(uploadProgress)}%
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
      ),
      error && <Text key="error" style={styles.errorText}>{error}</Text>,
          <TouchableOpacity
        key="submit"
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonContent}>Submit Report</Text>
            )}
          </TouchableOpacity>
    ];
  };

  const findNearestStationByAddress = async (address) => {
    try {
      // Get all stations
      const { data: stations, error } = await supabase
        .from('firefighters')
        .select('station_id, station_name, latitude, longitude, address')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      if (!stations?.length) throw new Error('No fire stations found');

      // Find station in the same city/region
      const addressLower = address.toLowerCase();
      const nearestStation = stations.find(station => 
        station.address && station.address.toLowerCase().includes(addressLower)
      ) || stations[0]; // If no match found, use the first station

      if (!nearestStation) {
        throw new Error('No valid fire stations found');
      }

      setNearestStation(nearestStation);
      return nearestStation;
    } catch (error) {
      console.error('Error finding nearest station:', error);
      Alert.alert('Warning', 'Could not determine nearest fire station. The report will still be submitted.');
    }
  };

  const handleManualLocationSubmit = async () => {
    try {
      if (!manualLocation.trim()) {
        Alert.alert('Error', 'Please enter a location');
        return;
      }

      // Format the search query for Ghana
      const searchQuery = manualLocation.toLowerCase().includes('ghana') 
        ? manualLocation 
        : `${manualLocation}, Ghana`;

      console.log('Searching for location:', searchQuery);

      // First try with region restriction
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${googlePlacesQuery.key}&region=gh`
      );
      
      const data = await response.json();
      console.log('Geocoding response:', data);

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const formattedAddress = data.results[0].formatted_address;

        console.log('Found location:', {
          address: formattedAddress,
          coordinates: location
        });

        // Update form data with the location
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: location.lat,
            longitude: location.lng
          },
          coordinates: {
            latitude: location.lat,
            longitude: location.lng
          }
        }));
        
        setLocationAddress(formattedAddress);
        
        // Find nearest station using actual coordinates
        await findNearestStation(location.lat, location.lng);
        
        setShowLocationModal(false);
        setManualLocation('');
      } else if (data.status === 'ZERO_RESULTS') {
        // If no results with region restriction, try without it
        console.log('No results with region restriction, trying without...');
        
        const responseWithoutRegion = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${googlePlacesQuery.key}`
        );
        
        const dataWithoutRegion = await responseWithoutRegion.json();
        console.log('Geocoding response without region:', dataWithoutRegion);

        if (dataWithoutRegion.status === 'OK' && dataWithoutRegion.results && dataWithoutRegion.results.length > 0) {
          const location = dataWithoutRegion.results[0].geometry.location;
          const formattedAddress = dataWithoutRegion.results[0].formatted_address;

          console.log('Found location without region:', {
            address: formattedAddress,
            coordinates: location
          });

          // Update form data with the location
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: location.lat,
              longitude: location.lng
            },
            coordinates: {
              latitude: location.lat,
              longitude: location.lng
            }
          }));
          
          setLocationAddress(formattedAddress);
          
          // Find nearest station using actual coordinates
          await findNearestStation(location.lat, location.lng);
          
          setShowLocationModal(false);
          setManualLocation('');
        } else {
          console.error('Location search failed:', dataWithoutRegion);
          Alert.alert(
            'Location Not Found',
            'Could not find the location. Please try:\n\n' +
            '1. Using a more specific address\n' +
            '2. Including the city/region (e.g., "Kotei, Kumasi")\n' +
            '3. Using a nearby landmark or major street\n\n' +
            'Error: ' + (dataWithoutRegion.status || 'Unknown error'),
            [{ text: 'OK', onPress: () => {} }]
          );
        }
      } else {
        console.error('Location search failed:', data);
        Alert.alert(
          'Location Not Found',
          'Could not find the location. Please try:\n\n' +
          '1. Using a more specific address\n' +
          '2. Including the city/region (e.g., "Kotei, Kumasi")\n' +
          '3. Using a nearby landmark or major street\n\n' +
          'Error: ' + (data.status || 'Unknown error'),
          [{ text: 'OK', onPress: () => {} }]
        );
      }
    } catch (error) {
      console.error('Error setting manual location:', error);
      Alert.alert(
        'Error',
        'Failed to process location. Please try again with a different address format.\n\n' +
        'Error details: ' + error.message,
        [{ text: 'OK', onPress: () => {} }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Report Incident</Text>
          <Text style={styles.headerSubtitle}>Please provide incident details</Text>
        </View>
      </View>

      <View style={styles.content}>
        <FlatList
          data={renderFormContent()}
          renderItem={({ item }) => item}
          keyExtractor={(_, index) => `form-item-${index}`}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={4}
        />
      </View>

      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationOptions}>
              <View style={styles.searchContainer}>
                <Text style={styles.label}>Location Details</Text>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter the location details (e.g., street address, landmark, area)"
                  value={manualLocation}
                  onChangeText={setManualLocation}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleManualLocationSubmit}
                >
                  <Text style={styles.submitButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper function to get icon for incident type
const getIncidentIcon = (type) => {
  switch (type) {
    case 'Fire':
      return 'flame';
    case 'Medical Emergency':
      return 'medical';
    case 'Traffic Accident':
      return 'car';
    case 'Natural Disaster':
      return 'warning';
    case 'Hazardous Material':
      return 'alert-circle';
    case 'Rescue Operation':
      return 'people';
    default:
      return 'help-circle';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  header: {
    height: '10%',
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
    height: '90%',
    padding: 10,
    paddingTop: 6,
    gap: 8,
  },
  scrollContent: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
    paddingVertical: 4,
  },
  incidentTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 6,
  },
  incidentTypeButtonActive: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  incidentTypeText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: '500',
  },
  incidentTypeTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 10,
    fontSize: 14,
    minHeight: 40,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    padding: 10,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  mediaContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    height: 50,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    height: '100%',
  },
  mediaButtonText: {
    color: '#495057',
    fontSize: 13,
    fontWeight: '500',
  },
  mediaScrollView: {
    flex: 1,
    width: '100%',
  },
  mediaPreviewItem: {
    width: 44,
    height: 44,
    marginRight: 6,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  submitButton: {
    backgroundColor: '#DC3545',
    borderRadius: 25,
    paddingVertical: 14,
    marginTop: 10,
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonContent: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#DC3545',
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
  progressText: {
    color: '#495057',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    marginVertical: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC3545',
    borderRadius: 2,
  },
  stationInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 8,
  },
  stationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
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
  locationOptions: {
    flex: 1,
    width: '100%',
  },
  searchContainer: {
    flex: 1,
    width: '100%',
  },
  locationInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    flex: 1,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#DC3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
}); 