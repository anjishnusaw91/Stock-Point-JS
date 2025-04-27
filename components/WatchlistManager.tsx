'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Watchlist, WatchlistStock } from '@/lib/supabase';
import yahooFinance from 'yahoo-finance2';
import { FaEye, FaEyeSlash, FaArrowUp, FaArrowDown, FaTrash, FaChartLine } from 'react-icons/fa';
import { FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiBarChart2 } from 'react-icons/fi';

interface StockSymbol {
  symbol: string;
  name: string;
}

interface WatchlistWithStocks extends Watchlist {
  stocks: (WatchlistStock & { 
    currentPrice?: number;
    previousClose?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    avgVolume?: number;
    high?: number;
    low?: number;
  })[];
}

interface StockRecommendation {
  symbol: string;
  name: string;
  current_price: number;
  previous_close: number;
  change: number;
  change_percent: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
}

interface WatchlistRecommendations {
  stocks: StockRecommendation[];
  top_recommendations: StockRecommendation[];
}

const WatchlistManager: React.FC = () => {
  const [watchlists, setWatchlists] = useState<WatchlistWithStocks[]>([]);
  const [symbols, setSymbols] = useState<StockSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWatchlist, setActiveWatchlist] = useState<string | null>(null);
  
  // New watchlist form state
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistDescription, setNewWatchlistDescription] = useState('');
  const [showNewWatchlistForm, setShowNewWatchlistForm] = useState(false);
  
  // New stock form state
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockNotes, setNewStockNotes] = useState('');
  
  const [activeTab, setActiveTab] = useState<'stocks' | 'recommendations'>('stocks');
  const [stockRecommendations, setStockRecommendations] = useState<WatchlistRecommendations | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const { user } = useAuth();

  // Fetch watchlists when user changes
  useEffect(() => {
    if (user) {
      fetchWatchlists();
      fetchSymbols();
      
      // Refresh data every 60 seconds for real-time updates
      const intervalId = setInterval(() => {
        console.log('Refreshing watchlist data...');
        fetchWatchlists();
      }, 60000);
      
      return () => clearInterval(intervalId);
    }
  }, [user]);

  // Add new effect to generate recommendations when active watchlist changes
  useEffect(() => {
    if (activeWatchlist && watchlists.length > 0) {
      const currentWatchlist = watchlists.find(w => w.id === activeWatchlist);
      if (currentWatchlist && currentWatchlist.stocks.length > 0) {
        generateRecommendations(currentWatchlist.stocks);
      }
    }
  }, [activeWatchlist, watchlists]);

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

  const fetchWatchlists = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch watchlists
      const { data: watchlistsData, error: watchlistsError } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id);
        
      if (watchlistsError) throw watchlistsError;
      
      if (!watchlistsData.length) {
        setWatchlists([]);
        setLoading(false);
        return;
      }
      
      // Fetch watchlist stocks for each watchlist
      const watchlistsWithStocks = await Promise.all(
        watchlistsData.map(async (watchlist) => {
          const { data: stocksData, error: stocksError } = await supabase
            .from('watchlist_stocks')
            .select('*')
            .eq('watchlist_id', watchlist.id);
            
          if (stocksError) throw stocksError;
          
          // Set the active watchlist to the first one if not already set
          if (!activeWatchlist) setActiveWatchlist(watchlist.id);
          
          // Fetch current prices for stocks
          const stocksWithPrices = await fetchStockData(stocksData);
          
          return {
            ...watchlist,
            stocks: stocksWithPrices
          };
        })
      );
      
      setWatchlists(watchlistsWithStocks);
    } catch (err) {
      console.error('Error fetching watchlists:', err);
      setError('Failed to load watchlists');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStockData = async (stocks: WatchlistStock[]) => {
    if (!stocks.length) return [];
    
    try {
      console.log('Fetching current prices for stocks:', stocks.map(s => s.symbol));
      
      // Call our dedicated watchlist data API
      const response = await fetch('/api/watchlist/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watchlistStocks: stocks }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Watchlist data API response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch watchlist data');
      }
      
      // API returns stocks with data already mapped
      return data.data;
      
    } catch (err) {
      console.error('Error fetching stock data:', err);
      
      // If API fails, return stocks with zero values
      return stocks.map(stock => ({
        ...stock,
        currentPrice: 0,
        previousClose: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        avgVolume: 0,
        high: 0,
        low: 0
      }));
    }
  };
  
  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .insert([
          {
            user_id: user.id,
            name: newWatchlistName,
            description: newWatchlistDescription || null
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Reset form
      setNewWatchlistName('');
      setNewWatchlistDescription('');
      setShowNewWatchlistForm(false);
      
      // Refresh watchlists
      fetchWatchlists();
    } catch (err) {
      console.error('Error creating watchlist:', err);
      setError('Failed to create watchlist');
    }
  };
  
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeWatchlist) return;
    
    try {
      // Check if stock already exists in this watchlist
      const { data: existingStocks, error: checkError } = await supabase
        .from('watchlist_stocks')
        .select('*')
        .eq('watchlist_id', activeWatchlist)
        .eq('symbol', newStockSymbol);
        
      if (checkError) throw checkError;
      
      if (existingStocks && existingStocks.length > 0) {
        setError(`${newStockSymbol} is already in this watchlist`);
        return;
      }
      
      const { data, error } = await supabase
        .from('watchlist_stocks')
        .insert([
          {
            watchlist_id: activeWatchlist,
            symbol: newStockSymbol,
            notes: newStockNotes || null,
            date_added: new Date().toISOString()
          }
        ]);
        
      if (error) throw error;
      
      // Reset form
      setNewStockSymbol('');
      setNewStockNotes('');
      setShowAddStockForm(false);
      setError(null);
      
      // Refresh watchlists
      fetchWatchlists();
    } catch (err) {
      console.error('Error adding stock:', err);
      setError('Failed to add stock');
    }
  };
  
  const handleRemoveStock = async (stockId: string) => {
    if (!confirm('Are you sure you want to remove this stock from your watchlist?')) return;
    
    try {
      const { error } = await supabase
        .from('watchlist_stocks')
        .delete()
        .eq('id', stockId);
        
      if (error) throw error;
      
      // Refresh watchlists
      fetchWatchlists();
    } catch (err) {
      console.error('Error removing stock:', err);
      setError('Failed to remove stock');
    }
  };
  
  const handleDeleteWatchlist = async (watchlistId: string) => {
    if (!confirm('Are you sure you want to delete this watchlist? All stocks will be removed.')) return;
    
    try {
      // First delete all stocks in the watchlist
      const { error: stocksError } = await supabase
        .from('watchlist_stocks')
        .delete()
        .eq('watchlist_id', watchlistId);
        
      if (stocksError) throw stocksError;
      
      // Then delete the watchlist
      const { error: watchlistError } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId);
        
      if (watchlistError) throw watchlistError;
      
      // Set active watchlist to first in list or null
      if (activeWatchlist === watchlistId) {
        const remainingWatchlists = watchlists.filter(w => w.id !== watchlistId);
        setActiveWatchlist(remainingWatchlists.length > 0 ? remainingWatchlists[0].id : null);
      }
      
      // Refresh watchlists
      fetchWatchlists();
    } catch (err) {
      console.error('Error deleting watchlist:', err);
      setError('Failed to delete watchlist');
    }
  };

  // Get the active watchlist object
  const currentWatchlist = watchlists.find(w => w.id === activeWatchlist);

  // Add new function to generate recommendations
  const generateRecommendations = async (stocks: any[]) => {
    if (!stocks.length) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Log the stocks data before sending to API
      console.log('Stocks data for recommendations:', JSON.stringify(stocks, null, 2));
      
      const response = await fetch('/api/watchlist/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stocks }),
      });
      
      const data = await response.json();
      console.log('Recommendations API response:', JSON.stringify(data, null, 2));
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate stock recommendations');
      }
      
      setStockRecommendations(data.data);
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setAnalysisError('Failed to generate recommendations. Please try again later.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add new section for recommendations tab
  const renderRecommendationsTab = () => {
    if (isAnalyzing) {
      return (
        <div className="flex justify-center items-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Analyzing stocks...</span>
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
    
    if (!stockRecommendations) {
      return (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-gray-500">No recommendations available. Please select a watchlist with stocks.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Top Recommendations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Recommendations</h3>
          
          <div className="space-y-4">
            {stockRecommendations.top_recommendations.map((stock) => (
              <div key={stock.symbol} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{stock.name || stock.symbol}</h4>
                    <div className="flex items-center">
                      <span className="text-gray-500 text-sm mr-2">₹{stock.current_price.toFixed(2)}</span>
                      <span className={`text-sm flex items-center ${
                        stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stock.change >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                        {Math.abs(stock.change_percent).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full font-medium text-sm ${
                    stock.recommendation === 'BUY' 
                      ? 'bg-green-100 text-green-800' 
                      : stock.recommendation === 'SELL'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {stock.recommendation} ({stock.confidence}%)
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{stock.reasoning}</p>
              </div>
            ))}
            
            {stockRecommendations.top_recommendations.length === 0 && (
              <p className="text-gray-500 text-sm">No recommendations available</p>
            )}
          </div>
        </div>
        
        {/* All Stocks Recommendations */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">All Stock Recommendations</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockRecommendations.stocks.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stock.symbol}</div>
                      <div className="text-sm text-gray-500">{stock.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">₹{stock.current_price.toFixed(2)}</div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <div className="flex items-center justify-end">
                        {stock.change >= 0 ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                        {Math.abs(stock.change_percent).toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        stock.recommendation === 'BUY' 
                          ? 'bg-green-100 text-green-800' 
                          : stock.recommendation === 'SELL'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {stock.recommendation}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 w-24">
                        <div 
                          className={`h-2.5 rounded-full ${
                            stock.recommendation === 'BUY' 
                              ? 'bg-green-600' 
                              : stock.recommendation === 'SELL'
                                ? 'bg-red-600'
                                : 'bg-gray-500'
                          }`} 
                          style={{ width: `${stock.confidence}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Watchlist Manager</h2>
          <p className="text-gray-600">Please sign in to manage your watchlists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Watchlist Manager</h2>
          <button 
            onClick={() => setShowNewWatchlistForm(!showNewWatchlistForm)} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            {showNewWatchlistForm ? 'Cancel' : 'New Watchlist'}
          </button>
        </div>
        
        {/* New Watchlist Form */}
        {showNewWatchlistForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Create New Watchlist</h3>
            <form onSubmit={handleCreateWatchlist}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Watchlist Name
                </label>
                <input
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newWatchlistDescription}
                  onChange={(e) => setNewWatchlistDescription(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </div>
              <button 
                type="submit" 
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
              >
                Create Watchlist
              </button>
            </form>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl">Loading watchlists...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 p-4 rounded-lg mb-4 text-red-700">
            {error}
          </div>
        ) : watchlists.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">No watchlists yet</h3>
            <p className="text-gray-600 mb-4">Create your first watchlist to start tracking stocks you're interested in</p>
            <button 
              onClick={() => setShowNewWatchlistForm(true)} 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Create Watchlist
            </button>
          </div>
        ) : (
          <div>
            {/* Watchlist Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Watchlist
              </label>
              <div className="flex flex-wrap gap-2">
                {watchlists.map((watchlist) => (
                  <button
                    key={watchlist.id}
                    onClick={() => setActiveWatchlist(watchlist.id)}
                    className={`px-4 py-2 rounded-md transition ${
                      activeWatchlist === watchlist.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    {watchlist.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Selected Watchlist Details */}
            {currentWatchlist && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{currentWatchlist.name}</h3>
                    {currentWatchlist.description && (
                      <p className="text-gray-600">{currentWatchlist.description}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeleteWatchlist(currentWatchlist.id)} 
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    Delete Watchlist
                  </button>
                </div>
                
                {/* Stocks Table */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold">Watched Stocks</h4>
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
                      <h5 className="text-md font-semibold mb-3">Add New Stock to Watchlist</h5>
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
                          Add to Watchlist
                        </button>
                      </form>
                    </div>
                  )}
                  
                  {currentWatchlist.stocks.length === 0 ? (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-gray-600">No stocks in this watchlist yet.</p>
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
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Price</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Change</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Change %</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">Volume</th>
                            <th className="p-3 text-right text-sm font-semibold text-gray-600">High / Low</th>
                            <th className="p-3 text-center text-sm font-semibold text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentWatchlist.stocks.map((stock) => {
                            // Check if this stock has a BUY recommendation
                            const recommendation = stockRecommendations?.stocks.find(rec => rec.symbol === stock.symbol);
                            const isBuyRecommended = recommendation?.recommendation === 'BUY' && recommendation?.confidence > 60;
                            
                            return (
                              <tr 
                                key={stock.id} 
                                className={`border-b border-gray-200 hover:bg-gray-50 ${isBuyRecommended ? 'bg-green-50' : ''}`}
                              >
                                <td className="p-3 text-left">
                                  <div className="font-medium">
                                    {stock.symbol}
                                    {recommendation && (
                                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                        recommendation.recommendation === 'BUY' 
                                          ? 'bg-green-100 text-green-800' 
                                          : recommendation.recommendation === 'SELL'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {recommendation.recommendation} ({recommendation.confidence}%)
                                      </span>
                                    )}
                                  </div>
                                  {stock.notes && (
                                    <div className="text-xs text-gray-500">{stock.notes}</div>
                                  )}
                                </td>
                                <td className="p-3 text-right font-medium">
                                  {`₹${stock.currentPrice.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}`}
                                </td>
                                <td className={`p-3 text-right ${
                                  stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  <div className="flex items-center justify-end">
                                    {stock.change >= 0 ? <FaArrowUp className="mr-1" size={12} /> : <FaArrowDown className="mr-1" size={12} />}
                                    ₹{Math.abs(stock.change).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </div>
                                </td>
                                <td className={`p-3 text-right ${
                                  stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {stock.changePercent >= 0 ? '+' : '-'}
                                  {Math.abs(stock.changePercent).toFixed(2)}%
                                </td>
                                <td className="p-3 text-right text-gray-700">
                                  <div>
                                    {stock.volume.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Avg: {stock.avgVolume.toLocaleString()}
                                  </div>
                                </td>
                                <td className="p-3 text-right text-gray-700">
                                  <div>H: ₹{stock.high.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}</div>
                                  <div>L: ₹{stock.low.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}</div>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleRemoveStock(stock.id)}
                                    className="text-red-500 hover:text-red-700 transition"
                                    title="Remove from watchlist"
                                  >
                                    <FaTrash />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
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

export default WatchlistManager; 