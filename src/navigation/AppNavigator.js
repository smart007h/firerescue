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
import UserBookingTrainingScreen from '../screens/UserBookingTrainingScreen';
import RateServiceScreen from '../screens/RateServiceScreen';
import FirefighterTrainingApprovalScreen from '../screens/FirefighterTrainingApprovalScreen';
import UserNotificationsScreen from '../screens/UserNotificationsScreen';
import CallLogsScreen from '../screens/CallLogsScreen';
import { getCurrentUser, initializeAuth } from '../services/auth';
import FirefighterNotificationsScreen from '../screens/FirefighterNotificationsScreen';
import DispatchIncidentHistoryScreen from '../screens/DispatchIncidentHistoryScreen';
import DispatchTrackingScreen from '../screens/DispatchTrackingScreen';
import DispatchIncidentDetailsScreen from '../screens/DispatchIncidentDetailsScreen';
import DispatchNewIncidentScreen from '../screens/DispatchNewIncidentScreen';
import { useAuth } from '../context/AuthContext';
import CustomSplashScreen from '../components/SplashScreen';

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
        title: 'Welcome back!',
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
    <Stack.Screen name="UserSelectionScreen" component={UserSelectionScreen} />
    <Stack.Screen name="UserMain" component={UserTabNavigator} />
    <Stack.Screen name="FirefighterMain" component={FirefighterTabNavigator} />
    <Stack.Screen name="FirefighterHome" component={FirefighterHomeScreen} />
    <Stack.Screen name="SafetyGuidelines" component={SafetyGuidelinesScreen} />
    <Stack.Screen name="IncidentTracking" component={IncidentTrackingScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="IncidentResponse" component={IncidentResponseScreen} />
    <Stack.Screen name="NewIncident" component={NewIncidentScreen} />
    <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
    <Stack.Screen name="UserReportHistory" component={UserReportHistoryScreen} />
    <Stack.Screen name="FirefighterIncidentDetails" component={IncidentDetailsScreen} />
    <Stack.Screen name="IncidentChat" component={IncidentChatScreen} />
    <Stack.Screen name="FirefighterTrainingApproval" component={FirefighterTrainingApprovalScreen} />
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
    <Stack.Screen name="DispatchIncidentHistory" component={DispatchIncidentHistoryScreen} />
    <Stack.Screen name="DispatcherDashboard" component={DispatcherDashboard} />
    <Stack.Screen name="DispatchTrackingScreen" component={DispatchTrackingScreen} />
    <Stack.Screen name="DispatchIncidentDetailsScreen" component={DispatchIncidentDetailsScreen} />
    <Stack.Screen name="DispatchNewIncidentScreen" component={DispatchNewIncidentScreen} />
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
    <Drawer.Screen name="BookTraining" component={UserBookingTrainingScreen} />
    <Drawer.Screen name="RateService" component={RateServiceScreen} />
    <Drawer.Screen name="FirefighterTrainingApproval" component={FirefighterTrainingApprovalScreen} />
  </Drawer.Navigator>
);

const AppNavigator = () => {
  const { userRole, loading } = useAuth();
  const [splashDone, setSplashDone] = React.useState(false);

  console.log('[AppNavigator] userRole:', userRole, 'loading:', loading, 'splashDone:', splashDone);

  if (loading || !splashDone) {
    return <CustomSplashScreen onFinish={() => setSplashDone(true)} />;
  }

  if (userRole === 'dispatcher') {
    // Only allow dispatcher screens
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="DispatcherDashboard" component={DispatcherDashboard} />
        <Stack.Screen name="DispatchTrackingScreen" component={DispatchTrackingScreen} />
        <Stack.Screen name="DispatchIncidentDetailsScreen" component={DispatchIncidentDetailsScreen} />
        <Stack.Screen name="DispatchNewIncidentScreen" component={DispatchNewIncidentScreen} />
        <Stack.Screen name="DispatchIncidentHistory" component={DispatchIncidentHistoryScreen} />
        <Stack.Screen name="IncidentChat" component={IncidentChatScreen} />
      </Stack.Navigator>
    );
  }

  if (userRole === 'user') {
    // Only allow user screens, wrapped in a Drawer Navigator
    return (
      <Drawer.Navigator
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            backgroundColor: '#FFF5F5',
            width: '80%',
          },
        }}
      >
        <Drawer.Screen name="UserMain" component={UserTabNavigator} />
        <Drawer.Screen name="MenuScreen" component={MenuScreen} options={{ title: 'Menu' }} />
        <Drawer.Screen name="SafetyGuidelines" component={SafetyGuidelinesScreen} options={{ title: 'Safety Guidelines' }} />
        <Drawer.Screen name="BookTraining" component={UserBookingTrainingScreen} options={{ title: 'Book Training Session' }} />
        <Drawer.Screen name="UserNotifications" component={UserNotificationsScreen} options={{ title: 'Notifications' }} />
        <Drawer.Screen name="RateService" component={RateServiceScreen} options={{ title: 'Rate Our Service' }} />
        <Drawer.Screen name="UserReportHistory" component={UserReportHistoryScreen} options={{ title: 'Report History' }} />
        <Drawer.Screen name="IncidentDetails" component={IncidentDetailsScreen} options={{ title: 'Incident Details' }} />
        <Drawer.Screen name="IncidentTracking" component={IncidentTrackingScreen} options={{ title: 'Incident Tracking' }} />
        <Drawer.Screen name="IncidentChat" component={IncidentChatScreen} options={{ title: 'Incident Chat' }} />
        {/* Add more Drawer.Screen for other user features if needed */}
      </Drawer.Navigator>
    );
  }

  if (userRole === 'firefighter') {
    console.log('[AppNavigator] Rendering firefighter stack!');
    // Only allow firefighter screens
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FirefighterMain" component={FirefighterTabNavigator} />
        {/* Add other firefighter screens as needed */}
      </Stack.Navigator>
    );
  }

  // If no role, show login/welcome
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="LoginSelection" component={LoginSelectionScreen} />
      <Stack.Screen name="UserLogin" component={UserLoginScreen} />
      <Stack.Screen name="UserSignup" component={UserSignupScreen} />
      <Stack.Screen name="FirefighterLogin" component={FirefighterLoginScreen} />
      <Stack.Screen name="DispatcherLogin" component={DispatcherLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="UserSelectionScreen" component={UserSelectionScreen} />
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
