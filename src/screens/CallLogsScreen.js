import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Badge, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CallLogsScreen = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationId, setStationId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadStationId();
  }, []);

  useEffect(() => {
    if (stationId) {
      loadCallLogs();
    }
  }, [stationId, filter]);

  const loadStationId = async () => {
    try {
      const id = await AsyncStorage.getItem('stationId');
      setStationId(id);
    } catch (error) {
      console.error('Error loading station ID:', error);
      Alert.alert('Error', 'Failed to load station information');
    }
  };

  const loadCallLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('emergency_calls')
        .select('*')
        .eq('station_id', stationId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error loading call logs:', error);
      Alert.alert('Error', 'Failed to load call logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCallLogs();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'received': return '#4CAF50';
      case 'missed': return '#DC3545';
      case 'dialed': return '#2196F3';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'received': return 'call-received';
      case 'missed': return 'call-missed';
      case 'dialed': return 'call-made';
      default: return 'call';
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Loading call logs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Call Logs</Text>
        </View>

        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'received', label: 'Received' },
            { value: 'missed', label: 'Missed' },
            { value: 'dialed', label: 'Dialed' },
          ]}
          style={styles.filterButtons}
        />

        {calls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="call-outline" size={48} color="#757575" />
            <Text style={styles.emptyText}>No call logs found</Text>
          </View>
        ) : (
          calls.map((call) => (
            <Card key={call.id} style={styles.callCard}>
              <Card.Content>
                <View style={styles.callHeader}>
                  <View style={styles.callInfo}>
                    <Ionicons 
                      name={getStatusIcon(call.status)} 
                      size={24} 
                      color={getStatusColor(call.status)} 
                    />
                    <View style={styles.callDetails}>
                      <Text style={styles.phoneNumber}>{call.caller_number}</Text>
                      <Text style={styles.callTime}>
                        {formatDateTime(call.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Badge
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(call.status) }
                    ]}
                  >
                    {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                  </Badge>
                </View>

                {call.location && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={16} color="#4A5568" />
                    <Text style={styles.locationText}>{call.location}</Text>
                  </View>
                )}

                {call.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{call.notes}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A5568',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  filterButtons: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
  },
  callCard: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  callDetails: {
    marginLeft: 12,
    flex: 1,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  callTime: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
  },
  notesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#4A5568',
  },
});

export default CallLogsScreen; 