import { supabase } from '../config/supabaseClient';
import * as Location from 'expo-location';

/**
 * AI-Powered Predictive Analytics Service
 * Provides intelligent risk assessment and resource optimization
 */
class AIPredictiveService {
  constructor() {
    this.riskFactors = {
      weather: ['temperature', 'humidity', 'windSpeed', 'precipitation'],
      location: ['buildingType', 'populationDensity', 'proximityToRisk'],
      historical: ['previousIncidents', 'seasonalPatterns', 'timeOfDay'],
      environmental: ['droughtIndex', 'vegetationDryness', 'airQuality']
    };
  }

  /**
   * Calculate fire risk score for a given location
   * @param {Object} locationData - Location and environmental data
   * @returns {Promise<Object>} Risk assessment with score and recommendations
   */
  async calculateFireRiskScore(locationData = {}) {
    try {
      // Provide default location data if not provided or incomplete
      const defaultLocation = {
        latitude: 40.7128, // NYC default
        longitude: -74.0060,
        timestamp: new Date()
      };
      
      const { 
        latitude = defaultLocation.latitude, 
        longitude = defaultLocation.longitude, 
        timestamp = defaultLocation.timestamp 
      } = locationData;
      
      // Gather risk factors
      const weatherData = await this.getWeatherData(latitude, longitude);
      const historicalData = await this.getHistoricalIncidents(latitude, longitude);
      const environmentalData = await this.getEnvironmentalFactors(latitude, longitude);
      
      // Calculate weighted risk score
      const riskScore = this.computeRiskScore({
        weather: weatherData,
        historical: historicalData,
        environmental: environmentalData,
        location: { latitude, longitude },
        timestamp
      });

      // Generate AI recommendations
      const recommendations = await this.generateRecommendations(riskScore, locationData);

      return {
        riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        recommendations,
        factors: {
          weather: weatherData,
          historical: historicalData,
          environmental: environmentalData
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating fire risk score:', error);
      // Return safe default values instead of throwing
      return {
        riskScore: 0.5,
        riskLevel: 'MODERATE',
        recommendations: ['Monitor conditions', 'Standard precautions'],
        factors: {
          weather: { score: 0.1, conditions: 'unknown' },
          historical: { score: 0.1, incidents: 0 },
          environmental: { score: 0.1, factors: 'standard' }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Predict optimal resource allocation for incidents
   * @param {Array} activeIncidents - Current active incidents
   * @param {Array} availableResources - Available firefighting resources
   * @returns {Promise<Object>} Optimal resource allocation plan
   */
  async optimizeResourceAllocation(activeIncidents, availableResources) {
    try {
      const allocationPlan = {
        assignments: [],
        efficiency: 0,
        estimatedResponseTimes: {},
        recommendations: []
      };

      // Sort incidents by priority and risk score
      const prioritizedIncidents = activeIncidents.sort((a, b) => 
        (b.priority * b.riskScore) - (a.priority * a.riskScore)
      );

      // Assign resources using AI optimization algorithm
      for (const incident of prioritizedIncidents) {
        const optimalResource = await this.findOptimalResource(
          incident, 
          availableResources, 
          allocationPlan.assignments
        );

        if (optimalResource) {
          allocationPlan.assignments.push({
            incidentId: incident.id,
            resourceId: optimalResource.id,
            estimatedResponseTime: optimalResource.estimatedResponseTime,
            confidence: optimalResource.confidence
          });

          // Remove assigned resource from available pool
          availableResources = availableResources.filter(r => r.id !== optimalResource.id);
        }
      }

      // Calculate overall efficiency
      allocationPlan.efficiency = this.calculateAllocationEfficiency(allocationPlan.assignments);
      
      // Generate strategic recommendations
      allocationPlan.recommendations = this.generateStrategicRecommendations(
        allocationPlan, 
        activeIncidents, 
        availableResources
      );

      return allocationPlan;
    } catch (error) {
      console.error('Error optimizing resource allocation:', error);
      throw new Error('Failed to optimize resource allocation');
    }
  }

  /**
   * Intelligent incident triage using AI
   * @param {Object} incidentData - Incident details including media
   * @returns {Promise<Object>} Triage assessment with priority and response recommendations
   */
  async performIntelligentTriage(incidentData) {
    try {
      // Validate input data
      if (!incidentData) {
        throw new Error('Incident data is required');
      }
      
      const { description, location, media, timestamp, reporterInfo } = incidentData;
      
      // Validate required fields
      if (!description && !media?.length) {
        throw new Error('Incident must have description or media');
      }
      
      // Analyze incident description using NLP
      const textAnalysis = await this.analyzeIncidentText(description);
      
      // Analyze incident media (images/videos) if available
      const mediaAnalysis = media && media.length > 0 
        ? await this.analyzeIncidentMedia(media)
        : null;

      // Get location risk factors with fallback
      const locationRisk = await this.calculateFireRiskScore(location).catch(error => {
        console.warn('Using default risk assessment due to location error:', error.message);
        return {
          riskScore: 0.5,
          riskLevel: 'MODERATE',
          recommendations: ['Standard emergency response'],
          factors: {
            weather: { score: 0.1 },
            historical: { score: 0.1 },
            environmental: { score: 0.1 }
          }
        };
      });

      // Compute priority score
      const priorityScore = this.computePriorityScore({
        textAnalysis,
        mediaAnalysis,
        locationRisk: locationRisk.riskScore,
        timestamp
      });

      // Determine recommended response
      const responseRecommendation = this.getResponseRecommendation(priorityScore, {
        textAnalysis,
        mediaAnalysis,
        locationRisk
      });

      return {
        priorityScore,
        priorityLevel: this.getPriorityLevel(priorityScore),
        confidence: this.calculateConfidence(textAnalysis, mediaAnalysis),
        responseRecommendation,
        analysis: {
          text: textAnalysis,
          media: mediaAnalysis,
          location: locationRisk
        },
        estimatedSeverity: this.estimateSeverity(priorityScore, mediaAnalysis),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error performing intelligent triage:', error);
      // Return safe default values instead of throwing
      return {
        priorityScore: 0.5,
        priorityLevel: 'MEDIUM',
        confidence: 0.5,
        responseRecommendation: {
          units: ['Fire Engine', 'Ambulance'],
          estimatedResponseTime: 8,
          specialEquipment: [],
          priority: 'standard'
        },
        analysis: {
          textAnalysis: { severity: 'moderate', keywords: [] },
          mediaAnalysis: null,
          locationRisk: { riskScore: 0.5, riskLevel: 'MODERATE' }
        },
        estimatedSeverity: 'moderate',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Predict incident escalation probability
   * @param {Object} incident - Current incident data
   * @returns {Promise<Object>} Escalation prediction with timeline
   */
  async predictIncidentEscalation(incident) {
    try {
      const escalationFactors = {
        environmental: await this.getEnvironmentalFactors(
          incident.latitude, 
          incident.longitude
        ),
        response: {
          responseTime: this.calculateResponseTime(incident),
          resourcesDeployed: incident.assignedResources?.length || 0,
          personnelExperience: await this.getAveragePersonnelExperience(incident.assignedResources)
        },
        incident: {
          type: incident.type,
          severity: incident.severity,
          location: incident.location,
          timeActive: Date.now() - new Date(incident.created_at).getTime()
        }
      };

      // Calculate escalation probability using ML model
      const escalationProbability = this.calculateEscalationProbability(escalationFactors);
      
      // Predict timeline for potential escalation
      const escalationTimeline = this.predictEscalationTimeline(
        escalationProbability, 
        escalationFactors
      );

      // Generate prevention recommendations
      const preventionActions = this.generatePreventionActions(
        escalationProbability,
        escalationFactors
      );

      return {
        probability: escalationProbability,
        riskLevel: this.getEscalationRiskLevel(escalationProbability),
        timeline: escalationTimeline,
        preventionActions,
        factors: escalationFactors,
        recommendations: this.generateEscalationRecommendations(
          escalationProbability,
          escalationFactors
        ),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error predicting incident escalation:', error);
      throw new Error('Failed to predict incident escalation');
    }
  }

  // Helper methods for risk calculation
  async getWeatherData(latitude, longitude) {
    // Simulate weather API call - replace with actual weather service
    return {
      temperature: 25 + Math.random() * 20,
      humidity: 30 + Math.random() * 50,
      windSpeed: Math.random() * 30,
      precipitation: Math.random(),
      droughtIndex: Math.random()
    };
  }

  async getHistoricalIncidents(latitude, longitude) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter incidents within 5km radius
      const nearbyIncidents = data.filter(incident => {
        const distance = this.calculateDistance(
          latitude, longitude,
          incident.latitude, incident.longitude
        );
        return distance <= 5; // 5km radius
      });

      return {
        totalIncidents: nearbyIncidents.length,
        averageResponseTime: this.calculateAverageResponseTime(nearbyIncidents),
        seasonalPattern: this.analyzeSeasonalPattern(nearbyIncidents),
        timePattern: this.analyzeTimePattern(nearbyIncidents)
      };
    } catch (error) {
      console.error('Error getting historical incidents:', error);
      return { totalIncidents: 0, averageResponseTime: 0 };
    }
  }

  async getEnvironmentalFactors(latitude, longitude) {
    // Simulate environmental data - integrate with real environmental APIs
    return {
      vegetationDryness: Math.random(),
      airQuality: 50 + Math.random() * 100,
      proximityToRisk: Math.random(),
      buildingDensity: Math.random()
    };
  }

  computeRiskScore(data) {
    const weights = {
      weather: 0.3,
      historical: 0.25,
      environmental: 0.25,
      temporal: 0.2
    };

    const weatherScore = (
      (data.weather.temperature > 30 ? 0.8 : 0.2) +
      (data.weather.humidity < 30 ? 0.8 : 0.2) +
      (data.weather.windSpeed > 20 ? 0.9 : 0.1) +
      (data.weather.droughtIndex > 0.7 ? 0.9 : 0.1)
    ) / 4;

    const historicalScore = Math.min(data.historical.totalIncidents / 10, 1);
    const environmentalScore = (
      data.environmental.vegetationDryness +
      (data.environmental.airQuality < 50 ? 0.8 : 0.2) +
      data.environmental.proximityToRisk +
      data.environmental.buildingDensity
    ) / 4;

    const hour = new Date(data.timestamp).getHours();
    const temporalScore = (hour >= 10 && hour <= 16) ? 0.8 : 0.3; // Higher risk during day

    return Math.min(
      weatherScore * weights.weather +
      historicalScore * weights.historical +
      environmentalScore * weights.environmental +
      temporalScore * weights.temporal, 1
    );
  }

  getRiskLevel(score) {
    if (score >= 0.8) return 'EXTREME';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MODERATE';
    if (score >= 0.2) return 'LOW';
    return 'MINIMAL';
  }

  async generateRecommendations(riskScore, locationData) {
    const recommendations = [];

    if (riskScore >= 0.8) {
      recommendations.push({
        type: 'immediate',
        priority: 'critical',
        action: 'Deploy preventive fire patrols in high-risk areas',
        reason: 'Extreme fire risk detected'
      });
    }

    if (riskScore >= 0.6) {
      recommendations.push({
        type: 'preventive',
        priority: 'high',
        action: 'Issue fire safety warnings to local residents',
        reason: 'High fire risk conditions present'
      });
    }

    recommendations.push({
      type: 'monitoring',
      priority: 'medium',
      action: 'Increase monitoring frequency for this area',
      reason: `Fire risk level: ${this.getRiskLevel(riskScore)}`
    });

    return recommendations;
  }

  // Utility methods
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async analyzeIncidentText(description) {
    // Simulate NLP analysis - integrate with actual NLP service
    const urgencyKeywords = ['fire', 'explosion', 'smoke', 'burning', 'emergency', 'help'];
    const severityKeywords = ['large', 'spreading', 'trapped', 'injured', 'building'];
    
    const urgencyScore = urgencyKeywords.reduce((score, keyword) => 
      description.toLowerCase().includes(keyword) ? score + 0.2 : score, 0
    );
    
    const severityScore = severityKeywords.reduce((score, keyword) => 
      description.toLowerCase().includes(keyword) ? score + 0.2 : score, 0
    );

    return {
      urgencyScore: Math.min(urgencyScore, 1),
      severityScore: Math.min(severityScore, 1),
      confidence: 0.8,
      keyPhrases: [...urgencyKeywords, ...severityKeywords].filter(keyword => 
        description.toLowerCase().includes(keyword)
      )
    };
  }

  async analyzeIncidentMedia(media) {
    // Simulate computer vision analysis - integrate with actual CV service
    return {
      fireDetected: Math.random() > 0.5,
      smokeDetected: Math.random() > 0.3,
      structuralDamage: Math.random() > 0.7,
      peopleDetected: Math.random() > 0.6,
      confidence: 0.7 + Math.random() * 0.3
    };
  }

  computePriorityScore(data) {
    const weights = {
      textAnalysis: 0.4,
      mediaAnalysis: 0.3,
      locationRisk: 0.2,
      temporal: 0.1
    };

    const textScore = (data.textAnalysis.urgencyScore + data.textAnalysis.severityScore) / 2;
    const mediaScore = data.mediaAnalysis ? 
      (data.mediaAnalysis.fireDetected ? 0.9 : 0) +
      (data.mediaAnalysis.smokeDetected ? 0.7 : 0) +
      (data.mediaAnalysis.structuralDamage ? 0.8 : 0) +
      (data.mediaAnalysis.peopleDetected ? 0.9 : 0) : 0;

    const hour = new Date(data.timestamp).getHours();
    const temporalScore = (hour >= 22 || hour <= 6) ? 0.8 : 0.5; // Higher priority at night

    return Math.min(
      textScore * weights.textAnalysis +
      mediaScore * weights.mediaAnalysis +
      data.locationRisk * weights.locationRisk +
      temporalScore * weights.temporal, 1
    );
  }

  getPriorityLevel(score) {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  }

  getResponseRecommendation(priorityScore, analysis) {
    if (priorityScore >= 0.8) {
      return {
        responseType: 'immediate',
        recommendedUnits: 3,
        estimatedResponseTime: '2-4 minutes',
        specialEquipment: ['ladder_truck', 'rescue_unit'],
        additionalResources: ['ambulance', 'hazmat_team']
      };
    } else if (priorityScore >= 0.6) {
      return {
        responseType: 'urgent',
        recommendedUnits: 2,
        estimatedResponseTime: '4-8 minutes',
        specialEquipment: ['fire_engine'],
        additionalResources: ['ambulance']
      };
    } else {
      return {
        responseType: 'standard',
        recommendedUnits: 1,
        estimatedResponseTime: '8-15 minutes',
        specialEquipment: ['fire_engine'],
        additionalResources: []
      };
    }
  }

  // Additional helper methods would continue here...
  // For brevity, I'll include key methods but the full implementation would be extensive

  calculateConfidence(textAnalysis, mediaAnalysis) {
    if (textAnalysis && mediaAnalysis) {
      return (textAnalysis.confidence + mediaAnalysis.confidence) / 2;
    } else if (textAnalysis) {
      return textAnalysis.confidence * 0.8; // Slightly lower confidence without media
    } else {
      return 0.5; // Base confidence
    }
  }

  estimateSeverity(priorityScore, mediaAnalysis) {
    let severity = 'minor';
    if (priorityScore >= 0.8) severity = 'major';
    else if (priorityScore >= 0.6) severity = 'moderate';
    
    if (mediaAnalysis?.structuralDamage) severity = 'major';
    if (mediaAnalysis?.peopleDetected && priorityScore >= 0.6) severity = 'critical';
    
    return severity;
  }

  /**
   * Calculate average response time from historical incidents
   * @param {Array} incidents - Array of historical incidents
   * @returns {number} Average response time in minutes
   */
  calculateAverageResponseTime(incidents) {
    if (!incidents || incidents.length === 0) {
      return 8.5; // Default average response time in minutes
    }

    let totalResponseTime = 0;
    let validIncidents = 0;

    incidents.forEach(incident => {
      if (incident.responseTime && typeof incident.responseTime === 'number') {
        totalResponseTime += incident.responseTime;
        validIncidents++;
      } else if (incident.created_at && incident.resolved_at) {
        // Calculate response time from timestamps
        const createdTime = new Date(incident.created_at);
        const resolvedTime = new Date(incident.resolved_at);
        const responseTime = (resolvedTime - createdTime) / (1000 * 60); // Convert to minutes
        
        if (responseTime > 0 && responseTime < 180) { // Reasonable response time (< 3 hours)
          totalResponseTime += responseTime;
          validIncidents++;
        }
      }
    });

    if (validIncidents === 0) {
      return 8.5; // Default if no valid data
    }

    return totalResponseTime / validIncidents;
  }

  /**
   * Calculate distance between two coordinates
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude  
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Analyze seasonal patterns in historical incidents
   * @param {Array} incidents - Array of historical incidents
   * @returns {Object} Seasonal pattern analysis
   */
  analyzeSeasonalPattern(incidents) {
    if (!incidents || incidents.length === 0) {
      return {
        spring: 0,
        summer: 0,
        autumn: 0,
        winter: 0,
        peakSeason: 'summer',
        riskMultiplier: 1.0
      };
    }

    const seasonalCounts = {
      spring: 0, // March, April, May
      summer: 0, // June, July, August  
      autumn: 0, // September, October, November
      winter: 0  // December, January, February
    };

    incidents.forEach(incident => {
      if (incident.created_at) {
        const month = new Date(incident.created_at).getMonth(); // 0-based month
        
        if (month >= 2 && month <= 4) {
          seasonalCounts.spring++;
        } else if (month >= 5 && month <= 7) {
          seasonalCounts.summer++;
        } else if (month >= 8 && month <= 10) {
          seasonalCounts.autumn++;
        } else {
          seasonalCounts.winter++;
        }
      }
    });

    // Calculate percentages
    const total = incidents.length;
    const seasonalPercentages = {
      spring: (seasonalCounts.spring / total) * 100,
      summer: (seasonalCounts.summer / total) * 100,
      autumn: (seasonalCounts.autumn / total) * 100,
      winter: (seasonalCounts.winter / total) * 100
    };

    // Find peak season
    const peakSeason = Object.keys(seasonalCounts).reduce((a, b) => 
      seasonalCounts[a] > seasonalCounts[b] ? a : b
    );

    // Calculate current season risk multiplier
    const currentMonth = new Date().getMonth();
    let currentSeason;
    if (currentMonth >= 2 && currentMonth <= 4) currentSeason = 'spring';
    else if (currentMonth >= 5 && currentMonth <= 7) currentSeason = 'summer';
    else if (currentMonth >= 8 && currentMonth <= 10) currentSeason = 'autumn';
    else currentSeason = 'winter';

    const maxCount = Math.max(...Object.values(seasonalCounts));
    const currentSeasonCount = seasonalCounts[currentSeason];
    const riskMultiplier = maxCount > 0 ? (currentSeasonCount / maxCount) : 1.0;

    return {
      counts: seasonalCounts,
      percentages: seasonalPercentages,
      peakSeason,
      currentSeason,
      riskMultiplier: Math.max(riskMultiplier, 0.5), // Minimum 0.5x multiplier
      totalIncidents: total
    };
  }

  /**
   * Analyze time-of-day patterns in historical incidents
   * @param {Array} incidents - Array of historical incidents
   * @returns {Object} Time pattern analysis
   */
  analyzeTimePattern(incidents) {
    if (!incidents || incidents.length === 0) {
      return {
        hourlyDistribution: new Array(24).fill(0),
        peakHour: 14,
        peakPeriod: 'afternoon',
        riskMultiplier: 1.0
      };
    }

    const hourlyDistribution = new Array(24).fill(0);

    incidents.forEach(incident => {
      if (incident.created_at) {
        const hour = new Date(incident.created_at).getHours();
        hourlyDistribution[hour]++;
      }
    });

    // Find peak hour
    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

    // Determine peak period
    let peakPeriod;
    if (peakHour >= 6 && peakHour < 12) peakPeriod = 'morning';
    else if (peakHour >= 12 && peakHour < 18) peakPeriod = 'afternoon';
    else if (peakHour >= 18 && peakHour < 22) peakPeriod = 'evening';
    else peakPeriod = 'night';

    // Calculate current hour risk multiplier
    const currentHour = new Date().getHours();
    const maxCount = Math.max(...hourlyDistribution);
    const currentHourCount = hourlyDistribution[currentHour];
    const riskMultiplier = maxCount > 0 ? (currentHourCount / maxCount) : 1.0;

    return {
      hourlyDistribution,
      peakHour,
      peakPeriod,
      currentHour,
      riskMultiplier: Math.max(riskMultiplier, 0.3), // Minimum 0.3x multiplier
      totalIncidents: incidents.length
    };
  }

  /**
   * Find optimal resource for an incident
   * @param {Object} incident - Incident requiring resources
   * @param {Array} availableResources - Available resources
   * @param {Array} currentAssignments - Current resource assignments
   * @returns {Promise<Object>} Optimal resource with confidence score
   */
  async findOptimalResource(incident, availableResources, currentAssignments) {
    if (!availableResources || availableResources.length === 0) {
      return null;
    }

    let bestResource = null;
    let bestScore = 0;

    for (const resource of availableResources) {
      // Calculate distance to incident
      const distance = this.calculateDistance(
        incident.latitude, incident.longitude,
        resource.latitude, resource.longitude
      );

      // Calculate resource capability score
      const capabilityScore = this.calculateCapabilityScore(resource, incident);
      
      // Calculate availability score
      const availabilityScore = this.calculateAvailabilityScore(resource, currentAssignments);
      
      // Calculate experience score
      const experienceScore = resource.experienceLevel || 0.7;

      // Weighted scoring
      const totalScore = (
        (1 / Math.max(distance, 0.1)) * 0.4 + // Distance (closer is better)
        capabilityScore * 0.3 +
        availabilityScore * 0.2 +
        experienceScore * 0.1
      );

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestResource = {
          ...resource,
          estimatedResponseTime: Math.max(distance * 2, 3), // Rough estimate: 2 min per km, min 3 min
          confidence: Math.min(totalScore / 2, 1)
        };
      }
    }

    return bestResource;
  }

  /**
   * Calculate resource capability score for incident type
   * @param {Object} resource - Resource to evaluate
   * @param {Object} incident - Incident details
   * @returns {number} Capability score (0-1)
   */
  calculateCapabilityScore(resource, incident) {
    const typeMapping = {
      'fire': { 'fire_engine': 1.0, 'ladder_truck': 0.9, 'rescue_unit': 0.7, 'ambulance': 0.3 },
      'medical': { 'ambulance': 1.0, 'rescue_unit': 0.8, 'fire_engine': 0.6, 'ladder_truck': 0.4 },
      'rescue': { 'rescue_unit': 1.0, 'ladder_truck': 0.9, 'fire_engine': 0.7, 'ambulance': 0.6 },
      'hazmat': { 'hazmat_unit': 1.0, 'rescue_unit': 0.8, 'fire_engine': 0.5, 'ambulance': 0.3 }
    };

    const incidentType = incident.type?.toLowerCase() || 'fire';
    const resourceType = resource.type?.toLowerCase() || 'fire_engine';
    
    return typeMapping[incidentType]?.[resourceType] || 0.5;
  }

  /**
   * Calculate resource availability score
   * @param {Object} resource - Resource to evaluate
   * @param {Array} currentAssignments - Current assignments
   * @returns {number} Availability score (0-1)
   */
  calculateAvailabilityScore(resource, currentAssignments) {
    // Check if resource is already assigned
    const isAssigned = currentAssignments.some(assignment => 
      assignment.resourceId === resource.id
    );

    if (isAssigned) {
      return 0.2; // Low score if already assigned
    }

    // Consider resource readiness status
    if (resource.status === 'available') return 1.0;
    if (resource.status === 'maintenance') return 0.1;
    if (resource.status === 'standby') return 0.8;
    
    return 0.6; // Default availability
  }

  /**
   * Calculate allocation efficiency
   * @param {Array} assignments - Resource assignments
   * @returns {number} Efficiency score (0-1)
   */
  calculateAllocationEfficiency(assignments) {
    if (!assignments || assignments.length === 0) {
      return 0;
    }

    const totalConfidence = assignments.reduce((sum, assignment) => 
      sum + (assignment.confidence || 0.5), 0
    );

    const averageConfidence = totalConfidence / assignments.length;
    const responseTimeScore = assignments.reduce((sum, assignment) => {
      const responseTime = assignment.estimatedResponseTime || 10;
      return sum + (1 / Math.max(responseTime, 1));
    }, 0) / assignments.length;

    return (averageConfidence * 0.6 + responseTimeScore * 0.4);
  }

  /**
   * Generate strategic recommendations for resource allocation
   * @param {Object} allocationPlan - Current allocation plan
   * @param {Array} activeIncidents - Active incidents
   * @param {Array} remainingResources - Unassigned resources
   * @returns {Array} Strategic recommendations
   */
  generateStrategicRecommendations(allocationPlan, activeIncidents, remainingResources) {
    const recommendations = [];

    // Check if any critical incidents are unassigned
    const unassignedCritical = activeIncidents.filter(incident => 
      incident.priority >= 0.8 && 
      !allocationPlan.assignments.some(assignment => assignment.incidentId === incident.id)
    );

    if (unassignedCritical.length > 0) {
      recommendations.push({
        type: 'critical',
        priority: 'immediate',
        message: `${unassignedCritical.length} critical incident(s) require immediate attention`,
        action: 'Consider reallocating resources or requesting mutual aid'
      });
    }

    // Check resource utilization
    const utilizationRate = allocationPlan.assignments.length / (allocationPlan.assignments.length + remainingResources.length);
    
    if (utilizationRate > 0.8) {
      recommendations.push({
        type: 'capacity',
        priority: 'high',
        message: 'High resource utilization detected',
        action: 'Consider requesting additional resources from neighboring stations'
      });
    } else if (utilizationRate < 0.3) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        message: 'Low resource utilization - resources available for preventive patrols',
        action: 'Deploy idle resources for preventive monitoring in high-risk areas'
      });
    }

    return recommendations;
  }

  /**
   * Calculate response time for an incident
   * @param {Object} incident - Incident data
   * @returns {number} Response time in minutes
   */
  calculateResponseTime(incident) {
    if (incident.responseTime) {
      return incident.responseTime;
    }

    if (incident.created_at && incident.resolved_at) {
      const createdTime = new Date(incident.created_at);
      const resolvedTime = new Date(incident.resolved_at);
      return (resolvedTime - createdTime) / (1000 * 60); // Convert to minutes
    }

    // Estimate based on incident type and severity
    const baseTime = 8; // Base response time in minutes
    const severityMultiplier = incident.severity === 'critical' ? 0.7 : 
                              incident.severity === 'high' ? 0.8 : 1.0;
    
    return baseTime * severityMultiplier;
  }

  /**
   * Get average personnel experience for assigned resources
   * @param {Array} assignedResources - Resources assigned to incident
   * @returns {Promise<number>} Average experience level (0-1)
   */
  async getAveragePersonnelExperience(assignedResources) {
    if (!assignedResources || assignedResources.length === 0) {
      return 0.6; // Default experience level
    }

    try {
      // In a real implementation, this would query personnel database
      const totalExperience = assignedResources.reduce((sum, resource) => {
        return sum + (resource.experienceLevel || 0.6);
      }, 0);

      return totalExperience / assignedResources.length;
    } catch (error) {
      console.error('Error calculating personnel experience:', error);
      return 0.6; // Default fallback
    }
  }

  /**
   * Calculate escalation probability using ML model simulation
   * @param {Object} escalationFactors - Factors affecting escalation
   * @returns {number} Escalation probability (0-1)
   */
  calculateEscalationProbability(escalationFactors) {
    const weights = {
      environmental: 0.25,
      response: 0.35,
      incident: 0.4
    };

    // Environmental factors score
    const envScore = (
      (escalationFactors.environmental.vegetationDryness || 0) * 0.3 +
      (escalationFactors.environmental.airQuality < 50 ? 0.8 : 0.2) * 0.2 +
      (escalationFactors.environmental.proximityToRisk || 0) * 0.3 +
      (escalationFactors.environmental.buildingDensity || 0) * 0.2
    );

    // Response factors score
    const responseScore = (
      (escalationFactors.response.responseTime > 10 ? 0.8 : 0.3) * 0.4 +
      (escalationFactors.response.resourcesDeployed < 2 ? 0.7 : 0.3) * 0.3 +
      (escalationFactors.response.personnelExperience < 0.5 ? 0.8 : 0.2) * 0.3
    );

    // Incident factors score
    const severityScore = escalationFactors.incident.severity === 'critical' ? 0.9 :
                         escalationFactors.incident.severity === 'high' ? 0.7 :
                         escalationFactors.incident.severity === 'medium' ? 0.4 : 0.2;
    
    const timeActiveHours = escalationFactors.incident.timeActive / (1000 * 60 * 60);
    const timeScore = Math.min(timeActiveHours / 2, 1); // Higher risk after 2+ hours

    const incidentScore = (severityScore * 0.6 + timeScore * 0.4);

    // Calculate weighted probability
    const probability = (
      envScore * weights.environmental +
      responseScore * weights.response +
      incidentScore * weights.incident
    );

    return Math.min(Math.max(probability, 0), 1);
  }

  /**
   * Predict escalation timeline
   * @param {number} escalationProbability - Current escalation probability
   * @param {Object} escalationFactors - Factors affecting escalation
   * @returns {Object} Escalation timeline prediction
   */
  predictEscalationTimeline(escalationProbability, escalationFactors) {
    const baseTimeToEscalation = 60; // Base time in minutes
    
    // Adjust based on probability and factors
    const timeMultiplier = (1 - escalationProbability) * 2; // Higher probability = faster escalation
    const estimatedMinutes = baseTimeToEscalation * timeMultiplier;

    return {
      estimatedTimeToEscalation: Math.max(estimatedMinutes, 15), // Minimum 15 minutes
      confidence: escalationProbability,
      criticalFactors: this.identifyCriticalFactors(escalationFactors),
      recommendedCheckpoints: [
        { time: 15, action: 'Reassess incident severity' },
        { time: 30, action: 'Evaluate resource adequacy' },
        { time: 60, action: 'Consider requesting additional support' }
      ]
    };
  }

  /**
   * Generate prevention actions for escalation
   * @param {number} escalationProbability - Escalation probability
   * @param {Object} escalationFactors - Escalation factors
   * @returns {Array} Prevention actions
   */
  generatePreventionActions(escalationProbability, escalationFactors) {
    const actions = [];

    if (escalationProbability > 0.7) {
      actions.push({
        priority: 'immediate',
        action: 'Deploy additional resources immediately',
        reason: 'High escalation risk detected'
      });
    }

    if (escalationFactors.response.resourcesDeployed < 2) {
      actions.push({
        priority: 'high',
        action: 'Request backup units',
        reason: 'Insufficient resources currently deployed'
      });
    }

    if (escalationFactors.environmental.vegetationDryness > 0.7) {
      actions.push({
        priority: 'medium',
        action: 'Establish wider perimeter',
        reason: 'High vegetation dryness increases spread risk'
      });
    }

    if (escalationFactors.response.personnelExperience < 0.5) {
      actions.push({
        priority: 'medium',
        action: 'Request experienced incident commander',
        reason: 'Current personnel may need additional expertise'
      });
    }

    return actions;
  }

  /**
   * Get escalation risk level
   * @param {number} probability - Escalation probability
   * @returns {string} Risk level
   */
  getEscalationRiskLevel(probability) {
    if (probability >= 0.8) return 'CRITICAL';
    if (probability >= 0.6) return 'HIGH';
    if (probability >= 0.4) return 'MODERATE';
    if (probability >= 0.2) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Generate escalation recommendations
   * @param {number} escalationProbability - Escalation probability
   * @param {Object} escalationFactors - Escalation factors
   * @returns {Array} Recommendations
   */
  generateEscalationRecommendations(escalationProbability, escalationFactors) {
    const recommendations = [];

    if (escalationProbability > 0.6) {
      recommendations.push({
        type: 'resource',
        priority: 'high',
        message: 'Consider requesting mutual aid',
        details: 'Escalation probability exceeds 60%'
      });
    }

    if (escalationFactors.incident.timeActive > 2 * 60 * 60 * 1000) { // 2 hours
      recommendations.push({
        type: 'strategic',
        priority: 'medium',
        message: 'Evaluate incident command structure',
        details: 'Long-duration incident may benefit from command structure review'
      });
    }

    recommendations.push({
      type: 'monitoring',
      priority: 'medium',
      message: 'Increase monitoring frequency',
      details: `Current escalation risk: ${this.getEscalationRiskLevel(escalationProbability)}`
    });

    return recommendations;
  }

  /**
   * Identify critical factors contributing to escalation risk
   * @param {Object} escalationFactors - All escalation factors
   * @returns {Array} Critical factors
   */
  identifyCriticalFactors(escalationFactors) {
    const criticalFactors = [];

    if (escalationFactors.environmental.vegetationDryness > 0.7) {
      criticalFactors.push('High vegetation dryness');
    }

    if (escalationFactors.response.responseTime > 15) {
      criticalFactors.push('Extended response time');
    }

    if (escalationFactors.response.resourcesDeployed < 2) {
      criticalFactors.push('Insufficient resources');
    }

    if (escalationFactors.incident.severity === 'critical') {
      criticalFactors.push('Critical incident severity');
    }

    return criticalFactors;
  }
}

export default new AIPredictiveService();
