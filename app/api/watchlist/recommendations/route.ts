import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Simple machine learning model simulation for stock recommendations
// In a real implementation, this would be a trained ML model
function generateRecommendation(
  stockData: any, 
  priceHistory: any[]
): { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number; reasoning: string } {
  try {
    // Extract key metrics
    const currentPrice = stockData.price || 0;
    const previousClose = stockData.previousClose || 0;
    const fiftyDayAvg = stockData.fiftyDayAverage || 0;
    const twoHundredDayAvg = stockData.twoHundredDayAverage || 0;
    const beta = stockData.beta || 1;
    const pe = stockData.trailingPE || 0;
    const targetPrice = stockData.targetMeanPrice || 0;
    const rsi = calculateRSI(priceHistory);
    
    // Collect signals - positive signals increase buy recommendation
    let signals = 0;
    let reasons = [];
    
    // Check 50-day vs 200-day moving average (Golden/Death Cross)
    if (fiftyDayAvg > twoHundredDayAvg) {
      signals += 1;
      reasons.push("Golden cross pattern (50-day MA above 200-day MA) is bullish");
    } else if (fiftyDayAvg < twoHundredDayAvg) {
      signals -= 1;
      reasons.push("Death cross pattern (50-day MA below 200-day MA) is bearish");
    }
    
    // Check price momentum
    if (currentPrice > fiftyDayAvg) {
      signals += 1;
      reasons.push("Price above 50-day moving average shows positive momentum");
    } else {
      signals -= 1;
      reasons.push("Price below 50-day moving average suggests negative momentum");
    }
    
    // Check RSI for overbought/oversold
    if (rsi > 70) {
      signals -= 2;
      reasons.push(`RSI at ${rsi.toFixed(2)} indicates overbought conditions`);
    } else if (rsi < 30) {
      signals += 2;
      reasons.push(`RSI at ${rsi.toFixed(2)} indicates oversold conditions (buying opportunity)`);
    }
    
    // Check price vs analyst target
    if (targetPrice > 0) {
      const targetDiff = ((targetPrice - currentPrice) / currentPrice) * 100;
      if (targetDiff > 15) {
        signals += 2;
        reasons.push(`Analyst target price is ${targetDiff.toFixed(1)}% above current price`);
      } else if (targetDiff < -10) {
        signals -= 2;
        reasons.push(`Analyst target price is ${(-targetDiff).toFixed(1)}% below current price`);
      }
    }
    
    // Check PE ratio (simplified)
    if (pe > 0) {
      if (pe > 50) {
        signals -= 1;
        reasons.push(`High P/E ratio (${pe.toFixed(2)}) indicates potential overvaluation`);
      } else if (pe < 15) {
        signals += 1;
        reasons.push(`Low P/E ratio (${pe.toFixed(2)}) suggests potential undervaluation`);
      }
    }
    
    // Daily change
    const dailyChangePercent = ((currentPrice - previousClose) / previousClose) * 100;
    if (dailyChangePercent > 5) {
      signals -= 1; // Profit taking
      reasons.push(`Large daily gain (${dailyChangePercent.toFixed(1)}%) may present profit-taking opportunity`);
    } else if (dailyChangePercent < -5) {
      signals += 1; // Buying opportunity
      reasons.push(`Large daily drop (${(-dailyChangePercent).toFixed(1)}%) may present buying opportunity`);
    }
    
    // Convert signals to recommendation
    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    
    if (signals >= 3) {
      action = 'BUY';
      confidence = Math.min(90, 60 + signals * 5);
    } else if (signals <= -3) {
      action = 'SELL';
      confidence = Math.min(90, 60 + Math.abs(signals) * 5);
    } else {
      action = 'HOLD';
      confidence = 50 + Math.abs(signals) * 5;
    }
    
    // Select most relevant reasons (top 3)
    reasons = reasons.slice(0, 3);
    
    return {
      action,
      confidence,
      reasoning: reasons.join(". ")
    };
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return {
      action: 'HOLD',
      confidence: 50,
      reasoning: "Insufficient data to generate a confident recommendation"
    };
  }
}

// Calculate Relative Strength Index
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) {
    return 50; // Default neutral value if not enough data
  }
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI using the formula: 100 - (100 / (1 + RS))
  // where RS = Average Gain / Average Loss
  if (avgLoss === 0) {
    return 100; // No losses means RSI is 100
  }
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export async function POST(req: Request) {
  try {
    const { stocks } = await req.json();
    
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Valid stocks array is required' 
      }, { status: 400 });
    }

    // Process each stock to generate recommendations
    const recommendedStocks = await Promise.all(
      stocks.map(async (stock) => {
        try {
          const nseSymbol = stock.symbol.endsWith('.NS') ? stock.symbol : `${stock.symbol}.NS`;
          
          // Get detailed quote data
          const quote = await yahooFinance.quote(nseSymbol);
          
          // Get additional modules for more data
          const modules = await yahooFinance.quoteSummary(nseSymbol, { 
            modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics'] 
          });
          
          // Get historical data for technical analysis
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30); // Get 30 days of data
          
          const history = await yahooFinance.historical(nseSymbol, {
            period1: startDate,
            period2: endDate
          });
          
          // Extract closing prices for technical indicators
          const closingPrices = history.map(day => day.close);
          
          // Combine data for analysis
          const analysisData = {
            ...quote,
            price: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose,
            beta: modules.defaultKeyStatistics?.beta?.raw,
            trailingPE: modules.summaryDetail?.trailingPE?.raw,
            targetMeanPrice: modules.financialData?.targetMeanPrice?.raw
          };
          
          // Generate recommendation
          const recommendation = generateRecommendation(analysisData, closingPrices);
          
          return {
            symbol: stock.symbol,
            name: quote.displayName || quote.shortName || stock.symbol,
            current_price: quote.regularMarketPrice,
            previous_close: quote.regularMarketPreviousClose,
            change: quote.regularMarketChange,
            change_percent: quote.regularMarketChangePercent,
            day_high: quote.regularMarketDayHigh,
            day_low: quote.regularMarketDayLow,
            volume: quote.regularMarketVolume,
            avg_volume: quote.averageDailyVolume3Month,
            market_cap: modules.summaryDetail?.marketCap?.raw,
            pe_ratio: modules.summaryDetail?.trailingPE?.raw,
            fifty_day_avg: quote.fiftyDayAverage,
            two_hundred_day_avg: quote.twoHundredDayAverage,
            recommendation: recommendation.action,
            confidence: recommendation.confidence,
            reasoning: recommendation.reasoning
          };
        } catch (error) {
          console.error(`Error analyzing stock ${stock.symbol}:`, error);
          // Return basic data if Yahoo Finance fails
          return {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            current_price: stock.current_price || 0,
            recommendation: 'HOLD',
            confidence: 50,
            reasoning: 'Unable to fetch sufficient data for analysis'
          };
        }
      })
    );
    
    // Sort recommendations by confidence (highest first)
    const sortedRecommendations = [...recommendedStocks].sort((a, b) => {
      // First sort by action priority (BUY > SELL > HOLD)
      const actionPriority = { 'BUY': 3, 'SELL': 2, 'HOLD': 1 };
      const priorityA = actionPriority[a.recommendation as keyof typeof actionPriority] || 0;
      const priorityB = actionPriority[b.recommendation as keyof typeof actionPriority] || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // Then sort by confidence
      return b.confidence - a.confidence;
    });
    
    return NextResponse.json({
      success: true,
      data: {
        stocks: recommendedStocks,
        top_recommendations: sortedRecommendations.slice(0, 3)
      }
    });
  } catch (err) {
    console.error('Error generating recommendations:', err);
    return NextResponse.json(
      { 
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate recommendations'
      },
      { status: 500 }
    );
  }
} 