import React, { useEffect, useRef } from 'react';
import { AppState, PanResponder, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLastActivity, isSessionExpired, clearAllSessions } from '../utils/sessionManager';
import { useAuth } from '../context/AuthContext';

const ActivityTracker = ({ children }) => {
  const appState = useRef(AppState.currentState);
  const { userRole, signOut } = useAuth();
  const inactivityTimer = useRef(null);

  // Track user interactions
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      updateLastActivity();
      return false; // Don't consume the touch event
    },
    onMoveShouldSetPanResponder: () => {
      updateLastActivity();
      return false;
    },
  });

  // Check session validity periodically
  const checkSessionValidity = async () => {
    if (userRole) {
      const expired = await isSessionExpired(userRole);
      if (expired) {
        await signOut();
      }
    }
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - check session validity
      checkSessionValidity();
    }
    
    if (nextAppState === 'active') {
      updateLastActivity();
    }
    
    appState.current = nextAppState;
  };

  useEffect(() => {
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic session checking (every 2 minutes)
    const sessionCheckInterval = setInterval(checkSessionValidity, 2 * 60 * 1000);

    // Set up inactivity timer (check every 30 seconds)
    const activityCheckInterval = setInterval(async () => {
      if (userRole) {
        const lastActivity = await AsyncStorage.getItem('lastActivityTime');
        const lastActivityTime = lastActivity ? parseInt(lastActivity) : Date.now();
        const now = Date.now();
        
        // If inactive for more than 1 hour 50 minutes, warn user
        if ((now - lastActivityTime) > (110 * 60 * 1000)) {
          // Could show a warning modal here
        }
      }
    }, 30 * 1000);

    return () => {
      subscription?.remove();
      clearInterval(sessionCheckInterval);
      clearInterval(activityCheckInterval);
    };
  }, [userRole]);

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

export default ActivityTracker;
