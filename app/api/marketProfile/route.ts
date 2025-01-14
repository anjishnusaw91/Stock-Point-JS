import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function POST(req: Request) {
  try {
    const { symbol, startDate, endDate } = await req.json();

    if (!symbol) {
      throw new Error('Stock symbol is required');
    }

    // Add .NS suffix if not present
    const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;

    const queryOptions = {
      period1: new Date(startDate || '2024-01-01'),
      period2: new Date(endDate || new Date()),
      interval: '1d',
    };

    console.log(`Fetching data for ${nseSymbol}...`);
    const result = await yahooFinance.historical(nseSymbol, queryOptions);
    console.log('Data received:', result.length, 'records');

    if (!result || result.length === 0) {
      throw new Error('No data received from Yahoo Finance');
    }

    const formattedData = result.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      open: Number(item.open.toFixed(2)),
      high: Number(item.high.toFixed(2)),
      low: Number(item.low.toFixed(2)),
      close: Number(item.close.toFixed(2)),
      volume: item.volume,
    }));

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
