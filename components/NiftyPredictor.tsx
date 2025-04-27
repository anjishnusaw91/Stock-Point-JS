import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div>Loading Chart...</div>
}) as React.ComponentType<any>;

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
  const [chartReady, setChartReady] = useState(false);

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
      setChartReady(false);

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
        setPredictionData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictionData();
  }, [selectedSymbol, dateRange]);

  // Set chart ready after data is loaded
  useEffect(() => {
    if (predictionData && predictionData.historicalData?.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setChartReady(true);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setChartReady(false);
    }
  }, [predictionData]);

  const getChartOptions = (): ApexOptions => ({
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
      fontFamily: 'inherit',
    },
    title: {
      text: selectedSymbol ? `${selectedSymbol} Price Analysis` : 'Price Analysis',
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
        formatter: (value) => {
          const num = Number(value);
          if (isNaN(num)) return 'N/A';
          return `₹${num.toFixed(2)}`;
        },
      },
    },
    tooltip: {
      shared: true,
      x: {
        format: 'dd MMM yyyy',
      },
      y: {
        formatter: (value) => {
          const num = Number(value);
          if (isNaN(num)) return 'N/A';
          return `₹${num.toFixed(2)}`;
        },
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
  });

  const getChartSeries = () => {
    if (!predictionData || !predictionData.historicalData || predictionData.historicalData.length === 0) {
      return [];
    }

    try {
      return [
        {
          name: 'Price',
          data: predictionData.historicalData
            .filter(item => item && item.date && item.close !== undefined && item.close !== null)
            .map((item) => {
              try {
                const timestamp = new Date(item.date).getTime();
                if (isNaN(timestamp)) return null;
                return {
                  x: timestamp,
                  y: Number(item.close),
                };
              } catch (e) {
                return null;
              }
            })
            .filter((point): point is NonNullable<typeof point> => point !== null),
        },
        {
          name: 'SMA20',
          data: predictionData.historicalData
            .filter(item => item && item.date && item.sma20 !== undefined && item.sma20 !== null)
            .map((item) => {
              try {
                const timestamp = new Date(item.date).getTime();
                if (isNaN(timestamp)) return null;
                return {
                  x: timestamp,
                  y: Number(item.sma20),
                };
              } catch (e) {
                return null;
              }
            })
            .filter((point): point is NonNullable<typeof point> => point !== null),
        },
        {
          name: 'SMA50',
          data: predictionData.historicalData
            .filter(item => item && item.date && item.sma50 !== undefined && item.sma50 !== null)
            .map((item) => {
              try {
                const timestamp = new Date(item.date).getTime();
                if (isNaN(timestamp)) return null;
                return {
                  x: timestamp,
                  y: Number(item.sma50),
                };
              } catch (e) {
                return null;
              }
            })
            .filter((point): point is NonNullable<typeof point> => point !== null),
        },
      ];
    } catch (error) {
      console.error("Error generating chart series:", error);
      return [];
    }
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Statistical Predictor</h2>
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
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Prediction</h3>
                  <div className={`text-2xl font-bold ${
                    predictionData.prediction.trend === 'bullish' ? 'text-green-500' :
                    predictionData.prediction.trend === 'bearish' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {predictionData.prediction.trend.toUpperCase()} 
                    <span className="text-gray-500 text-lg ml-2">
                      ({predictionData.prediction.probability.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium">Reasons:</h4>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {predictionData.prediction.reason.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">RSI (14)</div>
                  <div className="text-xl font-semibold">{predictionData.rsi.toFixed(2)}</div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">SMA 20</div>
                  <div className="text-xl font-semibold">₹{predictionData.sma20.toFixed(2)}</div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">SMA 50</div>
                  <div className="text-xl font-semibold">₹{predictionData.sma50.toFixed(2)}</div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Std Deviation</div>
                  <div className="text-xl font-semibold">{predictionData.standardDeviation.toFixed(4)}</div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Volatility</div>
                  <div className="text-xl font-semibold">{predictionData.volatility.toFixed(2)}%</div>
                </div>
                
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-sm text-gray-500">Momentum</div>
                  <div className="text-xl font-semibold">{predictionData.momentum.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-4 h-[500px]">
              {chartReady ? (
                <div className="w-full h-full">
                  <Chart 
                    options={getChartOptions()} 
                    series={getChartSeries()} 
                    type="line" 
                    height="100%"
                    width="100%"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Preparing chart...</div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && !predictionData && selectedSymbol && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">No data available for the selected stock.</div>
          </div>
        )}

        {!loading && !error && !predictionData && !selectedSymbol && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">Please select a stock to view predictions.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NiftyPredictor;

