import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Card, Button, ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AIPredictiveService from '../services/aiPredictiveService';
import { LineChart, BarChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

const SmartIncidentAnalysis = ({ incidentData, onAnalysisComplete }) => {
  const [analysis, setAnalysis] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [escalationPrediction, setEscalationPrediction] = useState(null);

  useEffect(() => {
    if (incidentData) {
      performSmartAnalysis();
    }
  }, [incidentData]);

  const performSmartAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel execution of AI analysis
      const [triageResult, riskResult, escalationResult] = await Promise.all([
        AIPredictiveService.performIntelligentTriage(incidentData),
        AIPredictiveService.calculateFireRiskScore({
          latitude: incidentData.latitude,
          longitude: incidentData.longitude,
          timestamp: incidentData.timestamp || new Date()
        }),
        incidentData.id ? AIPredictiveService.predictIncidentEscalation(incidentData) : null
      ]);

      setAnalysis(triageResult);
      setRiskAssessment(riskResult);
      setEscalationPrediction(escalationResult);

      // Notify parent component
      if (onAnalysisComplete) {
        onAnalysisComplete({
          triage: triageResult,
          risk: riskResult,
          escalation: escalationResult
        });
      }
    } catch (error) {
      console.error('Error performing smart analysis:', error);
      Alert.alert('Analysis Error', 'Failed to perform AI analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [incidentData, onAnalysisComplete]);

  const getPriorityColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#DC3545';
      case 'HIGH': return '#FD7E14';
      case 'MEDIUM': return '#FFC107';
      case 'LOW': return '#28A745';
      default: return '#6C757D';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'EXTREME': return '#8B0000';
      case 'HIGH': return '#DC3545';
      case 'MODERATE': return '#FD7E14';
      case 'LOW': return '#FFC107';
      case 'MINIMAL': return '#28A745';
      default: return '#6C757D';
    }
  };

  const renderTriageAnalysis = () => {
    if (!analysis) return null;

    return (
      <Card style={styles.analysisCard}>
        <Card.Title 
          title="AI Triage Analysis" 
          left={(props) => <Ionicons {...props} name="analytics" size={24} color="#007BFF" />}
        />
        <Card.Content>
          <View style={styles.priorityContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(analysis.priorityLevel) }]}>
              <Text style={styles.priorityText}>{analysis.priorityLevel}</Text>
            </View>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(analysis.confidence * 100)}%
            </Text>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Priority Score</Text>
            <ProgressBar 
              progress={analysis.priorityScore} 
              color={getPriorityColor(analysis.priorityLevel)}
              style={styles.progressBar}
            />
            <Text style={styles.scoreValue}>{Math.round(analysis.priorityScore * 100)}/100</Text>
          </View>

          <View style={styles.recommendationContainer}>
            <Text style={styles.sectionTitle}>AI Recommendations</Text>
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationType}>
                {analysis.responseRecommendation.responseType.toUpperCase()} RESPONSE
              </Text>
              <Text style={styles.recommendationText}>
                Units: {analysis.responseRecommendation.recommendedUnits}
              </Text>
              <Text style={styles.recommendationText}>
                ETA: {analysis.responseRecommendation.estimatedResponseTime}
              </Text>
              {analysis.responseRecommendation.specialEquipment.length > 0 && (
                <Text style={styles.recommendationText}>
                  Equipment: {analysis.responseRecommendation.specialEquipment.join(', ')}
                </Text>
              )}
            </View>
          </View>

          {analysis.analysis.media && (
            <View style={styles.mediaAnalysisContainer}>
              <Text style={styles.sectionTitle}>Media Analysis</Text>
              <View style={styles.mediaResults}>
                {analysis.analysis.media.fireDetected && (
                  <View style={styles.detectionBadge}>
                    <Ionicons name="flame" size={16} color="#DC3545" />
                    <Text style={styles.detectionText}>Fire Detected</Text>
                  </View>
                )}
                {analysis.analysis.media.smokeDetected && (
                  <View style={styles.detectionBadge}>
                    <Ionicons name="cloud" size={16} color="#6C757D" />
                    <Text style={styles.detectionText}>Smoke Detected</Text>
                  </View>
                )}
                {analysis.analysis.media.peopleDetected && (
                  <View style={styles.detectionBadge}>
                    <Ionicons name="people" size={16} color="#007BFF" />
                    <Text style={styles.detectionText}>People Detected</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderRiskAssessment = () => {
    if (!riskAssessment) return null;

    const chartData = {
      labels: ['Weather', 'Historical', 'Environmental', 'Location'],
      datasets: [{
        data: [
          riskAssessment.factors.weather.temperature / 50,
          riskAssessment.factors.historical.totalIncidents / 10,
          riskAssessment.factors.environmental.vegetationDryness,
          riskAssessment.riskScore
        ]
      }]
    };

    return (
      <Card style={styles.analysisCard}>
        <Card.Title 
          title="Risk Assessment" 
          left={(props) => <Ionicons {...props} name="warning" size={24} color="#FD7E14" />}
        />
        <Card.Content>
          <View style={styles.riskContainer}>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(riskAssessment.riskLevel) }]}>
              <Text style={styles.riskText}>{riskAssessment.riskLevel} RISK</Text>
            </View>
            <Text style={styles.riskScore}>
              Score: {Math.round(riskAssessment.riskScore * 100)}/100
            </Text>
          </View>

          <BarChart
            data={chartData}
            width={screenWidth - 80}
            height={180}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
              style: {
                borderRadius: 16
              }
            }}
            style={styles.chart}
          />

          <View style={styles.factorsContainer}>
            <Text style={styles.sectionTitle}>Risk Factors</Text>
            <View style={styles.factorItem}>
              <Ionicons name="thermometer" size={20} color="#DC3545" />
              <Text style={styles.factorText}>
                Temperature: {Math.round(riskAssessment.factors.weather.temperature)}°C
              </Text>
            </View>
            <View style={styles.factorItem}>
              <Ionicons name="water" size={20} color="#007BFF" />
              <Text style={styles.factorText}>
                Humidity: {Math.round(riskAssessment.factors.weather.humidity)}%
              </Text>
            </View>
            <View style={styles.factorItem}>
              <Ionicons name="leaf" size={20} color="#28A745" />
              <Text style={styles.factorText}>
                Vegetation Dryness: {Math.round(riskAssessment.factors.environmental.vegetationDryness * 100)}%
              </Text>
            </View>
          </View>

          {riskAssessment.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.sectionTitle}>AI Recommendations</Text>
              {riskAssessment.recommendations.map((rec, index) => (
                <View key={index} style={[styles.recommendationItem, { 
                  borderLeftColor: rec.priority === 'critical' ? '#DC3545' : 
                                  rec.priority === 'high' ? '#FD7E14' : '#FFC107' 
                }]}>
                  <Text style={styles.recommendationAction}>{rec.action}</Text>
                  <Text style={styles.recommendationReason}>{rec.reason}</Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderEscalationPrediction = () => {
    if (!escalationPrediction) return null;

    return (
      <Card style={styles.analysisCard}>
        <Card.Title 
          title="Escalation Prediction" 
          left={(props) => <Ionicons {...props} name="trending-up" size={24} color="#8B0000" />}
        />
        <Card.Content>
          <View style={styles.escalationContainer}>
            <View style={styles.probabilityContainer}>
              <Text style={styles.probabilityLabel}>Escalation Probability</Text>
              <View style={styles.probabilityCircle}>
                <Text style={styles.probabilityText}>
                  {Math.round(escalationPrediction.probability * 100)}%
                </Text>
              </View>
            </View>
            
            <View style={styles.timelineContainer}>
              <Text style={styles.sectionTitle}>Predicted Timeline</Text>
              {escalationPrediction.timeline.map((event, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTime}>{event.time}</Text>
                    <Text style={styles.timelineEvent}>{event.event}</Text>
                  </View>
                </View>
              ))}
            </View>

            {escalationPrediction.preventionActions.length > 0 && (
              <View style={styles.preventionContainer}>
                <Text style={styles.sectionTitle}>Prevention Actions</Text>
                {escalationPrediction.preventionActions.map((action, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.actionButton}
                    onPress={() => Alert.alert('Action', action.description)}
                  >
                    <Ionicons name="shield-checkmark" size={20} color="#28A745" />
                    <Text style={styles.actionText}>{action.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Performing AI Analysis...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={32} color="#007BFF" />
        <Text style={styles.headerTitle}>Smart Emergency Analysis</Text>
        <Text style={styles.headerSubtitle}>AI-Powered Incident Assessment</Text>
      </View>

      {renderTriageAnalysis()}
      {renderRiskAssessment()}
      {renderEscalationPrediction()}

      <Button
        mode="outlined"
        onPress={performSmartAnalysis}
        style={styles.refreshButton}
        icon="refresh"
      >
        Refresh Analysis
      </Button>
    </ScrollView>
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
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  analysisCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priorityText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  confidenceText: {
    fontSize: 14,
    color: '#6C757D',
  },
  scoreContainer: {
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'right',
    marginTop: 4,
  },
  recommendationContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  recommendationBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007BFF',
  },
  recommendationType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  mediaAnalysisContainer: {
    marginTop: 16,
  },
  mediaResults: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detectionText: {
    fontSize: 12,
    color: '#495057',
    marginLeft: 4,
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  riskScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  factorsContainer: {
    marginTop: 16,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
  },
  recommendationsContainer: {
    marginTop: 16,
  },
  recommendationItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  recommendationAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  recommendationReason: {
    fontSize: 12,
    color: '#6C757D',
  },
  escalationContainer: {
    gap: 16,
  },
  probabilityContainer: {
    alignItems: 'center',
  },
  probabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  probabilityCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  probabilityText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timelineContainer: {
    marginTop: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007BFF',
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTime: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '600',
  },
  timelineEvent: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 2,
  },
  preventionContainer: {
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#28A745',
    marginLeft: 8,
    fontWeight: '500',
  },
  refreshButton: {
    margin: 16,
    marginBottom: 32,
  },
});

export default SmartIncidentAnalysis;
