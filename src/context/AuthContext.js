import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';
import { validateAndRefreshSession, updateLastActivity, clearAllSessions } from '../utils/sessionManager';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [authHydrated, setAuthHydrated] = useState(false); // NEW: track if auth is hydrated
  const [freshLaunch, setFreshLaunch] = useState(true); // NEW: track if this is a fresh app launch
  const signOutCalledRef = useRef(false);

  // Check for dispatcher authentication from AsyncStorage
  const checkDispatcherAuth = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      if (role === 'dispatcher') {
        // Validate session first
        const session = await validateAndRefreshSession('dispatcher');
        if (!session) {
          // Session expired, clear dispatcher data
          await AsyncStorage.removeItem('dispatcherData');
          await AsyncStorage.removeItem('userRole');
          await AsyncStorage.removeItem('userId');
          await AsyncStorage.removeItem('userEmail');
          return false;
        }

        const dispatcherDataStr = await AsyncStorage.getItem('dispatcherData');
        if (dispatcherDataStr) {
          const dispatcherData = JSON.parse(dispatcherDataStr);
          
          // Verify dispatcher still exists and is active
          const { data: currentDispatcher, error } = await supabase
            .from('dispatchers')
            .select('*')
            .eq('id', dispatcherData.id)
            .eq('is_active', true)
            .maybeSingle();

          if (!error && currentDispatcher) {
            // Update last activity
            updateLastActivity();
            
            // Create a user object that matches the expected format
            const dispatcherUser = {
              id: currentDispatcher.id,
              email: currentDispatcher.email,
              role: 'dispatcher',
              user_metadata: {
                full_name: currentDispatcher.name,
                phone: currentDispatcher.phone
              },
              app_metadata: {
                role: 'dispatcher'
              }
            };

            setUser(dispatcherUser);
            setSession({
              user: dispatcherUser,
              // Add any other session fields you need here
            });
            setUserRole('dispatcher');
            return true;
          } else {
            // Clear invalid dispatcher data
            await clearAllSessions();
          }
        }
      }
      if (role === 'firefighter') {
        // Validate firefighter session
        const session = await validateAndRefreshSession('firefighter');
        if (!session) {
          await clearAllSessions();
          return false;
        }
        
        updateLastActivity();
        setUserRole('firefighter');
        return true;
      }
      // Only log false if dispatcher role was expected
      return false;
    } catch (error) {
      console.error('Error checking dispatcher auth:', error);
      await clearAllSessions();
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      let finished = false;
      try {
        signOutCalledRef.current = false; // Reset guard on init
        
        // Check if this is a fresh launch vs app refresh
        const isAppRefresh = await AsyncStorage.getItem('app-refresh-flag');
        
        if (isAppRefresh) {
          // This is an app refresh, keep existing auth
          await AsyncStorage.removeItem('app-refresh-flag');
          setFreshLaunch(false);
        } else {
          // This is a fresh launch, clear all sessions to force re-authentication
          await clearAllSessions();
          setFreshLaunch(true);
          setAuthHydrated(true);
          setLoading(false);
          return;
        }
        
        // Only proceed with auto-login if this was an app refresh
        // First check for dispatcher authentication
        const isDispatcherAuth = await checkDispatcherAuth();
        if (isDispatcherAuth) {
          setUserRole('dispatcher');
          finished = true;
          setAuthHydrated(true); // NEW: mark hydrated
          return;
        } else {
          // Check for Supabase session (for regular users)
          let session = null;
          let retries = 3;
          while (retries > 0) {
            const { data } = await supabase.auth.getSession();
            session = data.session;
            if (session && session.user) break;
            await new Promise(res => setTimeout(res, 300)); // wait 300ms
            retries--;
          }
          if (session && session.user) {
            setUser(session.user);
            setUserRole('user');
            finished = true;
            setAuthHydrated(true); // NEW: mark hydrated
            return;
          } else {
            // No valid session, clear userRole and sign out
            setUserRole(null);
            await signOut(true); // pass true to indicate called from init
            finished = true;
            setAuthHydrated(true); // NEW: mark hydrated
            return;
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        await signOut(true);
        setUserRole(null);
        finished = true;
        setAuthHydrated(true); // NEW: mark hydrated
      } finally {
        if (!finished) {
          // Defensive: ensure loading is always set to false
          setLoading(false);
        } else {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes (only for regular users)
    let lastSessionUserId = null; // NEW: track last session user id
    const { subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentRole = await AsyncStorage.getItem('userRole');
      if (currentRole !== 'dispatcher' && session == null) {
        await signOut();
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user?.id !== lastSessionUserId) {
        // Only update if user actually changed
        setUser(session.user);
        setUserRole('user');
        lastSessionUserId = session.user.id;
        setLoading(false);
      } else {
        // Session exists or dispatcher, not signing out
      }
      setAuthHydrated(true); // Always mark hydrated after any event
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Only run on mount

  useEffect(() => {
    if (userRole === 'firefighter') {
      // Firefighter stack should be shown
    }
  }, [userRole]);

  // Function to manually update dispatcher auth state
  const updateDispatcherAuth = async (dispatcherData) => {
    if (dispatcherData) {
      const dispatcherUser = {
        id: dispatcherData.id,
        email: dispatcherData.email,
        role: 'dispatcher',
        user_metadata: {
          full_name: dispatcherData.name,
          phone: dispatcherData.phone
        },
        app_metadata: {
          role: 'dispatcher'
        }
      };
      setUser(dispatcherUser);
      setUserRole('dispatcher');
    } else {
      setUser(null);
      setUserRole(null);
    }
  };

  // Function to mark app refresh (for development)
  const markAppRefresh = async () => {
    await AsyncStorage.setItem('app-refresh-flag', 'true');
  };

  // Function to clear refresh flag and force fresh login
  const forceFreshLogin = async () => {
    await AsyncStorage.removeItem('app-refresh-flag');
    await clearAllSessions();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setFreshLaunch(true);
  };

  // Function to sign out (handles both regular users and dispatchers)
  const signOut = async (fromInit = false) => {
    if (signOutCalledRef.current && !fromInit) {
      // Still clear state to force UI update
      setUser(null);
      setSession(null);
      setUserRole(null);
      setLoading(false);
      return;
    }
    signOutCalledRef.current = true;
    try {
      // Use centralized session clearing
      await clearAllSessions();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always clear state after sign out
      setUser(null);
      setSession(null);
      setUserRole(null);
      setLoading(false);
      
      // Reset the guard after a delay to allow for potential re-initialization
      setTimeout(() => {
        signOutCalledRef.current = false;
      }, 1000);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading: loading || !authHydrated, // NEW: loading is true until hydrated
      userRole,
      freshLaunch,
      setUserRole,
      updateDispatcherAuth,
      markAppRefresh,
      forceFreshLogin,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 