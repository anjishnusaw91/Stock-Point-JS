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
    const profileData = await req.json();
    
    console.log('Profile update request:', { id: profileData.id });
    
    if (!profileData.id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Create a strongly typed update object
    const updateData: Profile = {
      id: profileData.id,
      full_name: profileData.full_name || null
    };

    // Add other fields if they exist in the request
    if ('phone' in profileData && profileData.phone !== undefined) updateData.phone = profileData.phone;
    if ('address' in profileData && profileData.address !== undefined) updateData.address = profileData.address;
    if ('bio' in profileData && profileData.bio !== undefined) updateData.bio = profileData.bio;
    if ('investment_style' in profileData && profileData.investment_style !== undefined) updateData.investment_style = profileData.investment_style;
    if ('risk_tolerance' in profileData && profileData.risk_tolerance !== undefined) updateData.risk_tolerance = profileData.risk_tolerance;
    if ('email' in profileData && profileData.email !== undefined) updateData.email = profileData.email;

    console.log('Applying update with data:', updateData);

    // Update profile with admin privileges
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(updateData, { 
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Admin profile update failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Profile update failed: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data 
    });
  } catch (err) {
    console.error('Error in profile update API:', err);
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