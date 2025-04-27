import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Check environment variables safely (without exposing actual values)
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Missing",
    NODE_ENV: process.env.NODE_ENV || "Not set"
  };
  
  // Log environment status to server logs
  console.log('Environment variables status:', envCheck);
  
  // Return safe information about environment status
  return NextResponse.json({
    status: "OK",
    environment: process.env.NODE_ENV || "development",
    variables_set: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    message: "This endpoint checks environment variables without exposing sensitive data",
    next_steps: [
      "Check your .env.local file has SUPABASE_SERVICE_ROLE_KEY set",
      "Ensure environment variables are correctly set in your deployment platform",
      "If running locally, restart your development server",
      "For Vercel deployments, check your Environment Variables in the project settings"
    ]
  });
} 