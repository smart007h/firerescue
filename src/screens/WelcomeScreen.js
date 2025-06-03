import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, ScrollView, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const WelcomeScreen = ({ navigation }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const scrollViewRef = React.useRef(null);

  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('supabase-session');
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (sessionStr && userDataStr) {
        const session = JSON.parse(sessionStr);
        const userData = JSON.parse(userDataStr);
        
        // If session exists and not expired
        if (session && new Date(session.expires_at) > new Date()) {
          // Navigate directly to the appropriate home screen
          navigation.replace('DrawerNavigator', {
            screen: 'MainStack',
            params: {
              screen: userData.profile?.role === 'firefighter' ? 'FirefighterMain' : 'UserMain'
            }
          });
          return;
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking user session:', error);
      setIsLoading(false);
    }
  };

  const handleScroll = useCallback((event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.round(offset / slideSize);
    setActiveSlide(activeIndex);
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('UserSelection');
  };

  const handleSkip = () => {
    navigation.navigate('UserSelection');
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
  },
  loadingText: {
    fontSize: 16,
    color: '#DC3545',
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
  },
  slideDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
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
