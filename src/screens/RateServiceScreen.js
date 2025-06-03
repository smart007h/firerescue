import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const RateServiceScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Rate Our Service</Text>
      {/* Add your service rating content here */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
});

export default RateServiceScreen; 