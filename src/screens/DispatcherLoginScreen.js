import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TextInput, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

const DispatcherLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const { updateDispatcherAuth } = useAuth();

  // Debug: Log Supabase session on app start
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('DEBUG: Supabase session on app start:', session);
    });
  }, []);

  const handleLogin = async () => {
    console.log('Login started');
    if (!email || !password) {
      setError('Please fill in all fields');
      console.log('Login failed: missing email or password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Loading set to true, starting Supabase Auth');

      // 1. Login with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('After supabase.auth.signInWithPassword', data, authError);

      if (authError || !data.user) {
        setError(authError?.message || 'Invalid email or password');
        setLoading(false);
        console.log('Login failed: Supabase Auth error or no user', authError, data.user);
        return;
      }

      // 2. Fetch dispatcher profile by user id (UUID)
      const { data: dispatcherData, error: dispatcherError } = await supabase
        .from('dispatchers')
        .select('*')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .single();
      console.log('After fetching dispatcher profile', dispatcherData, dispatcherError);

      if (dispatcherError || !dispatcherData) {
        setError('User is not an active dispatcher');
        setLoading(false);
        console.log('Login failed: Not an active dispatcher', dispatcherError, dispatcherData);
        return;
      }

      // 3. Update the AuthContext with dispatcher data
      await updateDispatcherAuth(dispatcherData);
      console.log('After updateDispatcherAuth');

      // 4. Store dispatcher data in AsyncStorage (required for auth flow)
      await AsyncStorage.setItem('dispatcherData', JSON.stringify(dispatcherData));
      await AsyncStorage.setItem('userRole', 'dispatcher');
      await AsyncStorage.setItem('userId', dispatcherData.id);
      await AsyncStorage.setItem('userEmail', dispatcherData.email);
      console.log('After AsyncStorage set');

      // 5. Navigate to dispatcher dashboard
      console.log('Navigating to DispatcherDashboard');
      navigation.replace('DispatcherDashboard');
      console.log('After navigation.replace');
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please try again.');
      console.log('Login error caught in catch block');
    } finally {
      setLoading(false);
      console.log('Loading set to false (finally block)');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword', { userType: 'dispatcher' });
  };

  const handleClearStorage = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Storage Cleared', 'AsyncStorage has been cleared. Please restart the app and log in again.');
    } catch (e) {
      Alert.alert('Error', 'Failed to clear AsyncStorage.');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/fire.jpeg')}
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.header}>
              <Ionicons name="radio" size={60} color="#fff" />
              <Text style={styles.title}>Dispatcher Login</Text>
              <Text style={styles.subtitle}>Access your dispatcher dashboard</Text>
            </View>

            <View style={styles.formContainer}>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  style={[styles.input, styles.passwordInput]}
                  secureTextEntry={!showPassword}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>Back to Selection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#c62828', marginTop: 10 }]}
                onPress={handleClearStorage}
              >
                <Text style={styles.buttonText}>Clear Storage (Debug)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    padding: 4,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default DispatcherLoginScreen; 