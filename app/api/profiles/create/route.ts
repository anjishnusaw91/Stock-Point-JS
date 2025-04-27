import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with the service role key
// This bypasses RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { id, email, full_name } = await req.json();
    
    console.log('Profile creation request:', { id, email });
    
    if (!id || !email) {
      return NextResponse.json({ success: false, error: 'User ID and email are required' }, { status: 400 });
    }

    // Create profile with admin privileges
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id,
        email,
        full_name: full_name || '',
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Admin profile creation failed:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error in profile creation API:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 