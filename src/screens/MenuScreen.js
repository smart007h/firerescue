import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

const MenuScreen = ({ navigation }) => {
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    try {
      console.log('[MenuScreen] Signing out...');
      await signOut();
      // Close drawer after signing out
      navigation.closeDrawer();
    } catch (error) {
      console.error('[MenuScreen] Error signing out:', error.message);
    }
  };

  const handleMenuItemPress = (screenName) => {
    try {
      console.log('[MenuScreen] Navigating to:', screenName);
      navigation.navigate(screenName);
      // Close drawer after navigation
      navigation.closeDrawer();
    } catch (error) {
      console.error('[MenuScreen] Navigation error:', error);
    }
  };

  const handleHomePress = () => {
    try {
      // Navigate to the main tab navigator
      navigation.navigate('UserMain');
      navigation.closeDrawer();
    } catch (error) {
      console.error('[MenuScreen] Error navigating to home:', error);
    }
  };

  const menuItems = [
    {
      icon: 'home-outline',
      title: 'Home',
      onPress: handleHomePress,
      color: '#DC3545',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Safety Guidelines',
      onPress: () => handleMenuItemPress('SafetyGuidelines'),
      color: '#28A745',
    },
    {
      icon: 'school-outline',
      title: 'Book Training Session',
      onPress: () => handleMenuItemPress('BookTraining'),
      color: '#007BFF',
    },
    {
      icon: 'star-outline',
      title: 'Rate Our Service',
      onPress: () => handleMenuItemPress('RateService'),
      color: '#FFC107',
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      onPress: () => handleMenuItemPress('UserNotifications'),
      color: '#6F42C1',
    },
    {
      icon: 'time-outline',
      title: 'Report History',
      onPress: () => handleMenuItemPress('UserReportHistory'),
      color: '#17A2B8',
    },
    {
      icon: 'document-text-outline',
      title: 'Certificate Application',
      onPress: () => handleMenuItemPress('CertificateApplication'),
      color: '#28A745',
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
        {user && (
          <Text style={styles.userText}>
            Welcome, {user.email?.split('@')[0] || 'User'}
          </Text>
        )}
      </View>

      <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
              <Ionicons 
                name={item.icon} 
                size={24} 
                color={item.color} 
              />
            </View>
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color="#999" 
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={styles.signOutIconContainer}>
            <Ionicons 
              name="log-out-outline" 
              size={24} 
              color="#DC3545" 
            />
          </View>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>
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
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC3545',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#DC3545',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  safetyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    fontStyle: 'italic',
  },
  userText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#FFE5E5',
    backgroundColor: '#FFFFFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#FFE5E5',
  },
  signOutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC354515',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  signOutText: {
    fontSize: 16,
    color: '#DC3545',
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
});

export default MenuScreen;