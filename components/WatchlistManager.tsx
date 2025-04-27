'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Watchlist, WatchlistStock } from '@/lib/supabase';
import yahooFinance from 'yahoo-finance2';
import { FaEye, FaEyeSlash, FaArrowUp, FaArrowDown, FaTrash } from 'react-icons/fa';

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
  
  const { user } = useAuth();

  // Fetch watchlists when user changes
  useEffect(() => {
    if (user) {
      fetchWatchlists();
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
      const symbols = stocks.map(stock => stock.symbol);
      const uniqueSymbols = Array.from(new Set(symbols));
      
      // Batch fetch stock data
      const quotes = await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          try {
            const nseSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
            const quote = await yahooFinance.quote(nseSymbol);
            return { 
              symbol, 
              price: quote.regularMarketPrice,
              previousClose: quote.regularMarketPreviousClose,
              volume: quote.regularMarketVolume,
              avgVolume: quote.averageDailyVolume3Month,
              high: quote.regularMarketDayHigh,
              low: quote.regularMarketDayLow
            };
          } catch (err) {
            console.error(`Error fetching data for ${symbol}:`, err);
            return { 
              symbol, 
              price: 0,
              previousClose: 0,
              volume: 0,
              avgVolume: 0,
              high: 0,
              low: 0
            };
          }
        })
      );
      
      // Create a data lookup map
      const dataMap = quotes.reduce((map, quote) => {
        map[quote.symbol.replace('.NS', '')] = quote;
        return map;
      }, {} as Record<string, any>);
      
      // Add current prices and calculations to stocks
      return stocks.map(stock => {
        const data = dataMap[stock.symbol] || {};
        const currentPrice = data.price || 0;
        const previousClose = data.previousClose || 0;
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose * 100) : 0;
        
        return {
          ...stock,
          currentPrice,
          previousClose,
          change,
          changePercent,
          volume: data.volume,
          avgVolume: data.avgVolume,
          high: data.high,
          low: data.low
        };
      });
    } catch (err) {
      console.error('Error fetching stock data:', err);
      return stocks;
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
                          {currentWatchlist.stocks.map((stock) => (
                            <tr key={stock.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-3 text-left">
                                <div className="font-medium">{stock.symbol}</div>
                                {stock.notes && (
                                  <div className="text-xs text-gray-500">{stock.notes}</div>
                                )}
                              </td>
                              <td className="p-3 text-right font-medium">
                                ₹{(stock.currentPrice || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className={`p-3 text-right ${
                                (stock.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                <div className="flex items-center justify-end">
                                  {(stock.change || 0) >= 0 ? <FaArrowUp className="mr-1" size={12} /> : <FaArrowDown className="mr-1" size={12} />}
                                  ₹{Math.abs(stock.change || 0).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                              </td>
                              <td className={`p-3 text-right ${
                                (stock.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {(stock.changePercent || 0) >= 0 ? '+' : '-'}
                                {Math.abs(stock.changePercent || 0).toFixed(2)}%
                              </td>
                              <td className="p-3 text-right text-gray-700">
                                <div>
                                  {(stock.volume || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Avg: {(stock.avgVolume || 0).toLocaleString()}
                                </div>
                              </td>
                              <td className="p-3 text-right text-gray-700">
                                <div>H: ₹{(stock.high || 0).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}</div>
                                <div>L: ₹{(stock.low || 0).toLocaleString(undefined, {
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

export default WatchlistManager; 