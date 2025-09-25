import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Simplified AR Navigation Component
 * Provides emergency navigation without heavy 3D dependencies
 */
const SimpleARNavigation = ({ incident, userType = 'civilian', onNavigationComplete }) => {
  const [navigationData, setNavigationData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mockLocation, setMockLocation] = useState({
    latitude: 40.7128,
    longitude: -74.0060
  });

  useEffect(() => {
    if (incident) {
      generateNavigationData();
    }
  }, [incident]);

  const generateNavigationData = () => {
    // Mock navigation data for demo purposes
    const distance = Math.floor(Math.random() * 2000) + 100; // 100-2100m
    const duration = Math.floor(distance / 50 * 60); // Assuming 50m/min walking speed
    
    setNavigationData({
      destination: {
        latitude: incident.latitude || 40.7580,
        longitude: incident.longitude || -73.9855,
        address: incident.address || 'Emergency Location'
      },
      distance: distance,
      duration: duration,
      steps: [
        'Head north on Main Street',
        'Turn right on Emergency Avenue',
        'Continue for 500 meters',
        'Destination will be on your left'
      ],
      hazards: [
        { type: 'fire', severity: 'high', message: 'Active fire detected ahead' },
        { type: 'smoke', severity: 'medium', message: 'Heavy smoke in area' }
      ]
    });
  };

  const renderNavigationOverlay = () => (
    <View style={styles.overlay}>
      {/* Top information bar */}
      <View style={styles.topBar}>
        <View style={styles.destinationInfo}>
          <Ionicons name="location" size={20} color="#FFFFFF" />
          <Text style={styles.destinationText}>
            {navigationData?.destination?.address || 'Emergency Location'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setIsVisible(false)}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Navigation stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{navigationData?.distance}m</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.floor(navigationData?.duration / 60)}min</Text>
          <Text style={styles.statLabel}>ETA</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userType}</Text>
          <Text style={styles.statLabel}>Mode</Text>
        </View>
      </View>

      {/* Hazard warnings */}
      {navigationData?.hazards?.map((hazard, index) => (
        <View key={index} style={[styles.hazardAlert, 
          hazard.severity === 'high' ? styles.hazardHigh : styles.hazardMedium
        ]}>
          <Ionicons 
            name={hazard.type === 'fire' ? 'flame' : 'cloud'} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.hazardText}>{hazard.message}</Text>
        </View>
      ))}

      {/* Direction indicator */}
      <View style={styles.directionIndicator}>
        <Ionicons name="arrow-up" size={40} color="#00FF00" />
        <Text style={styles.directionText}>Continue Straight</Text>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => Alert.alert('Voice Navigation', 'Voice guidance activated')}
        >
          <Ionicons name="volume-high" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.primaryButton]}
          onPress={() => {
            Alert.alert('Navigation Complete', 'You have arrived at the destination');
            onNavigationComplete?.();
          }}
        >
          <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Arrive</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => Alert.alert('Emergency', 'Emergency services notified')}
        >
          <Ionicons name="call" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNavigationModal = () => (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.cameraView}>
          {/* Simulated camera view */}
          <View style={styles.mockCameraView}>
            <Text style={styles.mockCameraText}>📱 Camera View</Text>
            <Text style={styles.mockCameraSubtext}>
              AR navigation overlay would appear here
            </Text>
          </View>
          
          {navigationData && renderNavigationOverlay()}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Main interface */}
      <View style={styles.mainContent}>
        <Ionicons name="navigate" size={64} color="#007BFF" />
        <Text style={styles.title}>Emergency Navigation</Text>
        <Text style={styles.description}>
          Navigate safely to the emergency location with real-time guidance
        </Text>
        
        {incident && (
          <View style={styles.incidentInfo}>
            <Text style={styles.incidentTitle}>Incident Details</Text>
            <Text style={styles.incidentText}>
              Location: {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}
            </Text>
            <Text style={styles.incidentText}>
              Type: {incident.type || 'Emergency'}
            </Text>
            <Text style={styles.incidentText}>
              Priority: {incident.priority || 'High'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            generateNavigationData();
            setIsVisible(true);
          }}
        >
          <Ionicons name="play" size={24} color="#FFFFFF" />
          <Text style={styles.startButtonText}>Start AR Navigation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={() => Alert.alert(
            'Standard Navigation',
            'Opening standard map navigation...',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Maps', onPress: () => console.log('Open maps') }
            ]
          )}
        >
          <Ionicons name="map" size={20} color="#007BFF" />
          <Text style={styles.alternativeButtonText}>Use Standard Maps</Text>
        </TouchableOpacity>
      </View>

      {renderNavigationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  incidentInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  incidentText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  startButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  alternativeButtonText: {
    color: '#007BFF',
    fontSize: 14,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  cameraView: {
    flex: 1,
    position: 'relative',
  },
  mockCameraView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  mockCameraText: {
    fontSize: 48,
    marginBottom: 16,
  },
  mockCameraSubtext: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  destinationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  hazardAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  hazardHigh: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
  },
  hazardMedium: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
  },
  hazardText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  directionIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -40 }],
    alignItems: 'center',
  },
  directionText: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  primaryButton: {
    backgroundColor: 'rgba(40, 167, 69, 0.9)',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SimpleARNavigation;
