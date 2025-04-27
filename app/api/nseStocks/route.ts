import { NextResponse } from 'next/server';
import stockSymbols from '../../../lib/stockSymbols';

// Add export config to mark as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Return the centralized stock symbols list
    return NextResponse.json({
      success: true,
      data: stockSymbols
    });
  } catch (err) {
    console.error('Error fetching NSE stocks:', err);
    return NextResponse.json(
      { 
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch NSE stocks'
      },
      { status: 500 }
    );
  }
} 