'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Portfolio, PortfolioStock } from '@/lib/supabase';
import yahooFinance from 'yahoo-finance2';

interface StockSymbol {
  symbol: string;
  name: string;
}

interface PortfolioWithStocks extends Portfolio {
  stocks: (PortfolioStock & { currentPrice?: number; totalValue?: number; profitLoss?: number; profitLossPercent?: number })[];
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
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
  
  const { user } = useAuth();

  // Fetch portfolios when user changes
  useEffect(() => {
    if (user) {
      fetchPortfolios();
      fetchSymbols();
    }
  }, [user]);

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
      
      // Batch fetch current prices
      const quotes = await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          try {
            const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
            const quote = await yahooFinance.quote(nseSymbol);
            return { symbol, price: quote.regularMarketPrice };
          } catch (err) {
            console.error(`Error fetching price for ${symbol}:`, err);
            return { symbol, price: 0 };
          }
        })
      );
      
      // Create a price lookup map
      const priceMap = quotes.reduce((map, quote) => {
        map[quote.symbol.replace('.NS', '')] = quote.price || 0;
        return map;
      }, {} as Record<string, number>);
      
      // Add current prices and calculations to stocks
      return stocks.map(stock => {
        const currentPrice = priceMap[stock.symbol] || 0;
        const totalValue = stock.quantity * currentPrice;
        const totalCost = stock.quantity * stock.purchase_price;
        const profitLoss = totalValue - totalCost;
        const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost * 100) : 0;
        
        return {
          ...stock,
          currentPrice,
          totalValue,
          profitLoss,
          profitLossPercent
        };
      });
    } catch (err) {
      console.error('Error fetching current prices:', err);
      return stocks;
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
                  <button 
                    onClick={() => handleDeletePortfolio(currentPortfolio.id)} 
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    Delete Portfolio
                  </button>
                </div>
                
                {/* Portfolio Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Total Value</div>
                    <div className="text-xl font-semibold">
                      ₹{currentPortfolio.totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Total Cost</div>
                    <div className="text-xl font-semibold">
                      ₹{currentPortfolio.totalCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    currentPortfolio.totalProfitLoss >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="text-sm text-gray-500">Total P/L</div>
                    <div className={`text-xl font-semibold ${
                      currentPortfolio.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₹{currentPortfolio.totalProfitLoss.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    currentPortfolio.totalProfitLossPercent >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="text-sm text-gray-500">Return</div>
                    <div className={`text-xl font-semibold ${
                      currentPortfolio.totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentPortfolio.totalProfitLossPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                {/* Stocks Table */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold">Holdings</h4>
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
                      <h5 className="text-md font-semibold mb-3">Add New Stock</h5>
                      <form onSubmit={handleAddStock}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
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
                              value={newStockQuantity}
                              onChange={(e) => setNewStockQuantity(Number(e.target.value))}
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
                              value={newStockPrice}
                              onChange={(e) => setNewStockPrice(Number(e.target.value))}
                              className="w-full p-2 border rounded-md"
                              required
                            />
                          </div>
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
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes (Optional)
                            </label>
                            <textarea
                              value={newStockNotes}
                              onChange={(e) => setNewStockNotes(e.target.value)}
                              className="w-full p-2 border rounded-md"
                              rows={2}
                            />
                          </div>
                        </div>
                        <button 
                          type="submit" 
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                        >
                          Add Stock
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
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="p-3 text-left text-sm font-semibold text-gray-600">Symbol</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Quantity</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Buy Price</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Current Price</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Total Value</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">P/L</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Return %</th>
                            <th className="p-3 text-center text-sm font-semibold text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPortfolio.stocks.map((stock) => (
                            <tr key={stock.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-3 text-left">
                                <div>{stock.symbol}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(stock.purchase_date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="p-3 text-right">{stock.quantity}</td>
                              <td className="p-3 text-right">
                                ₹{stock.purchase_price.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className="p-3 text-right">
                                ₹{(stock.currentPrice || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className="p-3 text-right">
                                ₹{(stock.totalValue || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className={`p-3 text-right ${
                                (stock.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ₹{(stock.profitLoss || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className={`p-3 text-right ${
                                (stock.profitLossPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {(stock.profitLossPercent || 0).toFixed(2)}%
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleRemoveStock(stock.id)}
                                  className="text-red-500 hover:text-red-700 transition"
                                >
                                  Remove
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