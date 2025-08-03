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
  Linking,
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
import MapView, { Marker } from 'react-native-maps';
import {
  getCurrentLocation,
  getAddressFromCoordinates,
  searchLocationByAddress,
  calculateDistance
} from '../services/locationService';

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
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);

  // Memoize the Google Places Autocomplete query
  const googlePlacesQuery = React.useMemo(() => ({
    key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    language: 'en',
    components: 'country:gh',
    types: '(cities)',  // Limit to cities for faster results
  }), []);

  // Debounce the location search
  const debouncedSearchLocations = React.useCallback(
    debounce((place) => searchLocations(place), 300),
    []
  );

  // Debounce manual location suggestions
  const debouncedLocationSuggestions = React.useCallback(
    debounce(async (query) => {
      if (query.length < 3) {
        setLocationSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${googlePlacesQuery.key}&components=country:gh&types=geocode`
        );
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.predictions) {
          setLocationSuggestions(data.predictions.slice(0, 5)); // Limit to 5 suggestions
          setShowSuggestions(true);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Error fetching location suggestions:', error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500),
    [googlePlacesQuery.key]
  );

  // Debounced function to fetch Google Places suggestions
  const fetchPlaceSuggestions = React.useCallback(
    debounce(async (input) => {
      if (!input || input.length < 3) {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
        return;
      }
      try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:gh`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'OK' && data.predictions) {
          setPlaceSuggestions(data.predictions.slice(0, 5));
          setShowPlaceSuggestions(true);
        } else {
          setPlaceSuggestions([]);
          setShowPlaceSuggestions(false);
        }
      } catch (error) {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
      }
    }, 400),
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

  const getAddressFromGoogle = async (latitude, longitude) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return 'Location selected';
    } catch (error) {
      console.error('Google Geocoding API error:', error);
      return 'Location selected';
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

      let location;
      try {
        console.log('Attempting to get location with high accuracy...');
        // Try to get a high-accuracy location first
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000, // 15-second timeout for high accuracy
        });
      } catch (highAccuracyError) {
        console.warn('High accuracy location failed, trying with lower accuracy:', highAccuracyError.message);
        // If high accuracy fails or times out, try a less accurate but faster method
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 20000, // 20-second timeout for balanced accuracy
        });
      }
      
      if (!location || !location.coords) {
        throw new Error('Could not retrieve location. Please ensure GPS is enabled and has a clear signal.');
      }

      // Get address using Google Geocoding API
      const formattedAddress = await getAddressFromGoogle(location.coords.latitude, location.coords.longitude);

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
      await findNearestStationLocal(location.coords.latitude, location.coords.longitude);

      setShowLocationModal(false);
      Alert.alert('Success', 'Current location has been set');
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

      // Get the address for the current location using Google Geocoding API
      console.log('Getting address for location...');
      const formattedAddress = await getAddressFromGoogle(location.coords.latitude, location.coords.longitude);
      console.log('Received address:', formattedAddress);

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
      await findNearestStationLocal(location.coords.latitude, location.coords.longitude);
      
      setShowLocationModal(false);
      Alert.alert('Success', 'Current location has been set.');
    } catch (error) {
      console.error('Error processing location:', error);
      Alert.alert('Error', 'Failed to process location: ' + error.message);
    }
  };

  const findNearestStationLocal = async (latitude, longitude) => {
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
      // Request permissions before getting location and reverse geocoding
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable location permissions in settings.');
        return;
      }
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
      console.error('Error getting address from coordinates:', error);
    }
  };

  const handleImageUpload = async () => {
    try {
      // Show options to the user: Take Photo or Choose from Gallery
      Alert.alert(
        'Add Image',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              try {
                // Request camera permissions first
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                if (!cameraPermission.granted) {
                  Alert.alert(
                    'Permission Required',
                    'Camera permission is required to take photos. Please enable it in your device settings.',
                    [
                      { text: 'OK', style: 'cancel' },
                      {
                        text: 'Open Settings',
                        onPress: () => {
                          if (Platform.OS === 'ios') {
                            Linking.openURL('app-settings:');
                          } else {
                            Linking.openURL('app-settings:');
                          }
                        },
                      },
                    ]
                  );
                  return;
                }

                const cameraResult = await ImagePicker.launchCameraAsync({
                  mediaTypes: 'images',
                  allowsEditing: true,
                  quality: 0.8,
                  base64: true
                });
                if (!cameraResult.canceled) {
                  const asset = cameraResult.assets[0];
                  setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, {
                      uri: asset.uri,
                      type: 'image',
                      mimeType: asset.mimeType || 'image/jpeg',
                      base64: asset.base64
                    }]
                  }));
                }
              } catch (error) {
                console.error('Error capturing image:', error);
                Alert.alert('Error', 'Error capturing image. Please try again.');
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
    try {
      // Request media library permissions first
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaLibraryPermission.granted) {
        Alert.alert(
          'Permission Required',
          'Media library permission is required to select images. Please enable it in your device settings.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openURL('app-settings:');
                }
              },
            },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
        base64: true
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, {
            uri: asset.uri,
            type: 'image',
            mimeType: asset.mimeType || 'image/jpeg',
            base64: asset.base64
          }]
        }));
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Error selecting image. Please try again.');
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error showing image picker options:', error);
      Alert.alert('Error', 'Error showing image picker options. Please try again.');
    }
  };

  const handleVideoUpload = async () => {
    try {
      // Show options to the user: Record Video or Choose from Gallery
      Alert.alert(
        'Add Video',
        'Choose an option',
        [
          {
            text: 'Record Video',
            onPress: async () => {
              try {
                // Request camera permissions first
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                if (!cameraPermission.granted) {
                  Alert.alert(
                    'Permission Required',
                    'Camera permission is required to record videos. Please enable it in your device settings.',
                    [
                      { text: 'OK', style: 'cancel' },
                      {
                        text: 'Open Settings',
                        onPress: () => {
                          if (Platform.OS === 'ios') {
                            Linking.openURL('app-settings:');
                          } else {
                            Linking.openURL('app-settings:');
                          }
                        },
                      },
                    ]
                  );
                  return;
                }

                const cameraResult = await ImagePicker.launchCameraAsync({
                  mediaTypes: 'videos',
                  allowsEditing: true,
                  quality: 1,
                });
                if (!cameraResult.canceled) {
                  const asset = cameraResult.assets[0];
                  setFormData(prev => ({
                    ...prev,
                    videos: [...prev.videos, {
                      uri: asset.uri,
                      type: 'video',
                      mimeType: asset.mimeType || 'video/mp4'
                    }]
                  }));
                }
              } catch (error) {
                console.error('Error recording video:', error);
                Alert.alert('Error', 'Error recording video. Please try again.');
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
    try {
      // Request media library permissions first
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaLibraryPermission.granted) {
        Alert.alert(
          'Permission Required',
          'Media library permission is required to select videos. Please enable it in your device settings.',
          [
            { text: 'OK', style: 'cancel' },
            {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openURL('app-settings:');
              }
            },
            },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setFormData(prev => ({
          ...prev,
          videos: [...prev.videos, {
            uri: asset.uri,
            type: 'video',
            mimeType: asset.mimeType || 'video/mp4'
          }]
        }));
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert('Error', 'Error selecting video. Please try again.');
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error showing video picker options:', error);
      Alert.alert('Error', 'Error showing video picker options. Please try again.');
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
      
      // Clear the form data after successful submission
      setFormData({
        incidentType: '',
        location: null,
        description: '',
        images: [],
        videos: [],
        coordinates: null,
        mediaUrls: [],
      });
      setLocationAddress('');
      setNearestStation(null);
      
      // Navigate to tracking page with incident and station details
      console.log('Navigating to IncidentTracking with:', {
        incidentId,
        stationInfo: nearestStation
      });
      
      navigation.navigate('IncidentTracking', {
        incidentId,
        stationInfo: {
          latitude: nearestStation.latitude,
          longitude: nearestStation.longitude,
          station_address: nearestStation.station_address,
          station_id: nearestStation.station_id,
          station_name: nearestStation.station_name,
          station_region: nearestStation.station_region
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
      await findNearestStationLocal(location.latitude, location.longitude);

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
      findNearestStationLocal(location.latitude, location.longitude);
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
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={20} color="#DC3545" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.selectedLocationText} numberOfLines={2}>
                  {locationAddress}
                </Text>
                {nearestStation && (
                  <Text style={styles.nearestStationText}>
                    Nearest: {nearestStation.station_name}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </View>
          ) : (
            <View style={styles.selectLocation}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location-outline" size={20} color="#666" />
              </View>
              <View style={styles.selectLocationText}>
                <Text style={styles.selectLocationTitle}>Select Location</Text>
                <Text style={styles.selectLocationSubtitle}>Tap to choose location or use GPS</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Quick Current Location Button */}
        {!locationAddress && (
          <TouchableOpacity
            style={styles.quickLocationButton}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            <Ionicons name="location" size={16} color="#DC3545" />
            <Text style={styles.quickLocationText}>Use Current Location</Text>
            {loading && <ActivityIndicator size="small" color="#DC3545" />}
          </TouchableOpacity>
        )}
        
        {/* Map Preview */}
        {formData.location && (
          <View style={styles.mapPreviewContainer}>
            <MapView
              style={styles.mapPreview}
              region={{
                latitude: formData.location.latitude,
                longitude: formData.location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: formData.location.latitude,
                  longitude: formData.location.longitude,
                }}
                pinColor="red"
              />
            </MapView>
          </View>
        )}
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

      setLoading(true);

      // Use the location service to search for the location
      const locationData = await searchLocationByAddress(manualLocation);

      console.log('Found location:', locationData);

      // Update form data with the location
      setFormData(prev => ({
        ...prev,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        },
        coordinates: {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        }
      }));
      
      setLocationAddress(locationData.address);
      
      // Find nearest station using actual coordinates
      const nearest = await findNearestStationLocal(locationData.latitude, locationData.longitude);
      setNearestStation(nearest);
      
      setShowLocationModal(false);
      setManualLocation('');
      Alert.alert('Success', 'Location has been set.');
    } catch (error) {
      console.error('Error setting manual location:', error);
      Alert.alert(
        'Location Not Found',
        'Could not find the location. Please try:\n\n' +
        '1. Using a more specific address\n' +
        '2. Including the city/region (e.g., "Kotei, Kumasi")\n' +
        '3. Using a nearby landmark or major street\n\n' +
        'Error: ' + error.message,
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle manual location input changes
  const handleManualLocationChange = (text) => {
    setManualLocation(text);
    fetchPlaceSuggestions(text);
  };

  // Handle suggestion tap
  const handlePlaceSuggestionSelect = async (suggestion) => {
      setManualLocation(suggestion.description);
    setShowPlaceSuggestions(false);
    setLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&key=${apiKey}&fields=geometry,formatted_address`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.result) {
        const loc = data.result.geometry.location;
        const formattedAddress = data.result.formatted_address;
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: loc.lat,
            longitude: loc.lng
          },
          coordinates: {
            latitude: loc.lat,
            longitude: loc.lng
          }
        }));
        setLocationAddress(formattedAddress);
        await findNearestStationLocal(loc.lat, loc.lng);
        setShowLocationModal(false);
        setManualLocation('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set location. Please try again.');
    } finally {
      setLoading(false);
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
          <View style={styles.modalContentUber}>
            <View style={styles.modalHeaderUber}>
              <Text style={styles.modalTitleUber}>Set Pickup Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Manual Location Input Uber Style */}
            <View style={styles.manualInputUberContainer}>
              <Ionicons name="search-outline" size={24} color="#2563eb" style={{marginRight: 10}} />
                  <TextInput
                style={styles.manualInputUber}
                placeholder="Enter address, landmark, or area"
                    placeholderTextColor="#999"
                    value={manualLocation}
                    onChangeText={handleManualLocationChange}
                autoFocus={true}
                autoCorrect={false}
                autoCapitalize="sentences"
                underlineColorAndroid="transparent"
                selectionColor="#2563eb"
                  />
                  {manualLocation.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearInputButton}
                      onPress={() => {
                        setManualLocation('');
                      }}
                    >
                  <Ionicons name="close-circle" size={22} color="#ccc" />
                    </TouchableOpacity>
                  )}
                </View>

            {/* Confirm Location Button Uber Style */}
                      <TouchableOpacity
              style={styles.confirmLocationUberButton}
              onPress={async () => {
                if (!manualLocation.trim()) {
                  Alert.alert('Error', 'Please enter a location');
                  return;
                }
                setLoading(true);
                try {
                  // Geocode the manual location using Google Maps Geocoding API
                  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
                  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(manualLocation)}&key=${apiKey}`;
                  const response = await fetch(url);
                  const data = await response.json();
                  if (data.status === 'OK' && data.results.length > 0) {
                    const loc = data.results[0].geometry.location;
                    const formattedAddress = data.results[0].formatted_address;
                    setFormData(prev => ({
                      ...prev,
                      location: {
                        latitude: loc.lat,
                        longitude: loc.lng
                      },
                      coordinates: {
                        latitude: loc.lat,
                        longitude: loc.lng
                      }
                    }));
                    setLocationAddress(formattedAddress);
                    await findNearestStationLocal(loc.lat, loc.lng);
                    setShowLocationModal(false);
                    setManualLocation('');
                  } else {
                    Alert.alert('Location Not Found', 'Could not find the location. Please try a more specific address.');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to set location. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !manualLocation.trim()}
            >
              <Text style={styles.confirmLocationUberText}>Confirm Location</Text>
                      </TouchableOpacity>

            {/* Use Current Location Button (Uber style, only if manual input is empty) */}
            {manualLocation.length === 0 && (
              <TouchableOpacity
                style={styles.currentLocationUberButton}
                onPress={getCurrentLocation}
                disabled={loading}
              >
                <Ionicons name="locate" size={20} color="#2563eb" style={{marginRight: 8}} />
                <Text style={styles.currentLocationUberText}>Use Current Location</Text>
                {loading && <ActivityIndicator size="small" color="#2563eb" style={{marginLeft: 8}} />}
              </TouchableOpacity>
            )}

            {/* Map Preview and Address */}
              {formData.location && (
              <View style={styles.mapUberSection}>
                  <MapView
                  style={styles.mapUber}
                    region={{
                      latitude: formData.location.latitude,
                      longitude: formData.location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                  >
                    <Marker
                      coordinate={{
                        latitude: formData.location.latitude,
                        longitude: formData.location.longitude,
                      }}
                    title="Selected Location"
                      description={locationAddress}
                    pinColor="#2563eb"
                    />
                    {nearestStation && nearestStation.latitude && nearestStation.longitude && (
                      <Marker
                        coordinate={{
                          latitude: nearestStation.latitude,
                          longitude: nearestStation.longitude,
                        }}
                        title={nearestStation.station_name}
                        description="Nearest Fire Station"
                      pinColor="#DC3545"
                      />
                    )}
                  </MapView>
                <View style={styles.uberLocationInfo}>
                  <Ionicons name="location" size={18} color="#2563eb" style={{marginRight: 6}} />
                  <Text style={styles.uberLocationInfoText}>{locationAddress}</Text>
                </View>
                    {nearestStation && (
                  <Text style={styles.uberNearestStationInfo}>
                        Nearest Station: {nearestStation.station_name}
                      </Text>
                    )}
                </View>
            )}

            {showPlaceSuggestions && placeSuggestions.length > 0 && (
              <View style={styles.suggestionsUberContainer}>
                {placeSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionUberItem}
                    onPress={() => handlePlaceSuggestionSelect(item)}
                  >
                    <Ionicons name="location-outline" size={20} color="#2563eb" style={{marginRight: 10}} />
                    <View style={{flex: 1}}>
                      <Text style={styles.suggestionUberMainText}>{item.structured_formatting.main_text}</Text>
                      {item.structured_formatting.secondary_text && (
                        <Text style={styles.suggestionUberSecondaryText}>{item.structured_formatting.secondary_text}</Text>
              )}
            </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonContent: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  modalContentUber: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    alignSelf: 'center',
  },
  modalHeaderUber: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  modalTitleUber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  manualInputUberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  manualInputUber: {
    flex: 1,
    fontSize: 18,
    color: '#222',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  confirmLocationUberButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  confirmLocationUberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  currentLocationUberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f6fd',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  currentLocationUberText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 16,
  },
  mapUberSection: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
  },
  mapUber: {
    height: 180,
    width: '100%',
  },
  uberLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  uberLocationInfoText: {
    fontSize: 15,
    color: '#222',
    flex: 1,
  },
  uberNearestStationInfo: {
    fontSize: 13,
    color: '#2563eb',
    padding: 10,
    fontWeight: '500',
  },
  locationDisplayButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  locationDetails: {
    flex: 1,
  },
  selectedLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  nearestStationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectLocationText: {
    flex: 1,
  },
  selectLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectLocationSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  quickLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 8,
    gap: 8,
  },
  quickLocationText: {
    color: '#DC3545',
    fontSize: 14,
    fontWeight: '500',
  },
  mapPreviewContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  mapPreview: {
    height: 120,
    width: '100%',
  },
  suggestionsUberContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionUberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionUberMainText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  suggestionUberSecondaryText: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
}); 