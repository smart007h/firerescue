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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DispatchIncidentDetailsScreen = ({ route, navigation }) => {
  const { incident } = route.params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [incidentDetails, setIncidentDetails] = useState(incident);

  const loadIncidentDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incident.id)
        .single();

      if (error) throw error;
      setIncidentDetails(data);
    } catch (error) {
      console.error('Error loading incident details:', error);
      Alert.alert('Error', 'Failed to load incident details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('incidents')
        .update({ status: newStatus })
        .eq('id', incident.id);

      if (error) throw error;
      await loadIncidentDetails();
      Alert.alert('Success', 'Incident status updated successfully');
    } catch (error) {
      console.error('Error updating incident status:', error);
      Alert.alert('Error', 'Failed to update incident status');
    } finally {
      setLoading(false);
    }
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
      case 'active':
        return '#FF3B30';
      case 'in_progress':
        return '#FF9500';
      case 'resolved':
        return '#34C759';
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
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Incident Details</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadIncidentDetails} />
        }
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.incidentType}>{incidentDetails.type}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(incidentDetails.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {incidentDetails.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="map-marker" size={20} color="#007AFF" />
            <Text style={styles.detailText}>{incidentDetails.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={20} color="#007AFF" />
            <Text style={styles.detailText}>
              {new Date(incidentDetails.created_at).toLocaleString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="flag" size={20} color="#007AFF" />
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(incidentDetails.priority) },
              ]}
            >
              <Text style={styles.priorityText}>
                {incidentDetails.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{incidentDetails.description}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Update Status</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                incidentDetails.status === 'active' && styles.actionButtonActive,
              ]}
              onPress={() => handleStatusUpdate('active')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  incidentDetails.status === 'active' && styles.actionButtonTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                incidentDetails.status === 'in_progress' && styles.actionButtonActive,
              ]}
              onPress={() => handleStatusUpdate('in_progress')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  incidentDetails.status === 'in_progress' && styles.actionButtonTextActive,
                ]}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                incidentDetails.status === 'resolved' && styles.actionButtonActive,
              ]}
              onPress={() => handleStatusUpdate('resolved')}
              disabled={loading}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  incidentDetails.status === 'resolved' && styles.actionButtonTextActive,
                ]}
              >
                Resolved
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
    fontSize: 24,
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
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 16,
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
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
    lineHeight: 24,
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 4,
  },
  actionButtonActive: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    textAlign: 'center',
    color: '#000000',
  },
  actionButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default DispatchIncidentDetailsScreen; 