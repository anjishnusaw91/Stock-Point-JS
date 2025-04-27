import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to development values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key-for-development';

// Check if we're in a development environment
const isDev = process.env.NODE_ENV === 'development';

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a mock wrapper for development environments if needed
export const mockSupabase = isDev && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null })
  }
} : null;

// Export the appropriate client
export default supabase; 