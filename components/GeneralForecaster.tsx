import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div>Loading Chart...</div>
}) as React.ComponentType<any>;

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
    predictions?: (number | null)[];
  };
  metrics: {
    accuracy: number;
    confidence: number;
    rmse?: number;
    predictionDays?: number;
  };
}

const GeneralForecaster: React.FC = () => {
  const [symbols, setSymbols] = useState<StockSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [predictionDays, setPredictionDays] = useState<number>(4);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState('');
  const [polling, setPolling] = useState(false);

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

  // Polling function for training
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (training && selectedSymbol && !polling) {
      setPolling(true);
      pollInterval = setInterval(async () => {
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
          const data = await response.json();
          if (data.success) {
            setForecastData(data);
            setTraining(false);
            setTrainingMessage('');
            setPolling(false);
            setLoading(false);
            clearInterval(pollInterval);
          } else if (data.training) {
            setTraining(true);
            setTrainingMessage(data.message || 'We are cooking the forecast for you, please be patient.');
          } else if (data.error) {
            setError(data.error);
            setTraining(false);
            setTrainingMessage('');
            setPolling(false);
            setLoading(false);
            clearInterval(pollInterval);
          }
        } catch (err) {
          setError('Polling error.');
          setTraining(false);
          setTrainingMessage('');
          setPolling(false);
          setLoading(false);
          clearInterval(pollInterval);
        }
      }, 5000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [training, selectedSymbol, predictionDays, polling]);

  useEffect(() => {
    const fetchForecast = async () => {
      if (!selectedSymbol) return;

      setLoading(true);
      setError(null);
      setChartReady(false);
      setForecastData(null);
      setTraining(false);
      setTrainingMessage('');
      setPolling(false);

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
        if (data.training) {
          setTraining(true);
          setTrainingMessage(data.message || 'We are cooking the forecast for you, please be patient.');
          setLoading(false);
          setForecastData(null);
          return;
        }
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch forecast');
        }

        setForecastData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setForecastData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [selectedSymbol, predictionDays]);

  // Set chart ready after data is loaded
  useEffect(() => {
    if (forecastData && forecastData.historical?.dates?.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setChartReady(true);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setChartReady(false);
    }
  }, [forecastData]);

  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: 'line',
      height: 500,
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: true,
      },
      fontFamily: 'inherit',
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
  });

  const getChartSeries = () => {
    if (!forecastData) return [];

    try {
      // Process and validate historical data points
      const historicalPoints = forecastData.historical.dates
        .map((date, index) => {
          if (!date) return null;
          
          try {
            const timestamp = new Date(date).getTime();
            if (isNaN(timestamp)) return null;
            
            const price = Number(forecastData.historical.prices[index]);
            if (isNaN(price)) return null;
            
            return {
              x: timestamp,
              y: Number(price.toFixed(2)),
            };
          } catch (e) {
            return null;
          }
        })
        .filter((point): point is NonNullable<typeof point> => point !== null);

      // Process and validate prediction data points in historical period
      const trainingPoints = forecastData.historical.predictions 
        ? forecastData.historical.dates
          .map((date, index) => {
            if (!date || !forecastData.historical.predictions?.[index]) return null;
            
            try {
              const timestamp = new Date(date).getTime();
              if (isNaN(timestamp)) return null;
              
              const prediction = Number(forecastData.historical.predictions[index]);
              if (isNaN(prediction)) return null;
              
              return {
                x: timestamp,
                y: Number(prediction.toFixed(2)),
              };
            } catch (e) {
              return null;
            }
          })
          .filter((point): point is NonNullable<typeof point> => point !== null)
        : [];

      // Process and validate forecast data points
      const forecastPoints = forecastData.forecast.dates
        .map((date, index) => {
          if (!date) return null;
          
          try {
            const timestamp = new Date(date).getTime();
            if (isNaN(timestamp)) return null;
            
            const price = Number(forecastData.forecast.prices[index]);
            if (isNaN(price)) return null;
            
            return {
              x: timestamp,
              y: Number(price.toFixed(2)),
            };
          } catch (e) {
            return null;
          }
        })
        .filter((point): point is NonNullable<typeof point> => point !== null);

      return [
        {
          name: 'Actual Price',
          type: 'line',
          data: historicalPoints,
        },
        {
          name: 'Training Prediction',
          type: 'line',
          data: trainingPoints,
        },
        {
          name: 'Future Forecast',
          type: 'line',
          data: forecastPoints,
        },
      ];
    } catch (error) {
      console.error("Error generating chart series:", error);
      return [];
    }
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

        {training && (
          <div className="flex flex-col justify-center items-center h-96 w-full">
            <div className="w-full max-w-lg">
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-pulse h-4 w-full" style={{ animationDuration: '2s' }}></div>
              </div>
              <div className="text-xl text-blue-700 font-semibold text-center">
                {trainingMessage || 'We are cooking the forecast for you, please be patient.'}
              </div>
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
                  <p className="text-sm text-gray-500">Based on statistical analysis</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">RMSE</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-amber-600">
                    {forecastData.metrics.rmse?.toFixed(2) || 'N/A'}
                  </span>
                  <p className="text-sm text-gray-500">Root Mean Square Error</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow h-[500px]">
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
                  <div className="text-gray-500">Preparing forecast chart...</div>
                </div>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Forecast Insights</h3>
              <p className="text-gray-700">
                {selectedSymbol} is predicted to 
                {forecastData.forecast.prices[forecastData.forecast.prices.length - 1] > 
                 forecastData.historical.prices[forecastData.historical.prices.length - 1]
                  ? ' increase ' : ' decrease '}
                over the next {predictionDays} trading days with {forecastData.metrics.confidence.toFixed(2)}% confidence using Random Forest algorithm.
              </p>
              <p className="mt-2 text-sm text-purple-700 font-semibold">
                Prediction accuracy: {forecastData.metrics.accuracy.toFixed(2)}%
              </p>
              <p className="mt-2 text-gray-700">
                Last close: ₹{forecastData.historical.prices[forecastData.historical.prices.length - 1].toFixed(2)}
              </p>
              <p className="text-gray-700">
                Predicted {predictionDays} day{predictionDays > 1 ? 's' : ''} later: 
                ₹{forecastData.forecast.prices[forecastData.forecast.prices.length - 1].toFixed(2)}
                {' '}
                ({((forecastData.forecast.prices[forecastData.forecast.prices.length - 1] - 
                   forecastData.historical.prices[forecastData.historical.prices.length - 1]) / 
                   forecastData.historical.prices[forecastData.historical.prices.length - 1] * 100).toFixed(2)}%)
              </p>
            </div>
          </div>
        )}

        {!loading && !error && !forecastData && selectedSymbol && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">No forecast data available for the selected stock.</div>
          </div>
        )}

        {!loading && !error && !forecastData && !selectedSymbol && (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-gray-500">Please select a stock to view forecast predictions.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralForecaster;

