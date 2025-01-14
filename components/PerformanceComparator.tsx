import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface StockData {
  date: string;
  close: number;
}

interface StockResult {
  symbol: string;
  data: StockData[];
}

interface StockSymbol {
  symbol: string;
  name: string;
}

const PerformanceComparator: React.FC = () => {
  const [stockData, setStockData] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<StockSymbol[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [currentSelection, setCurrentSelection] = useState<string>('');
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

  // Fetch comparison data when selections change
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (selectedSymbols.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/compareStocks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbols: selectedSymbols,
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

        setStockData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [selectedSymbols, dateRange]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 500,
      animations: {
        enabled: true,
      },
      background: '#fff',
      zoom: {
        enabled: true,
        type: 'x',
      },
    },
    title: {
      text: 'Stock Performance Comparison',
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
      title: {
        text: 'Closing Price (₹)',
      },
      labels: {
        formatter: (value) => `₹${value.toFixed(2)}`,
      },
    },
    tooltip: {
      shared: true,
      x: {
        format: 'dd MMM yyyy',
      },
      y: {
        formatter: (value) => `₹${value.toFixed(2)}`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
    },
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    grid: {
      show: true,
    },
  };

  const chartSeries = stockData.map((stock) => ({
    name: stock.symbol,
    data: stock.data.map((item) => ({
      x: new Date(item.date).getTime(),
      y: item.close,
    })),
  }));

  const handleAddStock = () => {
    if (currentSelection && !selectedSymbols.includes(currentSelection)) {
      setSelectedSymbols(prev => [...prev, currentSelection]);
      setCurrentSelection('');
    }
  };

  const handleRemoveStock = (symbolToRemove: string) => {
    setSelectedSymbols(prev => prev.filter(symbol => symbol !== symbolToRemove));
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Performance Comparison</h2>
          <p className="text-gray-600">Compare multiple NSE stocks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Stocks
            </label>
            <div className="flex gap-2">
              <select
                className="w-full p-2 border rounded-md"
                value={currentSelection}
                onChange={(e) => setCurrentSelection(e.target.value)}
              >
                <option value="">Select a stock</option>
                {symbols
                  .filter(stock => !selectedSymbols.includes(stock.symbol))
                  .map((stock) => (
                    <option key={stock.symbol} value={stock.symbol}>
                      {stock.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleAddStock}
                disabled={!currentSelection}
                className={`px-4 py-2 rounded-md ${
                  currentSelection
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add
              </button>
            </div>

            {/* Selected Stocks List */}
            {selectedSymbols.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Stocks
                </label>
                <div className="space-y-2">
                  {selectedSymbols.map((symbol) => {
                    const stockName = symbols.find(s => s.symbol === symbol)?.name || symbol;
                    return (
                      <div key={symbol} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                        <span>{stockName}</span>
                        <button
                          onClick={() => handleRemoveStock(symbol)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
            <div className="text-xl">Loading comparison data...</div>
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-red-500">
              Error: {error}
              <button 
                onClick={() => setError(null)}
                className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && selectedSymbols.length > 0 && stockData.length > 0 && (
          <div className="w-full h-[600px]">
            <Chart
              options={chartOptions}
              series={chartSeries}
              type="line"
              height={500}
            />
          </div>
        )}

        {!loading && !error && selectedSymbols.length === 0 && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">
              Please select stocks to compare their performance
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

export default PerformanceComparator;
