import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLastActivity } from '../utils/sessionManager';
import { useAuth } from '../context/AuthContext';

const InactivityWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes in seconds
  const { signOut, userRole } = useAuth();

  useEffect(() => {
    if (!userRole) return;

    const checkInactivity = async () => {
      try {
        const lastActivity = await AsyncStorage.getItem('lastActivityTime');
        if (!lastActivity) return;

        const lastActivityTime = parseInt(lastActivity);
        const now = Date.now();
        const inactiveTime = now - lastActivityTime;
        
        // Show warning if inactive for 1 hour 50 minutes (10 minutes before 2-hour timeout)
        const warningThreshold = 110 * 60 * 1000; // 1 hour 50 minutes
        const logoutThreshold = 120 * 60 * 1000; // 2 hours
        
        if (inactiveTime >= logoutThreshold) {
          // Auto logout
          Alert.alert(
            'Session Expired',
            'You have been logged out due to inactivity.',
            [{ text: 'OK', onPress: () => signOut() }]
          );
        } else if (inactiveTime >= warningThreshold && !showWarning) {
          // Show warning
          setShowWarning(true);
          setCountdown(Math.ceil((logoutThreshold - inactiveTime) / 1000));
        }
      } catch (error) {
        console.error('Error checking inactivity:', error);
      }
    };

    const interval = setInterval(checkInactivity, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [userRole, showWarning, signOut]);

  useEffect(() => {
    if (!showWarning) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setShowWarning(false);
          signOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning, signOut]);

  const handleStayLoggedIn = async () => {
    updateLastActivity();
    setShowWarning(false);
    setCountdown(600);
  };

  const handleLogout = () => {
    setShowWarning(false);
    signOut();
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={showWarning}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Session Timeout Warning</Text>
          <Text style={styles.message}>
            You will be logged out in {formatTime(countdown)} due to inactivity.
          </Text>
          <Text style={styles.subMessage}>
            Do you want to stay logged in?
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.logoutButton]} 
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.stayButton]} 
              onPress={handleStayLoggedIn}
            >
              <Text style={styles.stayButtonText}>Stay Logged In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    margin: 20,
    minWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#D32F2F',
  },
  message: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
    color: '#333',
  },
  subMessage: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stayButton: {
    backgroundColor: '#D32F2F',
  },
  logoutButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  stayButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default InactivityWarning;
