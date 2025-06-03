import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import WelcomeScreen from '../screens/WelcomeScreen';
import LoginSelectionScreen from '../screens/LoginSelectionScreen';
import UserLoginScreen from '../screens/UserLoginScreen';
import UserSignupScreen from '../screens/UserSignupScreen';
import FirefighterLoginScreen from '../screens/FirefighterLoginScreen';
import DispatcherLoginScreen from '../screens/DispatcherLoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import UserHomeScreen from '../screens/UserHomeScreen';
import FirefighterHomeScreen from '../screens/FirefighterHomeScreen';
import FirefighterIncidentScreen from '../screens/FirefighterIncidentScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ReportIncidentScreen from '../screens/ReportIncidentScreen';
import IncidentTrackingScreen from '../screens/IncidentTrackingScreen';
import IncidentChatScreen from '../screens/IncidentChatScreen';
import FirefighterProfileScreen from '../screens/FirefighterProfileScreen';
import FirefighterTeamScreen from '../screens/FirefighterTeamScreen';
import IncidentResponseScreen from '../screens/IncidentResponseScreen';
import UserReportHistoryScreen from '../screens/UserReportHistoryScreen';
import SafetyGuidelinesScreen from '../screens/SafetyGuidelinesScreen';
import SafetyScreen from '../screens/SafetyScreen';
import UserSelectionScreen from '../screens/UserSelectionScreen';
import DispatcherDashboard from '../screens/DispatcherDashboard';
import NewIncidentScreen from '../screens/NewIncidentScreen';
import IncidentDetailsScreen from '../screens/IncidentDetailsScreen';
import IncidentHistoryScreen from '../screens/IncidentHistoryScreen';
import MenuScreen from '../screens/MenuScreen';
import BookTrainingScreen from '../screens/BookTrainingScreen';
import RateServiceScreen from '../screens/RateServiceScreen';
import TrainingBookingsScreen from '../screens/TrainingBookingsScreen';
import UserNotificationsScreen from '../screens/UserNotificationsScreen';
import CallLogsScreen from '../screens/CallLogsScreen';
import { getCurrentUser, initializeAuth } from '../services/auth';
import FirefighterNotificationsScreen from '../screens/FirefighterNotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2563eb" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

const UserTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: '#DC3545',
      tabBarInactiveTintColor: '#666',
    }}
  >
    <Tab.Screen
      name="Home"
      component={UserHomeScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Report"
      component={ReportIncidentScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="warning" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Safety"
      component={SafetyScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="shield" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const FirefighterTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#FF4B4B',
      tabBarInactiveTintColor: '#666',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
      },
    }}
  >
    <Tab.Screen
      name="FirefighterHome"
      component={FirefighterHomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="FirefighterNotifications"
      component={FirefighterNotificationsScreen}
      options={{
        tabBarLabel: 'Notifications',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="notifications" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Incidents"
      component={FirefighterIncidentScreen}
      options={{
        tabBarLabel: 'Incidents',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="alert-circle" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Team"
      component={FirefighterTeamScreen}
      options={{
        tabBarLabel: 'Team',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="people" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={FirefighterProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const MenuButton = ({ navigation }) => (
  <TouchableOpacity 
    onPress={() => navigation.openDrawer()}
    style={{ marginLeft: 15 }}
  >
    <Icon name="menu" size={24} color="#000" />
  </TouchableOpacity>
);

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="LoginSelection" component={LoginSelectionScreen} />
    <Stack.Screen name="UserLogin" component={UserLoginScreen} />
    <Stack.Screen name="UserSignup" component={UserSignupScreen} />
    <Stack.Screen name="FirefighterLogin" component={FirefighterLoginScreen} />
    <Stack.Screen name="DispatcherLogin" component={DispatcherLoginScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="UserMain" component={UserTabNavigator} />
    <Stack.Screen name="FirefighterMain" component={FirefighterTabNavigator} />
    <Stack.Screen name="SafetyGuidelines" component={SafetyGuidelinesScreen} />
    <Stack.Screen name="IncidentTracking" component={IncidentTrackingScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="IncidentResponse" component={IncidentResponseScreen} />
    <Stack.Screen name="NewIncident" component={NewIncidentScreen} />
    <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
    <Stack.Screen name="UserReportHistory" component={UserReportHistoryScreen} />
    <Stack.Screen name="FirefighterIncidentDetails" component={FirefighterIncidentScreen} />
    <Stack.Screen name="IncidentChat" component={IncidentChatScreen} />
    <Stack.Screen name="TrainingBookings" component={TrainingBookingsScreen} />
    <Stack.Screen name="CallLogs" component={CallLogsScreen} />
    <Stack.Screen
      name="UserNotifications"
      component={UserNotificationsScreen}
      options={{
        title: 'User Notifications',
        headerStyle: {
          backgroundColor: '#FF4B4B',
        },
        headerTintColor: '#fff',
      }}
    />
  </Stack.Navigator>
);

const DrawerNavigator = () => (
  <Drawer.Navigator
    drawerContent={(props) => <MenuScreen {...props} />}
    screenOptions={{
      headerShown: false,
      drawerStyle: {
        backgroundColor: '#FFF5F5',
        width: '80%',
      },
    }}
  >
    <Drawer.Screen name="MainStack" component={MainStack} />
    <Drawer.Screen name="SafetyGuidelines" component={SafetyGuidelinesScreen} />
    <Drawer.Screen name="BookTraining" component={BookTrainingScreen} />
    <Drawer.Screen name="RateService" component={RateServiceScreen} />
  </Drawer.Navigator>
);

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [initialRoute, setInitialRoute] = useState('Welcome');

  useEffect(() => {
    async function checkAuth() {
      try {
        await initializeAuth();
        
        // Check if there's a stored session
        const sessionStr = await AsyncStorage.getItem('supabase-session');
        const userDataStr = await AsyncStorage.getItem('userData');
        
        if (sessionStr && userDataStr) {
          const session = JSON.parse(sessionStr);
          const userData = JSON.parse(userDataStr);
          
          // Set the user and navigate to the appropriate screen
          setUser({
            ...userData,
            session: session
          });
          
          // Navigate to DrawerNavigator with the appropriate initial screen
          setInitialRoute('DrawerNavigator');
        } else {
          setInitialRoute('Welcome');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setInitialRoute('Welcome');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="LoginSelection" component={LoginSelectionScreen} />
      <Stack.Screen name="UserLogin" component={UserLoginScreen} />
      <Stack.Screen name="UserSignup" component={UserSignupScreen} />
      <Stack.Screen name="FirefighterLogin" component={FirefighterLoginScreen} />
      <Stack.Screen name="DispatcherLogin" component={DispatcherLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="UserSelection" component={UserSelectionScreen} />
      <Stack.Screen name="DispatcherDashboard" component={DispatcherDashboard} />
      <Stack.Screen 
        name="DrawerNavigator" 
        component={DrawerNavigator}
        initialParams={user ? {
          screen: 'MainStack',
          params: {
            screen: user?.profile?.role === 'firefighter' ? 'FirefighterMain' : 'UserMain'
          }
        } : undefined}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE6E6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2563eb',
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
