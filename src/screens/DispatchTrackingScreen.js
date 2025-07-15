import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '../context/AuthContext';

export default function DispatchTrackingScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { incidentId } = route.params;
  const [incident, setIncident] = useState(null);
  const [incidentLocation, setIncidentLocation] = useState(null);
  const [dispatcherLocation, setDispatcherLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const notificationSound = useRef();
  const { user: currentUser } = useAuth ? useAuth() : { user: null };

  useEffect(() => {
    loadTrackingData();
  }, [incidentId]);

  useEffect(() => {
    // Load notification sound
    (async () => {
      notificationSound.current = new Audio.Sound();
      try {
        await notificationSound.current.loadAsync(require('../assets/sounds/notification.mp3.wav'));
      } catch (e) { /* handle error */ }
    })();
    return () => {
      if (notificationSound.current) notificationSound.current.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (!incidentId || !currentUser) return;
    // Subscribe to new chat messages for this incident
    const subscription = supabase
      .channel('chat-messages-' + incidentId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `incident_id=eq.${incidentId}`
      }, async (payload) => {
        // Only count as unread if not sent by current user and chat is not open
        if (payload.new.sender_id !== currentUser.id && !chatOpen) {
          setUnreadCount((prev) => prev + 1);
          if (notificationSound.current) {
            try { await notificationSound.current.replayAsync(); } catch (e) {}
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [incidentId, currentUser, chatOpen]);

  useEffect(() => {
    if (!incidentId || !currentUser) return;
    // Fetch unread count from DB
    const fetchUnread = async () => {
      const { data, error } = await supabase.rpc('count_unread_messages', {
        incident_id_param: incidentId,
        user_id_param: currentUser.id
      });
      if (!error && data) setUnreadCount(data);
    };
    fetchUnread();
  }, [incidentId, currentUser]);

  const handleOpenChat = async () => {
    setChatOpen(true);
    navigation.navigate('IncidentChat', { incidentId, onChatClose: () => setChatOpen(false) });
    // Mark all messages as read for this user
    await supabase.rpc('mark_messages_read', {
      incident_id_param: incidentId,
      user_id_param: currentUser.id
    });
    setUnreadCount(0);
  };

  const loadTrackingData = async () => {
    setLoading(true);
    try {
      // Fetch incident details
      const { data: incidentData, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single();
      if (incidentError || !incidentData) throw incidentError || new Error('Incident not found');
      setIncident(incidentData);
      // Parse incident location
      let incLoc = null;
      if (incidentData.location) {
        const coords = incidentData.location.split(',');
        if (coords.length === 2) {
          incLoc = {
            latitude: parseFloat(coords[0]),
            longitude: parseFloat(coords[1]),
          };
        }
      }
      setIncidentLocation(incLoc);
      // Fetch dispatcher location
      let dispLoc = null;
      if (incidentData.dispatcher_id) {
        const { data: dispatcherData } = await supabase
          .from('dispatcher_locations')
          .select('latitude, longitude')
          .eq('dispatcher_id', incidentData.dispatcher_id)
          .single();
        if (dispatcherData) {
          dispLoc = {
            latitude: parseFloat(dispatcherData.latitude),
            longitude: parseFloat(dispatcherData.longitude),
          };
        }
      }
      setDispatcherLocation(dispLoc);
      // Fetch route from Google Directions API
      if (dispLoc && incLoc) {
        const apiKey = 'AIzaSyBUNUKncuC9GT6h4U-nDdjOea4-P7F_w4E';
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${dispLoc.latitude},${dispLoc.longitude}&destination=${incLoc.latitude},${incLoc.longitude}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setRouteCoordinates(points);
        }
      }
    } catch (error) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };

  function decodePolyline(encoded) {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={{ marginTop: 16 }}>Loading tracking map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: incidentLocation?.latitude || 0,
          longitude: incidentLocation?.longitude || 0,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* Incident Marker */}
        {incidentLocation && (
          <Marker
            coordinate={incidentLocation}
            title="Incident"
            pinColor="red"
          />
        )}
        {/* Dispatcher Marker */}
        {dispatcherLocation && (
          <Marker
            coordinate={dispatcherLocation}
            title="Dispatcher"
            pinColor="blue"
          />
        )}
        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF3B30"
            strokeWidth={8}
          />
        )}
      </MapView>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={handleOpenChat}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: 'red',
            borderRadius: 10,
            width: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 30,
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chatButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: '#2563eb',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 20,
  },
}); 