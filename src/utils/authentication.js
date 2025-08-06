import { supabase } from '../config/supabaseClient';

// Sign up with email, password, and role
export const signUp = async (email, password, role = 'user') => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    // Create profile with role
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ user_id: authData.user.id, role, email }]);

    if (profileError) throw profileError;
    return { data: authData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) throw authError;

    // Get user role from profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    return { 
      data: { ...authData, role: profileData.role }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

// Sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Get current session with role
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (session) {
      // Get user role from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      return { session: { ...session, role: profileData.role }, error: null };
    }
    return { session: null, error: null };
  } catch (error) {
    return { session: null, error };
  }
};

// Get current user with role
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    if (user) {
      // Get user role from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      return { user: { ...user, role: profileData.role }, error: null };
    }
    return { user: null, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

// Check if user is a firefighter
export const isFirefighter = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return { isFirefighter: data.role === 'firefighter', error: null };
  } catch (error) {
    return { isFirefighter: false, error };
  }
};
