import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NewIncidentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    description: '',
    priority: 'medium',
    status: 'active',
  });
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeoutRef = useRef(null);

  // Simple debounce function
  const debounce = (func, delay) => {
    return (...args) => {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => func.apply(this, args), delay);
    };
  };

  // Function to fetch Google Places suggestions
  const fetchLocationSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not found');
        return;
      }
      
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&components=country:gh&types=geocode`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        setLocationSuggestions(data.predictions.slice(0, 5));
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
  };

  // Debounced version of the fetch function
  const debouncedFetchSuggestions = useCallback(
    debounce(fetchLocationSuggestions, 400),
    []
  );

  const handleLocationChange = (text) => {
    setFormData({ ...formData, location: text });
    debouncedFetchSuggestions(text);
  };

  const handleSuggestionSelect = (suggestion) => {
    setFormData({ ...formData, location: suggestion.description });
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!formData.type || !formData.location || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Get authenticated user UUID
      const { data: { user } } = await supabase.auth.getUser();
      const dispatcherUUID = user?.id;
      // Check dispatcher record exists
      const { data: dispatcher, error: dispatcherError } = await supabase
        .from('dispatchers')
        .select('*')
        .eq('id', dispatcherUUID)
        .single();
      if (dispatcherError || !dispatcher) {
        Alert.alert('Error', 'Dispatcher record not found or mismatched.');
        setLoading(false);
        return;
      }
      // Create the incident
      const { data, error } = await supabase
        .from('incidents')
        .insert([
          {
            type: formData.type,
            location: formData.location,
            description: formData.description,
            priority: formData.priority,
            status: formData.status,
            station_id: dispatcher.station_id,
            reported_by: dispatcherUUID,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Incident created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating incident:', error);
      Alert.alert('Error', 'Failed to create incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
        </TouchableOpacity>
        <Text style={styles.title}>New Incident</Text>
      </View>

      <ScrollView style={styles.form}>
        <TextInput
          label="Incident Type *"
          value={formData.type}
          onChangeText={(text) => setFormData({ ...formData, type: text })}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.locationContainer}>
          <TextInput
            label="Location *"
            value={formData.location}
            onChangeText={handleLocationChange}
            mode="outlined"
            style={styles.input}
            placeholder="Start typing an address or location..."
          />
          
          {showSuggestions && locationSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {locationSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.suggestionIcon} />
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionMainText}>
                      {item.structured_formatting.main_text}
                    </Text>
                    {item.structured_formatting.secondary_text && (
                      <Text style={styles.suggestionSecondaryText}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TextInput
          label="Description *"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <View style={styles.priorityContainer}>
          <Text style={styles.priorityLabel}>Priority:</Text>
          <View style={styles.priorityButtons}>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                formData.priority === 'low' && styles.priorityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, priority: 'low' })}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  formData.priority === 'low' && styles.priorityButtonTextActive,
                ]}
              >
                Low
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                formData.priority === 'medium' && styles.priorityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, priority: 'medium' })}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  formData.priority === 'medium' && styles.priorityButtonTextActive,
                ]}
              >
                Medium
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                formData.priority === 'high' && styles.priorityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, priority: 'high' })}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  formData.priority === 'high' && styles.priorityButtonTextActive,
                ]}
              >
                High
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          Create Incident
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  locationContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 1001,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  priorityContainer: {
    marginBottom: 24,
  },
  priorityLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#000000',
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  priorityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priorityButtonText: {
    textAlign: 'center',
    color: '#000000',
  },
  priorityButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    marginTop: 16,
    padding: 8,
  },
});

export default NewIncidentScreen;