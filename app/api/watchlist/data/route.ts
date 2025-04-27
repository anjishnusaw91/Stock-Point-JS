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
    const { watchlistStocks } = body;
    
    if (!watchlistStocks || !Array.isArray(watchlistStocks) || watchlistStocks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid watchlistStocks array is required' 
      }, { status: 400 });
    }

    // Extract the unique symbols
    const symbols = watchlistStocks.map(stock => stock.symbol);
    const uniqueSymbols = Array.from(new Set(symbols));
    
    const now = Date.now();
    const stocksData = [];

    // Process each symbol
    for (const symbol of uniqueSymbols) {
      // Standardize symbol handling
      // First, strip the .NS if it exists to get a clean symbol
      const cleanSymbol = symbol.replace('.NS', '');
      // Then add .NS suffix for Yahoo Finance
      const nseSymbol = `${cleanSymbol}.NS`;
      
      // Check cache first
      if (cache[nseSymbol] && now - cache[nseSymbol].timestamp < CACHE_TTL) {
        stocksData.push({
          ...cache[nseSymbol].data,
          symbol: cleanSymbol // Use clean symbol in response
        });
        continue;
      }
      
      try {
        // Get current quote from Yahoo Finance
        console.log(`Fetching data for ${nseSymbol}...`);
        const quote = await yahooFinance.quote(nseSymbol);
        
        // Format the quote data
        const stockData = {
          symbol: cleanSymbol,
          currentPrice: quote.regularMarketPrice ?? 0,
          previousClose: quote.regularMarketPreviousClose ?? 0,
          change: quote.regularMarketChange ?? 0,
          changePercent: quote.regularMarketChangePercent ?? 0,
          high: quote.regularMarketDayHigh ?? 0,
          low: quote.regularMarketDayLow ?? 0,
          volume: quote.regularMarketVolume ?? 0,
          avgVolume: quote.averageDailyVolume3Month ?? 0,
          fiftyDayAvg: quote.fiftyDayAverage ?? 0,
          twoHundredDayAvg: quote.twoHundredDayAverage ?? 0
        };
        
        // Update cache
        cache[nseSymbol] = {
          data: stockData,
          timestamp: now
        };
        
        stocksData.push(stockData);
      } catch (error) {
        console.error(`Error fetching data for ${nseSymbol}:`, error);
        // Add a minimal error entry
        stocksData.push({
          symbol: cleanSymbol,
          currentPrice: 0,
          previousClose: 0,
          change: 0,
          changePercent: 0,
          high: 0,
          low: 0,
          volume: 0,
          avgVolume: 0,
          error: 'Failed to fetch quote'
        });
      }
    }
    
    // Map the data back to the original watchlist stocks
    const watchlistStocksWithData = watchlistStocks.map(stock => {
      const stockData = stocksData.find(data => data.symbol === stock.symbol.replace('.NS', ''));
      
      if (!stockData) {
        return {
          ...stock,
          currentPrice: 0,
          previousClose: 0,
          change: 0, 
          changePercent: 0,
          high: 0,
          low: 0,
          volume: 0,
          avgVolume: 0
        };
      }
      
      return {
        ...stock,
        currentPrice: stockData.currentPrice,
        previousClose: stockData.previousClose,
        change: stockData.change,
        changePercent: stockData.changePercent,
        high: stockData.high,
        low: stockData.low,
        volume: stockData.volume, 
        avgVolume: stockData.avgVolume
      };
    });
    
    return NextResponse.json({
      success: true,
      data: watchlistStocksWithData
    });
  } catch (err) {
    console.error('Error processing watchlist data:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to process watchlist data'
      },
      { status: 500 }
    );
  }
} 