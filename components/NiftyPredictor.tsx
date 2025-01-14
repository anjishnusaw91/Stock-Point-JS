import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PredictionData {
  rsi: number;
  sma20: number;
  sma50: number;
  standardDeviation: number;
  volatility: number;
  momentum: number;
  prediction: {
    trend: 'bullish' | 'bearish' | 'neutral';
    probability: number;
    reason: string[];
  };
  historicalData: {
    date: string;
    close: number;
    sma20: number;
    sma50: number;
  }[];
}

interface StockSymbol {
  symbol: string;
  name: string;
}

const NiftyPredictor: React.FC = () => {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
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

  // Fetch prediction data when symbol changes
  useEffect(() => {
    const fetchPredictionData = async () => {
      if (!selectedSymbol) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/stockPredictor', {
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
          throw new Error(data.error || 'Failed to fetch prediction data');
        }

        setPredictionData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictionData();
  }, [selectedSymbol, dateRange]);

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
      text: `${selectedSymbol} Price Analysis`,
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
        text: 'Price (₹)',
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
      width: [3, 2, 2],
      curve: 'smooth',
      dashArray: [0, 0, 0],
    },
    colors: ['#2E93fA', '#66DA26', '#FF9800'],
  };

  const chartSeries = predictionData ? [
    {
      name: 'Price',
      data: predictionData.historicalData.map((item) => ({
        x: new Date(item.date).getTime(),
        y: item.close,
      })),
    },
    {
      name: 'SMA20',
      data: predictionData.historicalData.map((item) => ({
        x: new Date(item.date).getTime(),
        y: item.sma20,
      })),
    },
    {
      name: 'SMA50',
      data: predictionData.historicalData.map((item) => ({
        x: new Date(item.date).getTime(),
        y: item.sma50,
      })),
    },
  ] : [];

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Nifty Predictor</h2>
          <p className="text-gray-600">Statistical Analysis & Prediction</p>
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
            <div className="text-xl">Analyzing stock data...</div>
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

        {!loading && !error && predictionData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${
                predictionData.prediction.trend === 'bullish' ? 'bg-green-100' :
                predictionData.prediction.trend === 'bearish' ? 'bg-red-100' :
                'bg-yellow-100'
              }`}>
                <h3 className="font-bold text-lg mb-2">Prediction</h3>
                <p className="text-lg font-semibold">
                  {predictionData.prediction.trend.toUpperCase()}
                </p>
                <p className="text-sm">
                  Probability: {predictionData.prediction.probability.toFixed(2)}%
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-100">
                <h3 className="font-bold text-lg mb-2">Technical Indicators</h3>
                <div className="space-y-1">
                  <p>RSI: {predictionData.rsi.toFixed(2)}</p>
                  <p>Momentum: {predictionData.momentum.toFixed(2)}%</p>
                  <p>Volatility: {predictionData.volatility.toFixed(2)}%</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-100">
                <h3 className="font-bold text-lg mb-2">Moving Averages</h3>
                <div className="space-y-1">
                  <p>SMA20: ₹{predictionData.sma20.toFixed(2)}</p>
                  <p>SMA50: ₹{predictionData.sma50.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Analysis Reasons</h3>
              <ul className="list-disc list-inside space-y-1">
                {predictionData.prediction.reason.map((reason, index) => (
                  <li key={index} className="text-gray-700">{reason}</li>
                ))}
              </ul>
            </div>

            <div className="w-full h-[600px]">
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="line"
                height={500}
              />
            </div>
          </>
        )}

        {!loading && !error && !selectedSymbol && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">
              Please select a stock to view prediction analysis
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

export default NiftyPredictor;

