import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const LoginSelectionScreen = ({ navigation }) => {
  return (
    <ImageBackground
      source={require('../assets/images/fire.jpeg')}
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Login Type</Text>
            <Text style={styles.subtitle}>Choose your role to continue</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('FirefighterLogin')}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="flame" size={32} color="#fff" />
                <Text style={styles.buttonText}>Station Login</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dispatcherButton]}
              onPress={() => navigation.navigate('DispatcherLogin')}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="radio" size={32} color="#fff" />
                <Text style={styles.buttonText}>Dispatcher Login</Text>
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
    backgroundColor: '#DC3545',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  dispatcherButton: {
    backgroundColor: '#007AFF',
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

export default LoginSelectionScreen; 