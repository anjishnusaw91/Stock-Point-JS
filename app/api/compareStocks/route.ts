import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function POST(req: Request) {
  try {
    const { symbols, startDate, endDate } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('At least one stock symbol is required');
    }

    const queryOptions = {
      period1: new Date(startDate || '2024-01-01'),
      period2: new Date(endDate || new Date()),
      interval: '1d' as '1d' | '1wk' | '1mo',
    };

    // Fetch data for all symbols in parallel
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
        try {
          const data = await yahooFinance.historical(nseSymbol, queryOptions);
          return {
            symbol: symbol.replace('.NS', ''),
            data: data.map(item => ({
              date: item.date.toISOString().split('T')[0],
              close: Number(item.close.toFixed(2)),
            })),
          };
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error);
          return null;
        }
      })
    );

    // Filter out failed requests and normalize data
    const validResults = results.filter(result => result !== null);
    
    if (validResults.length === 0) {
      throw new Error('Failed to fetch data for all requested symbols');
    }

    return NextResponse.json({
      success: true,
      data: validResults,
    });

  } catch (error) {
    console.error('Error fetching comparison data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch comparison data',
      },
      { status: 500 }
    );
  }
}
