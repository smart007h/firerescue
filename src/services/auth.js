import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const initializeAuth = async () => {
  try {
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (session) {
      // Store the session
      await AsyncStorage.setItem('supabase-session', JSON.stringify(session));
      
      // Get and store user data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profile) {
        await AsyncStorage.setItem('userData', JSON.stringify({
          id: session.user.id,
          profile: profile
        }));
      }
    }
    
    return { session, error: null };
  } catch (error) {
    console.error('Error initializing auth:', error);
    return { session: null, error };
  }
};

export const signUpUser = async (email, password, fullName, phone) => {
  try {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });

    if (error) throw error;

    // Wait for the session to be established
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      // Create profile entry only after we have a valid session
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: session.user.id,
            email,
            full_name: fullName,
            phone,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'id' });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('SignUp error:', error?.message || error);
    return { data: null, error };
  }
};

export const signInUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.session) {
      // Store the session
      await AsyncStorage.setItem('supabase-session', JSON.stringify(data.session));
      
      // Get and store user data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();
        
      if (profile) {
        const userData = {
          id: data.session.user.id,
          profile: profile
        };
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        return { data: userData, error: null };
      }
    }

    throw new Error('No session data returned');
  } catch (error) {
    return { data: null, error };
  }
};

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'firerescue://reset-password',
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Reset password error:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    // Clear stored session and user data
    await AsyncStorage.removeItem('supabase-session');
    await AsyncStorage.removeItem('userData');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    // First try to get the session from AsyncStorage
    const sessionStr = await AsyncStorage.getItem('supabase-session');
    let session = sessionStr ? JSON.parse(sessionStr) : null;

    // If no session in storage or it's expired, try to get from Supabase
    if (!session || new Date(session.expires_at) <= new Date()) {
      const { data: { session: newSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (newSession) {
        session = newSession;
        await AsyncStorage.setItem('supabase-session', JSON.stringify(newSession));
      } else {
        await AsyncStorage.removeItem('supabase-session');
        await AsyncStorage.removeItem('user-profile');
        return { data: null, error: null };
      }
    }

    if (!session?.user) {
      return { data: null, error: null };
    }

    // Try to get profile from storage first
    const profileStr = await AsyncStorage.getItem('user-profile');
    let profile = profileStr ? JSON.parse(profileStr) : null;

    // If no profile in storage, fetch from Supabase
    if (!profile) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .limit(1);

      if (profileError) throw profileError;

      profile = profiles?.[0];
      if (profile) {
        await AsyncStorage.setItem('user-profile', JSON.stringify(profile));
      }
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    return { 
      data: { 
        user: session.user, 
        profile,
        session 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
};

// =====================================================
// DISPATCHER AUTHENTICATION FUNCTIONS
// =====================================================

export const signInDispatcher = async (email, password) => {
  try {
    // First, check if the dispatcher exists in the dispatchers table
    const { data: dispatcherData, error: dispatcherError } = await supabase
      .from('dispatchers')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('is_active', true)
      .single();

    if (dispatcherError || !dispatcherData) {
      throw new Error('Invalid email or password');
    }

    // Try to authenticate with Supabase Auth (optional, for enhanced security)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: dispatcherData.email,
        password: dispatcherData.password,
      });

      if (authData?.session) {
        // Store the auth session
        await AsyncStorage.setItem('supabase-session', JSON.stringify(authData.session));
      }
    } catch (authError) {
      // If auth fails, we can still proceed with dispatcher table authentication
      console.log('Auth login failed, but dispatcher exists in table');
    }

    // Store dispatcher data
    await AsyncStorage.setItem('dispatcherData', JSON.stringify(dispatcherData));
    await AsyncStorage.setItem('userRole', 'dispatcher');
    await AsyncStorage.setItem('userId', dispatcherData.id);
    await AsyncStorage.setItem('userEmail', dispatcherData.email);

    return { 
      data: { 
        dispatcher: dispatcherData,
        role: 'dispatcher'
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Dispatcher sign in error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Authentication failed') 
    };
  }
};

export const getCurrentDispatcher = async () => {
  try {
    // Check if user is logged in as dispatcher
    const userRole = await AsyncStorage.getItem('userRole');
    if (userRole !== 'dispatcher') {
      return { data: null, error: null };
    }

    // Get dispatcher data from storage
    const dispatcherDataStr = await AsyncStorage.getItem('dispatcherData');
    if (!dispatcherDataStr) {
      return { data: null, error: null };
    }

    const dispatcherData = JSON.parse(dispatcherDataStr);
    
    // Verify dispatcher still exists and is active
    const { data: currentDispatcher, error: dispatcherError } = await supabase
      .from('dispatchers')
      .select('*')
      .eq('id', dispatcherData.id)
      .eq('is_active', true)
      .single();

    if (dispatcherError || !currentDispatcher) {
      // Clear stored data if dispatcher no longer exists or is inactive
      await AsyncStorage.removeItem('dispatcherData');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userEmail');
      return { data: null, error: null };
    }

    return { 
      data: { 
        dispatcher: currentDispatcher,
        role: 'dispatcher'
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Get current dispatcher error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
};

export const signOutDispatcher = async () => {
  try {
    // Clear dispatcher-specific stored data
    await AsyncStorage.removeItem('dispatcherData');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userEmail');
    
    // Also clear any auth session
    await AsyncStorage.removeItem('supabase-session');
    
    // Sign out from Supabase Auth if there's a session
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('Auth sign out error (non-critical):', error);
    }
    
    return { error: null };
  } catch (error) {
    console.error('Error signing out dispatcher:', error);
    return { error };
  }
};
