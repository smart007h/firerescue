import 'react-native-reanimated';
import 'react-native-gesture-handler';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as Font from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Import your navigation and other components
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/components/SplashScreen';

// Create a refresh context
export const RefreshContext = createContext();

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshApp = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Inter-Regular': Inter_400Regular,
          'Inter-Medium': Inter_500Medium,
          'Inter-SemiBold': Inter_600SemiBold,
          'Inter-Bold': Inter_700Bold,
        });
        setIsReady(true);
        SplashScreen.hideAsync();
      } catch (error) {
        console.error('Error loading fonts:', error);
      }
    }
    
    loadFonts();
  }, []);

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#DC3545', // Your app's primary color
      accent: '#2D3748',
    },
    fonts: {
      regular: {
        fontFamily: 'Inter-Regular',
      },
      medium: {
        fontFamily: 'Inter-Medium',
      },
      bold: {
        fontFamily: 'Inter-Bold',
      },
      labelLarge: {
        fontFamily: 'Inter-Medium',
      },
      labelMedium: {
        fontFamily: 'Inter-Medium',
      },
      labelSmall: {
        fontFamily: 'Inter-Regular',
      },
      titleLarge: {
        fontFamily: 'Inter-Bold',
      },
      titleMedium: {
        fontFamily: 'Inter-SemiBold',
      },
      titleSmall: {
        fontFamily: 'Inter-Medium',
      },
      bodyLarge: {
        fontFamily: 'Inter-Regular',
      },
      bodyMedium: {
        fontFamily: 'Inter-Regular',
      },
      bodySmall: {
        fontFamily: 'Inter-Regular',
      },
    },
  };

  if (!isReady) {
    return <CustomSplashScreen onFinish={() => setIsReady(true)} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <RefreshContext.Provider value={{ refreshApp }}>
            <NavigationContainer>
              <AppNavigator key={refreshKey} />
              <StatusBar style="auto" />
            </NavigationContainer>
          </RefreshContext.Provider>
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
