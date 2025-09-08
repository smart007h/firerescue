import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export default function FirefighterLoginScreen() {
  const [stationId, setStationId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const { setUserRole, markAppRefresh } = useAuth();

  const checkDatabase = async () => {
    try {
      console.log('=== Starting Database Check ===');
      
      // Check all stations
      const { data: allStations, error: allError } = await supabase
        .from('firefighters')
        .select('*');
      
      console.log('All stations in database:', allStations);

      // Check specific station
      const { data: fs001Data, error: fs001Error } = await supabase
        .from('firefighters')
        .select('*')
        .eq('station_id', 'FS001');

      console.log('FS001 specific check:', { fs001Data, fs001Error });

      if (fs001Data && fs001Data.length > 0) {
        console.log('FS001 details:', fs001Data[0]);
        console.log('FS001 password:', fs001Data[0].station_password);
      }

      console.log('=== End Database Check ===');
    } catch (error) {
      console.error('Database check error:', error);
    }
  };

  // Add debug check when component mounts
  useEffect(() => {
    checkDatabase();
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log('Checking for existing session...');
      
      // Check for stored session
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        
        // Check if session is still valid (handle both timestamp formats)
        const expiresAt = typeof session.expires_at === 'string' 
          ? new Date(session.expires_at).getTime() 
          : session.expires_at * 1000;
          
        const now = Date.now();
        const lastActivity = await AsyncStorage.getItem('lastActivityTime');
        const lastActivityTime = lastActivity ? parseInt(lastActivity) : now;
        
        // Check session expiration and inactivity (2 hours)
        const isExpired = expiresAt < now;
        const isInactive = (now - lastActivityTime) > (2 * 60 * 60 * 1000); // 2 hours
        
        if (!isExpired && !isInactive) {
          // Check if station data exists
          const stationDataStr = await AsyncStorage.getItem('stationData');
          if (stationDataStr) {
            const stationData = JSON.parse(stationDataStr);
            
            // Verify station exists and is active
            const { data: stations, error } = await supabase
              .from('firefighters')
              .select('*')
              .eq('station_id', stationData.station_id)
              .eq('is_active', true)
              .single();

            if (!error && stations) {
              console.log('Valid session found, navigating to home');
              // Update last activity
              await AsyncStorage.setItem('lastActivityTime', now.toString());
              // Store stationId if it's not already stored
              if (!await AsyncStorage.getItem('stationId')) {
                await AsyncStorage.setItem('stationId', stationData.station_id);
              }
              navigation.replace('FirefighterMain');
              return;
            }
          }
        } else {
          console.log('Session expired, clearing storage');
          // Clear expired session
          await AsyncStorage.removeItem('supabase-session');
          await AsyncStorage.removeItem('stationData');
          await AsyncStorage.removeItem('stationId');
          await AsyncStorage.removeItem('userRole');
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  };

  const createInitialStation = async (stationId) => {
    try {
      console.log('=== Starting Station Creation ===');
      console.log('Creating station with ID:', stationId);

      const stationNumber = parseInt(stationId.substring(2));
      const stationDetails = {
        station_id: stationId,
        station_name: `Fire Station ${stationNumber}`,
        station_region: 'Greater Accra Region',
        station_contact: `+233 30 ${stationNumber}${stationNumber}${stationNumber}`,
        station_address: `Station Address ${stationNumber}, Accra`,
        station_email: `station${stationNumber}@fire.gov.gh`,
        station_location: '5.6034,-0.1870',
        station_password: 'FireStation101!',
        is_active: true,
      };

      console.log('Station details to insert:', stationDetails);

      const { data, error } = await supabase
        .from('firefighters')
        .insert([stationDetails])
        .select();

      console.log('Insert result:', { data, error });

      if (error) {
        console.error('Error creating station:', error);
        if (error.code === '23505') { // Unique violation
          console.log('Station already exists, trying to fetch it');
          const { data: existingStation, error: fetchError } = await supabase
            .from('firefighters')
            .select('*')
            .eq('station_id', stationId)
            .single();

          if (fetchError) {
            console.error('Error fetching existing station:', fetchError);
            throw fetchError;
          }

          return existingStation;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }

      console.log('Successfully created station:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Detailed error in createInitialStation:', error);
      throw error;
    }
  };

  const handleLogin = async () => {
    if (!stationId || !password) {
      setError('Please enter both station ID and password');
      return;
    }

    // Validate station ID format
    const stationIdRegex = /^FS\d{3}$/;
    if (!stationIdRegex.test(stationId)) {
      setError('Invalid station ID format. Must be in the format FSXXX');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('firefighters')
        .select('*')
        .eq('station_id', stationId)
        .eq('station_password', password)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Invalid station ID or password');
      }

      // Store station data and session info
      await AsyncStorage.setItem('stationData', JSON.stringify(data));
      await AsyncStorage.setItem('stationId', data.station_id);
      await AsyncStorage.setItem('userRole', 'firefighter');

      // Create a session with proper expiration (12 hours instead of 7 days)
      const session = {
        station_id: data.station_id,
        station_name: data.station_name,
        access_token: 'firefighter_token',
        expires_at: Math.floor((Date.now() + 12 * 60 * 60 * 1000) / 1000), // 12 hours from now in seconds
        created_at: new Date().toISOString(),
        role: 'firefighter'
      };

      await AsyncStorage.setItem('supabase-session', JSON.stringify(session));
      await AsyncStorage.setItem('lastActivityTime', Date.now().toString());

      console.log('Login successful!');
      console.log('Station details:', data);

      // Mark that we're setting up a session (for future app refreshes)
      await markAppRefresh();

      // Set session and userRole, then let AuthContext/AppNavigator handle navigation
      // Do not navigate here
      setUserRole('firefighter');
    } catch (error) {
      console.error('Login error:', error);
      if (error.message === 'Invalid station ID or password') {
        setError('The station ID or password you entered is incorrect. Please check your credentials and try again.');
      } else {
        setError(error.message || 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image 
              source={require('../assets/images/logo.jpeg')}
            style={styles.logo}
          />
          <Text style={styles.title}>Firefighter Login</Text>
            <Text style={styles.subtitle}>Enter your Station ID and Password</Text>
        </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.messageContainer}>
                <Ionicons name="alert-circle" size={20} color="#DC3545" style={styles.messageIcon} />
                <Text style={styles.messageText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Ionicons name="id-card" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
                placeholder="Enter Station ID (e.g., FS001)"
                value={stationId}
                onChangeText={setStationId}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in" size={24} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.loginButtonText}>Login</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.debugButton]}
              onPress={checkDatabase}
            >
              <Text style={styles.debugButtonText}>Check Database</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#DC3545" />
              <Text style={styles.backButtonText}>Back to Selection</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 20,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    borderRadius: 12,
    height: 56,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#DC3545',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#DC3545',
    fontSize: 16,
    marginLeft: 8,
  },
  debugButton: {
    backgroundColor: '#666',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageIcon: {
    marginRight: 8,
  },
  messageText: {
    color: '#DC3545',
    fontSize: 14,
    flex: 1,
  },
});
