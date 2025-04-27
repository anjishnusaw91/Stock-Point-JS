import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Add export config to mark as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();

    // Get quote data with proper type handling
    const quoteResult = await yahooFinance.quote(symbol);
    const quote = Array.isArray(quoteResult) ? quoteResult[0] : quoteResult;

    // Get historical data
    const historical = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d' as '1d' | '1wk' | '1mo'
    });

    const candleData = historical.map(item => ({
      x: item.date.getTime(),
      y: [item.open, item.high, item.low, item.close]
    }));

    return NextResponse.json({
      success: true,
      data: {
        candleData,
        currentPrice: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching live data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live data' },
      { status: 500 }
    );
  }
} 