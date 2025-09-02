import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabaseClient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const floorTypes = [
  "Ground Floor",
  "First Floor",
  "Second Floor",
  "Third Floor",
  "Fourth Floor & Above",
  "Basement",
];

const rates = {
  groundFloor: 3,
  firstFloor: 2.64,
  secondFloor: 2.4,
  thirdFloor: 1.8,
  fourthFloorAndAbove: 1.2,
  basement: 1.2,
};

const CertificateApplicationScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [useOfPremises, setUseOfPremises] = useState("");
  const [numberOfStoreys, setNumberOfStoreys] = useState("");
  const [floors, setFloors] = useState([]);
  const [reviewFee, setReviewFee] = useState(0);
  const [finalCost, setFinalCost] = useState(0);
  const [showSubmissionMessage, setShowSubmissionMessage] = useState(false);
  const [showFloorTypeModal, setShowFloorTypeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef(null);

  const handleNumberOfStoreysChange = (value) => {
    setNumberOfStoreys(value);
    const numStoreys = parseInt(value, 10);
    if (numStoreys > 0) {
      const newFloors = [];
      for (let i = 0; i < numStoreys; i++) {
        newFloors.push({ type: floorTypes[0], length: "", width: "" });
      }
      setFloors(newFloors);
    } else {
      setFloors([]);
    }
  };

  const addFloor = () => {
    if (!numberOfStoreys || parseInt(numberOfStoreys, 10) === 0) {
      Alert.alert("Error", "Please enter the number of storeys first");
      return;
    }
    setShowFloorTypeModal(true);
  };

  const confirmAddFloor = (floorType) => {
    setFloors([...floors, { type: floorType, length: "", width: "" }]);
    setNumberOfStoreys((prev) => {
      const currentNum = parseInt(prev, 10) || 0;
      return (currentNum + 1).toString();
    });
    setShowFloorTypeModal(false);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const removeFloor = (index) => {
    const newFloors = [...floors];
    newFloors.splice(index, 1);
    setFloors(newFloors);
    setNumberOfStoreys((prev) => {
      const currentNum = parseInt(prev, 10) || 0;
      return Math.max(0, currentNum - 1).toString();
    });
  };

  const calculateCost = () => {
    if (
      !name ||
      !address ||
      !location ||
      !useOfPremises ||
      !numberOfStoreys ||
      floors.some((floor) => !floor.length || !floor.width)
    ) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    let totalCost = 0;
    floors.forEach((floor) => {
      const length = parseFloat(floor.length);
      const width = parseFloat(floor.width);
      let rate = 0;

      switch (floor.type) {
        case "Ground Floor":
          rate = rates.groundFloor;
          break;
        case "First Floor":
          rate = rates.firstFloor;
          break;
        case "Second Floor":
          rate = rates.secondFloor;
          break;
        case "Third Floor":
          rate = rates.thirdFloor;
          break;
        case "Fourth Floor & Above":
        case "Basement":
          rate = rates.fourthFloorAndAbove;
          break;
        default:
          rate = rates.groundFloor;
      }

      const floorCost = (length * width * rate) / 9;
      totalCost += floorCost;
    });

    const reviewFee = totalCost + 24;
    let finalCost = reviewFee + 84;

    if (
      useOfPremises.toLowerCase() === "church" ||
      useOfPremises.toLowerCase() === "school"
    ) {
      finalCost /= 2;
    }

    setReviewFee(parseFloat(reviewFee.toFixed(2)));
    setFinalCost(parseFloat(finalCost.toFixed(2)));
  };

  const findNearestStationForApplication = async (applicationLocation) => {
    try {
      console.log('Finding nearest station for location:', applicationLocation);
      
      // Get all active fire stations
      const { data: stations, error } = await supabase
        .from('firefighters')
        .select('station_id, station_name, station_address, station_region, latitude, longitude')
        .eq('is_active', true);

      if (error) throw error;
      if (!stations?.length) throw new Error('No fire stations found');

      // Simple location matching based on address/region keywords
      const locationLower = applicationLocation.toLowerCase();
      
      // Try to match by region/city keywords
      const regionMatches = {
        // Greater Accra Region (includes Accra, Tema, and surrounding areas)
        'accra': ['FS001'], // Accra Central Station
        'tema': ['FS001'], // Tema is part of Greater Accra, so goes to Accra station
        'east legon': ['FS001'],
        'adenta': ['FS001'],
        'madina': ['FS001'],
        'spintex': ['FS001'],
        'greater accra': ['FS001'],
        
        // Other regions
        'kumasi': ['FS002'], // Kumasi Central Station
        'ashanti': ['FS002'],
        'tamale': ['FS004'], // Northern Region
        'northern': ['FS004'],
        'cape coast': ['FS006'], // Central Region
        'central': ['FS006'],
        'sunyani': ['FS007'], // Brong Ahafo Region
        'ho': ['FS008'], // Volta Region
        'volta': ['FS008'],
        'koforidua': ['FS009'], // Eastern Region
        'eastern': ['FS009'],
        'wa': ['FS010'] // Upper West Region
      };

      // Check for region matches first
      for (const [region, stationIds] of Object.entries(regionMatches)) {
        if (locationLower.includes(region)) {
          // Return the first matching station ID
          const matchingStation = stations.find(s => stationIds.includes(s.station_id));
          if (matchingStation) {
            console.log(`Matched station ${matchingStation.station_id} for region: ${region}`);
            return matchingStation.station_id;
          }
        }
      }

      // If no specific region match, default to nearest by station priority
      // Priority order: FS005 (Tema), FS001 (Accra Central), FS002 (Kumasi), others
      const priorityOrder = ['FS005', 'FS001', 'FS002', 'FS003', 'FS004', 'FS006', 'FS007', 'FS008', 'FS009', 'FS010'];
      
      for (const stationId of priorityOrder) {
        const station = stations.find(s => s.station_id === stationId);
        if (station) {
          console.log(`Default assignment to station: ${stationId}`);
          return stationId;
        }
      }

      // Last resort: use first available station
      console.log(`Fallback assignment to station: ${stations[0].station_id}`);
      return stations[0].station_id;

    } catch (error) {
      console.error('Error finding nearest station:', error);
      // Default to FS005 (Tema) if all else fails
      return 'FS005';
    }
  };

  const handleSubmitApplication = async () => {
    if (reviewFee <= 0) {
      Alert.alert("Error", "Please calculate the cost first");
      return;
    }

    // Validate required fields
    if (!name.trim() || !address.trim() || !location.trim() || !useOfPremises.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (floors.length === 0) {
      Alert.alert("Error", "Please add at least one floor");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        Alert.alert('Authentication Error', 'Please log in again.');
        return;
      }

      if (!user?.id) {
        Alert.alert('Authentication Error', 'User not authenticated. Please log in.');
        return;
      }

      // Determine the appropriate station for this application
      const assignedStation = await findNearestStationForApplication(location.trim());
      console.log('Assigned station for application:', assignedStation);

      // Prepare application data
      const applicationData = {
        applicant_id: user.id,
        applicant_name: name.trim(),
        premises_address: address.trim(),
        premises_location: location.trim(),
        use_of_premises: useOfPremises.trim(),
        number_of_storeys: parseInt(numberOfStoreys),
        floors: floors, // Store as JSON
        review_fee: parseFloat(reviewFee),
        final_cost: parseFloat(finalCost),
        station_id: assignedStation, // Automatically assign station
        status: 'pending'
      };

      console.log('Submitting certificate application:', applicationData);

      // Insert into database
      const { data: application, error: insertError } = await supabase
        .from('certificate_applications')
        .insert(applicationData)
        .select()
        .single();

      if (insertError) {
        console.error('Error submitting application:', insertError);
        throw insertError;
      }

      console.log('Certificate application submitted successfully:', application);
      
      // Clear all inputs after successful submission
      setName("");
      setAddress("");
      setLocation("");
      setUseOfPremises("");
      setNumberOfStoreys("");
      setFloors([]);
      setReviewFee(0);
      setFinalCost(0);
      
      setShowSubmissionMessage(true);

    } catch (error) {
      console.error('Application submission error:', error);
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSubmissionMessage = () => {
    setShowSubmissionMessage(false);
  };

  const downloadApplication = async () => {
    try {
      // Create application summary text
      const applicationText = `
FIRE SAFETY CERTIFICATE APPLICATION
=====================================

Application Details:
-------------------
Applicant Name: ${name}
Premises Address: ${address}
Premises Location: ${location}
Use of Premises: ${useOfPremises}
Number of Storeys: ${numberOfStoreys}

Floor Details:
--------------
${floors.map((floor, index) => 
  `Floor ${index + 1}: ${floor.type} - ${floor.length}m x ${floor.width}m`
).join('\n')}

Cost Breakdown:
---------------
Review Fee: GH₵${reviewFee.toFixed(2)}
Final Cost: GH₵${finalCost.toFixed(2)}

Application Status: Pending
Submitted: ${new Date().toLocaleDateString()}

---
This application has been submitted to the Fire Service for review.
You will be notified of any updates regarding your application status.
      `.trim();

      // Create file path
      const fileName = `Certificate_Application_${name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, applicationText);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Save Certificate Application'
        });
      } else {
        // Fallback to showing alert with text
        Alert.alert(
          'Download Complete', 
          `Application saved to: ${fileName}\n\nFile location: ${fileUri}`,
          [{ text: 'OK' }]
        );
      }

      closeSubmissionMessage();

    } catch (error) {
      console.error('Error downloading application:', error);
      Alert.alert('Error', 'Failed to download application. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="red" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Certificate Application</Text>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ACQUIRING FIRE CERTIFICATE/PERMIT</Text>
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 1:</Text>
            <Text style={styles.stepText}>
              Request for inspection and submit following to the Fire Department each of them with
              dimensions:
            </Text>
            <Text style={styles.bulletPoint}>• Site Plan</Text>
            <Text style={styles.bulletPoint}>• Block Plan</Text>
            <Text style={styles.bulletPoint}>• Floor Plan</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 2:</Text>
            <Text style={styles.stepText}>Inspection of Project/Building by Fire Department.</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 3:</Text>
            <Text style={styles.stepText}>Present Fire Engineering drawings to the Fire Department.</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 4:</Text>
            <Text style={styles.stepText}>Apply for Fire Certificate/Permit from the Fire Department.</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 5:</Text>
            <Text style={styles.stepText}>The Fire Department operates a Risk based system. Categorized as:</Text>
            <Text style={styles.bulletPoint}>• Low Risk Projects</Text>
            <Text style={styles.bulletPoint}>• Medium Risk Projects</Text>
            <Text style={styles.bulletPoint}>• High Risk Projects</Text>
          </View>

          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>STEP 6:</Text>
            <Text style={styles.stepText}>The turnaround time for the majority of projects (Low Risk) is five (5) days.</Text>
            <Text style={styles.stepText}>Issued by Fire Safety Directorate.</Text>
          </View>
        </View>

        <Text style={styles.subheader}>
          Complete this form to apply for a Fire Service Emergency Response Certificate
        </Text>

        <Text style={styles.sectionHeader}>Applicant Information</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your address"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the location"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Use of Premises</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Residential, Commercial, Church, School"
            value={useOfPremises}
            onChangeText={setUseOfPremises}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Service Required</Text>
          <Text style={styles.inputText}>Certificate</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Number of Storeys</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter number of storeys"
            value={numberOfStoreys}
            onChangeText={handleNumberOfStoreysChange}
            keyboardType="numeric"
          />
        </View>

        <Text style={styles.sectionHeader}>Building Details</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>Floor Rates Information</Text>
          <Text style={styles.infoBoxText}>
            - Ground Floor: ¢3.00 per m²
          </Text>
          <Text style={styles.infoBoxText}>
            - First Floor: ¢2.64 per m²
          </Text>
          <Text style={styles.infoBoxText}>
            - Second Floor: ¢2.40 per m²
          </Text>
          <Text style={styles.infoBoxText}>
            - Third Floor: ¢1.80 per m²
          </Text>
          <Text style={styles.infoBoxText}>
            - Fourth Floor & Above: ¢1.20 per m²
          </Text>
          <Text style={styles.infoBoxText}>
            - Basement: ¢1.20 per m²
          </Text>
        </View>

        {floors.map((floor, index) => (
          <View key={index} style={styles.floorContainer}>
            <View style={styles.floorHeader}>
              <Picker
                selectedValue={floor.type}
                style={styles.picker}
                onValueChange={(itemValue) => {
                  const newFloors = [...floors];
                  newFloors[index].type = itemValue;
                  setFloors(newFloors);
                }}
              >
                {floorTypes.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
              <TouchableOpacity onPress={() => removeFloor(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Length (m)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter length"
                value={floor.length}
                onChangeText={(text) => {
                  const newFloors = [...floors];
                  newFloors[index].length = text;
                  setFloors(newFloors);
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Width (m)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter width"
                value={floor.width}
                onChangeText={(text) => {
                  const newFloors = [...floors];
                  newFloors[index].width = text;
                  setFloors(newFloors);
                }}
                keyboardType="numeric"
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addFloorButton} onPress={addFloor}>
          <Text style={styles.addFloorButtonText}>+ Add Floor</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.calculateButton} onPress={calculateCost}>
          <Text style={styles.calculateButtonText}>Calculate Cost</Text>
        </TouchableOpacity>

        {reviewFee > 0 && (
          <View style={styles.costContainer}>
            <Text style={styles.costLabel}>Subtotal: ¢{(reviewFee - 24).toFixed(2)}</Text>
            <Text style={styles.costLabel}>Review Fee: ¢{reviewFee.toFixed(2)}</Text>
            <Text style={styles.costLabelTotal}>
              Total Cost: ¢{finalCost.toFixed(2)}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
          onPress={handleSubmitApplication}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Floor Type Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFloorTypeModal}
        onRequestClose={() => setShowFloorTypeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Floor Type</Text>
            {floorTypes.map((type) => (
              <TouchableOpacity 
                key={type} 
                style={styles.modalButton}
                onPress={() => confirmAddFloor(type)}
              >
                <Text style={styles.modalButtonText}>{type}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowFloorTypeModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Submission Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSubmissionMessage}
        onRequestClose={() => setShowSubmissionMessage(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Application Submitted</Text>
            <Text style={styles.modalText}>
              Your certificate application has been successfully submitted to the database. You will receive updates on the status of your application.
            </Text>
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={downloadApplication}
            >
              <Ionicons name="download-outline" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.downloadButtonText}>Download Application</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={closeSubmissionMessage}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  header: {
    display: 'none',
  },
  subheader: {
    fontSize: 14,
    color: "gray",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "white",
    marginBottom: 10,
  },
  inputText: {
    fontSize: 14,
    color: "gray",
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: "#fff9e6",
    borderColor: "#ffcc00",
    borderWidth: 1,
    borderRadius: 5,
    padding: 15,
    marginBottom: 20,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoBoxText: {
    fontSize: 14,
    color: "#666",
  },
  floorContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    backgroundColor: "white",
  },
  floorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  picker: {
    flex: 1,
  },
  removeText: {
    color: "red",
    fontWeight: "bold",
    marginLeft: 10,
  },
  addFloorButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  addFloorButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  calculateButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  calculateButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  costContainer: {
    marginTop: 20,
  },
  costLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  costLabelTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "red",
  },
  submitButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalText: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    width: "100%",
    marginVertical: 5,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  modalCancelButton: {
    backgroundColor: "#f44336",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  modalCancelButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  downloadButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    width: "100%",
    marginBottom: 10,
  },
  downloadButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  stepContainer: {
    marginBottom: 15,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 5,
  },
  stepText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginLeft: 15,
  },
});

export default CertificateApplicationScreen;
