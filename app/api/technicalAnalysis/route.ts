import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

interface TechnicalIndicator {
  name: string;
  value: number;
  color: string;
}

interface TechnicalData {
  prices: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  indicators: {
    ema?: {
      ema20: (number | null)[];
      ema50: (number | null)[];
      ema200: (number | null)[];
    };
    bollinger?: {
      upper: (number | null)[];
      middle: (number | null)[];
      lower: (number | null)[];
    };
    macd?: {
      line: (number | null)[];
      signal: (number | null)[];
      histogram: (number | null)[];
    };
  };
}

function calculateRSI(prices: number[]): number[] {
  const period = 14;
  if (prices.length < period + 1) {
    return Array(prices.length).fill(null);
  }

  const rsiValues: number[] = Array(prices.length).fill(null);
  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  
  // Calculate initial averages
  const initialGains = changes.slice(0, period).filter(change => change > 0);
  const initialLosses = changes.slice(0, period).filter(change => change < 0).map(Math.abs);
  
  let avgGain = initialGains.reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = initialLosses.reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate first RSI
  rsiValues[period] = 100 - (100 / (1 + (avgGain / (avgLoss || 1))));

  // Calculate subsequent values using smoothed averages
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    rsiValues[i] = 100 - (100 / (1 + (avgGain / (avgLoss || 1))));
  }

  return rsiValues;
}

function calculateMACD(prices: number[]): { line: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const shortPeriod = 12;
  const longPeriod = 26;
  const signalPeriod = 9;

  // Initialize arrays with nulls
  const macdLine = Array(prices.length).fill(null);
  const signalLine = Array(prices.length).fill(null);
  const histogram = Array(prices.length).fill(null);

  // Calculate EMAs
  const shortEMA = calculateEMA(prices, shortPeriod);
  const longEMA = calculateEMA(prices, longPeriod);

  // Calculate MACD line
  for (let i = longPeriod - 1; i < prices.length; i++) {
    if (shortEMA[i] !== null && longEMA[i] !== null) {
      macdLine[i] = shortEMA[i] - longEMA[i];
    }
  }

  // Calculate Signal line (9-day EMA of MACD line)
  const validMACDValues = macdLine.filter(value => value !== null) as number[];
  const signalValues = calculateEMA(validMACDValues, signalPeriod);
  
  // Align signal values with the original array
  let signalIndex = 0;
  for (let i = longPeriod + signalPeriod - 2; i < prices.length; i++) {
    if (signalIndex < signalValues.length) {
      signalLine[i] = signalValues[signalIndex];
      if (macdLine[i] !== null) {
        histogram[i] = macdLine[i] - signalValues[signalIndex];
      }
      signalIndex++;
    }
  }

  return {
    line: macdLine,
    signal: signalLine,
    histogram: histogram,
  };
}

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return Array(prices.length).fill(null);
  }

  const multiplier = 2 / (period + 1);
  const emaValues: number[] = Array(prices.length).fill(null);
  
  // Initialize EMA with SMA for first period
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  emaValues[period - 1] = ema;

  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    emaValues[i] = ema;
  }

  return emaValues;
}

function calculateBollingerBands(prices: number[], period = 20, multiplier = 2): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const sma = prices.map((_, index) => {
    if (index < period - 1) return null;
    const slice = prices.slice(index - period + 1, index + 1);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  });

  const stdDev = prices.map((_, index) => {
    if (index < period - 1) return null;
    const slice = prices.slice(index - period + 1, index + 1);
    const mean = sma[index]!;
    const squaredDiffs = slice.map(price => Math.pow(price - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period);
  });

  return {
    upper: sma.map((mean, i) => mean === null ? null : mean + (multiplier * (stdDev[i] ?? 0))),
    middle: sma,
    lower: sma.map((mean, i) => mean === null ? null : mean - (multiplier * (stdDev[i] ?? 0))),
  };
}

export async function POST(req: Request) {
  try {
    const { symbol, indicators, startDate, endDate } = await req.json();

    if (!symbol) {
      throw new Error('Stock symbol is required');
    }

    const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
    const queryOptions = {
      period1: new Date(startDate || '2024-01-01'),
      period2: new Date(endDate || new Date()),
      interval: '1d' as const,
    };

    const result = await yahooFinance.historical(nseSymbol, queryOptions);
    
    if (!result || result.length === 0) {
      throw new Error('No data received from Yahoo Finance');
    }

    if (result.length < 26) {
      throw new Error('Insufficient data for technical analysis. Please select a longer date range.');
    }

    const prices = result.map(item => item.close);
    const technicalData: TechnicalData = {
      prices: result.map(item => ({
        date: item.date.toISOString().split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      })),
      indicators: {},
    };

    // Calculate EMAs if requested
    if (indicators.includes('ema')) {
      const ema20Data = calculateEMA(prices, 20);
      const ema50Data = calculateEMA(prices, 50);
      const ema200Data = calculateEMA(prices, 200);

      technicalData.indicators.ema = {
        ema20: ema20Data,
        ema50: ema50Data,
        ema200: ema200Data,
      };
    }

    if (indicators.includes('bb')) {
      technicalData.indicators.bollinger = calculateBollingerBands(prices);
    }

    // RSI calculation temporarily disabled
    // if (indicators.includes('rsi')) {
    //   technicalData.indicators.rsi = calculateRSI(prices);
    // }

    if (indicators.includes('macd')) {
      technicalData.indicators.macd = calculateMACD(prices);
    }

    return NextResponse.json({
      success: true,
      data: technicalData,
    });

  } catch (error) {
    console.error('Error in technical analysis:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze stock',
      },
      { status: 500 }
    );
  }
} 