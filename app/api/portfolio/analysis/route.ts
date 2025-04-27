import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// Interface for stock with analysis data
interface AnalyzedStock {
  symbol: string;
  name?: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  total_investment: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percent: number;
  sector?: string;
  beta?: number;
  pe_ratio?: number;
  dividend_yield?: number;
  fifty_day_avg?: number;
  two_hundred_day_avg?: number;
  contribution_percent?: number;
  risk_level?: string;
  recommendation?: string;
}

interface PortfolioSummary {
  total_investment: number;
  current_value: number;
  overall_return: number;
  overall_return_percent: number;
  daily_change: number;
  daily_change_percent: number;
  risk_profile: string;
  diversification_score: number;
  sector_allocation: { [key: string]: number };
  top_performers: AnalyzedStock[];
  worst_performers: AnalyzedStock[];
  recommendation: string;
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

    // Analyze each stock
    const analyzedStocks: AnalyzedStock[] = await Promise.all(
      stocks.map(async (stock) => {
        try {
          const nseSymbol = stock.symbol.endsWith('.NS') ? stock.symbol : `${stock.symbol}.NS`;
          const quote = await yahooFinance.quote(nseSymbol);
          const moduleInfo = await yahooFinance.quoteSummary(nseSymbol, { modules: ['summaryProfile', 'defaultKeyStatistics', 'financialData'] });
          
          const currentPrice = quote.regularMarketPrice || 0;
          const totalInvestment = stock.quantity * stock.purchase_price;
          const currentValue = stock.quantity * currentPrice;
          const profitLoss = currentValue - totalInvestment;
          const profitLossPercent = totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;
          
          // Extract sector and other fundamental data
          const sector = moduleInfo.summaryProfile?.sector || 'Unknown';
          const beta = moduleInfo.defaultKeyStatistics?.beta?.raw || 0;
          const peRatio = moduleInfo.summaryDetail?.trailingPE?.raw || 0;
          const dividendYield = moduleInfo.summaryDetail?.dividendYield?.raw || 0;
          const fiftyDayAvg = quote.fiftyDayAverage || 0;
          const twoHundredDayAvg = quote.twoHundredDayAverage || 0;
          
          // Determine risk level based on beta
          let riskLevel = 'Medium';
          if (beta < 0.8) riskLevel = 'Low';
          else if (beta > 1.2) riskLevel = 'High';
          
          return {
            symbol: stock.symbol,
            name: quote.displayName || quote.shortName || stock.symbol,
            quantity: stock.quantity,
            purchase_price: stock.purchase_price,
            current_price: currentPrice,
            total_investment: totalInvestment,
            current_value: currentValue,
            profit_loss: profitLoss,
            profit_loss_percent: profitLossPercent,
            sector,
            beta,
            pe_ratio: peRatio,
            dividend_yield: dividendYield,
            fifty_day_avg: fiftyDayAvg,
            two_hundred_day_avg: twoHundredDayAvg,
            risk_level: riskLevel
          };
        } catch (error) {
          console.error(`Error analyzing stock ${stock.symbol}:`, error);
          // Return basic analysis if Yahoo Finance fails
          const currentPrice = stock.current_price || stock.purchase_price;
          const totalInvestment = stock.quantity * stock.purchase_price;
          const currentValue = stock.quantity * currentPrice;
          const profitLoss = currentValue - totalInvestment;
          const profitLossPercent = totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;
          
          return {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            quantity: stock.quantity,
            purchase_price: stock.purchase_price,
            current_price: currentPrice,
            total_investment: totalInvestment,
            current_value: currentValue,
            profit_loss: profitLoss,
            profit_loss_percent: profitLossPercent,
            risk_level: 'Medium'
          };
        }
      })
    );
    
    // Calculate portfolio summary
    const totalInvestment = analyzedStocks.reduce((sum, stock) => sum + stock.total_investment, 0);
    const currentValue = analyzedStocks.reduce((sum, stock) => sum + stock.current_value, 0);
    const overallReturn = currentValue - totalInvestment;
    const overallReturnPercent = totalInvestment > 0 ? (overallReturn / totalInvestment) * 100 : 0;
    
    // Calculate daily change (approximate)
    const previousDayValue = analyzedStocks.reduce((sum, stock) => {
      const prevPrice = stock.current_price / (1 + (stock.profit_loss_percent / 100));
      return sum + (stock.quantity * prevPrice);
    }, 0);
    const dailyChange = currentValue - previousDayValue;
    const dailyChangePercent = previousDayValue > 0 ? (dailyChange / previousDayValue) * 100 : 0;
    
    // Calculate sector allocation
    const sectorAllocation: { [key: string]: number } = {};
    analyzedStocks.forEach(stock => {
      if (stock.sector) {
        sectorAllocation[stock.sector] = (sectorAllocation[stock.sector] || 0) + stock.current_value;
      }
    });
    
    // Convert sector allocation to percentages
    Object.keys(sectorAllocation).forEach(sector => {
      sectorAllocation[sector] = (sectorAllocation[sector] / currentValue) * 100;
    });
    
    // Calculate contribution percent for each stock
    const stocksWithContribution = analyzedStocks.map(stock => ({
      ...stock,
      contribution_percent: (stock.current_value / currentValue) * 100
    }));
    
    // Sort for top and worst performers
    const sortedStocks = [...stocksWithContribution].sort((a, b) => b.profit_loss_percent - a.profit_loss_percent);
    const topPerformers = sortedStocks.slice(0, 3);
    const worstPerformers = sortedStocks.slice(-3).reverse();
    
    // Calculate portfolio risk profile
    const weightedRisk = analyzedStocks.reduce((sum, stock) => {
      const weight = stock.current_value / currentValue;
      const riskScore = stock.risk_level === 'Low' ? 1 : stock.risk_level === 'Medium' ? 2 : 3;
      return sum + (weight * riskScore);
    }, 0);
    
    let riskProfile = 'Moderate';
    if (weightedRisk < 1.67) riskProfile = 'Conservative';
    else if (weightedRisk > 2.33) riskProfile = 'Aggressive';
    
    // Calculate diversification score (0-100)
    const numSectors = Object.keys(sectorAllocation).length;
    const maxContribution = Math.max(...Object.values(sectorAllocation));
    const diversificationScore = Math.min(
      100,
      (numSectors * 10) + ((100 - maxContribution) / 2)
    );
    
    // Generate portfolio recommendation
    let recommendation = 'Your portfolio appears balanced. Consider regular rebalancing to maintain your investment strategy.';
    
    if (diversificationScore < 40) {
      recommendation = 'Your portfolio lacks diversification. Consider adding stocks from different sectors to reduce risk.';
    } else if (overallReturnPercent < -5) {
      recommendation = 'Your portfolio is underperforming. Consider reviewing your worst-performing stocks and rebalancing.';
    } else if (overallReturnPercent > 15) {
      recommendation = 'Your portfolio is performing well. Consider taking some profits and reinvesting in undervalued opportunities.';
    }
    
    if (riskProfile === 'Aggressive' && Object.keys(sectorAllocation).length < 3) {
      recommendation = 'Your portfolio has high risk with limited diversification. Consider adding more stable assets.';
    }
    
    const portfolioSummary: PortfolioSummary = {
      total_investment: totalInvestment,
      current_value: currentValue,
      overall_return: overallReturn,
      overall_return_percent: overallReturnPercent,
      daily_change: dailyChange,
      daily_change_percent: dailyChangePercent,
      risk_profile: riskProfile,
      diversification_score: diversificationScore,
      sector_allocation: sectorAllocation,
      top_performers: topPerformers,
      worst_performers: worstPerformers,
      recommendation
    };
    
    return NextResponse.json({
      success: true,
      data: {
        stocks: stocksWithContribution,
        summary: portfolioSummary
      }
    });
  } catch (err) {
    console.error('Error analyzing portfolio:', err);
    return NextResponse.json(
      { 
        success: false,
        error: err instanceof Error ? err.message : 'Failed to analyze portfolio'
      },
      { status: 500 }
    );
  }
} 