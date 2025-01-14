import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

const NSE_SYMBOLS = [
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'ICICIBANK.NS',
  'HINDUNILVR.NS',
  'SBIN.NS',
  'BHARTIARTL.NS',
  'ITC.NS',
  'KOTAKBANK.NS',
  // Add more NSE symbols as needed
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: NSE_SYMBOLS.map(symbol => ({
        symbol,
        name: symbol.replace('.NS', ''),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch NSE stocks',
      },
      { status: 500 }
    );
  }
} 