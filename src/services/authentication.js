import { supabase } from '../config/supabaseClient';

export const signIn = async (identifier, password) => {
  try {
    const email = identifier.includes('@') ? identifier : `${identifier}@firerescue.com`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Check if user is a firefighter
    const { data: firefighterData } = await supabase
      .from('firefighters')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const { data: { role } } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    return { 
      data: { 
        ...data, 
        role,
        firefighterDetails: firefighterData || null 
      }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const signUp = async (email, password, role = 'user') => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    });

    if (error) throw error;

    // Create profile entry
    await supabase.from('profiles').insert([
      {
        id: data.user.id,
        email,
        role,
      },
    ]);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return { data: null, error: null };

    // Get user role from metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return { data: { ...user, role: profile?.role }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getFirefighterDetails = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('firefighters')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
