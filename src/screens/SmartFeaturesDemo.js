import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Import our services
import AIPredictiveService from '../services/aiPredictiveService';
import DroneService from '../services/droneService';
import IoTSensorService from '../services/iotSensorService';
import BlockchainCredentialsService from '../services/blockchainCredentialsService';

const SmartFeaturesDemo = ({ navigation }) => {
  const [demoResults, setDemoResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);

  const demoScenarios = [
    {
      id: 'ai_analytics',
      title: 'AI Predictive Analytics',
      description: 'Demonstrate intelligent risk assessment and incident triage',
      icon: 'bulb-outline',
      color: '#007BFF'
    },
    {
      id: 'drone_deployment',
      title: 'Drone Reconnaissance',
      description: 'Deploy drone for aerial intelligence and damage assessment',
      icon: 'airplane',
      color: '#28A745'
    },
    {
      id: 'iot_monitoring',
      title: 'IoT Sensor Network',
      description: 'Monitor smart building sensors and environmental data',
      icon: 'hardware-chip',
      color: '#6F42C1'
    },
    {
      id: 'blockchain_credentials',
      title: 'Blockchain Certificates',
      description: 'Issue and verify immutable emergency credentials',
      icon: 'shield-checkmark',
      color: '#17A2B8'
    },
    {
      id: 'integrated_response',
      title: 'Integrated Emergency Response',
      description: 'Full demonstration of all systems working together',
      icon: 'flash',
      color: '#DC3545'
    }
  ];

  const runAIAnalyticsDemo = async () => {
    setLoading(true);
    try {
      const mockIncident = {
        id: 'demo_incident_001',
        latitude: 40.7128,
        longitude: -74.0060,
        description: 'Large building fire with potential casualties and structural damage',
        media: ['fire_image.jpg', 'smoke_video.mp4'],
        timestamp: new Date().toISOString()
      };

      // Run AI analysis
      const [triage, riskAssessment] = await Promise.all([
        AIPredictiveService.performIntelligentTriage(mockIncident),
        AIPredictiveService.calculateFireRiskScore({
          latitude: mockIncident.latitude,
          longitude: mockIncident.longitude
        })
      ]);

      setDemoResults({
        ...demoResults,
        ai_analytics: {
          triage,
          riskAssessment,
          summary: {
            priorityLevel: triage.priorityLevel,
            riskScore: Math.round(riskAssessment.riskScore * 100),
            confidence: Math.round(triage.confidence * 100),
            recommendedUnits: triage.responseRecommendation.recommendedUnits
          }
        }
      });

      Alert.alert(
        'AI Analysis Complete',
        `Priority: ${triage.priorityLevel}\nRisk Score: ${Math.round(riskAssessment.riskScore * 100)}%\nRecommended Units: ${triage.responseRecommendation.recommendedUnits}`,
        [{ text: 'View Details', onPress: () => setSelectedDemo('ai_analytics') }]
      );
    } catch (error) {
      Alert.alert('Demo Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runDroneDemo = async () => {
    setLoading(true);
    try {
      const mockIncident = {
        id: 'demo_incident_002',
        latitude: 40.7580,
        longitude: -73.9855,
        type: 'fire',
        priority: 'high'
      };

      // Deploy drone
      const deployment = await DroneService.deployDroneForIncident(mockIncident, {
        missionType: 'reconnaissance',
        altitude: 50
      });

      // Simulate damage assessment
      setTimeout(async () => {
        const assessment = await DroneService.performDamageAssessment(deployment.missionId);
        
        setDemoResults({
          ...demoResults,
          drone_deployment: {
            deployment,
            assessment,
            summary: {
              missionId: deployment.missionId,
              droneId: deployment.droneId,
              structuralDamage: assessment.structuralDamage.severity,
              fireExtent: assessment.fireExtent.activeFireAreas,
              evacuationRequired: assessment.evacuation.required
            }
          }
        });

        Alert.alert(
          'Drone Mission Complete',
          `Mission ID: ${deployment.missionId}\nStructural Damage: ${assessment.structuralDamage.severity}\nEvacuation Required: ${assessment.evacuation.required ? 'Yes' : 'No'}`,
          [{ text: 'View Details', onPress: () => setSelectedDemo('drone_deployment') }]
        );
      }, 3000);

      Alert.alert('Drone Deployed', `Mission ID: ${deployment.missionId}\nAssessment in progress...`);
    } catch (error) {
      Alert.alert('Demo Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runIoTDemo = async () => {
    setLoading(true);
    try {
      // Initialize IoT network
      const networkStatus = await IoTSensorService.initializeSensorNetwork();
      
      // Get environmental data
      const environmentalData = await IoTSensorService.getEnvironmentalData(
        { latitude: 40.7128, longitude: -74.0060 },
        ['smoke_detector', 'heat_sensor', 'air_quality']
      );

      setDemoResults({
        ...demoResults,
        iot_monitoring: {
          networkStatus,
          environmentalData,
          summary: {
            connectedSensors: networkStatus.connectedSensors.length,
            riskLevel: environmentalData.riskLevel,
            criticalAlerts: Object.values(environmentalData.data).filter(
              d => d.status === 'critical'
            ).length
          }
        }
      });

      Alert.alert(
        'IoT Network Status',
        `Connected Sensors: ${networkStatus.connectedSensors.length}\nRisk Level: ${environmentalData.riskLevel}\nNetwork Health: ${networkStatus.networkHealth}%`,
        [{ text: 'View Details', onPress: () => setSelectedDemo('iot_monitoring') }]
      );
    } catch (error) {
      Alert.alert('Demo Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runBlockchainDemo = async () => {
    setLoading(true);
    try {
      // Issue a training certificate
      const trainingData = {
        courseId: 'DEMO_FIRE_101',
        courseName: 'Fire Safety Demonstration',
        provider: 'Fire Department Training Center',
        completionDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        competencies: ['Fire Safety', 'Emergency Response', 'Equipment Operation'],
        grade: 'A+',
        instructorId: 'demo_instructor',
        issuingOrganization: 'Demo Fire Department',
        authorizedBy: 'demo_chief'
      };

      const recipientData = {
        id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
        name: 'Demo Firefighter',
        publicKey: 'demo_public_key'
      };

      const certificate = await BlockchainCredentialsService.issueTrainingCertificate(
        trainingData,
        recipientData
      );

      // Verify the certificate
      const verification = await BlockchainCredentialsService.verifyCertificate(
        certificate.certificate.certificateId,
        certificate.blockchainProof.blockHash + ':' + certificate.blockchainProof.transactionId
      );

      setDemoResults({
        ...demoResults,
        blockchain_credentials: {
          certificate,
          verification,
          summary: {
            certificateId: certificate.certificate.certificateId,
            blockHash: certificate.blockchainProof.blockHash,
            verified: verification.valid,
            confidence: Math.round(verification.confidence * 100)
          }
        }
      });

      Alert.alert(
        'Certificate Issued & Verified',
        `Certificate ID: ${certificate.certificate.certificateId.substring(0, 12)}...\nVerified: ${verification.valid}\nConfidence: ${Math.round(verification.confidence * 100)}%`,
        [{ text: 'View Details', onPress: () => setSelectedDemo('blockchain_credentials') }]
      );
    } catch (error) {
      Alert.alert('Demo Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runIntegratedDemo = async () => {
    setLoading(true);
    Alert.alert('Integrated Demo', 'Running full emergency response simulation...');
    
    try {
      // Run all demos in sequence
      await runAIAnalyticsDemo();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await runDroneDemo();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await runIoTDemo();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await runBlockchainDemo();

      Alert.alert(
        'Integrated Demo Complete',
        'All systems have been demonstrated successfully!',
        [{ text: 'View Dashboard', onPress: () => navigation.navigate('SmartEmergencyDashboard') }]
      );
    } catch (error) {
      Alert.alert('Demo Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const runDemo = (demoId) => {
    switch (demoId) {
      case 'ai_analytics':
        runAIAnalyticsDemo();
        break;
      case 'drone_deployment':
        runDroneDemo();
        break;
      case 'iot_monitoring':
        runIoTDemo();
        break;
      case 'blockchain_credentials':
        runBlockchainDemo();
        break;
      case 'integrated_response':
        runIntegratedDemo();
        break;
      default:
        Alert.alert('Demo', 'Demo not implemented yet');
    }
  };

  const renderDemoCard = (demo) => (
    <Card key={demo.id} style={styles.demoCard}>
      <Card.Content>
        <View style={styles.demoHeader}>
          <Ionicons name={demo.icon} size={32} color={demo.color} />
          <View style={styles.demoTitleContainer}>
            <Text style={styles.demoTitle}>{demo.title}</Text>
            <Text style={styles.demoDescription}>{demo.description}</Text>
          </View>
        </View>
        <Button
          mode="contained"
          onPress={() => runDemo(demo.id)}
          disabled={loading}
          style={[styles.demoButton, { backgroundColor: demo.color }]}
        >
          Run Demo
        </Button>
        {demoResults[demo.id] && (
          <Button
            mode="outlined"
            onPress={() => setSelectedDemo(demo.id)}
            style={styles.viewResultsButton}
          >
            View Results
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  const renderResultsModal = () => {
    if (!selectedDemo || !demoResults[selectedDemo]) return null;

    const result = demoResults[selectedDemo];
    
    return (
      <Modal
        visible={!!selectedDemo}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDemo(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demo Results</Text>
              <TouchableOpacity
                onPress={() => setSelectedDemo(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.resultText}>
                {JSON.stringify(result.summary, null, 2)}
              </Text>
            </ScrollView>
          </View>  
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Features Demo</Text>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Running Demo...</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        <Text style={styles.subtitle}>
          Experience the next generation of emergency response technology
        </Text>

        {demoScenarios.map(renderDemoCard)}
      </ScrollView>

      {renderResultsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  demoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  demoTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  demoDescription: {
    fontSize: 14,
    color: '#6C757D',
  },
  demoButton: {
    marginBottom: 8,
  },
  viewResultsButton: {
    marginTop: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  resultText: {
    fontSize: 14,
    color: '#495057',
    fontFamily: 'monospace',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
});

export default SmartFeaturesDemo;
