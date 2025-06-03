import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataTable, Searchbar, Button, IconButton, Portal, Modal, TextInput, HelperText, Card } from 'react-native-paper';

const FirefighterTeamScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'firefighter'
  });
  const [formErrors, setFormErrors] = useState({});
  const [stationId, setStationId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const handleSessionExpiration = async () => {
    console.log('Session expired, clearing storage and redirecting to login');
    // Clear all session data
    await AsyncStorage.removeItem('supabase-session');
    await AsyncStorage.removeItem('stationData');
    await AsyncStorage.removeItem('stationId');
    await AsyncStorage.removeItem('userRole');
    
    // Navigate to login selection
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginSelection' }],
    });
  };

  const checkSession = async () => {
    try {
      // Get session from AsyncStorage
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      const stationIdStr = await AsyncStorage.getItem('stationId');
      
      console.log('Session check:', sessionStr ? 'Found' : 'Not found');
      console.log('Station ID:', stationIdStr);

      if (!sessionStr || !stationIdStr) {
        console.error('No active session or station ID found');
        setError('Please log in to view team members');
        await handleSessionExpiration();
        return;
      }

      // Parse and validate session
      const session = JSON.parse(sessionStr);
      if (new Date().getTime() > session.expires_at) {
        console.error('Session expired');
        await handleSessionExpiration();
        return;
      }

      setStationId(stationIdStr);
      await loadTeamMembers(stationIdStr);
    } catch (error) {
      console.error('Error checking session:', error);
      setError('Error loading data: ' + error.message);
      await handleSessionExpiration();
    }
  };

  const loadTeamMembers = async (stationId) => {
    try {
      setLoading(true);
      console.log('Starting to load team members for station:', stationId);

      // Get team members for the specific station
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('station_id', stationId.trim())
        .order('role', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Team members data:', data);
      console.log('Number of team members loaded:', data?.length);
      
      if (!data || data.length === 0) {
        console.log('No team members found for station:', stationId);
      }
      
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
      setError('Error loading team members: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const showModal = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone,
        address: member.address,
        role: member.role
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        role: 'firefighter'
      });
    }
    setVisible(true);
  };

  const hideModal = () => {
    setVisible(false);
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      role: 'firefighter'
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from('team_members')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            role: formData.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMember.id);

        if (error) throw error;
      } else {
        // Add new member
        const { error } = await supabase
          .from('team_members')
          .insert([{
            station_id: stationId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            role: formData.role,
            region: 'Greater Accra' // Default region
          }]);

        if (error) throw error;
      }

      hideModal();
      loadTeamMembers(stationId);
    } catch (err) {
      console.error('Error saving team member:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (memberId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      loadTeamMembers(stationId);
    } catch (err) {
      console.error('Error deleting team member:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeamMembers(stationId);
  };

  const renderTeamMemberItem = ({ item }) => (
    <Card style={styles.memberCard}>
      <Card.Content>
        <View style={styles.memberHeader}>
          <View style={styles.memberAvatar}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberRole}>{item.role}</Text>
          </View>
          <View style={styles.memberActions}>
            <IconButton
              icon="pencil"
              size={20}
              color="#DC3545"
              onPress={() => showModal(item)}
            />
            <IconButton
              icon="delete"
              size={20}
              color="#DC3545"
              onPress={() => handleDelete(item.id)}
            />
          </View>
        </View>

        <View style={styles.memberDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="mail" size={16} color="#666" />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color="#666" />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading team members...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Details</Text>
          {filteredMembers.length === 0 ? (
            <Text style={styles.noDataText}>No team members found</Text>
          ) : (
            <ScrollView>
              {filteredMembers.map((member) => renderTeamMemberItem({ item: member }))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  memberCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
  },
  memberDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#DC3545',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
  },
});

export default FirefighterTeamScreen; 