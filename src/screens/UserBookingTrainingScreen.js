import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { createTrainingBooking, getStations } from '../services/trainingBookings';
import { getCurrentUser } from '../services/auth';
import { getCurrentLocation, calculateDistance, findNearestStation } from '../services/locationService';
import Modal from 'react-native-modal';
import { useFocusEffect } from '@react-navigation/native';

const UserBookingTrainingScreen = ({ navigation }) => {
  const [companyName, setCompanyName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedStation, setSelectedStation] = useState(null);
  const [stations, setStations] = useState([]);
  const [participants, setParticipants] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSelectingStation, setAutoSelectingStation] = useState(false);
  const [locationFetched, setLocationFetched] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    const autoSelectNearestStation = async () => {
      if (!selectedStation && !locationFetched) {
        setAutoSelectingStation(true);
        try {
          const coords = await getCurrentLocation();
          const nearest = await findNearestStation(coords.latitude, coords.longitude);
          if (nearest) {
            setSelectedStation(nearest);
          }
        } catch (err) {
          setError('Could not auto-select nearest station. You can select manually.');
        } finally {
          setAutoSelectingStation(false);
          setLocationFetched(true);
        }
      }
    };
    autoSelectNearestStation();
  }, [selectedStation, locationFetched]);

  const loadStations = async () => {
    try {
      const { data, error } = await getStations();
      if (error) throw error;
      console.log('Loaded stations:', data);
      setStations(data || []);  // Ensure we always set an array
    } catch (err) {
      console.error('Failed to load stations:', err);
      setError('Failed to load stations. Please try again later.');
      setStations([]);  // Set empty array on error
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date && event.type !== 'dismissed') {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(false);
    if (time && event.type !== 'dismissed') {
      setSelectedTime(time);
    }
  };

  const showPicker = (type) => {
    if (type === 'date') {
      setShowDatePicker(true);
    } else {
      setShowTimePicker(true);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleStationSelect = (station) => {
    if (!station) return;
    setSelectedStation(station);
    setShowStationModal(false);
  };

  const handleBooking = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate inputs
      if (!selectedStation) {
        setError('Please select a station');
        return;
      }

      // Log the selected station before processing
      console.log('Selected station before booking:', {
        station: selectedStation,
        station_id: selectedStation.station_id,
        station_id_type: typeof selectedStation.station_id,
        station_id_value: selectedStation.station_id
      });

      // Ensure station_id is a string and matches a valid station
      const stationId = String(selectedStation.station_id);
      const validStation = stations.find(s => String(s.station_id) === stationId);
      
      if (!validStation) {
        console.error('Invalid station selected:', {
          selected_station_id: stationId,
          available_stations: stations.map(s => s.station_id)
        });
        throw new Error('Invalid station selected');
      }

      console.log('Using station_id:', {
        value: stationId,
        type: typeof stationId,
        original: selectedStation.station_id,
        valid_station: validStation
      });

      // Get current user
      const { data: userData, error: userError } = await getCurrentUser();
      if (userError) throw userError;

      // Create booking data
      const bookingData = {
        user_id: userData.user.id,
        station_id: stationId, // Use the validated string version
        company_name: companyName.trim() ? companyName.trim() : 'Individual',
        training_date: selectedDate.toISOString().split('T')[0],
        training_time: selectedTime.toLocaleTimeString('en-US', { 
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        num_participants: participants
      };

      console.log('Creating booking with data:', bookingData);

      // Create booking
      const { data, error } = await createTrainingBooking(bookingData);
      if (error) {
        console.error('Booking creation error:', {
          error,
          booking_data: bookingData,
          selected_station: selectedStation
        });
        throw error;
      }

      // Show success message and navigate to bookings
      Alert.alert(
        'Booking Successful',
        'Your training session has been booked successfully. You will receive a confirmation soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('UserNotifications', { showBookings: true })
          }
        ]
      );
    } catch (error) {
      console.error('Booking error:', error);
      setError('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setCompanyName('');
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setSelectedStation(null);
      setParticipants(1);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setLoading(false);
      setError('');
      setAutoSelectingStation(false);
      setLocationFetched(false);
      setShowStationModal(false);
      loadStations();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Training Session</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>
          Schedule a fire safety education session with our firefighters
        </Text>

        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="business" size={24} color="#666" />
            <Text style={styles.label}>Company Name</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter company name (if applicable)"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <Text style={styles.helperText}>
            Leave blank for personal or residential training
          </Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="calendar" size={24} color="#666" />
            <Text style={styles.label}>Select Date</Text>
          </View>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => showPicker('date')}
          >
            <Text style={styles.pickerButtonText}>
              {formatDate(selectedDate)}
            </Text>
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="time" size={24} color="#666" />
            <Text style={styles.label}>Select Time</Text>
          </View>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => showPicker('time')}
          >
            <Text style={styles.pickerButtonText}>
              {formatTime(selectedTime)}
            </Text>
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {(showDatePicker || showTimePicker) && (
          <DateTimePicker
            value={showDatePicker ? selectedDate : selectedTime}
            mode={showDatePicker ? 'date' : 'time'}
            is24Hour={false}
            onChange={showDatePicker ? handleDateChange : handleTimeChange}
            minimumDate={showDatePicker ? new Date() : undefined}
          />
        )}

        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="location" size={24} color="#666" />
            <Text style={styles.label}>Pick Station</Text>
          </View>
          <View style={styles.selectedStationBox}>
            <Text style={styles.selectedStationText}>
              {autoSelectingStation
                ? 'Detecting nearest station...'
                : selectedStation
                  ? `${selectedStation.station_name} (${selectedStation.station_id})`
                  : 'No station selected'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.changeButton, autoSelectingStation && styles.disabledButton]}
            onPress={() => setShowStationModal(true)}
            disabled={autoSelectingStation}
          >
            <Text style={styles.changeButtonText}>Change Station</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="people" size={24} color="#666" />
            <Text style={styles.label}>Number of participants</Text>
          </View>
          <View style={styles.participantsContainer}>
            <TouchableOpacity
              style={styles.participantButton}
              onPress={() => participants > 1 && setParticipants(participants - 1)}
            >
              <Text style={styles.participantButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.participantCount}>{participants}</Text>
            <TouchableOpacity
              style={styles.participantButton}
              onPress={() => participants < 20 && setParticipants(participants + 1)}
            >
              <Text style={styles.participantButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.maxParticipants}>(Max 20)</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#0891b2" />
          <Text style={styles.infoText}>
            All sessions are 90 minutes long.{'\n'}
            Please arrive 10mins early.{'\n'}
            Training materials will be provided.
          </Text>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleBooking}
          loading={loading}
          disabled={loading || !selectedStation}
          style={styles.bookButton}
          contentStyle={styles.bookButtonContent}
        >
          {loading ? 'Booking...' : 'Book Training Session'}
        </Button>
      </ScrollView>

      <Modal
        isVisible={showStationModal}
        onBackdropPress={() => setShowStationModal(false)}
        onBackButtonPress={() => setShowStationModal(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select a Station</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {stations.map((station) => (
              <TouchableOpacity
                key={station.station_id}
                style={styles.stationItem}
                onPress={() => handleStationSelect(station)}
              >
                <Text style={styles.stationName}>{station.station_name}</Text>
                <Text style={styles.stationAddress}>{station.station_address}</Text>
                <Text style={styles.stationRegion}>{station.station_region}</Text>
                <Text style={styles.stationId}>Station ID: {station.station_id}</Text>
                {station.distance !== undefined && (
                  <Text style={styles.stationDistance}>{station.distance.toFixed(2)} km away</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowStationModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  changeButton: {
    marginTop: 10,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#2196f3',
    borderRadius: 5,
    alignItems: 'center',
  },
  picker: {
    height: 50,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantButtonText: {
    fontSize: 24,
    color: '#000',
  },
  participantCount: {
    fontSize: 20,
    marginHorizontal: 16,
  },
  maxParticipants: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#0891b2',
    marginLeft: 8,
    flex: 1,
  },
  bookButton: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    marginBottom: 24,
  },
  bookButtonContent: {
    height: 50,
  },
  errorText: {
    color: '#DC3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedStationBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    minHeight: 48,
    justifyContent: 'center',
  },
  selectedStationText: {
    fontSize: 16,
    color: '#333',
  },
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stationItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stationAddress: {
    fontSize: 14,
    color: '#666',
  },
  stationRegion: {
    fontSize: 14,
    color: '#666',
  },
  stationId: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ddd',
  },
  stationDistance: {
    fontSize: 14,
    color: '#0891b2',
  },
});

export default UserBookingTrainingScreen;