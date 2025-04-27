import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function POST(req: Request) {
  try {
    const { symbol, startDate, endDate } = await req.json();

    if (!symbol) {
      throw new Error('Stock symbol is required');
    }

    // Suppress Yahoo Finance deprecation notice
    yahooFinance.suppressNotices(['ripHistorical']);

    // Add .NS suffix if not present
    const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;

    const queryOptions = {
      period1: new Date(startDate || '2024-01-01'),
      period2: new Date(endDate || new Date()),
      interval: '1d' as const,
    };

    console.log(`Fetching data for ${nseSymbol}...`);
    
    // Use chart() instead of historical()
    const result = await yahooFinance.chart(nseSymbol, queryOptions);
    
    if (!result || !result.quotes || result.quotes.length === 0) {
      throw new Error('No data received from Yahoo Finance');
    }

    console.log('Data received:', result.quotes.length, 'records');

    // Map chart data to our expected format with validation
    const formattedData = result.quotes
      .filter(item => 
        item && 
        item.date &&
        typeof item.open === 'number' && !isNaN(item.open) &&
        typeof item.high === 'number' && !isNaN(item.high) &&
        typeof item.low === 'number' && !isNaN(item.low) &&
        typeof item.close === 'number' && !isNaN(item.close) &&
        typeof item.volume === 'number'
      )
      .map(item => {
        try {
          return {
            date: new Date(item.date).toISOString().split('T')[0],
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
            volume: Number(item.volume || 0),
          };
        } catch (err) {
          console.error('Error formatting item:', err);
          return null;
        }
      })
      .filter(item => item !== null);  // Remove any null items

    return NextResponse.json({
      success: true,
      data: formattedData,
    });

  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stock data',
      },
      { status: 500 }
    );
  }
}
