import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal
} from 'react-native';
import { Card, FAB, Portal, Provider, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

// Import our new services
import AIPredictiveService from '../services/aiPredictiveService';
import DroneService from '../services/droneService';
import IoTSensorService from '../services/iotSensorService';
import BlockchainCredentialsService from '../services/blockchainCredentialsService';

// Import components
import SmartIncidentAnalysis from '../components/SmartIncidentAnalysis';
import AREmergencyNavigation from '../components/AREmergencyNavigation';
import SimpleARNavigation from '../components/SimpleARNavigation';

const SmartEmergencyDashboard = ({ navigation, userType = 'dispatcher' }) => {
  // Get screen dimensions safely inside the component
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [dashboardData, setDashboardData] = useState({
    aiAnalytics: null,
    droneStatus: null,
    iotSensors: null,
    blockchainStats: null
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = useCallback(async () => {
    try {
      setLoading(true);
      
      // Initialize all services in parallel
      const [aiData, droneData, iotData, blockchainData] = await Promise.allSettled([
        loadAIAnalytics(),
        loadDroneStatus(),
        loadIoTSensorData(),
        loadBlockchainStats()
      ]);

      setDashboardData({
        aiAnalytics: aiData.status === 'fulfilled' ? aiData.value : null,
        droneStatus: droneData.status === 'fulfilled' ? droneData.value : null,
        iotSensors: iotData.status === 'fulfilled' ? iotData.value : null,
        blockchainStats: blockchainData.status === 'fulfilled' ? blockchainData.value : null
      });
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAIAnalytics = async () => {
    // Simulate getting recent incidents for AI analysis
    const recentIncidents = [
      {
        id: '1',
        latitude: 40.7128,
        longitude: -74.0060,
        description: 'Building fire with potential casualties',
        media: ['image1.jpg', 'video1.mp4']
      }
    ];

    const analytics = [];
    for (const incident of recentIncidents) {
      // Ensure incident has required location data
      const incidentWithLocation = {
        ...incident,
        location: {
          latitude: incident.latitude || 40.7128, // Default to NYC if missing
          longitude: incident.longitude || -74.0060
        }
      };
      
      const analysis = await AIPredictiveService.performIntelligentTriage(incidentWithLocation);
      const riskAssessment = await AIPredictiveService.calculateFireRiskScore({
        latitude: incidentWithLocation.location.latitude,
        longitude: incidentWithLocation.location.longitude
      });
      
      analytics.push({
        incident,
        analysis,
        riskAssessment
      });
    }

    return {
      totalAnalyses: analytics.length,
      criticalIncidents: analytics.filter(a => a.analysis.priorityLevel === 'CRITICAL').length,
      averageRiskScore: analytics.reduce((sum, a) => sum + a.riskAssessment.riskScore, 0) / analytics.length,
      predictions: analytics
    };
  };

  const loadDroneStatus = async () => {
    // Simulate drone fleet status
    return {
      totalDrones: 5,
      activeMissions: 2,
      availableDrones: 3,
      batteryStatus: [
        { id: 'drone_001', battery: 85, status: 'active' },
        { id: 'drone_002', battery: 92, status: 'standby' },
        { id: 'drone_003', battery: 67, status: 'active' },
        { id: 'drone_004', battery: 78, status: 'standby' },
        { id: 'drone_005', battery: 15, status: 'charging' }
      ],
      missionStats: {
        completedToday: 8,
        averageResponseTime: 4.5,
        successRate: 94.2
      }
    };
  };

  const loadIoTSensorData = async () => {
    const location = { latitude: 40.7128, longitude: -74.0060 };
    const sensorData = await IoTSensorService.getEnvironmentalData(location);
    
    return {
      connectedSensors: 24,
      activeSensors: 22,
      criticalAlerts: 2,
      environmentalData: sensorData,
      sensorHealth: {
        operational: 22,
        warning: 2,
        offline: 0
      }
    };
  };

  const loadBlockchainStats = async () => {
    return {
      totalCertificates: 156,
      incidentRecords: 89,
      verificationRequests: 23,
      blockchainIntegrity: 100,
      recentActivity: {
        certificatesIssued: 5,
        recordsCreated: 12,
        verificationsPerformed: 8
      }
    };
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeDashboard();
    setRefreshing(false);
  }, [initializeDashboard]);

  const renderAIAnalyticsCard = () => {
    if (!dashboardData.aiAnalytics) return null;

    const { aiAnalytics } = dashboardData;
    
    return (
      <Card style={styles.dashboardCard}>
        <Card.Title 
          title="AI Predictive Analytics" 
          subtitle={`${aiAnalytics.totalAnalyses} Recent Analyses`}
          left={(props) => <Ionicons {...props} name="bulb-outline" size={24} color="#007BFF" />}
        />
        <Card.Content>
          <View style={styles.metricGrid}>
            <TouchableOpacity 
              style={[styles.metricItem, { backgroundColor: '#FFF3CD' }]}
              onPress={() => setSelectedMetric('critical_incidents')}
            >
              <Text style={styles.metricValue}>{aiAnalytics.criticalIncidents}</Text>
              <Text style={styles.metricLabel}>Critical Incidents</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.metricItem, { backgroundColor: '#D1ECF1' }]}
              onPress={() => setSelectedMetric('risk_score')}
            >
              <Text style={styles.metricValue}>
                {Math.round(aiAnalytics.averageRiskScore * 100)}%
              </Text>
              <Text style={styles.metricLabel}>Avg Risk Score</Text>
            </TouchableOpacity>
          </View>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('AIAnalytics')}
            style={styles.actionButton}
          >
            View Detailed Analytics
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const renderDroneStatusCard = () => {
    if (!dashboardData.droneStatus) return null;

    const { droneStatus } = dashboardData;
    
    const chartData = {
      labels: ['Active', 'Standby', 'Charging'],
      datasets: [{
        data: [
          droneStatus.batteryStatus.filter(d => d.status === 'active').length,
          droneStatus.batteryStatus.filter(d => d.status === 'standby').length,
          droneStatus.batteryStatus.filter(d => d.status === 'charging').length
        ]
      }]
    };

    return (
      <Card style={styles.dashboardCard}>
        <Card.Title 
          title="Drone Fleet Status" 
          subtitle={`${droneStatus.activeMissions} Active Missions`}
          left={(props) => <Ionicons {...props} name="airplane" size={24} color="#28A745" />}
        />
        <Card.Content>
          <PieChart
            data={[
              { name: 'Active', population: chartData.datasets[0].data[0], color: '#28A745', legendFontColor: '#7F7F7F' },
              { name: 'Standby', population: chartData.datasets[0].data[1], color: '#FFC107', legendFontColor: '#7F7F7F' },
              { name: 'Charging', population: chartData.datasets[0].data[2], color: '#DC3545', legendFontColor: '#7F7F7F' }
            ]}
            width={screenWidth - 80}
            height={120}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('DroneControl')}
            style={styles.actionButton}
          >
            Control Drones
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const renderIoTSensorCard = () => {
    if (!dashboardData.iotSensors) return null;

    const { iotSensors } = dashboardData;
    
    return (
      <Card style={styles.dashboardCard}>
        <Card.Title 
          title="IoT Sensor Network" 
          subtitle={`${iotSensors.connectedSensors} Connected Sensors`}
          left={(props) => <Ionicons {...props} name="hardware-chip" size={24} color="#6F42C1" />}
        />
        <Card.Content>
          <View style={styles.sensorGrid}>
            <View style={[styles.sensorStatus, { backgroundColor: '#D4EDDA' }]}>
              <Text style={styles.sensorValue}>{iotSensors.sensorHealth.operational}</Text>
              <Text style={styles.sensorLabel}>Operational</Text>
            </View>
            <View style={[styles.sensorStatus, { backgroundColor: '#FFF3CD' }]}>
              <Text style={styles.sensorValue}>{iotSensors.sensorHealth.warning}</Text>
              <Text style={styles.sensorLabel}>Warning</Text>
            </View>
            <View style={[styles.sensorStatus, { backgroundColor: '#F8D7DA' }]}>
              <Text style={styles.sensorValue}>{iotSensors.criticalAlerts}</Text>
              <Text style={styles.sensorLabel}>Critical</Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('IoTMonitoring')}
            style={styles.actionButton}
          >
            Monitor Sensors
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const renderBlockchainCard = () => {
    if (!dashboardData.blockchainStats) return null;

    const { blockchainStats } = dashboardData;
    
    return (
      <Card style={styles.dashboardCard}>
        <Card.Title 
          title="Blockchain Records" 
          subtitle={`${blockchainStats.totalCertificates} Certificates Issued`}
          left={(props) => <Ionicons {...props} name="shield-checkmark" size={24} color="#17A2B8" />}
        />
        <Card.Content>
          <View style={styles.blockchainGrid}>
            <View style={styles.blockchainItem}>
              <Text style={styles.blockchainValue}>{blockchainStats.incidentRecords}</Text>
              <Text style={styles.blockchainLabel}>Incident Records</Text>
            </View>
            <View style={styles.blockchainItem}>
              <Text style={styles.blockchainValue}>{blockchainStats.verificationRequests}</Text>
              <Text style={styles.blockchainLabel}>Verifications</Text>
            </View>
            <View style={styles.blockchainItem}>
              <Text style={styles.blockchainValue}>{blockchainStats.blockchainIntegrity}%</Text>
              <Text style={styles.blockchainLabel}>Integrity</Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('BlockchainVerification')}
            style={styles.actionButton}
          >
            Verify Credentials
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <Portal>
      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'play-circle',
            label: 'Features Demo',
            onPress: () => navigation.navigate('SmartFeaturesDemo'),
          },
          {
            icon: 'bulb-outline',
            label: 'AI Analysis',
            onPress: () => navigation.navigate('SmartIncidentAnalysis'),
          },
          {
            icon: 'airplane',
            label: 'Deploy Drone',
            onPress: () => handleDeployDrone(),
          },
          {
            icon: 'eye',
            label: 'AR Navigation',
            onPress: () => handleARNavigation(),
          },
          {
            icon: 'shield-checkmark',
            label: 'Issue Certificate',
            onPress: () => handleIssueCertificate(),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        onPress={() => {
          if (fabOpen) {
            // do something if the speed dial is open
          }
        }}
      />
    </Portal>
  );

  const handleDeployDrone = async () => {
    Alert.alert(
      'Deploy Drone',
      'Select deployment type:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reconnaissance', onPress: () => deployDroneForMission('reconnaissance') },
        { text: 'Search & Rescue', onPress: () => deployDroneForMission('search_rescue') },
        { text: 'Damage Assessment', onPress: () => deployDroneForMission('damage_assessment') }
      ]
    );
  };

  const deployDroneForMission = async (missionType) => {
    try {
      // Simulate incident for demo
      const mockIncident = {
        id: 'demo_incident',
        latitude: 40.7128,
        longitude: -74.0060,
        type: 'fire',
        priority: 'high'
      };

      const deployment = await DroneService.deployDroneForIncident(mockIncident, {
        missionType,
        altitude: 50
      });

      Alert.alert(
        'Drone Deployed',
        `Mission ID: ${deployment.missionId}\nEstimated Arrival: ${deployment.estimatedArrival}`,
        [
          { text: 'OK' },
          { text: 'View Live Stream', onPress: () => navigation.navigate('DroneStream', { missionId: deployment.missionId }) }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to deploy drone: ${error.message}`);
    }
  };

  const handleARNavigation = () => {
    // Show AR navigation options
    Alert.alert(
      'AR Navigation',
      'Choose navigation mode:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Full AR Mode', 
          onPress: () => {
            // Try to use full AR component
            setModalVisible(true);
            setSelectedMetric('ar_navigation');
          }
        },
        { 
          text: 'Simple AR Mode', 
          onPress: () => {
            // Use simplified AR component
            setModalVisible(true);
            setSelectedMetric('simple_ar_navigation');
          }
        }
      ]
    );
  };

  const handleIssueCertificate = () => {
    Alert.alert(
      'Issue Certificate',
      'Select certificate type:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Training Certificate', onPress: () => issueCertificate('training') },
        { text: 'Response Certificate', onPress: () => issueCertificate('response') },
        { text: 'Equipment Certificate', onPress: () => issueCertificate('equipment') }
      ]
    );
  };

  const issueCertificate = async (certificateType) => {
    try {
      // Mock certificate data
      const trainingData = {
        courseId: 'FIRE_101',
        courseName: 'Basic Fire Safety',
        provider: 'Fire Department Training Center',
        completionDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        competencies: ['Fire Safety', 'Emergency Response'],
        grade: 'A',
        instructorId: 'instructor_001',
        issuingOrganization: 'Fire Department',
        authorizedBy: 'chief_001'
      };

      const recipientData = {
        id: 'recipient_001',
        name: 'John Doe',
        publicKey: 'mock_public_key'
      };

      const certificate = await BlockchainCredentialsService.issueTrainingCertificate(
        trainingData,
        recipientData
      );

      Alert.alert(
        'Certificate Issued',
        `Certificate ID: ${certificate.certificate.certificateId}\nBlockchain Hash: ${certificate.blockchainProof.blockHash}`,
        [
          { text: 'OK' },
          { text: 'View Certificate', onPress: () => navigation.navigate('CertificateView', { certificate }) }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to issue certificate: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading Smart Dashboard...</Text>
      </View>
    );
  }

  return (
    <Provider>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007BFF']}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Smart Emergency Control Center</Text>
            <Text style={styles.headerSubtitle}>AI-Powered Emergency Management</Text>
          </View>

          {/* Quick Navigation Menu */}
          <View style={styles.quickNavContainer}>
            <TouchableOpacity
              style={styles.quickNavButton}
              onPress={() => navigation.navigate('DispatcherDashboard')}
            >
              <Ionicons name="grid-outline" size={20} color="#007BFF" />
              <Text style={styles.quickNavText}>Classic Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickNavButton}
              onPress={() => navigation.navigate('SmartFeaturesDemo')}
            >
              <Ionicons name="flash-outline" size={20} color="#007BFF" />
              <Text style={styles.quickNavText}>Demo Features</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickNavButton}
              onPress={() => navigation.navigate('SimpleARNavigation')}
            >
              <Ionicons name="compass-outline" size={20} color="#007BFF" />
              <Text style={styles.quickNavText}>AR Navigation</Text>
            </TouchableOpacity>
          </View>

          {renderAIAnalyticsCard()}
          {renderDroneStatusCard()}
          {renderIoTSensorCard()}
          {renderBlockchainCard()}

          {/* Real-time Activity Feed */}
          <Card style={styles.dashboardCard}>
            <Card.Title 
              title="Real-time Activity"
              left={(props) => <Ionicons {...props} name="pulse" size={24} color="#DC3545" />}
            />
            <Card.Content>
              <View style={styles.activityFeed}>
                <View style={styles.activityItem}>
                  <Ionicons name="alert-circle" size={16} color="#DC3545" />
                  <Text style={styles.activityText}>High temperature detected - Sensor ID: TEMP_001</Text>
                  <Text style={styles.activityTime}>2 min ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <Ionicons name="airplane" size={16} color="#28A745" />
                  <Text style={styles.activityText}>Drone mission completed - Incident #12345</Text>
                  <Text style={styles.activityTime}>5 min ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#17A2B8" />
                  <Text style={styles.activityText}>Training certificate issued to John Smith</Text>
                  <Text style={styles.activityTime}>10 min ago</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>

        {renderQuickActions()}

        {/* Modal for detailed metrics */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedMetric === 'ar_navigation' && (
                <AREmergencyNavigation
                  incident={{ latitude: 40.7580, longitude: -73.9855, type: 'fire', priority: 'high' }}
                  userType="dispatcher"
                  onNavigationComplete={() => setModalVisible(false)}
                />
              )}
              {selectedMetric === 'simple_ar_navigation' && (
                <SimpleARNavigation
                  incident={{ latitude: 40.7580, longitude: -73.9855, type: 'fire', priority: 'high' }}
                  userType="dispatcher"
                  onNavigationComplete={() => setModalVisible(false)}
                />
              )}
              {!selectedMetric?.includes('ar_navigation') && (
                <>
                  <Text style={styles.modalTitle}>Detailed Metrics</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
  quickNavContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  quickNavButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickNavText: {
    fontSize: 12,
    color: '#007BFF',
    marginTop: 4,
    textAlign: 'center',
  },
  dashboardCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 4,
  },
  sensorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sensorStatus: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  sensorValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  sensorLabel: {
    fontSize: 10,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 2,
  },
  blockchainGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  blockchainItem: {
    flex: 1,
    alignItems: 'center',
  },
  blockchainValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#17A2B8',
  },
  blockchainLabel: {
    fontSize: 10,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 2,
  },
  actionButton: {
    marginTop: 8,
  },
  activityFeed: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#6C757D',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default SmartEmergencyDashboard;
