import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NewIncidentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    description: '',
    priority: 'medium',
    status: 'active',
  });

  const handleSubmit = async () => {
    if (!formData.type || !formData.location || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Get authenticated user UUID
      const { data: { user } } = await supabase.auth.getUser();
      const dispatcherUUID = user?.id;
      // Check dispatcher record exists
      const { data: dispatcher, error: dispatcherError } = await supabase
        .from('dispatchers')
        .select('*')
        .eq('id', dispatcherUUID)
        .single();
      if (dispatcherError || !dispatcher) {
        Alert.alert('Error', 'Dispatcher record not found or mismatched.');
        setLoading(false);
        return;
      }
      // Create the incident
      const { data, error } = await supabase
        .from('incidents')
        .insert([
          {
            type: formData.type,
            location: formData.location,
            description: formData.description,
            priority: formData.priority,
            status: formData.status,
            station_id: dispatcher.station_id,
            reported_by: dispatcherUUID,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Incident created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating incident:', error);
      Alert.alert('Error', 'Failed to create incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
        </TouchableOpacity>
        <Text style={styles.title}>New Incident</Text>
      </View>

      <ScrollView style={styles.form}>
        <TextInput
          label="Incident Type *"
          value={formData.type}
          onChangeText={(text) => setFormData({ ...formData, type: text })}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Location *"
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Description *"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        <View style={styles.priorityContainer}>
          <Text style={styles.priorityLabel}>Priority:</Text>
          <View style={styles.priorityButtons}>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                formData.priority === 'low' && styles.priorityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, priority: 'low' })}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  formData.priority === 'low' && styles.priorityButtonTextActive,
                ]}
              >
                Low
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                formData.priority === 'medium' && styles.priorityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, priority: 'medium' })}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  formData.priority === 'medium' && styles.priorityButtonTextActive,
                ]}
              >
                Medium
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.priorityButton,
                formData.priority === 'high' && styles.priorityButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, priority: 'high' })}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  formData.priority === 'high' && styles.priorityButtonTextActive,
                ]}
              >
                High
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          Create Incident
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  priorityContainer: {
    marginBottom: 24,
  },
  priorityLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#000000',
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  priorityButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priorityButtonText: {
    textAlign: 'center',
    color: '#000000',
  },
  priorityButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    marginTop: 16,
    padding: 8,
  },
});

export default NewIncidentScreen;