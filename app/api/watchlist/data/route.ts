import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Define interfaces for data types
interface StockData {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  fiftyDayAvg?: number;
  twoHundredDayAvg?: number;
  error?: string;
}

// Define Yahoo Finance quote type
interface YahooQuote {
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  averageDailyVolume3Month?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  [key: string]: any;
}

interface WatchlistStock {
  id: string;
  symbol: string;
  watchlist_id: string;
  notes?: string;
  date_added: string;
  [key: string]: any; // Allow additional properties
}

// Cache to limit API calls - extended TTL to 5 minutes
const cache: Record<string, { data: StockData; timestamp: number }> = {};
const CACHE_TTL = 300000; // 5 minutes in milliseconds (increased from 1 minute)

// Maximum batch size for API requests
const MAX_BATCH_SIZE = 20;

// API timeout
const API_TIMEOUT = 10000; // 10 seconds

export const dynamic = 'force-dynamic';

// Helper function to create a timeout promise
const timeoutPromise = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

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
    
    console.log(`Processing ${uniqueSymbols.length} unique symbols for watchlist data`);
    
    const now = Date.now();
    const stocksData: StockData[] = [];

    // Create batches of symbols for more efficient processing
    const symbolBatches = [];
    for (let i = 0; i < uniqueSymbols.length; i += MAX_BATCH_SIZE) {
      symbolBatches.push(uniqueSymbols.slice(i, i + MAX_BATCH_SIZE));
    }
    
    console.log(`Created ${symbolBatches.length} batches for processing`);

    // Process each batch in parallel
    await Promise.all(symbolBatches.map(async (batch, batchIndex) => {
      console.log(`Processing batch ${batchIndex + 1} with ${batch.length} symbols`);
      
      // Process symbols in the batch
      const batchPromises = batch.map(async (symbol) => {
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
          return;
        }
        
        try {
          // Race between API call and timeout
          const quoteResult = await Promise.race([
            yahooFinance.quote(nseSymbol),
            timeoutPromise(API_TIMEOUT)
          ]);
          
          // Type assertion for the quote result
          const quote = quoteResult as YahooQuote;
          
          // Format the quote data
          const stockData: StockData = {
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
            error: error instanceof Error ? error.message : 'Failed to fetch quote'
          });
        }
      });
      
      // Wait for all symbols in the batch to be processed
      await Promise.allSettled(batchPromises);
      console.log(`Completed batch ${batchIndex + 1}`);
    }));
    
    console.log(`Processed all ${stocksData.length} stock quotes`);
    
    // Map the data back to the original watchlist stocks
    const watchlistStocksWithData = watchlistStocks.map((stock: WatchlistStock) => {
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