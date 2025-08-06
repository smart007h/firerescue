const React = require('react');
const { useState, useEffect } = React;
const { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } = require('react-native');
const { supabase } = require('../config/supabaseClient');
import { getAddressFromCoordinates } from '../services/locationService';

import AsyncStorage from '@react-native-async-storage/async-storage';

const DispatchIncidentHistoryScreen = ({ navigation }) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, in_progress, resolved

  useEffect(() => {
    loadIncidents();
  }, [filter]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const dispatcherId = await AsyncStorage.getItem('userId');
      if (!dispatcherId) {
        setIncidents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('dispatcher_id', dispatcherId)
        .order('created_at', { ascending: false });

      // Fix the filter logic
      if (filter === 'active') {
        query = query.eq('status', 'in_progress');
      } else if (filter === 'resolved') {
        query = query.eq('status', 'resolved');
      }
      // For 'all', don't add any status filter

      const { data, error } = await query;

      if (error) throw error;
      
      // Format locations for all incidents
      const incidentsWithFormattedLocations = await Promise.all(
        (data || []).map(async (incident) => {
          try {
            const formattedLocation = await formatLocation(incident.location);
            return { ...incident, formattedLocation };
          } catch (error) {
            return { ...incident, formattedLocation: incident.location };
          }
        })
      );
      
      setIncidents(incidentsWithFormattedLocations);
    } catch (error) {
      console.error('Error loading incidents:', error);
      Alert.alert('Error', 'Failed to load incident history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatLocation = async (location) => {
    if (!location) return 'Location not available';
    
    // If location is already a readable address (contains letters), return it quickly
    if (/[a-zA-Z]/.test(location) && !location.includes(',')) {
      return location;
    }
    
    try {
      // Quick check for coordinate format
      if (location.includes(',') && /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(location.trim())) {
        const coords = location.split(',').map(coord => parseFloat(coord.trim()));
        const [lat, lng] = coords;
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          try {
            const formattedAddress = await getAddressFromCoordinates(lat, lng);
            return formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          } catch (error) {
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }
        }
      }
      
      return location;
    } catch (error) {
      return location;
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadIncidents();
  }, [filter]);

  const handleViewIncident = (incident) => {
    navigation.navigate('DispatchIncidentDetailsScreen', { incident });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9500'; // Orange for pending
      case 'in_progress':
        return '#007AFF'; // Blue for in progress (active)
      case 'resolved':
      case 'completed':
        return '#34C759'; // Green for resolved/completed
      case 'cancelled':
        return '#8E8E93'; // Gray for cancelled
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Incident History</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'active' && styles.filterButtonTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'resolved' && styles.filterButtonActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'resolved' && styles.filterButtonTextActive,
            ]}
          >
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {incidents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No incidents found</Text>
          </View>
        ) : (
          incidents.map((incident) => (
            <TouchableOpacity
              key={incident.id}
              style={styles.incidentCard}
              onPress={() => handleViewIncident(incident)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.incidentType}>{incident.type}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(incident.status) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {(incident.status || 'N/A').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailText}>{incident.formattedLocation || incident.location}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailText}>
                  {new Date(incident.created_at).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(incident.priority) },
                  ]}
                >
                  <Text style={styles.priorityText}>
                    {(incident.priority || 'N/A').toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {incident.description}
              </Text>
            </TouchableOpacity>
          ))
        )}
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
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    textAlign: 'center',
    color: '#000000',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incidentType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000000',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});

module.exports = DispatchIncidentHistoryScreen;