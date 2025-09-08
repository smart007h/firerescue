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
  const { updateDispatcherAuth, markAppRefresh, setUserRole } = useAuth();

  // Check for existing session on component mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Supabase session on app start:', session);
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

      if (authError || !data.user) {
        if (authError?.message?.includes('Invalid login credentials')) {
          setError('The email or password you entered is incorrect. Please check your credentials and try again.');
        } else {
          setError('Login failed. Please verify your email and password and try again.');
        }
        setLoading(false);
        return;
      }

      // Immediately set user role to prevent flash of wrong screen
      setUserRole('dispatcher');

      // 2. Fetch dispatcher profile by user id (UUID)
      const { data: dispatcherData, error: dispatcherError } = await supabase
        .from('dispatchers')
        .select('*')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .single();

      if (dispatcherError || !dispatcherData) {
        setError('This account is not registered as an active dispatcher. Please contact your administrator.');
        setLoading(false);
        return;
      }

      // 3. Update the AuthContext with dispatcher data
      await updateDispatcherAuth(dispatcherData);

      // Mark that we're setting up a session (for future app refreshes)
      await markAppRefresh();

      // 4. Store dispatcher data in AsyncStorage (required for auth flow)
      await AsyncStorage.setItem('dispatcherData', JSON.stringify(dispatcherData));
      await AsyncStorage.setItem('userRole', 'dispatcher');
      await AsyncStorage.setItem('userId', dispatcherData.id);
      await AsyncStorage.setItem('userEmail', dispatcherData.email);

      // 5. Navigate to dispatcher dashboard
      navigation.replace('DispatcherDashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
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
              style={styles.returnButtonTop}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#007AFF" style={{ marginRight: 5 }} />
              <Text style={styles.returnButtonText}>Return to Selection</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Ionicons name="radio" size={60} color="#fff" style={styles.headerIcon} />
              <Text style={styles.title}>Dispatcher Login</Text>
              <Text style={styles.subtitle}>Access your dispatcher dashboard</Text>
            </View>

            <View style={styles.formContainer}>
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning" size={20} color="#c62828" style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={22} color="#007AFF" style={styles.inputIcon} />
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  theme={{ colors: { primary: '#007AFF' } }}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={22} color="#007AFF" style={styles.inputIcon} />
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
                  theme={{ colors: { primary: '#007AFF' } }}
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
                  <>
                    <Ionicons name="log-in" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Login</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
              >
                <Ionicons name="help-circle" size={18} color="#007AFF" style={{ marginRight: 4 }} />
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#c62828', marginTop: 10 }]}
                onPress={handleClearStorage}
              >
                <Ionicons name="trash" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Clear Storage</Text>
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
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingTop: 0,
    paddingBottom: 0,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    minHeight: '100%',
  },
  backButton: {
    display: 'none',
  },
  returnButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'absolute',
    top: 16,
    left: 4,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f4ff',
    borderRadius: 20,
    width: 'auto',
    maxWidth: 180,
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 10,
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 24,
    paddingHorizontal: 0,
  },
  headerIcon: {
    backgroundColor: 'rgba(0,122,255,0.15)',
    borderRadius: 30,
    padding: 10,
    marginBottom: 8,
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
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginTop: 0,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 18,
    paddingHorizontal: 10,
    height: 56,
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    backgroundColor: '#fff',
    fontSize: 16,
    flex: 1,
    minWidth: 0,
    maxWidth: 350,
    borderRadius: 8,
    paddingLeft: 0,
    marginBottom: 0,
    elevation: 0,
  },
  passwordContainer: {
    display: 'none',
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
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  forgotPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 4,
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
  returnButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DispatcherLoginScreen;