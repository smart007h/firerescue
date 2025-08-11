import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';

// Session timeout configurations (in milliseconds)
export const SESSION_TIMEOUT = {
  DISPATCHER: 8 * 60 * 60 * 1000, // 8 hours
  FIREFIGHTER: 12 * 60 * 60 * 1000, // 12 hours  
  USER: 24 * 60 * 60 * 1000, // 24 hours
  INACTIVITY: 2 * 60 * 60 * 1000, // 2 hours of inactivity
};

// Track last activity
let lastActivityTime = Date.now();

export const updateLastActivity = () => {
  lastActivityTime = Date.now();
  AsyncStorage.setItem('lastActivityTime', lastActivityTime.toString());
};

export const getLastActivity = async () => {
  try {
    const stored = await AsyncStorage.getItem('lastActivityTime');
    return stored ? parseInt(stored) : Date.now();
  } catch (error) {
    return Date.now();
  }
};

export const isSessionExpired = async (role = 'user') => {
  try {
    const sessionStr = await AsyncStorage.getItem('supabase-session');
    if (!sessionStr) return true;

    const session = JSON.parse(sessionStr);
    const now = Date.now();
    
    // Check token expiration
    if (session.expires_at && session.expires_at * 1000 < now) {
      return true;
    }

    // Check session timeout based on role
    let sessionTimeout;
    switch (role) {
      case 'dispatcher':
        sessionTimeout = SESSION_TIMEOUT.DISPATCHER;
        break;
      case 'firefighter':
        sessionTimeout = SESSION_TIMEOUT.FIREFIGHTER;
        break;
      default:
        sessionTimeout = SESSION_TIMEOUT.USER;
    }

    if (session.created_at && (now - new Date(session.created_at).getTime()) > sessionTimeout) {
      return true;
    }

    // Check inactivity timeout
    const lastActivity = await getLastActivity();
    if ((now - lastActivity) > SESSION_TIMEOUT.INACTIVITY) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking session expiration:', error);
    return true; // Assume expired on error
  }
};

export const validateAndRefreshSession = async (role = 'user') => {
  try {
    const expired = await isSessionExpired(role);
    if (expired) {
      await clearAllSessions();
      return null;
    }

    // Try to refresh token if close to expiration
    const sessionStr = await AsyncStorage.getItem('supabase-session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      const timeUntilExpiry = (session.expires_at * 1000) - Date.now();
      
      // Refresh if less than 10 minutes until expiry
      if (timeUntilExpiry < 10 * 60 * 1000) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          await clearAllSessions();
          return null;
        }
        if (data.session) {
          await AsyncStorage.setItem('supabase-session', JSON.stringify(data.session));
          return data.session;
        }
      }
      
      return session;
    }

    return null;
  } catch (error) {
    console.error('Error validating session:', error);
    await clearAllSessions();
    return null;
  }
};

export const clearAllSessions = async () => {
  try {
    const keysToRemove = [
      'supabase-session',
      'dispatcherData',
      'stationData',
      'stationId',
      'userRole',
      'userId',
      'userEmail',
      'userData',
      'lastActivityTime',
      'user-profile'
    ];

    await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error clearing sessions:', error);
  }
};

export const createSession = async (sessionData, role = 'user') => {
  try {
    const now = Date.now();
    const sessionWithTimestamp = {
      ...sessionData,
      created_at: new Date().toISOString(),
      last_activity: now,
      role
    };

    await AsyncStorage.setItem('supabase-session', JSON.stringify(sessionWithTimestamp));
    await AsyncStorage.setItem('lastActivityTime', now.toString());
    
    return sessionWithTimestamp;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
};

// Hook for components to use session validation
export const useSessionValidation = (role = 'user') => {
  const [isValid, setIsValid] = React.useState(true);
  
  React.useEffect(() => {
    const validateSession = async () => {
      const session = await validateAndRefreshSession(role);
      setIsValid(!!session);
    };

    validateSession();
    
    // Check every 5 minutes
    const interval = setInterval(validateSession, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [role]);

  return isValid;
};
