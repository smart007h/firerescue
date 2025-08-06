import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/AuthContext";
import { getAddressFromCoordinates } from "../services/locationService";

const DispatcherDashboard = () => {
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [dispatcherName, setDispatcherName] = useState("");
  const [stationId, setStationId] = useState("");
  const navigation = useNavigation();
  const { signOut } = useAuth();

  useEffect(() => {
    fetchActiveIncidents();
    fetchDispatcherInfo();
    
    // Set up real-time subscription for incident updates
    const setupRealtimeSubscription = async () => {
      const dispatcherId = await AsyncStorage.getItem("userId");
      if (!dispatcherId) return;

      console.log('Setting up real-time subscription for dispatcher:', dispatcherId);
      
      const channel = supabase
        .channel('dispatcher-incidents')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'incidents',
            filter: `dispatcher_id=eq.${dispatcherId}`,
          },
          (payload) => {
            console.log('Real-time incident update received:', payload);
            // Refresh the incidents list when any change occurs
            fetchActiveIncidents();
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    
    return () => {
      if (cleanup) cleanup.then(fn => fn && fn());
    };
  }, []);

  const fetchActiveIncidents = async () => {
    setRefreshing(true);
    try {
      const dispatcherId = await AsyncStorage.getItem("userId");
      console.log('Fetching active incidents for dispatcher:', dispatcherId);
      
      if (!dispatcherId) {
        console.log('No dispatcher ID found - clearing incidents');
        setActiveIncidents([]);
        setRefreshing(false);
        return;
      }

      // Query for active incidents (in_progress status only)
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("dispatcher_id", dispatcherId)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error('Error fetching active incidents:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} active incidents for dispatcher ${dispatcherId}`);
      console.log('Active incidents data:', data);
      
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
      
      setActiveIncidents(incidentsWithFormattedLocations);
    } catch (err) {
      console.error('Error in fetchActiveIncidents:', err);
      setActiveIncidents([]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDispatcherInfo = async () => {
    try {
      const dispatcherData = await AsyncStorage.getItem("dispatcherData");
      if (dispatcherData) {
        const dispatcher = JSON.parse(dispatcherData);
        setDispatcherName(dispatcher.name || "");
        setStationId(dispatcher.station_id || "");
      }
    } catch (err) {
      setDispatcherName("");
      setStationId("");
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

  const onRefresh = () => {
    fetchActiveIncidents();
  };

  const handleViewIncident = (incident) => {
    navigation.navigate("DispatchTrackingScreen", {
      incidentId: incident.id,
      incident,
      onStatusChange: () => {
        // Refresh the dashboard when status changes
        fetchActiveIncidents();
      }
    });
  };

  const handleResolveIncident = async (incident) => {
    Alert.alert(
      'Resolve Incident',
      `Are you sure you want to mark this incident as resolved?\n\nType: ${incident.incident_type || 'Unknown'}\nLocation: ${incident.formattedLocation || incident.location}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('incidents')
                .update({ 
                  status: 'resolved',
                  updated_at: new Date().toISOString()
                })
                .eq('id', incident.id);

              if (error) throw error;

              Alert.alert('Success', 'Incident has been resolved and will be removed from active list');
              fetchActiveIncidents(); // Refresh the list
            } catch (error) {
              console.error('Error resolving incident:', error);
              Alert.alert('Error', 'Failed to resolve incident. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleTrackIncident = () => {
    const incident = activeIncidents.find((i) => i.id === selectedIncidentId);
    if (incident) {
      navigation.navigate("DispatchTrackingScreen", {
        incidentId: incident.id,
        incident,
      });
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
              {dispatcherName} {stationId ? `| Station ID: ${stationId}` : ""}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={async () => {
          try {
            await signOut();
            console.log('Dispatcher logged out successfully');
            // Don't navigate manually - let AuthContext and AppNavigator handle it
          } catch (error) {
            console.error('Error logging out:', error);
          }
        }}>
          <Ionicons name="log-out-outline" size={24} color="#DC3545" />
        </TouchableOpacity>
      </View>

      <ScrollView>
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
                label={`${
                  incident.type || incident.incident_type || "Incident"
                } (${incident.formattedLocation || incident.location})`}
                value={incident.id}
              />
            ))}
          </Picker>
          <TouchableOpacity
            style={[
              styles.trackButton,
              { opacity: selectedIncidentId ? 1 : 0.5 },
            ]}
            onPress={handleTrackIncident}
            disabled={!selectedIncidentId}
          >
            <Ionicons name="navigate" size={24} color="#fff" />
            <Text style={styles.trackButtonText}>Track Incident</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("DispatchNewIncidentScreen")}
          >
            <Ionicons name="add-circle" size={32} color="#34C759" />
            <Text style={styles.actionText}>New Incident</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("DispatchIncidentHistory")}
          >
            <Ionicons name="time" size={32} color="#FF9500" />
            <Text style={styles.actionText}>Incident History</Text>
          </TouchableOpacity>
        </View>

        {/* Active Incidents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Incidents</Text>
            <Text style={styles.incidentCount}>
              {activeIncidents.length} active
            </Text>
          </View>
          <ScrollView
            style={styles.incidentsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {refreshing && activeIncidents.length === 0 ? (
              <Text style={styles.loadingText}>Loading active incidents...</Text>
            ) : activeIncidents.length === 0 ? (
              <View style={styles.noIncidentsContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                <Text style={styles.noIncidents}>No active incidents</Text>
                <Text style={styles.noIncidentsSubtext}>
                  All your assigned incidents are resolved
                </Text>
              </View>
            ) : (
              activeIncidents.map((incident) => (
                <TouchableOpacity
                  key={incident.id}
                  style={styles.incidentCard}
                  onPress={() => handleViewIncident(incident)}
                >
                  <View style={styles.incidentHeader}>
                    <Text style={styles.incidentType}>
                      {incident.type || incident.incident_type || "Incident"}
                    </Text>
                    <Text style={styles.incidentTime}>
                      {new Date(incident.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.incidentLocation}>
                    {incident.formattedLocation || incident.location}
                  </Text>
                  <Text style={styles.incidentDescription} numberOfLines={2}>
                    {incident.description}
                  </Text>
                  <View style={styles.incidentFooter}>
                    <Text style={styles.incidentStatus}>
                      Status: {incident.status}
                    </Text>
                    <Text style={styles.incidentPriority}>
                      Priority: {incident.priority || "N/A"}
                    </Text>
                  </View>
                  
                  {/* Action Buttons */}
                  <View style={styles.incidentActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.trackButton]}
                      onPress={() => handleViewIncident(incident)}
                    >
                      <Text style={styles.actionButtonText}>Track</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.resolveButton]}
                      onPress={() => handleResolveIncident(incident)}
                    >
                      <Text style={styles.actionButtonText}>Resolve</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  stationText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  actionButton: {
    alignItems: "center",
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: "#007AFF",
  },
  section: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  incidentCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  incidentsList: {
    flex: 1,
  },
  noIncidentsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noIncidents: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    fontWeight: '600',
  },
  noIncidentsSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  incidentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  incidentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  incidentType: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  incidentTime: {
    fontSize: 14,
    color: "#666666",
  },
  incidentLocation: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 8,
  },
  incidentDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 12,
  },
  incidentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  incidentStatus: {
    fontSize: 14,
    color: "#34C759",
  },
  incidentPriority: {
    fontSize: 14,
    color: "#FF3B30",
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackButton: {
    backgroundColor: '#007AFF',
  },
  resolveButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  picker: {
    width: "100%",
    minWidth: 200,
    marginBottom: 12,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 4,
  },
  trackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  dispatcherInfo: {
    fontSize: 15,
    color: "#666",
    marginTop: 2,
    fontWeight: "500",
  },
});

export default DispatcherDashboard;
