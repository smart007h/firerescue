import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SafetyGuidelinesScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Guidelines</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.guidelineItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFE6E6' }]}>
              <Ionicons name="flame" size={24} color="#DC3545" />
            </View>
            <View style={styles.guidelineContent}>
              <Text style={styles.guidelineTitle}>Fire Prevention</Text>
              <Text style={styles.guidelineText}>
                • Install smoke detectors on every floor{'\n'}
                • Keep fire extinguishers readily available{'\n'}
                • Create and practice a fire escape plan{'\n'}
                • Never leave cooking unattended{'\n'}
                • Keep flammable items away from heat sources
              </Text>
            </View>
          </View>

          <View style={styles.guidelineItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="warning" size={24} color="#FFA000" />
            </View>
            <View style={styles.guidelineContent}>
              <Text style={styles.guidelineTitle}>Emergency Response</Text>
              <Text style={styles.guidelineText}>
                • Stay calm and assess the situation{'\n'}
                • Call emergency services immediately{'\n'}
                • Follow evacuation procedures{'\n'}
                • Help others if safe to do so{'\n'}
                • Meet at designated assembly points
              </Text>
            </View>
          </View>

          <View style={styles.guidelineItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="medkit" size={24} color="#4CAF50" />
            </View>
            <View style={styles.guidelineContent}>
              <Text style={styles.guidelineTitle}>First Aid Basics</Text>
              <Text style={styles.guidelineText}>
                • Keep a well-stocked first aid kit{'\n'}
                • Learn basic first aid techniques{'\n'}
                • Know emergency contact numbers{'\n'}
                • Understand CPR basics{'\n'}
                • Recognize common emergency signs
              </Text>
            </View>
          </View>

          <View style={styles.guidelineItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8EAF6' }]}>
              <Ionicons name="home" size={24} color="#3949AB" />
            </View>
            <View style={styles.guidelineContent}>
              <Text style={styles.guidelineTitle}>Home Safety</Text>
              <Text style={styles.guidelineText}>
                • Secure all entry points{'\n'}
                • Maintain clear evacuation routes{'\n'}
                • Regular safety equipment checks{'\n'}
                • Proper storage of hazardous materials{'\n'}
                • Keep emergency contacts visible
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC3545',
    paddingVertical: 16,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
  },
});

export default SafetyGuidelinesScreen; 