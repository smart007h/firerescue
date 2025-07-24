import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { TextInput } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TrackingMapScreen = ({ route, navigation }) => {
  const { incident } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    setupRealtimeSubscription();
    // In a real app, you would get the actual route coordinates from a routing service
    // For demo purposes, we'll use some sample coordinates
    setRouteCoordinates([
      { latitude: 10.7853, longitude: -0.8513 }, // Bolgatanga coordinates
      { latitude: 10.7853, longitude: -0.8513 }, // Incident location
    ]);
    setCurrentLocation({ latitude: 10.7853, longitude: -0.8513 });
  }, []);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_messages')
        .select('*')
        .eq('incident_id', incident.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('incident_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incident_messages',
          filter: `incident_id=eq.${incident.id}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const dispatcherData = await AsyncStorage.getItem('dispatcherData');
      const dispatcher = JSON.parse(dispatcherData);

      const { error } = await supabase.from('incident_messages').insert([
        {
          incident_id: incident.id,
          sender_id: dispatcher.dispatcher_id,
          sender_name: dispatcher.name,
          message: newMessage.trim(),
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const dispatcherData = JSON.parse(AsyncStorage.getItem('dispatcherData'));
    const isDispatcher = item.sender_id === dispatcherData.dispatcher_id;

    return (
      <View
        style={[
          styles.messageContainer,
          isDispatcher ? styles.dispatcherMessage : styles.userMessage,
        ]}
      >
        <Text style={styles.senderName}>{item.sender_name}</Text>
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ fontSize: 24, color: '#000' }}>&lt; Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Track Incident</Text>
        <Text style={styles.incidentType}>{incident.type}</Text>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker
          coordinate={currentLocation}
          title="Dispatcher Location"
          pinColor="#007AFF"
        />
        <Marker
          coordinate={{
            latitude: routeCoordinates[1].latitude,
            longitude: routeCoordinates[1].longitude,
          }}
          title="Incident Location"
          pinColor="#FF3B30"
        />
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#007AFF"
          strokeWidth={3}
        />
      </MapView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
        />
        <View style={styles.inputContainer}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            style={styles.input}
            mode="outlined"
            right={
              <TextInput.Icon
                icon="send"
                onPress={sendMessage}
                disabled={!newMessage.trim()}
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
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
    flex: 1,
  },
  incidentType: {
    fontSize: 16,
    color: '#666666',
  },
  map: {
    flex: 1,
  },
  chatContainer: {
    height: 300,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  dispatcherMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  senderName: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000000',
  },
  timestamp: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
});

export default TrackingMapScreen;