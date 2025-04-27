import { createClient } from '@supabase/supabase-js';

// Get environment variables with proper fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a proper Supabase client with error handling
let supabaseClient;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.warn('Error creating Supabase client:', error);
  
  // Provide a simplified mock client
  supabaseClient = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      signUp: async () => ({ data: { user: null }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: async () => ({ data: [], error: null }),
        in: async () => ({ data: [], error: null }),
        select: async () => ({ data: [], error: null })
      }),
      insert: async () => ({ data: [], error: null }),
      update: async () => ({ data: [], error: null }),
      delete: async () => ({ data: [], error: null })
    }),
    // @ts-ignore - Using a simplified mock for realtime channels
    channel: (channelName) => {
      return {
        // @ts-ignore
        on: (eventType, filterObject, callback) => {
          return {
            subscribe: () => ({
              unsubscribe: () => {}
            })
          };
        }
      };
    }
  };
}

// Export the client
export const supabase = supabaseClient;

// Default export
export default supabase; 