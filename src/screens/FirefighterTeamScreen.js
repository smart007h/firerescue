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
  const [dispatchers, setDispatchers] = useState([]);
  const [showAddDispatcher, setShowAddDispatcher] = useState(false);
  const [dispatcherForm, setDispatcherForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [dispatcherFormErrors, setDispatcherFormErrors] = useState({});
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', phone: '', address: '', role: 'firefighter', region: '', dispatcher_id: '' });
  const [memberFormErrors, setMemberFormErrors] = useState({});

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
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      const stationIdStr = await AsyncStorage.getItem('stationId');
      if (!sessionStr || !stationIdStr) {
        setError('Please log in to view team members');
        await handleSessionExpiration();
        return;
      }
      const session = JSON.parse(sessionStr);
      if (Date.now() > session.expires_at * 1000) {
        await handleSessionExpiration();
        return;
      }
      setStationId(stationIdStr);
      await loadDispatchers(stationIdStr);
      await loadTeamMembers(stationIdStr);
    } catch (error) {
      setError('Error loading data: ' + error.message);
      await handleSessionExpiration();
    }
  };

  const loadDispatchers = async (stationId) => {
    try {
      const { data, error } = await supabase
        .from('dispatchers')
        .select('*')
        .eq('station_id', stationId);
      if (error) throw error;
      setDispatchers(data || []);
    } catch (error) {
      console.error('Error loading dispatchers:', error);
      setDispatchers([]);
    }
  };

  const loadTeamMembers = async (stationId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('station_id', stationId.trim());
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
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

  const handleAddDispatcher = async () => {
    // Validate
    const errors = {};
    if (!dispatcherForm.name.trim()) errors.name = 'Name is required';
    if (!dispatcherForm.email.trim()) errors.email = 'Email is required';
    if (!dispatcherForm.phone.trim()) errors.phone = 'Phone is required';
    if (!dispatcherForm.password.trim()) errors.password = 'Password is required';
    setDispatcherFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('dispatchers')
        .insert([{ ...dispatcherForm, station_id: stationId }]);
      if (error) throw error;
      setShowAddDispatcher(false);
      setDispatcherForm({ name: '', email: '', phone: '', password: '' });
      await loadDispatchers(stationId);
    } catch (err) {
      setDispatcherFormErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    // Validate
    const errors = {};
    if (!memberForm.name.trim()) errors.name = 'Name is required';
    if (!memberForm.email.trim()) errors.email = 'Email is required';
    if (!memberForm.phone.trim()) errors.phone = 'Phone is required';
    if (!memberForm.address.trim()) errors.address = 'Address is required';
    if (!memberForm.region.trim()) errors.region = 'Region is required';
    if (!memberForm.dispatcher_id) errors.dispatcher_id = 'Dispatcher is required';
    setMemberFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      setLoading(true);
      // Find the selected dispatcher to get station_id and region
      const dispatcher = dispatchers.find(d => d.dispatcher_id === memberForm.dispatcher_id);
      if (!dispatcher) throw new Error('Selected dispatcher not found');
      const { error } = await supabase
        .from('team_members')
        .insert([{ 
          name: memberForm.name,
          email: memberForm.email,
          phone: memberForm.phone,
          address: memberForm.address,
          role: memberForm.role,
          region: memberForm.region,
          station_id: dispatcher.station_id,
          dispatcher_id: dispatcher.dispatcher_id
        }]);
      if (error) throw error;
      setShowAddMember(false);
      setMemberForm({ name: '', email: '', phone: '', address: '', role: 'firefighter', region: '', dispatcher_id: '' });
      await loadTeamMembers(stationId);
    } catch (err) {
      setMemberFormErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispatchers</Text>
          <Button mode="contained" onPress={() => setShowAddDispatcher(true)} style={{ marginBottom: 12 }}>Add Dispatcher</Button>
          {dispatchers.length === 0 ? (
            <Text style={styles.noDataText}>No dispatchers found</Text>
          ) : (
            dispatchers.map(dispatcher => {
              const members = teamMembers.filter(m => m.dispatcher_id === dispatcher.dispatcher_id);
              return (
                <Card key={dispatcher.dispatcher_id} style={{ marginBottom: 16 }}>
                  <Card.Content>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{dispatcher.name}</Text>
                    <Text>Email: {dispatcher.email}</Text>
                    <Text>Phone: {dispatcher.phone}</Text>
                    <Text>Team Members:</Text>
                    {members.length === 0 ? (
                      <Text style={{ color: '#666' }}>No team members assigned</Text>
                    ) : (
                      members.slice(0, 2).map(member => (
                        <Text key={member.id} style={{ marginLeft: 12 }}>- {member.name} ({member.role})</Text>
                      ))
                    )}
                    {members.length < 2 && (
                      <Button mode="outlined" onPress={() => { setShowAddMember(true); setMemberForm({ ...memberForm, dispatcher_id: dispatcher.dispatcher_id }); }}>Add Team Member</Button>
                    )}
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Team Members</Text>
          <Button mode="contained" onPress={() => setShowAddMember(true)} style={{ marginBottom: 12 }}>Add Team Member</Button>
          {teamMembers.length === 0 ? (
            <Text style={styles.noDataText}>No team members found</Text>
          ) : (
            teamMembers.map(member => (
              <Card key={member.id} style={styles.memberCard}>
                <Card.Content>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                  <Text>Email: {member.email}</Text>
                  <Text>Phone: {member.phone}</Text>
                  <Text>Assigned Dispatcher: {dispatchers.find(d => d.dispatcher_id === member.dispatcher_id)?.name || 'None'}</Text>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
        {/* Add Dispatcher Modal */}
        <Portal>
          <Modal visible={showAddDispatcher} onDismiss={() => setShowAddDispatcher(false)} contentContainerStyle={{ backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Add Dispatcher</Text>
            <TextInput label="Name" value={dispatcherForm.name} onChangeText={v => setDispatcherForm({ ...dispatcherForm, name: v })} style={{ marginBottom: 8 }} error={!!dispatcherFormErrors.name} />
            <HelperText type="error" visible={!!dispatcherFormErrors.name}>{dispatcherFormErrors.name}</HelperText>
            <TextInput label="Email" value={dispatcherForm.email} onChangeText={v => setDispatcherForm({ ...dispatcherForm, email: v })} style={{ marginBottom: 8 }} error={!!dispatcherFormErrors.email} />
            <HelperText type="error" visible={!!dispatcherFormErrors.email}>{dispatcherFormErrors.email}</HelperText>
            <TextInput label="Phone" value={dispatcherForm.phone} onChangeText={v => setDispatcherForm({ ...dispatcherForm, phone: v })} style={{ marginBottom: 8 }} error={!!dispatcherFormErrors.phone} />
            <HelperText type="error" visible={!!dispatcherFormErrors.phone}>{dispatcherFormErrors.phone}</HelperText>
            <TextInput label="Password" value={dispatcherForm.password} onChangeText={v => setDispatcherForm({ ...dispatcherForm, password: v })} style={{ marginBottom: 8 }} error={!!dispatcherFormErrors.password} secureTextEntry />
            <HelperText type="error" visible={!!dispatcherFormErrors.password}>{dispatcherFormErrors.password}</HelperText>
            <Button mode="contained" onPress={handleAddDispatcher} loading={loading}>Add</Button>
            <Button onPress={() => setShowAddDispatcher(false)} style={{ marginTop: 8 }}>Cancel</Button>
            <HelperText type="error" visible={!!dispatcherFormErrors.form}>{dispatcherFormErrors.form}</HelperText>
          </Modal>
        </Portal>
        {/* Add Team Member Modal */}
        <Portal>
          <Modal visible={showAddMember} onDismiss={() => setShowAddMember(false)} contentContainerStyle={{ backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Add Team Member</Text>
            <TextInput label="Name" value={memberForm.name} onChangeText={v => setMemberForm({ ...memberForm, name: v })} style={{ marginBottom: 8 }} error={!!memberFormErrors.name} />
            <HelperText type="error" visible={!!memberFormErrors.name}>{memberFormErrors.name}</HelperText>
            <TextInput label="Email" value={memberForm.email} onChangeText={v => setMemberForm({ ...memberForm, email: v })} style={{ marginBottom: 8 }} error={!!memberFormErrors.email} />
            <HelperText type="error" visible={!!memberFormErrors.email}>{memberFormErrors.email}</HelperText>
            <TextInput label="Phone" value={memberForm.phone} onChangeText={v => setMemberForm({ ...memberForm, phone: v })} style={{ marginBottom: 8 }} error={!!memberFormErrors.phone} />
            <HelperText type="error" visible={!!memberFormErrors.phone}>{memberFormErrors.phone}</HelperText>
            <TextInput label="Address" value={memberForm.address} onChangeText={v => setMemberForm({ ...memberForm, address: v })} style={{ marginBottom: 8 }} error={!!memberFormErrors.address} />
            <HelperText type="error" visible={!!memberFormErrors.address}>{memberFormErrors.address}</HelperText>
            <TextInput label="Region" value={memberForm.region} onChangeText={v => setMemberForm({ ...memberForm, region: v })} style={{ marginBottom: 8 }} error={!!memberFormErrors.region} />
            <HelperText type="error" visible={!!memberFormErrors.region}>{memberFormErrors.region}</HelperText>
            <Text style={{ marginBottom: 4, marginTop: 8 }}>Assign to Dispatcher:</Text>
            <ScrollView horizontal style={{ marginBottom: 8 }}>
              {dispatchers.map(d => (
                <Button key={d.dispatcher_id} mode={memberForm.dispatcher_id === d.dispatcher_id ? 'contained' : 'outlined'} onPress={() => setMemberForm({ ...memberForm, dispatcher_id: d.dispatcher_id })} style={{ marginRight: 8 }}>{d.name}</Button>
              ))}
            </ScrollView>
            <HelperText type="error" visible={!!memberFormErrors.dispatcher_id}>{memberFormErrors.dispatcher_id}</HelperText>
            <Button mode="contained" onPress={handleAddMember} loading={loading}>Add</Button>
            <Button onPress={() => setShowAddMember(false)} style={{ marginTop: 8 }}>Cancel</Button>
            <HelperText type="error" visible={!!memberFormErrors.form}>{memberFormErrors.form}</HelperText>
          </Modal>
        </Portal>
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