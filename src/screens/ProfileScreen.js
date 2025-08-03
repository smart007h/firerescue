import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, Avatar, Button, Card, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

const ProfileScreen = ({ navigation, route }) => {
  const [profile, setProfile] = useState(route.params?.profile || {});
  const [reportsCount, setReportsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Reload profile when screen comes into focus (e.g., returning from EditProfile)
  useFocusEffect(
    React.useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        throw error;
      }

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile.id) {
      fetchReportsCount();
    }
  }, [profile.id]);

  const fetchReportsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { count, error } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('reported_by', user.id);

      if (error) {
        console.error('Error fetching reports count:', error);
        throw error;
      }

      setReportsCount(count || 0);
    } catch (error) {
      console.error('Error in fetchReportsCount:', error);
      setReportsCount(0);
    }
  };

  const { signOut } = useAuth();
  const handleLogout = async () => {
    try {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to log out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await signOut();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditProfile', { profile });
  };

  const renderContent = () => (
    <View style={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{profile?.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{profile?.phone || 'Not provided'}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Activity Information</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Reports Made</Text>
            <Text style={styles.value}>{reportsCount}</Text>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        icon="logout"
      >
        Logout
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC3545" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <FlatList
          data={[{ key: 'content' }]}
          renderItem={() => (
            <>
              <View style={styles.header}>
                {profile?.profile_image ? (
                  <Avatar.Image 
                    size={120} 
                    source={{ uri: profile.profile_image }}
                    style={styles.avatar}
                  />
                ) : (
                  <Avatar.Text 
                    size={120} 
                    label={profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                    style={styles.avatar}
                  />
                )}
                <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
                <Text style={styles.role}>{profile?.role === 'user' ? 'Civilian' : 'Firefighter'}</Text>
                <Button
                  mode="contained"
                  onPress={handleEdit}
                  style={styles.editButton}
                  icon="account-edit"
                >
                  Edit Profile
                </Button>
              </View>
              {renderContent()}
            </>
          )}
          contentContainerStyle={styles.scrollContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  backButton: {
    margin: 0,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#FF6B6B',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  editButton: {
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 'auto',
    backgroundColor: '#FF4B4B',
    borderRadius: 8,
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
});

export default ProfileScreen;
