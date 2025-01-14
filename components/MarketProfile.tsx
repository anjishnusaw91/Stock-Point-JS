import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false 
}) as React.ComponentType<any>;

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface StockSymbol {
  symbol: string;
  name: string;
}

interface ChartDataPoint {
  x: number;
  y: [number, number, number, number];
}

const MarketProfile: React.FC = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<StockSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
  });

  // Fetch available NSE symbols
  useEffect(() => {
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

    fetchSymbols();
  }, []);

  // Fetch stock data when symbol or date range changes
  useEffect(() => {
    const fetchStockData = async () => {
      if (!selectedSymbol) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/marketProfile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: selectedSymbol,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch data');
        }

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format received');
        }

        setStockData(data.data);
      } catch (err) {
        console.error('Error in fetchStockData:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [selectedSymbol, dateRange]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'candlestick',
      height: 500,
      animations: {
        enabled: true,
      },
      background: '#fff',
    },
    title: {
      text: `${selectedSymbol} Stock Price`,
      align: 'center',
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format: 'dd MMM yyyy',
      },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
      labels: {
        formatter: (value) => `₹${value.toFixed(2)}`,
      },
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
    },
    grid: {
      show: true,
    },
  };

  const chartSeries = [{
    name: selectedSymbol,
    data: stockData.map((item: StockData): ChartDataPoint => ({
      x: new Date(item.date).getTime(),
      y: [item.open, item.high, item.low, item.close],
    })),
  }];

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Market Profile</h2>
          <p className="text-gray-600">NSE Stock Performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Stock
            </label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              <option value="">Select a stock</option>
              {symbols.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              className="w-full p-2 border rounded-md"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                startDate: e.target.value
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              className="w-full p-2 border rounded-md"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                endDate: e.target.value
              }))}
            />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl">Loading stock data...</div>
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-red-500">
              Error loading stock data: {error}
              <button 
                onClick={() => setError(null)}
                className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && selectedSymbol && stockData.length > 0 && (
          <div className="w-full h-[600px]">
            <Chart
              options={chartOptions}
              series={chartSeries}
              type="candlestick"
              height={500}
            />
          </div>
        )}

        {!loading && !error && !selectedSymbol && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">
              Please select a stock to view its data
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Data source: Yahoo Finance | Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MarketProfile;
