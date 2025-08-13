import { supabase } from '../lib/supabase';

export const getStations = async () => {
  try {
    console.log('Fetching stations from database...');
    const { data, error } = await supabase
      .from('firefighters')
      .select('id, station_id, station_name, station_address, station_region')
      .eq('is_active', true);

    if (error) {
      console.error('Get stations error:', error);
      throw error;
    }

    // Ensure we always return an array
    const stations = Array.isArray(data) ? data : [];
    console.log('Fetched stations:', stations);
    return { data: stations, error: null };
  } catch (error) {
    console.error('Failed to load stations:', error);
    return { data: [], error };
  }
};

export const createTrainingBooking = async (bookingData) => {
  try {
    console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2));
    
    // Ensure station_id is a string
    const bookingDataWithStringStationId = {
      ...bookingData,
      station_id: String(bookingData.station_id),
      status: 'pending'
    };
    
    console.log('Processed booking data:', JSON.stringify(bookingDataWithStringStationId, null, 2));
    
    const { data, error } = await supabase
      .from('training_bookings')
      .insert([bookingDataWithStringStationId])
      .select(`
        *,
        firefighters (
          id,
          station_id,
          station_name,
          station_address,
          station_region
        )
      `)
      .single();

    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('Booking created successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Create training booking error:', error);
    return { data: null, error };
  }
};

export const getUserBookings = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('training_bookings')
      .select(`
        *,
        firefighters (
          id,
          station_id,
          station_name,
          station_address,
          station_region
        )
      `)
      .eq('user_id', userId)
      .order('training_date', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Get user bookings error:', error);
    return { data: null, error };
  }
};

export const getStationBookings = async (stationId) => {
  try {
    console.log('Querying for stationId:', stationId, 'Type:', typeof stationId);
    const { data, error } = await supabase
      .from('training_bookings')
      .select(`
        *,
        firefighters (
          id,
          station_id,
          station_name,
          station_address,
          station_region
        )
      `)
      .eq('station_id', stationId)
      .order('training_date', { ascending: true });
    console.log('Supabase query result:', data);
    console.log('Supabase query error:', error);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Get station bookings error:', error);
    return { data: null, error };
  }
};

export const updateBookingStatus = async (bookingId, status) => {
  try {
    const { data, error } = await supabase
      .from('training_bookings')
      .update({ status })
      .eq('id', bookingId)
      .select(`
        *,
        firefighters (
          id,
          station_id,
          station_name,
          station_address,
          station_region
        )
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Update booking status error:', error);
    return { data: null, error };
  }
};

export const cancelBooking = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('training_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select(`
        *,
        firefighters (
          id,
          station_id,
          station_name,
          station_address,
          station_region
        )
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Cancel booking error:', error);
    return { data: null, error };
  }
};

export const getBookingById = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('training_bookings')
      .select(`
        *,
        firefighters (
          id,
          station_id,
          station_name,
          station_address,
          station_region
        ),
        profiles:user_id (
          full_name,
          email,
          phone
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Get booking by id error:', error);
    return { data: null, error };
  }
};

export const getRandomStations = async (limit = 3) => {
  try {
    console.log('Fetching random stations...');
    const { data, error } = await supabase
      .from('firefighters')
      .select('id, station_id, station_name, station_address, station_region, station_contact')
      .eq('is_active', true)
      .order('id', { ascending: false })  // Order by id in reverse to get different stations each time
      .limit(limit);

    if (error) {
      console.error('Get random stations error:', error);
      throw error;
    }

    // Shuffle the results client-side to ensure randomness
    const stations = Array.isArray(data) ? data.sort(() => Math.random() - 0.5) : [];
    console.log('Fetched random stations:', stations);
    return { data: stations, error: null };
  } catch (error) {
    console.error('Failed to load random stations:', error);
    return { data: [], error };
  }
}; 