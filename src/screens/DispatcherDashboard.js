import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';

const DispatcherDashboard = () => {
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [dispatcherName, setDispatcherName] = useState('');
  const [stationId, setStationId] = useState('');
  const navigation = useNavigation();
  const { signOut } = useAuth();

  useEffect(() => {
    fetchActiveIncidents();
    fetchDispatcherInfo();
  }, []);

  const fetchActiveIncidents = async () => {
    setRefreshing(true);
    try {
      const dispatcherId = await AsyncStorage.getItem('userId');
      if (!dispatcherId) {
        setActiveIncidents([]);
        setRefreshing(false);
        return;
      }
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('dispatcher_id', dispatcherId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActiveIncidents(data || []);
    } catch (err) {
      setActiveIncidents([]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDispatcherInfo = async () => {
    try {
      const dispatcherData = await AsyncStorage.getItem('dispatcherData');
      if (dispatcherData) {
        const dispatcher = JSON.parse(dispatcherData);
        setDispatcherName(dispatcher.name || '');
        setStationId(dispatcher.station_id || '');
      }
    } catch (err) {
      setDispatcherName('');
      setStationId('');
    }
  };

  const onRefresh = () => {
    fetchActiveIncidents();
  };

  const handleViewIncident = (incident) => {
    navigation.navigate('DispatchTrackingScreen', { incidentId: incident.id, incident });
  };

  const handleTrackIncident = () => {
    const incident = activeIncidents.find((i) => i.id === selectedIncidentId);
    if (incident) {
      navigation.navigate('DispatchTrackingScreen', { incidentId: incident.id, incident });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome!</Text>
          {dispatcherName ? (
            <Text style={styles.dispatcherInfo}>
              {dispatcherName} {stationId ? `| Station ID: ${stationId}` : ''}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color="#DC3545" />
        </TouchableOpacity>
      </View>

      {/* Incident Picker Card */}
      <View style={styles.pickerCard}>
        <Text style={styles.pickerLabel}>Select Incident to Track</Text>
        <Picker
          selectedValue={selectedIncidentId}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedIncidentId(itemValue)}
          enabled={activeIncidents.length > 0}
        >
          <Picker.Item label="Select Incident" value="" />
          {activeIncidents.map((incident) => (
            <Picker.Item
              key={incident.id}
              label={`${incident.type || incident.incident_type || 'Incident'} (${incident.location})`}
              value={incident.id}
            />
          ))}
        </Picker>
        <TouchableOpacity
          style={[styles.trackButton, { opacity: selectedIncidentId ? 1 : 0.5 }]}
          onPress={handleTrackIncident}
          disabled={!selectedIncidentId}
        >
          <Ionicons name="navigate" size={24} color="#fff" />
          <Text style={styles.trackButtonText}>Track Incident</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('DispatchNewIncidentScreen')}>
          <Ionicons name="add-circle" size={32} color="#34C759" />
          <Text style={styles.actionText}>New Incident</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('DispatchIncidentHistory')}>
          <Ionicons name="time" size={32} color="#FF9500" />
          <Text style={styles.actionText}>Incident History</Text>
        </TouchableOpacity>
      </View>

      {/* Active Incidents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Incidents</Text>
        <ScrollView
          style={styles.incidentsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeIncidents.length === 0 ? (
            <Text style={styles.noIncidents}>No active incidents</Text>
          ) : (
            activeIncidents.map((incident) => (
              <TouchableOpacity
                key={incident.id}
                style={styles.incidentCard}
                onPress={() => handleViewIncident(incident)}
              >
                <View style={styles.incidentHeader}>
                  <Text style={styles.incidentType}>{incident.type || incident.incident_type || 'Incident'}</Text>
                  <Text style={styles.incidentTime}>
                    {new Date(incident.created_at).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.incidentLocation}>{incident.location}</Text>
                <Text style={styles.incidentDescription} numberOfLines={2}>
                  {incident.description}
                </Text>
                <View style={styles.incidentFooter}>
                  <Text style={styles.incidentStatus}>
                    Status: {incident.status}
                  </Text>
                  <Text style={styles.incidentPriority}>
                    Priority: {incident.priority || 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  stationText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  section: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000000',
  },
  incidentsList: {
    flex: 1,
  },
  noIncidents: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    marginTop: 20,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  incidentTime: {
    fontSize: 14,
    color: '#666666',
  },
  incidentLocation: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
  },
  incidentDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentStatus: {
    fontSize: 14,
    color: '#34C759',
  },
  incidentPriority: {
    fontSize: 14,
    color: '#FF3B30',
  },
  pickerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  picker: {
    width: '100%',
    minWidth: 200,
    marginBottom: 12,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 4,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  dispatcherInfo: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
});

export default DispatcherDashboard; 