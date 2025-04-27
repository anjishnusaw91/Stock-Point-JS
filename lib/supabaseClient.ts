import { createClient } from '@supabase/supabase-js';

// Check if we're in a development environment
const isDev = process.env.NODE_ENV === 'development';

// Get environment variables with proper fallbacks
// We need to make sure createClient doesn't throw if URL/key are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key-for-development';

// Create a Supabase client if possible, or a mock client if not
let supabaseClient;

try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.warn('Error creating Supabase client:', error);
  // Create a mock client that won't throw errors
  supabaseClient = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      signUp: async () => ({ data: { user: null }, error: null })
    }
  };
}

// Export the client
export const supabase = supabaseClient;

// Also export a mock client for development use if needed
export const mockSupabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null }, error: null }),
    signUp: async () => ({ data: { user: null }, error: null })
  }
};

// Default export
export default supabase; 