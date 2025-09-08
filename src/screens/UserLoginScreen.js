import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInUser } from '../services/auth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const UserLoginScreen = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setUserRole, markAppRefresh } = useAuth();

  useEffect(() => {
    if (route.params?.message) {
      setSuccessMessage(route.params.message);
    }
  }, [route.params]);

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data, error } = await signInUser(formData.email, formData.password);
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('The email or password you entered is incorrect. Please check your credentials and try again.');
        }
        throw error;
      }

      if (data.profile.role !== 'user') {
        throw new Error('This account is not registered as a civilian user. Please use the appropriate login.');
      }

      // Set userRole in AsyncStorage
      await AsyncStorage.setItem('userRole', 'user');
      
      // Mark that we're setting up a session (for future app refreshes)
      await markAppRefresh();
      
      // Immediately update context for navigation
      if (setUserRole) setUserRole('user');

      // Do not navigate; let AuthContext/AppNavigator handle stack switch
    } catch (err) {
      setError(err.message || 'Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/fire3.jpeg')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>GHANA NATIONAL{'\n'}FIRE SERVICE</Text>
          <Text style={styles.subtitle}>Civilian Login</Text>
        </View>

        <View style={styles.formContainer}>
          {successMessage ? (
            <HelperText type="info" visible={true} style={styles.successMessage}>
              {successMessage}
            </HelperText>
          ) : null}

          {error ? (
            <HelperText type="error" visible={true}>
              {error}
            </HelperText>
          ) : null}

          <TextInput
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry={!showPassword}
            style={styles.input}
            mode="outlined"
            right={<TextInput.Icon icon={() => (
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#666" onPress={() => setShowPassword(!showPassword)} />
            )} />}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.linkButton}
          >
            Forgot Password?
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('UserSignup')}
            style={styles.linkButton}
          >
            Don't have an account? Sign Up
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#DC3545',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 8,
  },
  successMessage: {
    color: '#4CAF50',
  },
});

export default UserLoginScreen;
