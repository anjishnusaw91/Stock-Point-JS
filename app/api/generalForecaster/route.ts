import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

interface PredictionMetrics {
  accuracy: number;
  confidence: number;
  rmse: number;
}

// Helper function to calculate standard deviation
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// Helper function to calculate mean
function calculateMean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateMetrics(actual: number[], predicted: (number | null)[]): PredictionMetrics {
  try {
    // Filter out null values and get corresponding actual values
    const validPairs = predicted.map((pred, i) => ({ pred, actual: actual[i] }))
      .filter(pair => pair.pred !== null);
    
    const actualValues = validPairs.map(pair => pair.actual);
    const predictedValues = validPairs.map(pair => pair.pred as number);

    if (predictedValues.length === 0) {
      return {
        accuracy: 0,
        confidence: 0,
        rmse: 0
      };
    }

    // Calculate RMSE
    const squaredErrors = predictedValues.map((pred, i) => 
      Math.pow(pred - actualValues[i], 2)
    );
    const rmse = Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / predictedValues.length);

    // Calculate accuracy as percentage of predictions within 2% of actual value
    const accurateCount = predictedValues.filter((pred, i) => 
      Math.abs(pred - actualValues[i]) / actualValues[i] <= 0.02
    ).length;
    const accuracy = (accurateCount / predictedValues.length) * 100;

    // Calculate confidence based on recent prediction accuracy and trend stability
    const recentActual = actualValues.slice(-5);
    const recentPredicted = predictedValues.slice(-5);

    const recentAccuracy = recentPredicted.filter((pred, i) => 
      Math.abs(pred - recentActual[i]) / recentActual[i] <= 0.02
    ).length / recentActual.length;

    // Calculate trend stability using standard deviation
    const stdDev = calculateStandardDeviation(recentActual);
    const mean = calculateMean(recentActual);
    const trendStability = mean === 0 ? 0 : 1 - (stdDev / mean);

    // Calculate final confidence score
    const confidence = Math.min(
      Math.max(
        ((recentAccuracy * 0.7 + Math.max(trendStability, 0) * 0.3) * 100),
        0
      ),
      100
    );

    return {
      accuracy: Number(accuracy.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      rmse: Number(rmse.toFixed(2)),
    };

  } catch (error) {
    console.error('Error calculating metrics:', error);
    return {
      accuracy: 0,
      confidence: 0,
      rmse: 0
    };
  }
}

export async function POST(req: Request) {
  try {
    const { symbol, days = 4 } = await req.json(); // Default to 4 days if not specified

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Validate prediction days
    const predictionDays = Math.min(Math.max(1, Number(days)), 30); // Limit between 1 and 30 days

    // Fetch historical data
    const historicalData = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - (180 * 24 * 60 * 60 * 1000)),
      period2: new Date(),
      interval: '1d',
    });

    if (!historicalData || historicalData.length === 0) {
      throw new Error('No data received from Yahoo Finance');
    }

    // Get last 30 days for historical display
    const last30Days = historicalData.slice(-30);
    const prices = last30Days.map(day => day.close);
    
    // Calculate training predictions for historical data
    const trainingPredictions = prices.map((_, index) => {
      if (index < 5) return null;
      const prevPrices = prices.slice(index - 5, index);
      const sma5 = prevPrices.reduce((a, b) => a + b, 0) / 5;
      const sma10 = index >= 10 
        ? prices.slice(index - 10, index).reduce((a, b) => a + b, 0) / 10 
        : sma5;
      const trend = sma5 > sma10 ? 1.001 : 0.999;
      return prices[index - 1] * trend;
    });

    // Calculate metrics
    const metrics = calculateMetrics(prices, trainingPredictions);

    // Calculate future predictions with confidence adjustment
    const lastPrice = prices[prices.length - 1];
    const sma5 = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const trend = sma5 > sma10 ? 1.001 : 0.999;
    
    // Adjust trend based on confidence
    const confidenceAdjustedTrend = trend * (Math.max(metrics.confidence, 50) / 100);
    
    // Generate forecast for specified number of days
    const forecast = Array(predictionDays).fill(0).map((_, i) => 
      lastPrice * Math.pow(confidenceAdjustedTrend, i + 1)
    );

    // Generate forecast dates for specified number of days
    const lastDate = last30Days[last30Days.length - 1].date;
    const forecastDates = Array(predictionDays).fill(0).map((_, i) => {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i + 1);
      return date.toISOString().split('T')[0];
    });

    return NextResponse.json({
      success: true,
      forecast: {
        dates: forecastDates,
        prices: forecast,
      },
      historical: {
        dates: last30Days.map(day => day.date.toISOString().split('T')[0]),
        prices: last30Days.map(day => day.close),
        predictions: trainingPredictions,
      },
      metrics: {
        accuracy: metrics.accuracy,
        confidence: metrics.confidence,
        rmse: metrics.rmse,
        predictionDays: predictionDays,
      },
    });

  } catch (error) {
    console.error('Error in forecast generation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate forecast' 
      },
      { status: 500 }
    );
  }
} 