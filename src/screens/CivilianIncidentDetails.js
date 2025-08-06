import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';

export default function CivilianIncidentDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const { incident, incidentId, returnTo } = route.params;

  const [loading, setLoading] = useState(!incident);
  const [incidentData, setIncidentData] = useState(incident || null);
  const [stationInfo, setStationInfo] = useState(null);

  const loadIncidentDetails = async () => {
    try {
      setLoading(true);

      // Load incident if not provided
      if (!incidentData) {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single();

        if (error) {
          console.error('Error loading incident:', error);
          Alert.alert('Error', 'Failed to load incident details');
          return;
        }

        setIncidentData(data);
      }

      const currentIncident = incidentData || incident;

      // Load station information if assigned
      if (currentIncident?.station_id) {
        const { data: station, error: stationError } = await supabase
          .from('firefighters')
          .select('station_id, station_name, station_address, station_contact, station_region')
          .eq('station_id', currentIncident.station_id)
          .maybeSingle();

        if (!stationError && station) {
          setStationInfo(station);
        }
      }
    } catch (error) {
      console.error('Error loading incident details:', error);
      Alert.alert('Error', 'Failed to load incident information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentDetails();
  }, [incidentId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'resolved': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'time';
      case 'in_progress': return 'sync';
      case 'resolved': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const handleBackPress = () => {
    if (returnTo === 'UserReportHistory') {
      navigation.navigate('UserReportHistory');
    } else if (returnTo === 'CivilianTrackingScreen') {
      navigation.navigate('CivilianTrackingScreen', { incidentId, incident: incidentData });
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading incident details...</Text>
      </View>
    );
  }

  const currentIncident = incidentData || incident;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Incident Details</Text>
          <Text style={styles.headerSubtitle}>
            {currentIncident?.incident_type || 'Emergency Report'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={getStatusIcon(currentIncident?.status)} 
              size={24} 
              color={getStatusColor(currentIncident?.status)} 
            />
            <Text style={styles.cardTitle}>Status</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(currentIncident?.status) }
          ]}>
            <Text style={styles.statusText}>
              {currentIncident?.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Incident Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color="#2563eb" />
            <Text style={styles.cardTitle}>Incident Information</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="flame" size={20} color="#dc2626" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>
                {currentIncident?.incident_type || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Reported</Text>
              <Text style={styles.infoValue}>
                {new Date(currentIncident?.created_at).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {currentIncident?.location_address || 'Location not available'}
              </Text>
            </View>
          </View>

          {currentIncident?.description && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>{currentIncident.description}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Station Information */}
        {stationInfo ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business" size={24} color="#dc2626" />
              <Text style={styles.cardTitle}>Assigned Fire Station</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="home" size={20} color="#dc2626" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Station</Text>
                <Text style={styles.infoValue}>{stationInfo.station_name}</Text>
                <Text style={styles.infoSubvalue}>{stationInfo.station_id}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{stationInfo.station_address}</Text>
              </View>
            </View>

            {stationInfo.station_contact && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={20} color="#16a34a" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Contact</Text>
                  <Text style={styles.infoValue}>{stationInfo.station_contact}</Text>
                </View>
              </View>
            )}

            {stationInfo.station_region && (
              <View style={styles.infoRow}>
                <Ionicons name="map" size={20} color="#64748b" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Region</Text>
                  <Text style={styles.infoValue}>{stationInfo.station_region}</Text>
                </View>
              </View>
            )}
          </View>
        ) : currentIncident?.status !== 'pending' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={24} color="#f59e0b" />
              <Text style={styles.cardTitle}>Station Assignment</Text>
            </View>
            <Text style={styles.waitingText}>
              Waiting for fire station assignment...
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#dc2626',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
  },
  infoSubvalue: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  waitingText: {
    fontSize: 16,
    color: '#f59e0b',
    textAlign: 'center',
    padding: 16,
  },
});
