import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabaseClient';
import { decode } from 'base64-js';

const EditProfileScreen = ({ navigation, route }) => {
  const { profile } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    profile_image: profile?.profile_image || null
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setLoading(true);
        const base64Image = result.assets[0].base64;
        const fileName = `${profile.id}-${Date.now()}.jpeg`;
        const filePath = `avatars/${fileName}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, decode(base64Image), {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          setFormData(prev => ({ ...prev, profile_image: publicUrl }));
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      // Navigate back to Profile screen with updated data
      const updatedProfile = {
        ...profile,
        full_name: formData.full_name,
        phone: formData.phone
      };
      
      navigation.navigate('Profile', { profile: updatedProfile });
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Update Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {formData.profile_image ? (
            <Avatar.Image
              size={120}
              source={{ uri: formData.profile_image }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={120}
              label={formData.full_name ? formData.full_name.charAt(0).toUpperCase() : '?'}
              style={styles.avatar}
            />
          )}
          <Button
            mode="contained"
            onPress={pickImage}
            style={styles.imageButton}
            loading={loading}
            icon="camera"
          >
            Change Picture
          </Button>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Full Name"
            value={formData.full_name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Phone Number"
            value={formData.phone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            loading={loading}
            disabled={loading}
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#FF6B6B',
  },
  imageButton: {
    marginTop: 8,
  },
  form: {
    marginTop: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 16,
  },
  saveButton: {
    borderRadius: 8,
  },
});

export default EditProfileScreen;
