const React = require("react");
const { useState, useEffect } = React;
const {
  createNativeStackNavigator,
} = require("@react-navigation/native-stack");
const {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} = require("react-native");
const { createBottomTabNavigator } = require("@react-navigation/bottom-tabs");
const { Ionicons } = require("@expo/vector-icons");
const { createDrawerNavigator } = require("@react-navigation/drawer");

import AsyncStorage from "@react-native-async-storage/async-storage";

// Screen imports with consistent fallback pattern
const WelcomeScreen =
  require("../screens/WelcomeScreen").default ||
  require("../screens/WelcomeScreen");
const LoginSelectionScreen =
  require("../screens/LoginSelectionScreen").default ||
  require("../screens/LoginSelectionScreen");
const UserLoginScreen =
  require("../screens/UserLoginScreen").default ||
  require("../screens/UserLoginScreen");
const UserSignupScreen =
  require("../screens/UserSignupScreen").default ||
  require("../screens/UserSignupScreen");
const FirefighterLoginScreen =
  require("../screens/FirefighterLoginScreen").default ||
  require("../screens/FirefighterLoginScreen");
const DispatcherLoginScreen =
  require("../screens/DispatcherLoginScreen").default ||
  require("../screens/DispatcherLoginScreen");
const ForgotPasswordScreen =
  require("../screens/ForgotPasswordScreen").default ||
  require("../screens/ForgotPasswordScreen");
const UserHomeScreen =
  require("../screens/UserHomeScreen").default ||
  require("../screens/UserHomeScreen");
const FirefighterHomeScreen =
  require("../screens/FirefighterHomeScreen").default ||
  require("../screens/FirefighterHomeScreen");
const FirefighterIncidentScreen =
  require("../screens/FirefighterIncidentScreen").default ||
  require("../screens/FirefighterIncidentScreen");
const ProfileScreen =
  require("../screens/ProfileScreen").default ||
  require("../screens/ProfileScreen");
const EditProfileScreen =
  require("../screens/EditProfileScreen").default ||
  require("../screens/EditProfileScreen");
const ReportIncidentScreen =
  require("../screens/ReportIncidentScreen").default ||
  require("../screens/ReportIncidentScreen");
const IncidentTrackingScreen =
  require("../screens/IncidentTrackingScreen").default ||
  require("../screens/IncidentTrackingScreen");
const IncidentChatScreen =
  require("../screens/IncidentChatScreen").default ||
  require("../screens/IncidentChatScreen");
const FirefighterProfileScreen =
  require("../screens/FirefighterProfileScreen").default ||
  require("../screens/FirefighterProfileScreen");
const FirefighterTeamScreen =
  require("../screens/FirefighterTeamScreen").default ||
  require("../screens/FirefighterTeamScreen");
const IncidentResponseScreen =
  require("../screens/IncidentResponseScreen").default ||
  require("../screens/IncidentResponseScreen");
const UserReportHistoryScreen =
  require("../screens/UserReportHistoryScreen").default ||
  require("../screens/UserReportHistoryScreen");
const SafetyGuidelinesScreen =
  require("../screens/SafetyGuidelinesScreen").default ||
  require("../screens/SafetyGuidelinesScreen");
const SafetyScreen =
  require("../screens/SafetyScreen").default ||
  require("../screens/SafetyScreen");
const UserSelectionScreen =
  require("../screens/UserSelectionScreen").default ||
  require("../screens/UserSelectionScreen");
const DispatcherDashboard =
  require("../screens/DispatcherDashboard").default ||
  require("../screens/DispatcherDashboard");
const NewIncidentScreen =
  require("../screens/NewIncidentScreen").default ||
  require("../screens/NewIncidentScreen");
const IncidentDetailsScreen =
  require("../screens/IncidentDetailsScreen").default ||
  require("../screens/IncidentDetailsScreen");
const IncidentHistoryScreen =
  require("../screens/IncidentHistoryScreen").default ||
  require("../screens/IncidentHistoryScreen");
const MenuScreen =
  require("../screens/MenuScreen").default || require("../screens/MenuScreen");
const UserBookingTrainingScreen =
  require("../screens/UserBookingTrainingScreen").default ||
  require("../screens/UserBookingTrainingScreen");
const RateServiceScreen =
  require("../screens/RateServiceScreen").default ||
  require("../screens/RateServiceScreen");
const FirefighterTrainingApprovalScreen =
  require("../screens/FirefighterTrainingApprovalScreen").default ||
  require("../screens/FirefighterTrainingApprovalScreen");
const UserNotificationsScreen =
  require("../screens/UserNotificationsScreen").default ||
  require("../screens/UserNotificationsScreen");
const CallLogsScreen =
  require("../screens/CallLogsScreen").default ||
  require("../screens/CallLogsScreen");
const FirefighterNotificationsScreen =
  require("../screens/FirefighterNotificationsScreen").default ||
  require("../screens/FirefighterNotificationsScreen");
const DispatchIncidentHistoryScreen =
  require("../screens/DispatchIncidentHistoryScreen").default ||
  require("../screens/DispatchIncidentHistoryScreen");
const DispatchTrackingScreen =
  require("../screens/DispatchTrackingScreen").default ||
  require("../screens/DispatchTrackingScreen");
const DispatchIncidentDetailsScreen =
  require("../screens/DispatchIncidentDetailsScreen").default ||
  require("../screens/DispatchIncidentDetailsScreen");
const DispatchNewIncidentScreen =
  require("../screens/DispatchNewIncidentScreen").default ||
  require("../screens/DispatchNewIncidentScreen");
const CertificateApplicationScreen =
  require("../screens/CertificateApplication").default ||
  require("../screens/CertificateApplication");

// Services and contexts
const { getCurrentUser, initializeAuth } = require("../services/auth");
const { useAuth } = require("../context/AuthContext");
const CustomSplashScreen =
  require("../components/SplashScreen").default ||
  require("../components/SplashScreen");

// Navigator instances
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Loading component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2563eb" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Menu button component
const MenuButton = ({ navigation }) => (
  <TouchableOpacity
    onPress={() => navigation.openDrawer()}
    style={styles.menuButton}
  >
    <Ionicons name="menu" size={24} color="#000" />
  </TouchableOpacity>
);

// Tab navigator styles
const tabScreenOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarActiveTintColor: "#DC3545",
  tabBarInactiveTintColor: "#666",
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: "500",
  },
};

// User Tab Navigator
const UserTabNavigator = () => (
  <Tab.Navigator screenOptions={tabScreenOptions}>
    <Tab.Screen
      name="UserHome"
      component={UserHomeScreen}
      options={{
        tabBarLabel: "Home",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ReportIncident"
      component={ReportIncidentScreen}
      options={{
        tabBarLabel: "Report",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="warning" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Safety"
      component={SafetyScreen}
      options={{
        tabBarLabel: "Safety",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="shield" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="UserProfile"
      component={ProfileScreen}
      options={{
        tabBarLabel: "Profile",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

// Firefighter Tab Navigator
const FirefighterTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: "#FF4B4B",
      tabBarInactiveTintColor: "#666",
      tabBarStyle: {
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: "500",
      },
    }}
  >
    <Tab.Screen
      name="FirefighterHome"
      component={FirefighterHomeScreen}
      options={{
        tabBarLabel: "Home",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="FirefighterNotifications"
      component={FirefighterNotificationsScreen}
      options={{
        tabBarLabel: "Notifications",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="notifications" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="FirefighterIncidents"
      component={FirefighterIncidentScreen}
      options={{
        tabBarLabel: "Incidents",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="alert-circle" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="FirefighterTeam"
      component={FirefighterTeamScreen}
      options={{
        tabBarLabel: "Team",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="people" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="FirefighterProfile"
      component={FirefighterProfileScreen}
      options={{
        tabBarLabel: "Profile",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

// Auth Stack Navigator (for login/signup flows)
const AuthStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
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
  </Stack.Navigator>
);

// User Stack Navigator with Drawer
const UserStack = () => (
  <Drawer.Navigator
    drawerContent={(props) => <MenuScreen {...props} />}
    screenOptions={{
      headerShown: false,
      drawerStyle: {
        backgroundColor: "#FFF5F5",
        width: "80%",
      },
      drawerType: "front",
      overlayColor: "rgba(0,0,0,0.5)",
    }}
  >
    <Drawer.Screen 
      name="UserMain" 
      component={UserTabNavigator}
      options={{ 
        title: "Home",
        drawerItemStyle: { display: 'none' } // Hide from drawer menu since it's handled by MenuScreen
      }}
    />
    <Drawer.Screen
      name="SafetyGuidelines"
      component={SafetyGuidelinesScreen}
      options={{ 
        title: "Safety Guidelines",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="BookTraining"
      component={UserBookingTrainingScreen}
      options={{ 
        title: "Book Training Session",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="UserNotifications"
      component={UserNotificationsScreen}
      options={{ 
        title: "Notifications",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="RateService"
      component={RateServiceScreen}
      options={{ 
        title: "Rate Our Service",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="UserReportHistory"
      component={UserReportHistoryScreen}
      options={{ 
        title: "Report History",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{ 
        title: "Edit Profile",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="IncidentDetails"
      component={IncidentDetailsScreen}
      options={{ 
        title: "Incident Details",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="IncidentTracking"
      component={IncidentTrackingScreen}
      options={{ 
        title: "Incident Tracking",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="IncidentChat"
      component={IncidentChatScreen}
      options={{ 
        title: "Incident Chat",
        drawerItemStyle: { display: 'none' }
      }}
    />
    <Drawer.Screen
      name="CertificateApplication"
      component={CertificateApplicationScreen}
      options={{ 
        title: "Certificate Application",
        drawerItemStyle: { display: 'none' }
      }}
    />
  </Drawer.Navigator>
);

// Firefighter Stack Navigator
const FirefighterStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen
      name="FirefighterMain"
      component={FirefighterTabNavigator}
    />
    <Stack.Screen
      name="IncidentResponse"
      component={IncidentResponseScreen}
    />
    <Stack.Screen
      name="IncidentDetails"
      component={IncidentDetailsScreen}
    />
    <Stack.Screen
      name="IncidentChat"
      component={IncidentChatScreen}
    />
    <Stack.Screen
      name="FirefighterTrainingApproval"
      component={FirefighterTrainingApprovalScreen}
    />
    <Stack.Screen
      name="EditProfile"
      component={EditProfileScreen}
    />
  </Stack.Navigator>
);

// Dispatcher Stack Navigator
const DispatcherStack = () => (
  <Stack.Navigator 
    screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen
      name="DispatcherDashboard"
      component={DispatcherDashboard}
    />
    <Stack.Screen
      name="DispatchTrackingScreen"
      component={DispatchTrackingScreen}
    />
    <Stack.Screen
      name="DispatchIncidentDetailsScreen"
      component={DispatchIncidentDetailsScreen}
    />
    <Stack.Screen
      name="DispatchNewIncidentScreen"
      component={DispatchNewIncidentScreen}
    />
    <Stack.Screen
      name="DispatchIncidentHistory"
      component={DispatchIncidentHistoryScreen}
    />
    <Stack.Screen 
      name="IncidentChat" 
      component={IncidentChatScreen} 
    />
    <Stack.Screen
      name="NewIncident"
      component={NewIncidentScreen}
    />
    <Stack.Screen
      name="CallLogs"
      component={CallLogsScreen}
    />
  </Stack.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { userRole, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  console.log("[AppNavigator] userRole:", userRole, "loading:", loading, "splashDone:", splashDone);

  // Show splash screen while loading or splash not done
  if (loading || !splashDone) {
    return <CustomSplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Route based on user role
  switch (userRole) {
    case "user":
      console.log("[AppNavigator] Rendering user stack");
      return <UserStack />;
      
    case "firefighter":
      console.log("[AppNavigator] Rendering firefighter stack");
      return <FirefighterStack />;
      
    case "dispatcher":
      console.log("[AppNavigator] Rendering dispatcher stack");
      return <DispatcherStack />;
      
    default:
      console.log("[AppNavigator] Rendering auth stack");
      return <AuthStack />;
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFE6E6",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "500",
  },
  menuButton: {
    marginLeft: 15,
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#DC3545",
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

module.exports = AppNavigator;
