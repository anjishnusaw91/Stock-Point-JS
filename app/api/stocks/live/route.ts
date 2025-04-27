import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Cache to limit API calls
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 60000; // 1 minute in milliseconds

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ 
        success: false, 
        error: 'Symbol parameter is required' 
      }, { status: 400 });
    }

    // Check if we have cached data that's still valid
    const now = Date.now();
    if (cache[symbol] && now - cache[symbol].timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cache[symbol].data,
        cached: true
      });
    }
    
    // Add .NS suffix if not present for NSE stocks
    const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
    
    console.log(`Fetching live data for ${nseSymbol}...`);
    
    // Get current quote
    const quote = await yahooFinance.quote(nseSymbol);
    
    // Get recent price data (last 5 days for candlestick)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 5);
    
    const chartData = await yahooFinance.chart(nseSymbol, {
      period1: startDate,
      period2: endDate,
      interval: '15m' // 15-minute intervals
    });
    
    // Format data for candlestick chart
    const candlestickData = chartData.quotes.map(item => ({
      x: new Date(item.date).getTime(),
      y: [
        item.open,
        item.high,
        item.low,
        item.close
      ]
    }));
    
    const volume = chartData.quotes.map(item => ({
      x: new Date(item.date).getTime(),
      y: item.volume || 0
    }));
    
    // Add the latest quote as the most recent candle
    const latestTimestamp = candlestickData.length > 0 
      ? Math.max(...candlestickData.map(d => d.x)) 
      : new Date().getTime();
      
    // Only add if it's newer than our last data point
    if (new Date().getTime() - latestTimestamp > 15 * 60 * 1000) {
      candlestickData.push({
        x: new Date().getTime(),
        y: [
          quote.regularMarketOpen || quote.regularMarketPrice,
          quote.regularMarketDayHigh || quote.regularMarketPrice,
          quote.regularMarketDayLow || quote.regularMarketPrice,
          quote.regularMarketPrice
        ]
      });
      
      volume.push({
        x: new Date().getTime(),
        y: quote.regularMarketVolume || 0
      });
    }
    
    // Prepare response data
    const responseData = {
      symbol: nseSymbol,
      companyName: quote.shortName || quote.longName,
      currentPrice: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      previousClose: quote.regularMarketPreviousClose,
      timestamp: new Date().toISOString(),
      candlestickData,
      volumeData: volume
    };
    
    // Update cache
    cache[symbol] = {
      data: responseData,
      timestamp: now
    };
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (err) {
    console.error('Error fetching live stock data:', err);
    return NextResponse.json(
      { 
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch live stock data'
      },
      { status: 500 }
    );
  }
} 