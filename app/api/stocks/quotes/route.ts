import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function POST(req: Request) {
  try {
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid symbols array is required' 
      }, { status: 400 });
    }

    console.log('Fetching quotes for symbols:', symbols);
    
    // Batch fetch stock quotes
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
          console.log(`Fetching data for ${nseSymbol}...`);
          
          // Fetch detailed quote data
          const quoteResult = await yahooFinance.quote(nseSymbol);
          const quote = Array.isArray(quoteResult) ? quoteResult[0] : quoteResult;
          
          // Add more data modules for comprehensive information
          const modules = await yahooFinance.quoteSummary(nseSymbol, { 
            modules: ['price', 'summaryDetail', 'defaultKeyStatistics'] 
          });
          
          return { 
            symbol, 
            price: quote.regularMarketPrice || 0, 
            previousClose: quote.regularMarketPreviousClose || 0,
            dayHigh: quote.regularMarketDayHigh || 0,
            dayLow: quote.regularMarketDayLow || 0,
            volume: quote.regularMarketVolume || 0,
            beta: modules.defaultKeyStatistics?.beta || 0,
            pe: modules.summaryDetail?.trailingPE || 0,
            dividendYield: modules.summaryDetail?.dividendYield || 0,
            fiftyDayAvg: quote.fiftyDayAverage || 0,
            twoHundredDayAvg: quote.twoHundredDayAverage || 0
          };
        } catch (err) {
          console.error(`Error fetching data for ${symbol}:`, err);
          return { 
            symbol, 
            price: 0,
            previousClose: 0,
            dayHigh: 0,
            dayLow: 0,
            volume: 0,
            beta: 0,
            pe: 0,
            dividendYield: 0,
            fiftyDayAvg: 0,
            twoHundredDayAvg: 0
          };
        }
      })
    );
    
    console.log('Quotes fetched successfully:', quotes.map(q => `${q.symbol}: ${q.price}`));
    
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