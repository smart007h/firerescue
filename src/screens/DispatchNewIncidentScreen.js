import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const DispatchNewIncidentScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    incident_type: '',
    description: '',
    location: '',
    station_id: '',
  });
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const { data, error } = await supabase
        .from('firefighters')
        .select('id, station_id, station_name, station_address')
        .eq('is_active', true)
        .order('station_name');

      if (error) throw error;
      setStations(data || []);
    } catch (error) {
      console.error('Error loading stations:', error);
      Alert.alert('Error', 'Failed to load fire stations');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get current location');
        return;
      }

      // Get current position
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Get address from coordinates
      let address = `${latitude},${longitude}`;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        
        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = `${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        }
      } catch (geocodeError) {
        console.log('Geocoding failed, using coordinates');
      }

      setFormData(prev => ({ ...prev, location: address }));
      setCurrentLocation({ latitude, longitude });
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log('Form data before validation:', formData);
    
    // Validate form
    if (!formData.incident_type.trim()) {
      Alert.alert('Validation Error', 'Please select an incident type');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }
    if (!formData.location.trim()) {
      Alert.alert('Validation Error', 'Please enter a location');
      return;
    }
    if (!formData.station_id) {
      Alert.alert('Validation Error', 'Please select a fire station');
      return;
    }

    try {
      setLoading(true);
      console.log('Creating incident with data:', formData);

      // Get dispatcher info
      const dispatcherId = await AsyncStorage.getItem('userId');
      if (!dispatcherId) {
        Alert.alert('Error', 'Dispatcher not found. Please log in again.');
        return;
      }

      // Get current user from Supabase auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert('Error', 'Authentication error. Please log in again.');
        return;
      }

      // Create incident
      const incidentData = {
        incident_type: formData.incident_type,
        description: formData.description.trim(),
        location: formData.location.trim(),
        media_urls: [], // Empty array for media URLs
        reported_by: user.id, // The authenticated user (dispatcher) who is creating this incident
        station_id: formData.station_id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dispatcher_id: dispatcherId,
      };

      console.log('Inserting incident data:', incidentData);

      const { data, error } = await supabase
        .from('incidents')
        .insert([incidentData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Incident created successfully:', data);

      Alert.alert(
        'Success',
        'Incident created successfully and sent to the fire station for approval.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                incident_type: '',
                description: '',
                location: '',
                station_id: '',
              });
              // Navigate back to dashboard
              navigation.goBack();
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error creating incident:', error);
      Alert.alert('Error', `Failed to create incident: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const incidentTypes = [
    { label: 'Select Incident Type', value: '' },
    { label: 'Fire', value: 'fire' },
    { label: 'Medical Emergency', value: 'medical' },
    { label: 'Vehicle Accident', value: 'accident' },
    { label: 'Rescue Operation', value: 'rescue' },
    { label: 'Hazard', value: 'hazard' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Incident</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Debug info - remove in production */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>
                Incident Type: {formData.incident_type || 'None selected'}
              </Text>
              <Text style={styles.debugText}>
                Station ID: {formData.station_id || 'None selected'}
              </Text>
              <Text style={styles.debugText}>
                Stations loaded: {stations.length}
              </Text>
            </View>
          )}

          {/* Incident Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Incident Type *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.incident_type}
                style={styles.picker}
                onValueChange={(value) => {
                  console.log('Selected incident type:', value);
                  setFormData(prev => ({ ...prev, incident_type: value }));
                }}
                mode="dropdown"
                enabled={true}
              >
                {incidentTypes.map((type) => (
                  <Picker.Item 
                    key={type.value} 
                    label={type.label} 
                    value={type.value}
                    color={type.value === '' ? '#999' : '#000'}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.textArea}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter detailed description of the incident..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <View style={styles.locationHeader}>
              <Text style={styles.label}>Location *</Text>
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={locationLoading}
              >
                <Ionicons 
                  name={locationLoading ? "hourglass" : "location"} 
                  size={20} 
                  color="#DC3545" 
                />
                <Text style={styles.locationButtonText}>
                  {locationLoading ? 'Getting...' : 'Current Location'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              placeholder="Enter incident location or address..."
              multiline
            />
          </View>

          {/* Fire Station */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Assign to Fire Station *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.station_id}
                style={styles.picker}
                onValueChange={(value) => {
                  console.log('Selected station:', value);
                  setFormData(prev => ({ ...prev, station_id: value }));
                }}
                mode="dropdown"
                enabled={true}
              >
                <Picker.Item 
                  label="Select Fire Station" 
                  value="" 
                  color="#999"
                />
                {stations.map((station) => (
                  <Picker.Item 
                    key={station.id} 
                    label={`${station.station_name} - ${station.station_address}`} 
                    value={station.station_id}
                    color="#000"
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating Incident...' : 'Create Incident'}
            </Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 0 : 8,
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
    width: '100%',
    color: '#2D3748',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    minHeight: 50,
    color: '#2D3748',
    textAlignVertical: 'top',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#2D3748',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  locationButtonText: {
    marginLeft: 4,
    color: '#DC3545',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 56,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Debug styles - remove in production
  debugContainer: {
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
});

export default DispatchNewIncidentScreen;
