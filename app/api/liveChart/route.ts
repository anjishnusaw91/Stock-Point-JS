import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function POST(req: Request) {
  try {
    const { symbol, interval = '1m' } = await req.json();

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Get initial data
    const [quote, historicalData] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.historical(symbol, {
        period1: new Date(Date.now() - (24 * 60 * 60 * 1000)),
        period2: new Date(),
        interval: interval === '1s' ? '1m' : interval,
      })
    ]);

    if (!historicalData || historicalData.length === 0) {
      throw new Error('No data available');
    }

    // Process data
    const candleData = historicalData.map(candle => ({
      x: candle.date.getTime(),
      y: [
        Number(candle.open.toFixed(2)),
        Number(candle.high.toFixed(2)),
        Number(candle.low.toFixed(2)),
        Number(candle.close.toFixed(2)),
      ],
      volume: candle.volume,
    }));

    // Calculate VWAP
    const vwap = candleData.reduce((acc, curr) => {
      const typicalPrice = (curr.y[1] + curr.y[2] + curr.y[3]) / 3;
      return acc + (typicalPrice * curr.volume);
    }, 0) / candleData.reduce((acc, curr) => acc + curr.volume, 0);

    return NextResponse.json({
      success: true,
      data: {
        candleData,
        currentPrice: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        volume: quote.regularMarketVolume,
        previousClose: quote.regularMarketPreviousClose,
        dayHigh: quote.regularMarketDayHigh,
        dayLow: quote.regularMarketDayLow,
        vwap: Number(vwap.toFixed(2)),
        lastUpdated: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching live data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch live data' 
      },
      { status: 500 }
    );
  }
} 