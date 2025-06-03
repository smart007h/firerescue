import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { Text, Card, Title, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SafetyScreen = ({ navigation }) => {
  const [selectedResource, setSelectedResource] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const safetyResources = [
    {
      id: 1,
      title: 'FIRE EXTINGUISHER\nGUIDE',
      image: require('../assets/images/extinguisher.jpeg'),
      description: `A comprehensive guide to fire extinguisher usage and maintenance:

1. Types of Fire Extinguishers:
• Class A: For ordinary combustibles
• Class B: For flammable liquids
• Class C: For electrical fires
• Class D: For metal fires
• Class K: For kitchen fires

2. PASS Technique:
• Pull the pin
• Aim at the base of the fire
• Squeeze the handle
• Sweep from side to side

3. Maintenance Tips:
• Check pressure gauge monthly
• Inspect for physical damage
• Ensure easy accessibility
• Schedule professional inspections annually
• Replace or service as recommended

4. Safety Precautions:
• Never block access to extinguishers
• Keep away from children
• Know when to evacuate instead of fighting fire
• Maintain proper distance from fire
• Always have a clear escape route`
    },
    {
      id: 2,
      title: 'ACQUIRING\nFIRE\nCERTIFICATE',
      image: require('../assets/images/fire.jpeg'),
      description: `Essential steps and requirements for obtaining a fire certificate:

1. Application Process:
• Submit formal application
• Schedule premises inspection
• Pay required fees
• Provide building plans
• Complete safety assessment

2. Required Documents:
• Building ownership proof
• Floor plans and layouts
• Electrical system certification
• Emergency evacuation plans
• Insurance documentation

3. Safety Requirements:
• Adequate fire exits
• Proper emergency lighting
• Functional alarm systems
• Appropriate extinguishers
• Clear evacuation routes

4. Compliance Measures:
• Regular staff training
• Updated emergency procedures
• Maintenance records
• Safety signage
• Annual renewals`
    },
    {
      id: 3,
      title: 'TIPS',
      image: require('../assets/images/tips.jpeg'),
      description: `Essential fire safety tips for home and workplace:

1. Prevention Strategies:
• Install smoke detectors
• Regular electrical inspections
• Proper storage of flammables
• Kitchen safety practices
• Smoking safety measures

2. Emergency Planning:
• Create evacuation plans
• Designate meeting points
• Practice fire drills
• Keep emergency contacts
• Document valuable items

3. Home Safety:
• Clear escape routes
• Childproof measures
• Regular maintenance
• Safe cooking practices
• Proper appliance use

4. Workplace Safety:
• Emergency procedures
• Equipment training
• Regular inspections
• Clear communication
• Safety equipment access`
    }
  ];

  const recentActivities = [
    {
      type: 'Gas leak reported',
      location: 'Kaneshie Central St',
      time: '10:45 AM'
    },
    {
      type: 'Medical assistance',
      location: 'Ablekuma South St',
      time: '09:30 AM'
    },
    {
      type: 'Fire alarm check',
      location: '37 Hospital Rd',
      time: '8:15 AM'
    }
  ];

  const handleResourcePress = (resource) => {
    setSelectedResource(resource);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#DC3545" />
        </TouchableOpacity>
        <Image 
          source={require('../assets/images/logo.jpeg')} 
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>GHANA NATIONAL{'\n'}FIRE SERVICE</Text>
        <IconButton 
          icon="bell" 
          size={24} 
          color="#DC3545"
          onPress={() => {}}
        />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.titleContainer}>
          <Ionicons name="shield-outline" size={24} color="#DC3545" />
          <Text style={styles.sectionTitle}>SAFETY RESOURCES</Text>
        </View>

        {safetyResources.map((resource) => (
          <TouchableOpacity 
            key={resource.id}
            style={styles.resourceCard}
            onPress={() => handleResourcePress(resource)}
          >
            <View style={styles.resourceContent}>
              <View>
                <Text style={styles.resourceTitle}>{resource.title}</Text>
                <Text style={styles.tapText}>Tap to read more</Text>
              </View>
              <Image 
                source={resource.image}
                style={styles.resourceImage}
              />
            </View>
            <Text style={styles.arrow}>{'>'}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Recent Activity</Text>
          {recentActivities.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View>
                <Text style={styles.activityType}>{activity.type}</Text>
                <Text style={styles.activityLocation}>{activity.location}</Text>
              </View>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>CALL FIRE MASTER{'\n'}CONTROL ON:</Text>
          <Text style={styles.contactNumbers}>112 / 192 / 0302 772446 / 0299 340383</Text>
          <TouchableOpacity style={styles.contactForm}>
            <Ionicons name="document-text-outline" size={24} color="#DC3545" />
            <Text style={styles.contactFormText}>Fill Our Contact Form</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.newsSection}>
          <Text style={styles.newsTitle}>LATEST NEWS</Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedResource?.title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#DC3545" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <Image 
                source={selectedResource?.image}
                style={styles.modalImage}
              />
              <Text style={styles.modalDescription}>
                {selectedResource?.description}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    backgroundColor: '#FFE6E6',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC3545',
  },
  scrollView: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC3545',
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  resourceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tapText: {
    color: '#666',
    fontSize: 12,
  },
  resourceImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  arrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    fontSize: 20,
    color: '#DC3545',
  },
  activitySection: {
    padding: 16,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  activityType: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  contactSection: {
    padding: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactNumbers: {
    fontSize: 14,
    color: '#DC3545',
    marginBottom: 16,
  },
  contactForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactFormText: {
    fontSize: 14,
    color: '#DC3545',
  },
  newsSection: {
    padding: 16,
    marginBottom: 24,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
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
    color: '#DC3545',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalScrollView: {
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});

export default SafetyScreen; 