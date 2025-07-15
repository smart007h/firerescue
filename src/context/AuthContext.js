import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [authHydrated, setAuthHydrated] = useState(false); // NEW: track if auth is hydrated
  const signOutCalledRef = useRef(false);

  // Check for dispatcher authentication from AsyncStorage
  const checkDispatcherAuth = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      if (role === 'dispatcher') {
        const dispatcherDataStr = await AsyncStorage.getItem('dispatcherData');
        if (dispatcherDataStr) {
          const dispatcherData = JSON.parse(dispatcherDataStr);
          
          // Verify dispatcher still exists and is active
          const { data: currentDispatcher, error } = await supabase
            .from('dispatchers')
            .select('*')
            .eq('id', dispatcherData.id)
            .eq('is_active', true)
            .single();

          if (!error && currentDispatcher) {
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
            console.log('[AuthContext] isDispatcherAuth:', true);
            return true;
          } else {
            // Clear invalid dispatcher data
            await AsyncStorage.removeItem('dispatcherData');
            await AsyncStorage.removeItem('userRole');
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('userEmail');
          }
        }
      }
      if (role === 'firefighter') {
        setUserRole('firefighter');
        console.log('[AuthContext] isFirefighterAuth: true');
        return true;
      }
      // Only log false if dispatcher role was expected
      console.log('[AuthContext] isDispatcherAuth: false (dispatcher role in AsyncStorage, but no valid session)');
      return false;
    } catch (error) {
      console.error('Error checking dispatcher auth:', error);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      let finished = false;
      console.log('[AuthContext] initializeAuth called');
      try {
        signOutCalledRef.current = false; // Reset guard on init
        // First check for dispatcher authentication
        const isDispatcherAuth = await checkDispatcherAuth();
        console.log('[AuthContext] isDispatcherAuth:', isDispatcherAuth);
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
            console.log('[AuthContext] Supabase session:', session);
            if (session && session.user) break;
            await new Promise(res => setTimeout(res, 300)); // wait 300ms
            retries--;
          }
          if (session && session.user) {
            setUser(session.user);
            console.log('[AuthContext] Setting user:', session.user);
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
          console.log('[AuthContext] Setting loading false (finally block)');
          setLoading(false);
        } else {
          console.log('[AuthContext] Setting loading false (early return)');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes (only for regular users)
    let lastSessionUserId = null; // NEW: track last session user id
    const { subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session ? 'Session exists' : 'No session');
      const currentRole = await AsyncStorage.getItem('userRole');
      if (currentRole !== 'dispatcher' && session == null) {
        console.log('[AuthContext] onAuthStateChange: No session, calling signOut');
        await signOut();
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user?.id !== lastSessionUserId) {
        // Only update if user actually changed
        setUser(session.user);
        setUserRole('user');
        lastSessionUserId = session.user.id;
        setLoading(false);
      } else {
        console.log('[AuthContext] onAuthStateChange: Session exists or dispatcher, not signing out');
      }
      setAuthHydrated(true); // Always mark hydrated after any event
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Only run on mount

  useEffect(() => {
    console.log('[AuthContext] userRole changed:', userRole);
    if (userRole === 'firefighter') {
      console.log('[AuthContext] userRole is firefighter, should show firefighter stack');
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

  // Function to sign out (handles both regular users and dispatchers)
  const signOut = async (fromInit = false) => {
    if (signOutCalledRef.current && !fromInit) {
      console.log('[AuthContext] signOut: already called, skipping');
      // Still clear state to force UI update
      setUser(null);
      setSession(null);
      setUserRole(null);
      setLoading(false);
      return;
    }
    signOutCalledRef.current = true;
    console.log('[AuthContext] signOut called', { fromInit });
    try {
      // Clear dispatcher data
      await AsyncStorage.removeItem('dispatcherData');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userEmail');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Always clear state after sign out
      setUser(null);
      setSession(null);
      setUserRole(null);
      setLoading(false);
      console.log('[AuthContext] Setting loading false (signOut finally)');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading: loading || !authHydrated, // NEW: loading is true until hydrated
      userRole,
      setUserRole,
      updateDispatcherAuth,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 