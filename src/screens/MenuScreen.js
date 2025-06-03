import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../config/supabaseClient';

const MenuScreen = ({ navigation }) => {
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const menuItems = [
    {
      icon: 'book-open-variant',
      title: 'Safety Guidelines',
      onPress: () => navigation.navigate('SafetyGuidelines'),
    },
    {
      icon: 'account-group',
      title: 'Book Training Session',
      onPress: () => navigation.navigate('BookTraining'),
    },
    {
      icon: 'star',
      title: 'Rate Our Service',
      onPress: () => navigation.navigate('RateService'),
    },
    {
      icon: 'bell-outline',
      title: 'Notifications',
      onPress: () => navigation.navigate('UserNotifications'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/logo.jpeg')}
            style={styles.logo}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>GHANA NATIONAL</Text>
            <Text style={styles.subtitle}>FIRE SERVICE</Text>
          </View>
        </View>
        <Text style={styles.safetyText}>Safety First</Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Icon name={item.icon} size={24} color="#666" />
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Icon name="logout" size={24} color="#DC3545" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5E5',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 10,
    borderRadius: 30,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC3545',
  },
  subtitle: {
    fontSize: 16,
    color: '#DC3545',
  },
  safetyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  menuContainer: {
    flex: 1,
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE5E5',
  },
  menuText: {
    marginLeft: 15,
    fontSize: 18,
    color: '#666',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#FFE5E5',
  },
  signOutText: {
    marginLeft: 15,
    fontSize: 18,
    color: '#DC3545',
  },
});

export default MenuScreen; 