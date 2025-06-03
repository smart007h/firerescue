import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DispatcherDashboard = () => {
  const navigation = useNavigation();
  const [dispatcherData, setDispatcherData] = useState(null);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDispatcherData();
    loadActiveIncidents();
  }, []);

  const loadDispatcherData = async () => {
    try {
      const data = await AsyncStorage.getItem('dispatcherData');
      if (data) {
        setDispatcherData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading dispatcher data:', error);
    }
  };

  const loadActiveIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveIncidents(data || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
      Alert.alert('Error', 'Failed to load active incidents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadActiveIncidents();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('dispatcherData');
      await AsyncStorage.removeItem('userRole');
      navigation.replace('LoginSelection');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleNewIncident = () => {
    navigation.navigate('NewIncident');
  };

  const handleViewIncident = (incident) => {
    navigation.navigate('IncidentDetails', { incident });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Welcome, {dispatcherData?.name || 'Dispatcher'}
          </Text>
          <Text style={styles.stationText}>
            {dispatcherData?.station_id} - {dispatcherData?.region}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNewIncident}
        >
          <Icon name="plus-circle" size={32} color="#007AFF" />
          <Text style={styles.actionText}>New Incident</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('IncidentHistory')}
        >
          <Icon name="history" size={32} color="#007AFF" />
          <Text style={styles.actionText}>History</Text>
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
                  <Text style={styles.incidentType}>{incident.type}</Text>
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
                    Priority: {incident.priority}
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
});

export default DispatcherDashboard; 