import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '../config/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshContext } from '../../App';

const BookTrainingsScreen = ({ navigation }) => {
  const { refreshApp } = useContext(RefreshContext);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [trainingDate, setTrainingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingStations, setIsLoadingStations] = useState(true);

  const fetchStations = useCallback(async () => {
    try {
      setIsLoadingStations(true);
      setError('');
      
      console.log('Fetching stations from database...');
      const { data, error: fetchError } = await supabase
        .from('firefighters')
        .select('station_id, station_name, station_address, station_region')
        .eq('is_active', true);

      if (fetchError) {
        console.error('Get stations error:', fetchError);
        throw fetchError;
      }

      console.log('Fetched stations data:', {
        count: data?.length,
        sample: data?.[0],
        all_stations: data
      });

      const stationsData = Array.isArray(data) ? data : [];
      setStations(stationsData);
      
    } catch (err) {
      console.error('Failed to load stations:', err);
      setError('Failed to load training stations. Please try again later.');
      setStations([]);
    } finally {
      setIsLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const handleStationSelect = (station) => {
    if (!station) return;
    
    // Validate that the station has a valid station_id
    if (!station.station_id || typeof station.station_id !== 'string') {
      console.error('Invalid station selected:', {
        station,
        station_id: station.station_id,
        station_id_type: typeof station.station_id
      });
      setError('Invalid station selected');
      return;
    }

    // Ensure station_id is a string and matches the format we expect (e.g., "FS001")
    if (!/^FS\d{3}$/.test(station.station_id)) {
      console.error('Invalid station_id format:', {
        station_id: station.station_id,
        expected_format: 'FS###'
      });
      setError('Invalid station format');
      return;
    }

    console.log('Selected station details:', {
      station,
      station_id: station.station_id,
      station_id_type: typeof station.station_id,
      station_id_value: station.station_id
    });
    
    setSelectedStation(station);
    setShowStationPicker(false);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTrainingDate(selectedDate);
    }
  };

  const handleBookTraining = async () => {
    if (!selectedStation) {
      setError('Please select a station');
      return;
    }

    // Validate station_id format
    if (!/^FS\d{3}$/.test(selectedStation.station_id)) {
      console.error('Invalid station_id format:', {
        station_id: selectedStation.station_id,
        expected_format: 'FS###'
      });
      setError('Invalid station format');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Get the current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) throw new Error('No authenticated user found');

      // Log the selected station details
      console.log('Selected station details:', {
        station: selectedStation,
        station_id: selectedStation.station_id,
        station_id_type: typeof selectedStation.station_id,
        station_id_value: selectedStation.station_id
      });

      // Ensure station_id is a string and matches our expected format
      const stationId = String(selectedStation.station_id);
      if (!/^FS\d{3}$/.test(stationId)) {
        throw new Error('Invalid station ID format');
      }

      console.log('Processed station_id:', {
        original: selectedStation.station_id,
        converted: stationId,
        type: typeof stationId
      });
      
      const bookingData = {
        user_id: session.user.id,
        station_id: stationId,
        training_date: trainingDate.toISOString().split('T')[0],
        training_time: trainingDate.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        status: 'pending',
        num_participants: 1
      };

      console.log('Creating booking with data:', bookingData);
      
      const { error: bookingError } = await supabase
        .from('training_bookings')
        .insert([bookingData]);

      if (bookingError) {
        console.error('Booking error details:', {
          code: bookingError.code,
          message: bookingError.message,
          details: bookingError.details,
          hint: bookingError.hint,
          booking_data: bookingData
        });
        throw bookingError;
      }

      Alert.alert(
        'Success',
        'Training session booked successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              refreshApp();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Booking error:', err);
      setError('Failed to book training session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStationsList = () => {
    if (isLoadingStations) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading stations...</Text>
        </View>
      );
    }

    if (stations.length === 0) {
      return (
        <View style={styles.noStationsContainer}>
          <Text style={styles.noStationsText}>No stations available</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              fetchStations();
              refreshApp();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView>
        {stations.map((station) => (
          <TouchableOpacity
            key={station.station_id}
            style={[
              styles.stationItem,
              selectedStation?.station_id === station.station_id && styles.selectedStationItem
            ]}
            onPress={() => handleStationSelect(station)}
          >
            <Text style={styles.stationName}>{station.station_name}</Text>
            <Text style={styles.stationAddress}>{station.station_address}</Text>
            <Text style={styles.stationRegion}>{station.station_region}</Text>
            <Text style={styles.stationId}>Station ID: {station.station_id}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Book Training Session</Text>

        {/* Station Selection */}
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setShowStationPicker(true)}
          disabled={isLoadingStations}
        >
          <Text style={styles.label}>Select Station</Text>
          <Text style={styles.selectedText}>
            {selectedStation ? selectedStation.station_name : 'Tap to select a station'}
          </Text>
        </TouchableOpacity>

        {/* Station Picker Modal */}
        <Modal
          visible={showStationPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStationPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select a Station</Text>
              {renderStationsList()}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowStationPicker(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Date Selection */}
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.label}>Training Date</Text>
          <Text style={styles.selectedText}>
            {trainingDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={trainingDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.bookButton, loading && styles.disabledButton]}
          onPress={handleBookTraining}
          disabled={loading}
        >
          <Text style={styles.bookButtonText}>
            {loading ? 'Booking...' : 'Book Training'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  selectedText: {
    fontSize: 18,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  stationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  stationRegion: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noStationsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noStationsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedStationItem: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  stationId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default BookTrainingsScreen; 