import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface StockSymbol {
  symbol: string;
  name: string;
}

interface ForecastData {
  forecast: {
    dates: string[];
    prices: number[];
  };
  historical: {
    dates: string[];
    prices: number[];
    predictions: (number | null)[];
  };
  metrics: {
    accuracy: number;
    confidence: number;
    rmse: number;
  };
}

const GeneralForecaster: React.FC = () => {
  const [symbols, setSymbols] = useState<StockSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [predictionDays, setPredictionDays] = useState<number>(4);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchForecast = async () => {
      if (!selectedSymbol) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/generalForecaster', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: selectedSymbol,
            days: predictionDays,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch forecast');
        }

        setForecastData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [selectedSymbol, predictionDays]);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 500,
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: true,
      },
    },
    stroke: {
      curve: 'smooth',
      width: [2, 2, 2],
      dashArray: [0, 0, 0],
    },
    colors: ['#2E93fA', '#66DA26', '#FF9800'],
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
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
    },
    legend: {
      position: 'top',
    },
    annotations: forecastData ? {
      xaxis: [{
        x: new Date(forecastData.historical.dates[forecastData.historical.dates.length - 1]).getTime(),
        borderColor: '#775DD0',
        label: {
          style: {
            color: '#fff',
            background: '#775DD0',
          },
          text: 'Forecast Start',
        },
      }],
    } : undefined,
  };

  const getChartSeries = () => {
    if (!forecastData) return [];

    return [
      {
        name: 'Actual Price',
        type: 'line',
        data: forecastData.historical.dates.map((date, index) => ({
          x: new Date(date).getTime(),
          y: Number(forecastData.historical.prices[index].toFixed(2)),
        })),
      },
      {
        name: 'Training Prediction',
        type: 'line',
        data: forecastData.historical.dates.map((date, index) => ({
          x: new Date(date).getTime(),
          y: forecastData.historical.predictions[index] 
            ? Number(forecastData.historical.predictions[index]?.toFixed(2))
            : null,
        })).filter(point => point.y !== null),
      },
      {
        name: 'Future Forecast',
        type: 'line',
        data: forecastData.forecast.dates.map((date, index) => ({
          x: new Date(date).getTime(),
          y: Number(forecastData.forecast.prices[index].toFixed(2)),
        })),
      },
    ];
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">General Stock Forecaster</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              Prediction Days (1-30)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={predictionDays}
              onChange={(e) => setPredictionDays(Math.min(Math.max(1, Number(e.target.value)), 30))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl">Generating forecast...</div>
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

        {!loading && !error && forecastData && (
          <div className="w-full">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Prediction Accuracy</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {forecastData.metrics.accuracy}%
                  </span>
                  <p className="text-sm text-gray-500">Based on historical predictions</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Confidence Level</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-green-600">
                    {forecastData.metrics.confidence}%
                  </span>
                  <p className="text-sm text-gray-500">For future predictions</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">RMSE</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-orange-600">
                    ₹{forecastData.metrics.rmse}
                  </span>
                  <p className="text-sm text-gray-500">Root Mean Square Error</p>
                </div>
              </div>
            </div>

            <div className="w-full h-[600px]">
              <Chart
                options={chartOptions}
                series={getChartSeries()}
                type="line"
                height={500}
              />
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-lg mb-2">4-Day Price Forecast</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {forecastData.forecast.dates.map((date, index) => (
                    <div key={date} className="p-3 bg-white rounded-lg shadow">
                      <div className="text-sm text-gray-600">{new Date(date).toLocaleDateString()}</div>
                      <div className="text-lg font-bold">₹{forecastData.forecast.prices[index].toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !selectedSymbol && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">
              Please select a stock to view price forecast
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

export default GeneralForecaster;

