import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, ScrollView, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Emergency Response',
    description: 'Quick access to emergency services when you need them most',
    image: require('../assets/images/fire1.jpeg'),
  },
  {
    id: 2,
    title: 'Fire Safety',
    description: 'Learn about fire prevention and safety guidelines',
    image: require('../assets/images/fire2.jpeg'),
  },
  {
    id: 3,
    title: 'Real-time Updates',
    description: 'Stay informed with real-time updates from nearby fire stations',
    image: require('../assets/images/fire3.jpeg'),
  },
];

const WelcomeScreen = ({ navigation, route }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const scrollViewRef = React.useRef(null);
  const sessionCheckingRef = React.useRef(false); // Prevent multiple simultaneous calls
  const initialRoleRef = React.useRef(null); // Track initial user role
  const { userRole, loading: authLoading } = useAuth();

  // Check if we came from a logout action
  const fromLogout = route?.params?.fromLogout || false;

  // Detect logout scenario: if we had a role initially but now don't have one
  const detectedLogout = React.useMemo(() => {
    if (initialRoleRef.current === null) {
      initialRoleRef.current = userRole;
    }
    // If we initially had a role but now don't (and it's not the first render), it's likely a logout
    return initialRoleRef.current && !userRole && !authLoading;
  }, [userRole, authLoading]);

  const isFromLogout = fromLogout || detectedLogout;

  // Early return if user already has a role and it's not from logout
  // This prevents unnecessary session checking when AppNavigator should handle routing
  if (!isFromLogout && userRole && !authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    // If we came from logout or detected logout, don't check session - just show welcome screen
    if (isFromLogout) {
      console.log('[WelcomeScreen] Arrived from logout (detected or explicit), showing welcome screen');
      setSessionChecked(true);
      setIsLoading(false);
      return;
    }

    // Only check session once when auth context is ready and session hasn't been checked yet
    if (!authLoading && !sessionChecked && !sessionCheckingRef.current) {
      console.log('[WelcomeScreen] Auth context ready, checking session once...');
      checkUserSession();
    }
  }, [authLoading, sessionChecked, isFromLogout]);

  // Handle navigation based on userRole from context
  useEffect(() => {
    // Don't auto-navigate if we came from logout
    if (isFromLogout) {
      return;
    }

    // If user has a valid role, don't show welcome screen - let AppNavigator handle the routing
    if (!authLoading && sessionChecked && userRole) {
      console.log('[WelcomeScreen] User has role:', userRole, 'letting AppNavigator handle routing');
      // Don't navigate manually - let the AppNavigator switch stacks based on userRole
      return;
    }
  }, [userRole, authLoading, sessionChecked, isFromLogout]);

  const checkUserSession = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (sessionCheckingRef.current) {
      console.log('[WelcomeScreen] Session check already in progress, skipping...');
      return;
    }

    try {
      sessionCheckingRef.current = true;
      setIsLoading(true);
      console.log('[WelcomeScreen] Checking user session...');
      
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      const userDataStr = await AsyncStorage.getItem('userData');

      if (sessionStr && userDataStr) {
        const session = JSON.parse(sessionStr);
        const userData = JSON.parse(userDataStr);

        console.log('[WelcomeScreen] Found session:', !!session);
        console.log('[WelcomeScreen] User role:', userData?.role);

        // If session exists and not expired
        if (session && session.expires_at * 1000 > Date.now()) {
          // Let the useEffect handle navigation based on userRole from context
          setSessionChecked(true);
          setIsLoading(false);
          return;
        } else {
          console.log('[WelcomeScreen] Session expired or invalid');
        }
      } else {
        console.log('[WelcomeScreen] No session found');
      }

      // If no valid session found
      setSessionChecked(true);
      setIsLoading(false);
      
      // Don't navigate automatically - let the screen render naturally
      console.log('[WelcomeScreen] No valid session, showing welcome screen');

    } catch (error) {
      console.error('[WelcomeScreen] Error checking user session:', error);
      setSessionChecked(true);
      setIsLoading(false);
    } finally {
      sessionCheckingRef.current = false;
    }
  }, []);

  const handleScroll = useCallback((event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.round(offset / slideSize);
    setActiveSlide(activeIndex);
  }, []);

  const navigateToUserSelection = () => {
    try {
      navigation.navigate('UserSelectionScreen');
    } catch (error) {
      console.error('[WelcomeScreen] Error navigating to UserSelectionScreen:', error);
      // Fallback navigation
      navigation.navigate('LoginSelection');
    }
  };

  const handleGetStarted = () => {
    navigateToUserSelection();
  };

  const handleSkip = () => {
    navigateToUserSelection();
  };

  const handleNext = () => {
    if (scrollViewRef.current) {
      const nextSlide = activeSlide + 1;
      if (nextSlide < slides.length) {
        const offset = nextSlide * (screenWidth - 40);
        scrollViewRef.current.scrollTo({ x: offset, animated: true });
      }
    }
  };

  const renderSlide = (item) => (
    <View key={item.id} style={[styles.slideContainer, { width: screenWidth - 40 }]}>
      <Image 
        source={item.image} 
        style={styles.slideImage} 
        resizeMode="cover"
      />
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  // Show loading while checking session or auth is loading
  if (isLoading || authLoading || !sessionChecked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image 
            source={require('../assets/images/logo.jpeg')} 
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>Loading...</Text>
          <Text style={styles.loadingSubtext}>
            {authLoading ? 'Authenticating...' : 'Checking session...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // If user has a role and session is valid, don't show welcome screen
  if (userRole && sessionChecked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../assets/images/logo.jpeg')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>GHANA NATIONAL{'\n'}FIRE SERVICE</Text>
        <Text style={styles.subtitle}>
          Empowering Communities, Protecting Lives
        </Text>
      </View>

      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollViewContent}
          style={{ width: '100%' }}
        >
          {slides.map(renderSlide)}
        </ScrollView>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeSlide && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {activeSlide === slides.length - 1 ? (
          <Button
            mode="contained"
            style={styles.button}
            contentStyle={styles.buttonContent}
            onPress={handleGetStarted}
          >
            Get Started
          </Button>
        ) : (
          <View style={styles.footerButtons}>
            <Button
              mode="text"
              onPress={handleSkip}
              style={styles.skipButton}
              labelStyle={styles.skipButtonText}
            >
              Skip
            </Button>
            <Button
              mode="text"
              onPress={handleNext}
              style={styles.nextButton}
              labelStyle={styles.nextButtonText}
            >
              Next
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6E6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 20,
    borderRadius: 40,
  },
  loadingText: {
    fontSize: 18,
    color: '#DC3545',
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 16,
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  carouselContainer: {
    flex: 1,
    alignItems: 'center',
  },
  scrollViewContent: {
    paddingHorizontal: 20,
  },
  slideContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 10,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
  },
  slideImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  slideDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
    transition: 'all 0.3s ease',
  },
  paginationDotActive: {
    backgroundColor: '#DC3545',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#DC3545',
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  skipButton: {
    marginRight: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  nextButton: {
    marginLeft: 8,
  },
  nextButtonText: {
    color: '#DC3545',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;