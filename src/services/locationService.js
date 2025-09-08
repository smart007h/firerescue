import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';
import { getNetworkErrorMessage, isConnectionError } from '../utils/errorHandler';

// Get the API key from Expo Constants or environment variables
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || 
                           Constants.manifest?.extra?.googleMapsApiKey ||
                           process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Check if Google Maps API key is available
const hasGoogleMapsKey = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key';

if (!hasGoogleMapsKey) {
  console.warn('Google Maps API key not found. Using fallback location services.');
} else {
  console.log('✅ Google Maps API key loaded successfully');
}

export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
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

    const { latitude, longitude } = location.coords;
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Invalid coordinates received');
    }

    return {
      latitude,
      longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    if (isConnectionError(error)) {
      throw new Error(getNetworkErrorMessage(error));
    }
    throw error;
  }
};

export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    console.log(`Getting address for coordinates: ${latitude}, ${longitude}`);
    
    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates provided');
    }
    
    // Request permissions before reverse geocoding
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission denied, falling back to coordinates display');
      return `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    
    // Try Google Maps API first if available
    if (hasGoogleMapsKey) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&region=gh`,
          { timeout: 5000 }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const address = data.results[0].formatted_address;
            console.log(`Google Maps address found: ${address}`);
            return address;
          }
        }
      } catch (googleError) {
        console.warn('Google Maps geocoding failed:', googleError.message);
        if (isConnectionError(googleError)) {
          console.warn('Network error during Google Maps geocoding');
        }
      }
    }
    
    // Fall back to Expo Location reverse geocoding
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (address) {
        const formattedAddress = [
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        
        if (formattedAddress) {
          console.log(`Expo reverse geocoding address found: ${formattedAddress}`);
          return formattedAddress;
        }
      }
    } catch (reverseGeocodeError) {
      console.warn('Expo reverse geocoding failed:', reverseGeocodeError.message);
    }

    // Final fallback to coordinates with better formatting
    const coordinateString = `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    console.log(`Using coordinate fallback: ${coordinateString}`);
    return coordinateString;
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    return `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
};

export const searchLocationByAddress = async (address) => {
  try {
    if (!hasGoogleMapsKey) {
      throw new Error('Google Maps API key not configured. Please add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file');
    }

    const searchQuery = address.toLowerCase().includes('ghana') 
      ? address 
      : `${address}, Ghana`;

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_API_KEY}&region=gh`
    );
    
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const formattedAddress = data.results[0].formatted_address;

      return {
        latitude: location.lat,
        longitude: location.lng,
        address: formattedAddress,
      };
    }

    throw new Error('Location not found');
  } catch (error) {
    console.error('Error searching location:', error);
    if (isConnectionError(error)) {
      throw new Error(getNetworkErrorMessage(error));
    }
    throw error;
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

export const findNearestStation = async (latitude, longitude) => {
  try {
    const { data: stations, error } = await supabase
      .from('firefighters')
      .select('id, station_id, station_name, station_address, station_region, latitude, longitude, station_contact')
      .eq('is_active', true);

    if (error) throw error;
    if (!stations?.length) throw new Error('No fire stations found');

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

        if (distance < minDistance) {
          minDistance = distance;
          nearestStation = { ...station, distance };
        }
      }
    });

    if (!nearestStation) {
      throw new Error('No valid fire stations found');
    }

    return nearestStation;
  } catch (error) {
    console.error('Error finding nearest station:', error);
    throw error;
  }
};

export const isInKumasiArea = (latitude, longitude) => {
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