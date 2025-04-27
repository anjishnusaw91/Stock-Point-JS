import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Cache to limit API calls
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 60000; // 1 minute in milliseconds

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbols } = body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid symbols array is required' 
      }, { status: 400 });
    }

    const now = Date.now();
    const quotes = [];

    // Process each symbol
    for (const symbol of symbols) {
      // Standardize symbol handling
      // First, strip the .NS if it exists to get a clean symbol
      const cleanSymbol = symbol.replace('.NS', '');
      // Then add .NS suffix for Yahoo Finance
      const nseSymbol = `${cleanSymbol}.NS`;
      
      // Check cache first
      if (cache[nseSymbol] && now - cache[nseSymbol].timestamp < CACHE_TTL) {
        quotes.push(cache[nseSymbol].data);
        continue;
      }
      
      try {
        // Get current quote from Yahoo Finance
        const quote = await yahooFinance.quote(nseSymbol);
        
        // Format the quote data
        const quoteData = {
          symbol: nseSymbol,
          price: quote.regularMarketPrice ?? 0,
          change: quote.regularMarketChange ?? 0,
          changePercent: quote.regularMarketChangePercent ?? 0,
          previousClose: quote.regularMarketPreviousClose ?? 0,
          dayHigh: quote.regularMarketDayHigh ?? 0,
          dayLow: quote.regularMarketDayLow ?? 0,
          volume: quote.regularMarketVolume ?? 0,
          beta: (quote as any).beta ?? null,
          pe: (quote as any).trailingPE ?? null,
          fiftyDayAvg: (quote as any).fiftyDayAverage ?? null,
          twoHundredDayAvg: (quote as any).twoHundredDayAverage ?? null,
          shortName: quote.shortName ?? cleanSymbol,
          longName: quote.longName ?? null,
          sector: (quote as any).sector ?? null,
          industry: (quote as any).industry ?? null,
        };
        
        // Update cache
        cache[nseSymbol] = {
          data: quoteData,
          timestamp: now
        };
        
        quotes.push(quoteData);
      } catch (error) {
        console.error(`Error fetching data for ${nseSymbol}:`, error);
        // Add a minimal error entry so we don't completely fail
        quotes.push({
          symbol: nseSymbol,
          price: 0,
          error: 'Failed to fetch quote'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: quotes
    });
  } catch (err) {
    console.error('Error fetching stock quotes:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch stock quotes'
      },
      { status: 500 }
    );
  }
} 