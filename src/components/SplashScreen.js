import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function CustomSplashScreen({ onFinish }) {
  useEffect(() => {
    async function prepare() {
      try {
        // You can add other resource loading logic here if needed
      } catch (e) {
        console.warn('Error loading resources:', e);
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