import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ImageBackground, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/auth';

const UserSelectionScreen = ({ navigation }) => {
  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const { data, error } = await getCurrentUser();
      if (error) throw error;
      
      if (data) {
        // User is already logged in, navigate to appropriate screen
        if (data.profile.role === 'firefighter') {
          navigation.replace('FirefighterMain');
        } else {
          navigation.replace('UserMain', { screen: 'Home' });
        }
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    }
  };

  const handleCivilianLogin = () => {
    navigation.navigate('UserLogin');
  };

  const handleFirefighterLogin = () => {
    navigation.navigate('LoginSelection');
  };

  return (
    <ImageBackground
      source={require('../assets/images/fire.jpeg')}
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Select User Type</Text>
            <Text style={styles.subtitle}>Choose how you want to proceed</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleCivilianLogin}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="person" size={32} color="#fff" />
                <Text style={styles.buttonText}>Civilian Login</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.firefighterButton]}
              onPress={handleFirefighterLogin}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="flame" size={32} color="#fff" />
                <Text style={styles.buttonText}>Firefighter Login</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  firefighterButton: {
    backgroundColor: '#DC3545',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default UserSelectionScreen;
