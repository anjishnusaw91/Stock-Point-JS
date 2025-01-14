import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

interface StatisticalData {
  rsi: number;
  sma20: number;
  sma50: number;
  standardDeviation: number;
  volatility: number;
  momentum: number;
  prediction: {
    trend: 'bullish' | 'bearish' | 'neutral';
    probability: number;
    reason: string[];
  };
}

function calculateRSI(prices: number[]): number {
  const periods = 14;
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains.push(difference);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(difference));
    }
  }

  const avgGain = gains.slice(-periods).reduce((a, b) => a + b, 0) / periods;
  const avgLoss = losses.slice(-periods).reduce((a, b) => a + b, 0) / periods;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSMA(prices: number[], period: number): number {
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calculateStandardDeviation(prices: number[]): number {
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / prices.length);
}

function calculateVolatility(prices: number[]): number {
  const returns = prices.slice(1).map((price, i) => 
    (price - prices[i]) / prices[i]
  );
  return calculateStandardDeviation(returns) * Math.sqrt(252) * 100;
}

function calculateMomentum(prices: number[]): number {
  const period = 10;
  return ((prices[prices.length - 1] - prices[prices.length - period]) / 
    prices[prices.length - period]) * 100;
}

function analyzeTrend(stats: Omit<StatisticalData, 'prediction'>): StatisticalData['prediction'] {
  const reasons: string[] = [];
  let bullishPoints = 0;
  let totalPoints = 0;

  // RSI Analysis
  if (stats.rsi < 30) {
    reasons.push('RSI indicates oversold conditions (bullish)');
    bullishPoints += 2;
  } else if (stats.rsi > 70) {
    reasons.push('RSI indicates overbought conditions (bearish)');
  }
  totalPoints += 2;

  // Moving Average Analysis
  if (stats.sma20 > stats.sma50) {
    reasons.push('Short-term SMA above long-term SMA (bullish)');
    bullishPoints += 2;
  } else {
    reasons.push('Short-term SMA below long-term SMA (bearish)');
  }
  totalPoints += 2;

  // Momentum Analysis
  if (stats.momentum > 0) {
    reasons.push(`Positive momentum of ${stats.momentum.toFixed(2)}% (bullish)`);
    bullishPoints += 1;
  } else {
    reasons.push(`Negative momentum of ${stats.momentum.toFixed(2)}% (bearish)`);
  }
  totalPoints += 1;

  // Volatility Analysis
  if (stats.volatility > 30) {
    reasons.push('High volatility indicates increased risk');
  } else {
    reasons.push('Moderate volatility levels');
  }

  const probability = (bullishPoints / totalPoints) * 100;
  let trend: 'bullish' | 'bearish' | 'neutral';

  if (probability > 60) trend = 'bullish';
  else if (probability < 40) trend = 'bearish';
  else trend = 'neutral';

  return {
    trend,
    probability,
    reason: reasons,
  };
}

export async function POST(req: Request) {
  try {
    const { symbol, startDate, endDate } = await req.json();

    if (!symbol) {
      throw new Error('Stock symbol is required');
    }

    const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
    const queryOptions = {
      period1: new Date(startDate || '2024-01-01'),
      period2: new Date(endDate || new Date()),
      interval: '1d' as '1d' | '1wk' | '1mo'
    };

    const result = await yahooFinance.historical(nseSymbol, queryOptions);
    
    if (!result || result.length === 0) {
      throw new Error('No data received from Yahoo Finance');
    }

    const closingPrices = result.map(item => item.close);
    
    const statistics: Omit<StatisticalData, 'prediction'> = {
      rsi: calculateRSI(closingPrices),
      sma20: calculateSMA(closingPrices, 20),
      sma50: calculateSMA(closingPrices, 50),
      standardDeviation: calculateStandardDeviation(closingPrices),
      volatility: calculateVolatility(closingPrices),
      momentum: calculateMomentum(closingPrices),
    };

    const prediction = analyzeTrend(statistics);

    const formattedData = {
      ...statistics,
      prediction,
      historicalData: result.map(item => ({
        date: item.date.toISOString().split('T')[0],
        close: Number(item.close.toFixed(2)),
        sma20: Number(calculateSMA(
          result.slice(0, result.indexOf(item) + 1).map(i => i.close),
          20
        ).toFixed(2)),
        sma50: Number(calculateSMA(
          result.slice(0, result.indexOf(item) + 1).map(i => i.close),
          50
        ).toFixed(2)),
      })),
    };

    return NextResponse.json({
      success: true,
      data: formattedData,
    });

  } catch (error) {
    console.error('Error in stock prediction:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze stock',
      },
      { status: 500 }
    );
  }
} 