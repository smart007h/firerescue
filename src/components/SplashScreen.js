import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function CustomSplashScreen({ onFinish }) {
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts
        await Font.loadAsync({
          'Inter-Regular': Inter_400Regular,
          'Inter-Medium': Inter_500Medium,
          'Inter-SemiBold': Inter_600SemiBold,
          'Inter-Bold': Inter_700Bold,
        });
      } catch (e) {
        console.warn('Error loading fonts:', e);
      } finally {
        // Tell the application to render
        onFinish();
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#DC3545" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
}); 