import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './src/config/supabaseClient';
import { AuthProvider } from './src/context/AuthContext';
import ActivityTracker from './src/components/ActivityTracker';
import InactivityWarning from './src/components/InactivityWarning';

// Import your navigation and other components
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/components/SplashScreen';

// Create a refresh context
export const RefreshContext = createContext();

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [initialState, setInitialState] = useState();

  const refreshApp = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  useEffect(() => {
    async function loadFontsAndNavState() {
      try {
        await Font.loadAsync({
          // Removed Inter fonts loading
        });
        // Restore navigation state
        const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;
        if (state !== undefined) {
          setInitialState(state);
        }
        setIsReady(true);
        SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error loading fonts or nav state:', error);
      }
    }
    loadFontsAndNavState();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        console.log('No session found on app start');
        // Optionally, redirect to login or show a message
      } else {
        console.log('Session restored on app start:', session);
      }
    });
  }, []);

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#DC3545', // Your app's primary color
      accent: '#2D3748',
    },
    // Removed font customization
  };

  if (!isReady) {
    return <CustomSplashScreen onFinish={() => setIsReady(true)} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
          <RefreshContext.Provider value={{ refreshApp }}>
            <NavigationContainer
              initialState={initialState}
              onStateChange={state =>
                AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))
              }
            >
              <ActivityTracker>
                <AppNavigator key={refreshKey} />
                <InactivityWarning />
              </ActivityTracker>
              <StatusBar style="auto" />
            </NavigationContainer>
          </RefreshContext.Provider>
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
