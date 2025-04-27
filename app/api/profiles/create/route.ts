import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';

// Initialize Supabase admin client with the service role key
// This bypasses RLS policies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Log environment variable status (without exposing values)
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  try {
    const { id, email, full_name } = await req.json();
    
    console.log('Profile creation request:', { id, email });
    
    if (!id || !email) {
      return NextResponse.json({ success: false, error: 'User ID and email are required' }, { status: 400 });
    }

    // Create a typed profile object
    const profileData: Profile = {
      id,
      email,
      full_name: full_name || null
    };

    // Don't add created_at if not needed by schema
    // Comment this line if your schema doesn't have created_at
    // profileData.created_at = new Date().toISOString();

    // Create profile with admin privileges
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (error) {
      console.error('Admin profile creation failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Profile creation failed: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile created successfully',
      data
    });
  } catch (err) {
    console.error('Error in profile creation API:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown server error',
        details: err
      },
      { status: 500 }
    );
  }
} 