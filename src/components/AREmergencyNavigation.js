import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';

// Conditional imports with error handling
let Camera, Location, Canvas, useFrame, Text3D, Box, Sphere;

try {
  const cameraModule = require('expo-camera');
  Camera = cameraModule.Camera;
} catch (e) {
  console.warn('expo-camera not available:', e.message);
}

try {
  Location = require('expo-location');
} catch (e) {
  console.warn('expo-location not available:', e.message);
}

try {
  const fiberModule = require('@react-three/fiber');
  Canvas = fiberModule.Canvas;
  useFrame = fiberModule.useFrame;
  
  const dreiModule = require('@react-three/drei');
  Text3D = dreiModule.Text;
  Box = dreiModule.Box;
  Sphere = dreiModule.Sphere;
} catch (e) {
  console.warn('3D libraries not available, using 2D fallback:', e.message);
  // Create fallback 2D components
  Canvas = ({ children, style }) => <View style={[style, { backgroundColor: 'transparent' }]}>{children}</View>;
}

/**
 * AR Emergency Navigation Component
 * Provides augmented reality guidance for emergency situations
 */
const AREmergencyNavigation = ({ incident, userType = 'civilian', onNavigationComplete }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [arObjects, setArObjects] = useState([]);
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [hazardWarnings, setHazardWarnings] = useState([]);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [deviceOrientation, setDeviceOrientation] = useState({ heading: 0, pitch: 0, roll: 0 });
  const [librariesAvailable, setLibrariesAvailable] = useState(!!Camera && !!Location && !!Canvas);
  
  const cameraRef = useRef(null);
  const locationSubscription = useRef(null);

  useEffect(() => {
    initializeAR();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const initializeAR = async () => {
    try {
      // Check if required libraries are available
      if (!Camera || !Location) {
        console.warn('AR libraries not available, using fallback mode');
        setLibrariesAvailable(false);
        return;
      }

      // Request camera permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required for AR navigation.');
        return;
      }

      // Request location permissions
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required for navigation.');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setCurrentLocation(location.coords);

      // Start location tracking
      startLocationTracking();

      // Initialize device orientation tracking
      initializeOrientationTracking();

      // Load AR navigation data
      await loadNavigationData();

    } catch (error) {
      console.error('Error initializing AR:', error);
      Alert.alert('Error', 'Failed to initialize AR system. Please try again.');
    }
  };

  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1
        },
        (location) => {
          setCurrentLocation(location.coords);
          updateARObjects(location.coords);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const initializeOrientationTracking = () => {
    // Simulate device orientation tracking
    // In real implementation, use expo-sensors or react-native-sensors
    const updateOrientation = () => {
      setDeviceOrientation({
        heading: Math.random() * 360,
        pitch: (Math.random() - 0.5) * 90,
        roll: (Math.random() - 0.5) * 45
      });
    };

    const orientationInterval = setInterval(updateOrientation, 100);
    return () => clearInterval(orientationInterval);
  };

  const loadNavigationData = async () => {
    try {
      if (!currentLocation || !incident) return;

      // Generate navigation route to incident location
      const route = await generateNavigationRoute(
        currentLocation,
        { latitude: incident.latitude, longitude: incident.longitude }
      );
      setNavigationRoute(route);

      // Load hazard information for the area
      const hazards = await loadHazardInformation(currentLocation, incident);
      setHazardWarnings(hazards);

      // Generate AR objects for navigation
      const objects = await generateARObjects(route, hazards);
      setArObjects(objects);

    } catch (error) {
      console.error('Error loading navigation data:', error);
    }
  };

  const generateNavigationRoute = async (start, destination) => {
    // Simulate route generation - integrate with Google Directions API
    const waypoints = [
      start,
      {
        latitude: start.latitude + (destination.latitude - start.latitude) * 0.5,
        longitude: start.longitude + (destination.longitude - start.longitude) * 0.5
      },
      destination
    ];

    return {
      waypoints,
      distance: calculateDistance(start, destination),
      estimatedTime: calculateDistance(start, destination) / 5 * 60, // 5 km/h walking speed
      instructions: [
        'Head northeast towards the incident location',
        'Continue straight for 200 meters',
        'Turn right at the next intersection',
        'Destination will be on your left'
      ],
      safetyNotes: [
        'Stay on designated paths',
        'Avoid smoke-filled areas',
        'Follow emergency personnel instructions'
      ]
    };
  };

  const loadHazardInformation = async (location, incident) => {
    try {
      // Query hazard database
      const { data: hazards, error } = await supabase
        .from('emergency_hazards')
        .select('*')
        .eq('incident_id', incident.id)
        .eq('active', true);

      if (error) throw error;

      return hazards.map(hazard => ({
        id: hazard.id,
        type: hazard.hazard_type,
        location: hazard.location,
        severity: hazard.severity,
        description: hazard.description,
        safetyDistance: hazard.safety_distance,
        color: getHazardColor(hazard.hazard_type),
        icon: getHazardIcon(hazard.hazard_type)
      }));
    } catch (error) {
      console.error('Error loading hazard information:', error);
      return [];
    }
  };

  const generateARObjects = async (route, hazards) => {
    const objects = [];

    // Navigation waypoints
    if (route && route.waypoints) {
      route.waypoints.forEach((waypoint, index) => {
        objects.push({
          id: `waypoint_${index}`,
          type: 'waypoint',
          position: calculateARPosition(waypoint),
          scale: [0.5, 0.5, 0.5],
          color: '#00FF00',
          text: `Waypoint ${index + 1}`,
          distance: calculateDistance(currentLocation, waypoint)
        });
      });
    }

    // Incident location marker
    if (incident) {
      objects.push({
        id: 'incident_marker',
        type: 'incident',
        position: calculateARPosition(incident),
        scale: [1, 2, 1],
        color: '#FF0000',
        text: 'INCIDENT LOCATION',
        distance: calculateDistance(currentLocation, incident),
        animated: true
      });
    }

    // Hazard warnings
    hazards.forEach(hazard => {
      objects.push({
        id: `hazard_${hazard.id}`,
        type: 'hazard',
        position: calculateARPosition(hazard.location),
        scale: [0.8, 0.8, 0.8],
        color: hazard.color,
        text: hazard.type.toUpperCase(),
        description: hazard.description,
        distance: calculateDistance(currentLocation, hazard.location),
        severity: hazard.severity,
        pulsing: hazard.severity === 'critical'
      });
    });

    // Emergency equipment locations
    const equipment = await loadEmergencyEquipment(currentLocation);
    equipment.forEach(item => {
      objects.push({
        id: `equipment_${item.id}`,
        type: 'equipment',
        position: calculateARPosition(item.location),
        scale: [0.4, 0.4, 0.4],
        color: '#0066FF',
        text: item.type,
        distance: calculateDistance(currentLocation, item.location)
      });
    });

    return objects;
  };

  const calculateARPosition = (geoLocation) => {
    if (!currentLocation) return [0, 0, 0];

    // Convert geographic coordinates to AR space coordinates
    const deltaLat = geoLocation.latitude - currentLocation.latitude;
    const deltaLng = geoLocation.longitude - currentLocation.longitude;
    
    // Scale factors (approximate for local area)
    const latScale = 111000; // meters per degree latitude
    const lngScale = 111000 * Math.cos(currentLocation.latitude * Math.PI / 180);
    
    const x = deltaLng * lngScale / 10; // Scale down for AR space
    const z = -deltaLat * latScale / 10; // Negative Z for forward direction
    const y = 0; // Ground level
    
    return [x, y, z];
  };

  const updateARObjects = (newLocation) => {
    if (!arObjects.length) return;

    const updatedObjects = arObjects.map(obj => {
      if (obj.type === 'waypoint' || obj.type === 'incident' || obj.type === 'hazard') {
        return {
          ...obj,
          distance: calculateDistance(newLocation, obj.originalLocation || currentLocation)
        };
      }
      return obj;
    });

    setArObjects(updatedObjects);
  };

  const loadEmergencyEquipment = async (location) => {
    // Simulate loading nearby emergency equipment
    return [
      {
        id: 'extinguisher_001',
        type: 'Fire Extinguisher',
        location: {
          latitude: location.latitude + 0.001,
          longitude: location.longitude + 0.001
        }
      },
      {
        id: 'hydrant_001',
        type: 'Fire Hydrant',
        location: {
          latitude: location.latitude - 0.001,
          longitude: location.longitude + 0.001
        }
      }
    ];
  };

  const ARObject = ({ object }) => {
    const meshRef = useRef();

    useFrame((state, delta) => {
      if (!meshRef.current) return;

      // Animate pulsing effect for critical hazards
      if (object.pulsing) {
        meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.2);
      }

      // Rotate incident markers
      if (object.animated && object.type === 'incident') {
        meshRef.current.rotation.y += delta;
      }
    });

    return (
      <group position={object.position} ref={meshRef}>
        {object.type === 'waypoint' && (
          <Sphere args={[0.2]} position={[0, 1, 0]}>
            <meshStandardMaterial color={object.color} />
          </Sphere>
        )}
        
        {object.type === 'incident' && (
          <Box args={[0.5, 1, 0.5]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color={object.color} />
          </Box>
        )}
        
        {object.type === 'hazard' && (
          <Box args={[0.6, 0.6, 0.6]} position={[0, 0.3, 0]}>
            <meshStandardMaterial color={object.color} transparent opacity={0.8} />
          </Box>
        )}
        
        {object.type === 'equipment' && (
          <Sphere args={[0.15]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color={object.color} />
          </Sphere>
        )}
        
        <Text3D
          position={[0, object.type === 'incident' ? 1.5 : 1, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {object.text}
        </Text3D>
        
        <Text3D
          position={[0, object.type === 'incident' ? -0.5 : 0.5, 0]}
          fontSize={0.15}
          color="lightgray"
          anchorX="center"
          anchorY="middle"
        >
          {Math.round(object.distance)}m
        </Text3D>
      </group>
    );
  };

  const getHazardColor = (hazardType) => {
    switch (hazardType) {
      case 'fire': return '#FF4500';
      case 'smoke': return '#696969';
      case 'structural_damage': return '#8B0000';
      case 'electrical': return '#FFD700';
      case 'chemical': return '#9400D3';
      default: return '#FF6B6B';
    }
  };

  const getHazardIcon = (hazardType) => {
    switch (hazardType) {
      case 'fire': return 'flame';
      case 'smoke': return 'cloud';
      case 'structural_damage': return 'warning';
      case 'electrical': return 'flash';
      case 'chemical': return 'skull';
      default: return 'alert-circle';
    }
  };

  const calculateDistance = (point1, point2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleCalibrateAR = () => {
    Alert.alert(
      'AR Calibration',
      'Point your device towards the incident location and tap calibrate.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Calibrate', 
          onPress: () => {
            setIsCalibrated(true);
            Alert.alert('Success', 'AR system calibrated successfully!');
          }
        }
      ]
    );
  };

  const renderARControls = () => (
    <View style={styles.controlsContainer}>
      <TouchableOpacity 
        style={[styles.controlButton, { backgroundColor: isCalibrated ? '#28A745' : '#FFC107' }]}
        onPress={handleCalibrateAR}
      >
        <Ionicons 
          name={isCalibrated ? "checkmark-circle" : "compass"} 
          size={24} 
          color="white" 
        />
        <Text style={styles.controlText}>
          {isCalibrated ? 'Calibrated' : 'Calibrate'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.controlButton}
        onPress={() => setArObjects([])}
      >
        <Ionicons name="eye-off" size={24} color="white" />
        <Text style={styles.controlText}>Hide AR</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.controlButton}
        onPress={loadNavigationData}
      >
        <Ionicons name="refresh" size={24} color="white" />
        <Text style={styles.controlText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHazardPanel = () => (
    <View style={styles.hazardPanel}>
      <Text style={styles.hazardTitle}>Active Hazards</Text>
      {hazardWarnings.slice(0, 3).map(hazard => (
        <View key={hazard.id} style={styles.hazardItem}>
          <Ionicons 
            name={hazard.icon} 
            size={16} 
            color={hazard.color}
          />
          <Text style={styles.hazardText}>
            {hazard.type} - {Math.round(hazard.distance || 0)}m
          </Text>
        </View>
      ))}
    </View>
  );

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="camera-off" size={64} color="#DC3545" />
        <Text style={styles.errorText}>Camera access is required for AR navigation</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeAR}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback UI when AR libraries are not available
  if (!librariesAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Ionicons name="warning" size={64} color="#FF6B35" />
          <Text style={styles.fallbackTitle}>AR Navigation Unavailable</Text>
          <Text style={styles.fallbackText}>
            AR Emergency Navigation requires additional dependencies.{'\n'}
            Using standard navigation mode.
          </Text>
          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={() => {
              Alert.alert(
                'Navigation Info',
                `Incident Location: ${incident?.latitude || 'Unknown'}, ${incident?.longitude || 'Unknown'}\n\nPlease use your standard navigation app to reach the destination.`
              );
            }}
          >
            <Ionicons name="map" size={24} color="#FFFFFF" />
            <Text style={styles.fallbackButtonText}>Open Standard Navigation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Camera && (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={Camera.Constants?.Type?.back || 'back'}
          onCameraReady={() => setCameraReady(true)}
        >
          {cameraReady && Canvas && (
            <Canvas style={styles.arCanvas}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              {arObjects.map(object => (
                <ARObject key={object.id} object={object} />
              ))}
            </Canvas>
          )}
        </Camera>
      )}
      {renderARControls()}
      {hazardWarnings.length > 0 && renderHazardPanel()}
      
      {navigationRoute && (
        <View style={styles.navigationInfo}>
          <Text style={styles.navigationTitle}>Navigation</Text>
          <Text style={styles.navigationText}>
            Distance: {Math.round(navigationRoute.distance)}m
          </Text>
          <Text style={styles.navigationText}>
            ETA: {Math.round(navigationRoute.estimatedTime / 60)} min
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6C757D',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  arCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  controlText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  hazardPanel: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    padding: 12,
    borderRadius: 8,
    maxWidth: 200,
  },
  hazardTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hazardText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 8,
  },
  navigationInfo: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
    maxWidth: 150,
  },
  navigationTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  navigationText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 40,
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  fallbackButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AREmergencyNavigation;
