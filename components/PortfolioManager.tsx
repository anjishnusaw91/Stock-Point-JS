'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Portfolio, PortfolioStock } from '@/lib/supabase';
import yahooFinance from 'yahoo-finance2';
import { FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiCheck, FiPieChart, FiBarChart2 } from 'react-icons/fi';
import { FaTrash } from 'react-icons/fa';

interface StockSymbol {
  symbol: string;
  name: string;
}

interface PortfolioWithStocks extends Portfolio {
  stocks: (PortfolioStock & { 
    currentPrice?: number; 
    totalValue?: number; 
    profitLoss?: number; 
    profitLossPercent?: number;
    dayHigh?: number;
    dayLow?: number;
  })[];
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
}

interface PortfolioAnalysis {
  stocks: any[];
  summary: {
    total_investment: number;
    current_value: number;
    overall_return: number;
    overall_return_percent: number;
    daily_change: number;
    daily_change_percent: number;
    risk_profile: string;
    diversification_score: number;
    sector_allocation: { [key: string]: number };
    top_performers: any[];
    worst_performers: any[];
    recommendation: string;
  };
}

const PortfolioManager: React.FC = () => {
  const [portfolios, setPortfolios] = useState<PortfolioWithStocks[]>([]);
  const [symbols, setSymbols] = useState<StockSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePortfolio, setActivePortfolio] = useState<string | null>(null);
  
  // New portfolio form state
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  
  // New stock form state
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockQuantity, setNewStockQuantity] = useState<number>(0);
  const [newStockPrice, setNewStockPrice] = useState<number>(0);
  const [newStockDate, setNewStockDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStockNotes, setNewStockNotes] = useState('');
  
  const [activeTab, setActiveTab] = useState<'holdings' | 'analysis'>('holdings');
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const { user } = useAuth();

  // Fetch portfolios when user changes
  useEffect(() => {
    if (user) {
      fetchPortfolios();
      fetchSymbols();
    }
  }, [user]);

  // Add new effect to analyze portfolio when active portfolio changes
  useEffect(() => {
    if (activePortfolio && portfolios.length > 0) {
      const currentPortfolio = portfolios.find(p => p.id === activePortfolio);
      if (currentPortfolio && currentPortfolio.stocks.length > 0) {
        analyzePortfolio(currentPortfolio.stocks);
      }
    }
  }, [activePortfolio, portfolios]);

  const fetchSymbols = async () => {
    try {
      const response = await fetch('/api/nseStocks');
      const data = await response.json();
      if (data.success) {
        setSymbols(data.data);
      }
    } catch (err) {
      console.error('Error fetching symbols:', err);
    }
  };

  const fetchPortfolios = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch portfolios
      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id);
        
      if (portfoliosError) throw portfoliosError;
      
      if (!portfoliosData.length) {
        setPortfolios([]);
        setLoading(false);
        return;
      }
      
      // Fetch portfolio stocks for each portfolio
      const portfoliosWithStocks = await Promise.all(
        portfoliosData.map(async (portfolio) => {
          const { data: stocksData, error: stocksError } = await supabase
            .from('portfolio_stocks')
            .select('*')
            .eq('portfolio_id', portfolio.id);
            
          if (stocksError) throw stocksError;
          
          // Set the active portfolio to the first one if not already set
          if (!activePortfolio) setActivePortfolio(portfolio.id);
          
          // Fetch current prices for stocks
          const stocksWithPrices = await fetchCurrentPrices(stocksData);
          
          // Calculate portfolio stats
          const totalCost = stocksWithPrices.reduce((sum, stock) => 
            sum + (stock.quantity * stock.purchase_price), 0);
            
          const totalValue = stocksWithPrices.reduce((sum, stock) => 
            sum + (stock.quantity * (stock.currentPrice || 0)), 0);
            
          const totalProfitLoss = totalValue - totalCost;
          const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost * 100) : 0;
          
          return {
            ...portfolio,
            stocks: stocksWithPrices,
            totalValue,
            totalCost,
            totalProfitLoss,
            totalProfitLossPercent
          };
        })
      );
      
      setPortfolios(portfoliosWithStocks);
    } catch (err) {
      console.error('Error fetching portfolios:', err);
      setError('Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCurrentPrices = async (stocks: PortfolioStock[]) => {
    if (!stocks.length) return [];
    
    try {
      const symbols = stocks.map(stock => stock.symbol);
      const uniqueSymbols = Array.from(new Set(symbols));
      
      console.log('Fetching current prices for symbols:', uniqueSymbols);
      
      // Try the bulk quotes endpoint first
      let quotes;
      let usedFallback = false;
      
      try {
        const response = await fetch('/api/stocks/quotes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbols: uniqueSymbols }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stock quotes: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch stock quotes');
        }
        
        quotes = data.data;
      } catch (error) {
        // Fallback to individual live API calls if bulk endpoint fails
        console.log('Bulk quotes endpoint failed, falling back to individual requests');
        usedFallback = true;
        
        quotes = await Promise.all(
          uniqueSymbols.map(async (symbol) => {
            try {
              const response = await fetch(`/api/stocks/live?symbol=${symbol}`);
              const data = await response.json();
              
              if (!data.success) {
                return { symbol, price: 0, error: data.error };
              }
              
              return {
                symbol: data.data.symbol,
                price: data.data.currentPrice,
                previousClose: data.data.previousClose,
                dayHigh: data.data.high,
                dayLow: data.data.low,
                volume: data.data.volume,
              };
            } catch (err) {
              console.error(`Error fetching live data for ${symbol}:`, err);
              return { symbol, price: 0, error: 'Failed to fetch live data' };
            }
          })
        );
      }
      
      console.log(`Stock quotes ${usedFallback ? '(fallback)' : ''} response:`, quotes);
      
      // Create a data lookup map with all fetched information
      const dataMap = quotes.reduce((map: Record<string, any>, quote: any) => {
        // Standardize the symbols by removing .NS suffix
        const keySymbol = quote.symbol.replace('.NS', '');
        map[keySymbol] = quote;
        return map;
      }, {} as Record<string, any>);
      
      // Add current prices and calculations to stocks with detailed data
      const stocksWithData = stocks.map(stock => {
        // Standardize the symbol key by removing .NS suffix if present
        const symbolKey = stock.symbol.replace('.NS', '');
        const stockData = dataMap[symbolKey] || {};
        
        // Make sure we get the current price from the API data or fallback to 0
        const currentPrice = stockData.price || 0;
        
        // Calculate values based on current price and quantity
        const totalValue = stock.quantity * currentPrice;
        const totalCost = stock.quantity * stock.purchase_price;
        const profitLoss = totalValue - totalCost;
        const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost * 100) : 0;
        
        console.log(`Stock ${stock.symbol}: Current price = ${currentPrice}, Total value = ${totalValue}`);
        
        return {
          ...stock,
          currentPrice,
          previousClose: stockData.previousClose,
          dayHigh: stockData.dayHigh,
          dayLow: stockData.dayLow,
          volume: stockData.volume,
          beta: stockData.beta,
          pe: stockData.pe,
          fiftyDayAvg: stockData.fiftyDayAvg,
          twoHundredDayAvg: stockData.twoHundredDayAvg,
          totalValue,
          profitLoss,
          profitLossPercent
        };
      });
      
      console.log('Processed stocks with data:', stocksWithData);
      return stocksWithData;
    } catch (err) {
      console.error('Error fetching current prices:', err);
      // If all else fails, return stocks with calculated values based on purchase price
      return stocks.map(stock => {
        const totalValue = stock.quantity * stock.purchase_price;
        return {
          ...stock,
          currentPrice: stock.purchase_price,
          totalValue,
          profitLoss: 0,
          profitLossPercent: 0
        };
      });
    }
  };
  
  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .insert([
          {
            user_id: user.id,
            name: newPortfolioName,
            description: newPortfolioDescription || null
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Reset form
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      setShowNewPortfolioForm(false);
      
      // Refresh portfolios
      fetchPortfolios();
    } catch (err) {
      console.error('Error creating portfolio:', err);
      setError('Failed to create portfolio');
    }
  };
  
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePortfolio) return;
    
    try {
      const { data, error } = await supabase
        .from('portfolio_stocks')
        .insert([
          {
            portfolio_id: activePortfolio,
            symbol: newStockSymbol,
            quantity: newStockQuantity,
            purchase_price: newStockPrice,
            purchase_date: newStockDate,
            notes: newStockNotes || null
          }
        ]);
        
      if (error) throw error;
      
      // Reset form
      setNewStockSymbol('');
      setNewStockQuantity(0);
      setNewStockPrice(0);
      setNewStockDate(new Date().toISOString().split('T')[0]);
      setNewStockNotes('');
      setShowAddStockForm(false);
      
      // Refresh portfolios
      fetchPortfolios();
    } catch (err) {
      console.error('Error adding stock:', err);
      setError('Failed to add stock');
    }
  };
  
  const handleRemoveStock = async (stockId: string) => {
    if (!confirm('Are you sure you want to remove this stock?')) return;
    
    try {
      const { error } = await supabase
        .from('portfolio_stocks')
        .delete()
        .eq('id', stockId);
        
      if (error) throw error;
      
      // Refresh portfolios
      fetchPortfolios();
    } catch (err) {
      console.error('Error removing stock:', err);
      setError('Failed to remove stock');
    }
  };
  
  const handleDeletePortfolio = async (portfolioId: string) => {
    if (!confirm('Are you sure you want to delete this portfolio? All stocks will be removed.')) return;
    
    try {
      // First delete all stocks in the portfolio
      const { error: stocksError } = await supabase
        .from('portfolio_stocks')
        .delete()
        .eq('portfolio_id', portfolioId);
        
      if (stocksError) throw stocksError;
      
      // Then delete the portfolio
      const { error: portfolioError } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId);
        
      if (portfolioError) throw portfolioError;
      
      // Set active portfolio to first in list or null
      if (activePortfolio === portfolioId) {
        const remainingPortfolios = portfolios.filter(p => p.id !== portfolioId);
        setActivePortfolio(remainingPortfolios.length > 0 ? remainingPortfolios[0].id : null);
      }
      
      // Refresh portfolios
      fetchPortfolios();
    } catch (err) {
      console.error('Error deleting portfolio:', err);
      setError('Failed to delete portfolio');
    }
  };

  // Get the active portfolio object
  const currentPortfolio = portfolios.find(p => p.id === activePortfolio);

  // Add new function to analyze portfolio
  const analyzePortfolio = async (stocks: any[]) => {
    if (!stocks.length) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const response = await fetch('/api/portfolio/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stocks }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze portfolio');
      }
      
      setPortfolioAnalysis(data.data);
    } catch (err) {
      console.error('Error analyzing portfolio:', err);
      setAnalysisError('Failed to analyze portfolio. Please try again later.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderAnalysisTab = () => {
    if (isAnalyzing) {
      return (
        <div className="flex justify-center items-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Analyzing portfolio...</span>
        </div>
      );
    }
    
    if (analysisError) {
      return (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-500">{analysisError}</p>
        </div>
      );
    }
    
    if (!portfolioAnalysis) {
      return (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-gray-500">No analysis available. Please select a portfolio with stocks.</p>
        </div>
      );
    }
    
    const { summary } = portfolioAnalysis;
    
    return (
      <div className="space-y-6">
        {/* Portfolio Summary Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Portfolio Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Total Investment</p>
              <p className="text-xl font-bold text-gray-800">₹{summary.total_investment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Current Value</p>
              <p className="text-xl font-bold text-gray-800">₹{summary.current_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            
            <div className={`p-4 rounded-md ${summary.overall_return >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-500">Overall Return</p>
              <p className={`text-xl font-bold ${summary.overall_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{summary.overall_return.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                <span className="text-sm ml-1">
                  ({summary.overall_return_percent.toFixed(2)}%)
                </span>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-md ${summary.daily_change >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-500">Today's Change</p>
              <div className="flex items-center">
                {summary.daily_change >= 0 ? 
                  <FiTrendingUp className="text-green-600 mr-1" /> : 
                  <FiTrendingDown className="text-red-600 mr-1" />
                }
                <p className={`text-md font-medium ${summary.daily_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{summary.daily_change.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  <span className="text-sm ml-1">
                    ({summary.daily_change_percent.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Risk Profile</p>
              <div className="flex items-center">
                {summary.risk_profile === 'Conservative' ? (
                  <div className="bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-medium">
                    Conservative
                  </div>
                ) : summary.risk_profile === 'Moderate' ? (
                  <div className="bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-xs font-medium">
                    Moderate
                  </div>
                ) : (
                  <div className="bg-red-100 text-red-800 rounded-full px-3 py-1 text-xs font-medium">
                    Aggressive
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">Diversification Score</p>
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                  <div 
                    className={`h-2.5 rounded-full ${
                      summary.diversification_score > 70 ? 'bg-green-600' : 
                      summary.diversification_score > 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${summary.diversification_score}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{summary.diversification_score.toFixed(0)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-start">
              <FiAlertTriangle className="text-blue-500 mr-2 mt-1" />
              <p className="text-blue-700">{summary.recommendation}</p>
            </div>
          </div>
        </div>
        
        {/* Sector Allocation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sector Allocation</h3>
          
          <div className="space-y-3">
            {Object.entries(summary.sector_allocation).sort((a, b) => b[1] - a[1]).map(([sector, percentage]) => (
              <div key={sector} className="flex items-center">
                <span className="w-32 text-sm text-gray-600">{sector}</span>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="h-2.5 rounded-full bg-blue-600" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <span className="w-16 text-right text-sm font-medium text-gray-900">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performers</h3>
            
            <div className="space-y-4">
              {summary.top_performers.map((stock) => (
                <div key={stock.symbol} className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <FiTrendingUp className="text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{stock.name || stock.symbol}</p>
                    <p className="text-xs text-gray-500">{stock.quantity} shares at ₹{stock.current_price.toFixed(2)}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-medium text-green-600">+{stock.profit_loss_percent.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500">₹{stock.profit_loss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              ))}
              
              {summary.top_performers.length === 0 && (
                <p className="text-gray-500 text-sm">No performers to display</p>
              )}
            </div>
          </div>
          
          {/* Worst Performers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Underperforming</h3>
            
            <div className="space-y-4">
              {summary.worst_performers.map((stock) => (
                <div key={stock.symbol} className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <FiTrendingDown className="text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{stock.name || stock.symbol}</p>
                    <p className="text-xs text-gray-500">{stock.quantity} shares at ₹{stock.current_price.toFixed(2)}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-medium text-red-600">{stock.profit_loss_percent.toFixed(2)}%</p>
                    <p className="text-xs text-gray-500">₹{stock.profit_loss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              ))}
              
              {summary.worst_performers.length === 0 && (
                <p className="text-gray-500 text-sm">No underperformers to display</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Portfolio Manager</h2>
          <p className="text-gray-600">Please sign in to manage your portfolios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Portfolio Manager</h2>
          <button 
            onClick={() => setShowNewPortfolioForm(!showNewPortfolioForm)} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            {showNewPortfolioForm ? 'Cancel' : 'New Portfolio'}
          </button>
        </div>
        
        {/* New Portfolio Form */}
        {showNewPortfolioForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Create New Portfolio</h3>
            <form onSubmit={handleCreatePortfolio}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newPortfolioDescription}
                  onChange={(e) => setNewPortfolioDescription(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              <button 
                type="submit" 
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
              >
                Create Portfolio
              </button>
            </form>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl">Loading portfolios...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 p-4 rounded-lg mb-4 text-red-700">
            {error}
          </div>
        ) : portfolios.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">No portfolios yet</h3>
            <p className="text-gray-600 mb-4">Create your first portfolio to start tracking your investments</p>
            <button 
              onClick={() => setShowNewPortfolioForm(true)} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Create Portfolio
            </button>
          </div>
        ) : (
          <div>
            {/* Portfolio Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Portfolio
              </label>
              <div className="flex flex-wrap gap-2">
                {portfolios.map((portfolio) => (
                  <button
                    key={portfolio.id}
                    onClick={() => setActivePortfolio(portfolio.id)}
                    className={`px-4 py-2 rounded-md transition ${
                      activePortfolio === portfolio.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    {portfolio.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Selected Portfolio Details */}
            {currentPortfolio && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{currentPortfolio.name}</h3>
                    {currentPortfolio.description && (
                      <p className="text-gray-600">{currentPortfolio.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => analyzePortfolio(currentPortfolio.stocks)} 
                      className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition text-sm flex items-center"
                    >
                      <FiBarChart2 className="mr-1" /> Analyze Portfolio
                    </button>
                    <button 
                      onClick={() => handleDeletePortfolio(currentPortfolio.id)} 
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      Delete Portfolio
                    </button>
                  </div>
                </div>
                
                {/* Portfolio Summary */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="text-xl font-bold text-gray-800">
                      ₹{currentPortfolio.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-sm text-gray-500">Total Cost</p>
                    <p className="text-xl font-bold text-gray-800">
                      ₹{currentPortfolio.totalCost.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-lg shadow ${
                    currentPortfolio.totalProfitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <p className="text-sm text-gray-500">Profit/Loss</p>
                    <p className={`text-xl font-bold ${
                      currentPortfolio.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{currentPortfolio.totalProfitLoss.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-lg shadow ${
                    currentPortfolio.totalProfitLossPercent >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <p className="text-sm text-gray-500">Return %</p>
                    <p className={`text-xl font-bold ${
                      currentPortfolio.totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentPortfolio.totalProfitLossPercent >= 0 ? '+' : ''}
                      {currentPortfolio.totalProfitLossPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                {/* Stocks Table */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold">Portfolio Holdings</h4>
                    <button 
                      onClick={() => setShowAddStockForm(!showAddStockForm)} 
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition text-sm"
                    >
                      {showAddStockForm ? 'Cancel' : 'Add Stock'}
                    </button>
                  </div>
                  
                  {/* Add Stock Form */}
                  {showAddStockForm && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="text-md font-semibold mb-3">Add New Stock to Portfolio</h5>
                      <form onSubmit={handleAddStock}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Symbol
                            </label>
                            <select
                              value={newStockSymbol}
                              onChange={(e) => setNewStockSymbol(e.target.value)}
                              className="w-full p-2 border rounded-md"
                              required
                            >
                              <option value="">Select a stock</option>
                              {symbols.map((stock) => (
                                <option key={stock.symbol} value={stock.symbol}>
                                  {stock.name} ({stock.symbol})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={newStockQuantity || ''}
                              onChange={(e) => setNewStockQuantity(parseFloat(e.target.value))}
                              className="w-full p-2 border rounded-md"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Purchase Price (₹)
                            </label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={newStockPrice || ''}
                              onChange={(e) => setNewStockPrice(parseFloat(e.target.value))}
                              className="w-full p-2 border rounded-md"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Purchase Date
                            </label>
                            <input
                              type="date"
                              value={newStockDate}
                              onChange={(e) => setNewStockDate(e.target.value)}
                              className="w-full p-2 border rounded-md"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes (Optional)
                            </label>
                            <textarea
                              value={newStockNotes}
                              onChange={(e) => setNewStockNotes(e.target.value)}
                              className="w-full p-2 border rounded-md"
                              rows={1}
                            />
                          </div>
                        </div>
                        <button 
                          type="submit" 
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                        >
                          Add to Portfolio
                        </button>
                      </form>
                    </div>
                  )}
                  
                  {currentPortfolio.stocks.length === 0 ? (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-gray-600">No stocks in this portfolio yet.</p>
                      <button 
                        onClick={() => setShowAddStockForm(true)} 
                        className="mt-3 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition text-sm"
                      >
                        Add Your First Stock
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit/Loss</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Return %</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentPortfolio.stocks.map((stock) => (
                            <tr key={stock.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{stock.symbol}</div>
                                <div className="text-xs text-gray-500">
                                  {stock.purchase_date && new Date(stock.purchase_date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {stock.quantity}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                ₹{stock.purchase_price.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className={`${
                                  (stock.currentPrice || 0) >= stock.purchase_price ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  ₹{(stock.currentPrice || 0).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                                {stock.dayHigh && stock.dayLow && (
                                  <div className="text-xs text-gray-500">
                                    H: ₹{stock.dayHigh.toFixed(2)} L: ₹{stock.dayLow.toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                                ₹{(stock.totalValue || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                })}
                              </td>
                              <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${
                                (stock.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {(stock.profitLoss || 0) >= 0 ? '+' : ''}
                                ₹{(stock.profitLoss || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                })}
                              </td>
                              <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${
                                (stock.profitLossPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {(stock.profitLossPercent || 0) >= 0 ? '+' : ''}
                                {(stock.profitLossPercent || 0).toFixed(2)}%
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                                <button
                                  onClick={() => handleRemoveStock(stock.id)}
                                  className="text-red-500 hover:text-red-700 transition"
                                  title="Remove from portfolio"
                                >
                                  <FaTrash />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioManager; 