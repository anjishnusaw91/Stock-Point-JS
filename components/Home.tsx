import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { getStockName, getRandomStocks } from '../lib/stockSymbols';

// Define a type-safe wrapper for database operations to avoid TypeScript errors
const db = {
  async getPortfolios(userId: string) {
    try {
      // @ts-ignore - Supabase mock implementation type issues
      return await supabase.from('portfolios').select('id').eq('user_id', userId);
    } catch (error) {
      console.error('Error in getPortfolios:', error);
      return { data: null, error };
    }
  },
  
  async getPortfolioStocks(portfolioIds: string[]) {
    try {
      if (!portfolioIds || portfolioIds.length === 0) {
        return { data: [], error: null };
      }
      // @ts-ignore - Supabase mock implementation type issues
      return await supabase.from('portfolio_stocks').select('*').in('portfolio_id', portfolioIds);
    } catch (error) {
      console.error('Error in getPortfolioStocks:', error);
      return { data: null, error };
    }
  },
  
  async getWatchlists(userId: string) {
    try {
      // @ts-ignore - Supabase mock implementation type issues
      return await supabase.from('watchlists').select('id').eq('user_id', userId);
    } catch (error) {
      console.error('Error in getWatchlists:', error);
      return { data: null, error };
    }
  },
  
  async getWatchlistStocks(watchlistIds: string[]) {
    try {
      if (!watchlistIds || watchlistIds.length === 0) {
        return { data: [], error: null };
      }
      // @ts-ignore - Supabase mock implementation type issues
      return await supabase.from('watchlist_stocks').select('*').in('watchlist_id', watchlistIds);
    } catch (error) {
      console.error('Error in getWatchlistStocks:', error);
      return { data: null, error };
    }
  },
  
  createSubscription(channel: string, table: string, callback: (payload: any) => void) {
    try {
      return supabase
        .channel(channel)
        // @ts-ignore - Using postgres_changes events which may not be typed correctly
        .on('postgres_changes', 
          { event: '*', schema: 'public', table },
          callback
        )
        .subscribe();
    } catch (error) {
      console.error(`Error creating subscription for ${table}:`, error);
      return null;
    }
  }
};

// Market hours configuration
const MARKET_HOURS = {
  open: 9, // 9:00 AM
  close: 15.5, // 3:30 PM
};

// Standard market holidays (YYYY-MM-DD format)
const MARKET_HOLIDAYS = [
  '2024-01-26', // Republic Day
  '2024-03-29', // Good Friday
  '2024-04-11', // Eid-Ul-Fitr
  '2024-05-01', // Maharashtra Day
  '2024-06-17', // Bakri Id
  '2024-08-15', // Independence Day
  '2024-10-02', // Gandhi Jayanti
  '2024-11-01', // Diwali
  '2024-11-15', // Guru Nanak Jayanti
  '2024-12-25', // Christmas
];

// Default data when API requests fail
const DEFAULT_WATCHLIST_ALERTS = [
  { id: 1, symbol: 'TATASTEEL.NS', type: 'price_above', threshold: 120, currentPrice: 125.30 },
  { id: 2, symbol: 'CIPLA.NS', type: 'price_below', threshold: 950, currentPrice: 940.75 }
];

const DEFAULT_RECENT_ACTIVITIES = [
  { id: 1, type: 'buy', symbol: 'INFY.NS', quantity: 5, price: 1445.60, date: new Date('2024-06-10T09:30:00') },
  { id: 2, type: 'sell', symbol: 'HDFCBANK.NS', quantity: 2, price: 1680.25, date: new Date('2024-06-09T14:15:00') },
  { id: 3, type: 'watchlist_add', symbol: 'CIPLA.NS', date: new Date('2024-06-08T11:20:00') },
  { id: 4, type: 'alert_set', symbol: 'TATASTEEL.NS', alertType: 'price_above', threshold: 120, date: new Date('2024-06-07T16:45:00') },
  { id: 5, type: 'analysis', symbol: 'TCS.NS', analysisType: 'technical', date: new Date('2024-06-06T10:30:00') }
];

type HomeProps = {
  setParentTab?: (tab: string) => void;
};

export default function Home({ setParentTab }: HomeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState<any>({
    marketStatus: 'Checking...',
    sensexValue: '0.00',
    sensexChange: '+0.0%',
    niftyValue: '0.00',
    niftyChange: '+0.0%',
    topGainer: 'Loading...',
    topGainerChange: '+0.0%',
    topLoser: 'Loading...',
    topLoserChange: '-0.0%',
    marketMood: 'Neutral'
  });
  
  // User dashboard data
  const [portfolioData, setPortfolioData] = useState({
    stocksCount: 0,
    totalValue: 0,
    portfolioStocks: [] as any[]
  });
  
  const [watchlistData, setWatchlistData] = useState({
    alertsCount: 0
  });
  
  const [activityData, setActivityData] = useState({
    recentCount: 0
  });

  // Simulated current time
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Navigate to the specific tab - either using direct parent function or URL params
  const navigateToTab = (tab: string) => {
    console.log(`Navigating to tab: ${tab}`);
    if (setParentTab) {
      // If parent function is available, use it for direct tab switching
      setParentTab(tab);
    } else {
      // Fallback to URL-based navigation
      router.push(`/?tab=${encodeURIComponent(tab)}`);
    }
  };
  
  // Navigate to Portfolio Manager
  const handleViewPortfolio = () => {
    navigateToTab('Portfolio Manager');
  };
  
  // Navigate to Watchlist Manager
  const handleCreateWatchlist = () => {
    navigateToTab('Watchlist Manager');
  };
  
  // Navigate to Live Charts
  const handleViewLiveMarket = () => {
    navigateToTab('Live Charts');
  };
  
  // Navigate to specific features
  const navigateToFeature = (feature: string) => {
    switch (feature) {
      case 'performance':
        navigateToTab('Performance Comparator');
        break;
      case 'technical':
        navigateToTab('Technical Analysis');
        break;
      case 'ai-predictions':
        navigateToTab('NIFTY predictor');
        break;
      case 'live-charts':
        navigateToTab('Live Charts');
        break;
      case 'news':
        navigateToTab('Market News');
        break;
      case 'activity':
        navigateToTab('User Activity');
        break;
      default:
        navigateToTab('Home');
        break;
    }
  };
  
  // Check if market is open
  const checkMarketStatus = (date: Date) => {
    const day = date.getDay();
    const hours = date.getHours() + date.getMinutes() / 60;
    const dateString = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // Check if today is a weekend (0 = Sunday, 6 = Saturday)
    if (day === 0 || day === 6) {
      return 'Closed';
    }
    
    // Check if today is a holiday
    if (MARKET_HOLIDAYS.includes(dateString)) {
      return 'Closed';
    }
    
    // Check if within market hours
    if (hours >= MARKET_HOURS.open && hours < MARKET_HOURS.close) {
      return 'Open';
    }
    
    return 'Closed';
  };
  
  // Fetch user portfolio data
  const fetchPortfolioData = useCallback(async () => {
    try {
      // Get the current user
      let user;
      try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      } catch (authError) {
        console.error('Auth error:', authError);
        return;
      }
      
      if (!user) {
        console.log('No authenticated user found');
        setPortfolioData({
          stocksCount: 0,
          totalValue: 0,
          portfolioStocks: []
        });
        return;
      }
      
      // Use our type-safe wrapper
      const { data: portfolios, error: portfolioError } = await db.getPortfolios(user.id);
      
      if (portfolioError) {
        console.error('Error fetching portfolios:', portfolioError);
        throw portfolioError;
      }
      
      if (!portfolios || portfolios.length === 0) {
        setPortfolioData({
          stocksCount: 0,
          totalValue: 0,
          portfolioStocks: []
        });
        return;
      }
      
      // Then get all portfolio stocks for these portfolios
      const portfolioIds = portfolios.map(p => p.id);
      
      const { data: stocks, error: stocksError } = await db.getPortfolioStocks(portfolioIds);
      
      if (stocksError) {
        console.error('Error fetching portfolio stocks:', stocksError);
        throw stocksError;
      }
      
      // Calculate total value from stocks
      const totalValue = stocks ? stocks.reduce((sum, stock) => 
        sum + (stock.quantity * stock.purchase_price), 0) : 0;
      
      console.log(`Found ${stocks?.length || 0} stocks in ${portfolios.length} portfolios`);
      
      // Update portfolio data state with correct count
      setPortfolioData({
        stocksCount: stocks?.length || 0,
        totalValue: totalValue,
        portfolioStocks: stocks || []
      });
    } catch (error) {
      console.error('Error in fetchPortfolioData:', error);
      // Fallback to default data when there's an error
      setPortfolioData({
        stocksCount: 0,
        totalValue: 0,
        portfolioStocks: []
      });
    }
  }, []);
  
  // Fetch watchlist alerts
  const fetchWatchlistAlerts = async () => {
    try {
      // In a real implementation, fetch from API
      // For now, we'll use the default data
      setWatchlistData({
        alertsCount: DEFAULT_WATCHLIST_ALERTS.length
      });
    } catch (error) {
      console.error('Error fetching watchlist alerts:', error);
      // Fall back to default data on error
      setWatchlistData({
        alertsCount: DEFAULT_WATCHLIST_ALERTS.length
      });
    }
  };
  
  // Check if market is currently open and update status
  const checkMarketHours = () => {
    const now = new Date();
    const status = checkMarketStatus(now);
    
    setStockData((prevData: typeof stockData) => ({
      ...prevData,
      marketStatus: status
    }));
    
    setCurrentTime(now);
  };
  
  // Fetch user data
  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };
  
  // Fetch watchlist data
  const fetchWatchlistData = useCallback(async () => {
    try {
      // Get the current user
      let user;
      try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      } catch (authError) {
        console.error('Auth error:', authError);
        return;
      }
      
      if (!user) {
        console.log('No authenticated user found');
        setWatchlistData({
          alertsCount: 0
        });
        return;
      }
      
      // Use our type-safe wrapper
      const { data: watchlists, error: watchlistError } = await db.getWatchlists(user.id);
      
      if (watchlistError) {
        console.error('Error fetching watchlists:', watchlistError);
        throw watchlistError;
      }
      
      if (!watchlists || watchlists.length === 0) {
        setWatchlistData({
          alertsCount: 0
        });
        return;
      }
      
      // Then get all watchlist stocks for these watchlists
      const watchlistIds = watchlists.map(w => w.id);
      
      const { data: stocks, error: stocksError } = await db.getWatchlistStocks(watchlistIds);
      
      if (stocksError) {
        console.error('Error fetching watchlist stocks:', stocksError);
        throw stocksError;
      }
      
      console.log(`Found ${stocks?.length || 0} stocks in ${watchlists.length} watchlists`);
      
      // Update watchlist data
      setWatchlistData({
        alertsCount: stocks?.length || 0
      });
    } catch (error) {
      console.error('Error in fetchWatchlistData:', error);
      // Fallback to mock data when there's an error
      setWatchlistData({
        alertsCount: DEFAULT_WATCHLIST_ALERTS.length
      });
    }
  }, []);
  
  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      // In a real implementation, fetch from API
      // For now, we'll use the default data
      setActivityData({
        recentCount: DEFAULT_RECENT_ACTIVITIES.length
      });
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Fall back to default data on error
      setActivityData({
        recentCount: DEFAULT_RECENT_ACTIVITIES.length
      });
    }
  };
  
  // Fetch live market data
  const fetchMarketData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would make API calls to fetch live data
      // For demo purposes, we'll simulate a fetch with realistic but randomized data
      
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate realistic but random data
      const sensexBase = 73142.80;
      const niftyBase = 22212.70;
      const randomPercentage = () => (Math.random() * 3 - 1.5).toFixed(2);
      
      const sensexPercent = parseFloat(randomPercentage());
      const niftyPercent = parseFloat(randomPercentage());
      
      const sensexChange = sensexPercent > 0 ? `+${sensexPercent}%` : `${sensexPercent}%`;
      const niftyChange = niftyPercent > 0 ? `+${niftyPercent}%` : `${niftyPercent}%`;
      
      const sensexValue = (sensexBase * (1 + sensexPercent/100)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      const niftyValue = (niftyBase * (1 + niftyPercent/100)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      // Get some random stocks for displaying market data
      const randomStocks = getRandomStocks(6);
      
      // Top gainers and losers
      const stocks = [
        { symbol: randomStocks[0].symbol, change: (Math.random() * 5 + 1).toFixed(2) },
        { symbol: randomStocks[1].symbol, change: (Math.random() * 5 + 0.5).toFixed(2) },
        { symbol: randomStocks[2].symbol, change: (Math.random() * 4 + 0.2).toFixed(2) },
        { symbol: randomStocks[3].symbol, change: (-Math.random() * 4 - 0.2).toFixed(2) },
        { symbol: randomStocks[4].symbol, change: (-Math.random() * 5 - 0.5).toFixed(2) },
        { symbol: randomStocks[5].symbol, change: (-Math.random() * 5 - 1).toFixed(2) }
      ];
      
      const gainers = stocks.filter(stock => parseFloat(stock.change) > 0)
        .sort((a, b) => parseFloat(b.change) - parseFloat(a.change));
      
      const losers = stocks.filter(stock => parseFloat(stock.change) < 0)
        .sort((a, b) => parseFloat(a.change) - parseFloat(b.change));
      
      const topGainer = gainers[0];
      const topLoser = losers[0];
      
      // Determine market mood based on average change
      const avgChange = stocks.reduce((sum, stock) => sum + parseFloat(stock.change), 0) / stocks.length;
      let marketMood = 'Neutral';
      if (avgChange > 1) marketMood = 'Bullish';
      else if (avgChange < -1) marketMood = 'Bearish';
      
      setStockData({
        marketStatus: checkMarketStatus(new Date()),
        sensexValue,
        sensexChange,
        niftyValue,
        niftyChange,
        topGainer: getStockName(topGainer.symbol),
        topGainerChange: `+${topGainer.change}%`,
        topLoser: getStockName(topLoser.symbol),
        topLoserChange: `${topLoser.change}%`,
        marketMood
      });
      
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch various data when the component mounts
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        await fetchPortfolioData();
        await fetchWatchlistData();
        await fetchRecentActivity();
        await fetchMarketData();
        checkMarketHours();
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
    
    const marketHoursInterval = setInterval(checkMarketHours, 60000); // Check every minute
    
    // Use a fallback polling mechanism by default
    let pollInterval: NodeJS.Timeout | null = null;
    
    // Set up real-time subscription for portfolio changes (both tables)
    let portfolioSubscription: any = null;
    let portfoliosSubscription: any = null;
    let watchlistSubscription: any = null;
    let watchlistStocksSubscription: any = null;
    
    // Attempt to set up Supabase realtime subscriptions using try/catch
    try {
      // Create subscriptions using our wrapper
      portfolioSubscription = db.createSubscription(
        'portfolio-changes', 
        'portfolios',
        (payload) => {
          console.log('Portfolio table change detected:', payload);
          if (isMounted) fetchPortfolioData();
        }
      );
      
      portfoliosSubscription = db.createSubscription(
        'portfolio-stocks-changes', 
        'portfolio_stocks',
        (payload) => {
          console.log('Portfolio stock change detected:', payload);
          if (isMounted) fetchPortfolioData();
        }
      );
      
      watchlistSubscription = db.createSubscription(
        'watchlist-changes', 
        'watchlists',
        (payload) => {
          console.log('Watchlist table change detected:', payload);
          if (isMounted) fetchWatchlistData();
        }
      );
      
      watchlistStocksSubscription = db.createSubscription(
        'watchlist-stocks-changes', 
        'watchlist_stocks',
        (payload) => {
          console.log('Watchlist stock change detected:', payload);
          if (isMounted) fetchWatchlistData();
        }
      );
      
      if (portfolioSubscription && portfoliosSubscription && 
          watchlistSubscription && watchlistStocksSubscription) {
        console.log('Successfully set up all realtime subscriptions');
      } else {
        console.log('Some subscriptions failed, using polling as fallback');
        // Set up polling as a fallback
        pollInterval = setInterval(() => {
          if (isMounted) {
            fetchPortfolioData();
            fetchWatchlistData();
          }
        }, 10000);
      }
    } catch (error) {
      console.error('Error setting up data sync:', error);
      // Fallback to polling if anything goes wrong
      pollInterval = setInterval(() => {
        if (isMounted) {
          fetchPortfolioData();
          fetchWatchlistData();
        }
      }, 10000);
    }
      
    // Clean up subscriptions and prevent state updates after unmount
    return () => {
      isMounted = false;
      clearInterval(marketHoursInterval);
      
      // Clean up polling if it was used
      if (pollInterval) clearInterval(pollInterval);
      
      // Clean up subscriptions if they were created
      try {
        if (portfolioSubscription) {
          portfolioSubscription.unsubscribe?.();
        }
        if (portfoliosSubscription) {
          portfoliosSubscription.unsubscribe?.();
        }
        if (watchlistSubscription) {
          watchlistSubscription.unsubscribe?.();
        }
        if (watchlistStocksSubscription) {
          watchlistStocksSubscription.unsubscribe?.();
        }
      } catch (cleanupError) {
        console.error('Error cleaning up subscriptions:', cleanupError);
      }
    };
  }, [fetchPortfolioData, fetchWatchlistData]);
  
  useEffect(() => {
    // Update clock every second
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Update market status every minute
      if (now.getSeconds() === 0) {
        setStockData((prev: typeof stockData) => ({
          ...prev,
          marketStatus: checkMarketStatus(now)
        }));
      }
    }, 1000);
    
    // Fetch market data initially and then every 5 minutes
    fetchMarketData();
    
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50">
      {/* Market Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Welcome & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">
            Welcome to Stock Point
          </h1>
                <p className="text-blue-100 mt-2">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} | {currentTime.toLocaleTimeString()}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-3xl">📈</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4">
              <button 
                onClick={handleViewPortfolio}
                className="bg-white/10 hover:bg-white/20 transition rounded-lg px-4 py-2 text-sm font-medium backdrop-blur-sm"
              >
                View Portfolio
              </button>
              <button 
                onClick={handleCreateWatchlist}
                className="bg-white/10 hover:bg-white/20 transition rounded-lg px-4 py-2 text-sm font-medium backdrop-blur-sm"
              >
                Create Watchlist
              </button>
              <button 
                onClick={handleViewLiveMarket}
                className="bg-white text-blue-700 hover:bg-blue-50 transition rounded-lg px-4 py-2 text-sm font-medium"
              >
                Live Market
              </button>
            </div>
          </div>
          
          {/* Market Summary */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Market Summary</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                stockData.marketStatus === 'Open' 
                  ? 'bg-green-100 text-green-800' 
                  : stockData.marketStatus === 'Checking...' 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                Market {stockData.marketStatus}
              </span>
            </div>
            
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${loading ? 'opacity-50' : ''}`}>
              <MarketCard 
                title="SENSEX" 
                value={stockData.sensexValue} 
                change={stockData.sensexChange} 
                isPositive={stockData.sensexChange.startsWith('+')}
                loading={loading}
              />
              <MarketCard 
                title="NIFTY 50" 
                value={stockData.niftyValue} 
                change={stockData.niftyChange} 
                isPositive={stockData.niftyChange.startsWith('+')}
                loading={loading}
              />
              <MarketCard 
                title="Top Gainer" 
                value={stockData.topGainer} 
                change={stockData.topGainerChange} 
                isPositive={true}
                loading={loading}
              />
              <MarketCard 
                title="Top Loser" 
                value={stockData.topLoser} 
                change={stockData.topLoserChange} 
                isPositive={false}
                loading={loading}
              />
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Market Sentiment:</span>
              <div className="flex items-center">
                <span className={`text-sm font-medium ${
                  stockData.marketMood === 'Bullish' 
                    ? 'text-green-600' 
                    : stockData.marketMood === 'Bearish' 
                      ? 'text-red-600' 
                      : 'text-gray-600'
                }`}>
                  {stockData.marketMood}
                </span>
                <span className="ml-2 text-lg">
                  {stockData.marketMood === 'Bullish' 
                    ? '🐂' 
                    : stockData.marketMood === 'Bearish' 
                      ? '🐻' 
                      : '⚖️'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Personal Dashboard */}
        <div className="space-y-6">
          {/* Your Portfolio Summary */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Dashboard</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Portfolio Stocks</p>
                    <p className="text-lg font-bold text-gray-800">{portfolioData.stocksCount}</p>
                  </div>
                </div>
                <button 
                  onClick={handleViewPortfolio}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Watchlist Alerts</p>
                    <p className="text-lg font-bold text-gray-800">{watchlistData.alertsCount}</p>
                  </div>
                </div>
                <button 
                  onClick={handleCreateWatchlist}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                    <p className="text-lg font-bold text-gray-800">{activityData.recentCount} actions</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigateToFeature('activity')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </button>
              </div>
            </div>
            
            <div className="mt-6">
              <button 
                onClick={handleViewPortfolio}
                className="w-full bg-blue-600 hover:bg-blue-700 transition text-white rounded-lg py-2 font-medium"
              >
                Update Portfolio
              </button>
            </div>
          </div>
          
          {/* Market News */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Market News</h2>
            <div className="space-y-4">
              <NewsItem 
                title="RBI releases new monetary policy" 
                time="2 hours ago"
              />
              <NewsItem 
                title="Tech stocks rally on positive earnings" 
                time="4 hours ago"
              />
              <NewsItem 
                title="Global markets react to international tensions" 
                time="6 hours ago"
              />
            </div>
            <div className="mt-4 text-center">
              <button 
                onClick={() => navigateToFeature('news')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All News
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Powerful Tools at Your Fingertips</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ToolCard 
            title="Performance Comparison"
            description="Compare stocks side by side"
            icon="📊"
            bgColor="bg-blue-50"
            textColor="text-blue-700"
            onClick={() => navigateToFeature('performance')}
          />
          <ToolCard 
            title="Technical Analysis" 
            description="Advanced charting tools"
            icon="📈"
            bgColor="bg-purple-50"
            textColor="text-purple-700"
            onClick={() => navigateToFeature('technical')}
          />
          <ToolCard 
            title="AI Predictions"
            description="ML-powered forecasting"
            icon="🤖"
            bgColor="bg-green-50"
            textColor="text-green-700"
            onClick={() => navigateToFeature('ai-predictions')}
          />
          <ToolCard 
            title="Live Charts" 
            description="Real-time market data"
            icon="⚡"
            bgColor="bg-amber-50"
            textColor="text-amber-700"
            onClick={() => navigateToFeature('live-charts')}
          />
        </div>
      </div>
    </div>
  );
}

function MarketCard({ title, value, change, isPositive, loading = false }: { 
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  loading?: boolean;
}) {
  return (
    <div className={`bg-gray-50 rounded-xl p-4 ${loading ? 'animate-pulse' : ''}`}>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-lg font-bold text-gray-800 mt-1">{value}</p>
      <p className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'} mt-1`}>
        {change} {isPositive ? '↑' : '↓'}
      </p>
    </div>
  );
}

function NewsItem({ title, time }: { 
  title: string;
  time: string;
}) {
  return (
    <div className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <h3 className="text-sm font-medium text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{time}</p>
    </div>
  );
}

function ToolCard({ title, description, icon, bgColor, textColor, onClick }: {
  title: string; 
  description: string; 
  icon: string; 
  bgColor: string;
  textColor: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
      onClick={onClick}
    >
      <div className={`${bgColor} ${textColor} w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}

