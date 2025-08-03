import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, Keyboard, TouchableWithoutFeedback, Image } from 'react-native';
import { supabase } from '../config/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const RateServiceScreen = () => {
  const navigation = useNavigation();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleStarPress = (star) => {
    setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Please select a rating before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      // Optionally verify user/session here
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('You must be logged in to submit feedback.');
        setSubmitting(false);
        return;
      }
      // Insert feedback into DB
      const { error } = await supabase
        .from('service_feedback')
        .insert([
          {
            user_id: user.id,
            rating,
            feedback,
            created_at: new Date().toISOString(),
          },
        ]);
      if (error) {
        Alert.alert('Error submitting feedback:', error.message);
      } else {
        Alert.alert('Thank you!', 'Your feedback has been submitted.');
        setRating(0);
        setFeedback('');
      }
    } catch (err) {
      Alert.alert('Error submitting feedback:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Our Service</Text>
        </View>
        <View style={styles.container}>
          <Text style={styles.subtitle}>How would you rate your emergency assistance experience?</Text>
          <View style={styles.rating}>
            {[1,2,3,4,5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleStarPress(star)}>
                <Text style={[styles.star, rating >= star ? styles.starFilled : styles.starEmpty]}>
                  {rating >= star ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.feedbackTitle}>Additional Feedback (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Tell us about your experience..."
            multiline={true}
            value={feedback}
            onChangeText={setFeedback}
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Feedback'}</Text>
          </TouchableOpacity>
          <Text style={styles.note}>Your feedback helps us improve our services and is confidential, used for quality improvement only.</Text>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  rating: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  star: {
    fontSize: 32,
    marginHorizontal: 2,
    paddingHorizontal: 2,
  },
  starFilled: {
    color: '#FFB300',
  },
  starEmpty: {
    color: '#ccc',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  textInput: {
    minHeight: 80,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    width: '100%',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
});

export default RateServiceScreen;