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
    const profileData = await req.json();
    
    console.log('Profile update request:', { id: profileData.id });
    
    if (!profileData.id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Declare validUpdateData with a flexible type that covers all possible use cases
    let validUpdateData: Record<string, any>;

    // First, let's check the structure of the profiles table
    try {
      const { data: schemaInfo, error: schemaError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .limit(1);

      if (schemaError) {
        console.error('Error fetching schema info:', schemaError);
        return NextResponse.json({ success: false, error: schemaError.message }, { status: 500 });
      }

      // Get the first row to check available columns
      const sampleRow = schemaInfo && schemaInfo[0] ? schemaInfo[0] : null;
      
      if (!sampleRow) {
        console.log('No sample row found, creating basic update data');
        // If no row exists, use basic fields
        validUpdateData = {
          id: profileData.id,
          full_name: profileData.full_name || null,
          updated_at: new Date().toISOString()
        };
      } else {
        console.log('Sample row found, validating fields:', Object.keys(sampleRow));
        
        // Build an object with only the fields that exist in the database
        validUpdateData = { id: profileData.id };
        
        // Check each field from the request against the schema
        for (const key in profileData) {
          if (key in sampleRow || key === 'id') {
            validUpdateData[key] = profileData[key];
          } else {
            console.log(`Skipping field not in schema: ${key}`);
          }
        }
        
        validUpdateData.updated_at = new Date().toISOString();
      }
    } catch (schemaErr) {
      console.error('Error validating schema:', schemaErr);
      // Fallback to basic update if schema check fails
      validUpdateData = {
        id: profileData.id,
        full_name: profileData.full_name || null,
        updated_at: new Date().toISOString()
      };
    }

    console.log('Applying update with validated data:', validUpdateData);

    // Update profile with admin privileges
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(validUpdateData, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Admin profile update failed:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error in profile update API:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 