'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import apexcharts from 'apexcharts';
import useSWR from 'swr';
import stockSymbols, { StockSymbol } from '../lib/stockSymbols';

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false }) as React.ComponentType<any>;

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

const LiveCharts: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE.NS');
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 1 minute in milliseconds
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chartHeight, setChartHeight] = useState<number>(350);
  const [volumeHeight, setVolumeHeight] = useState<number>(160);

  // Fetch data using SWR for automatic revalidation
  const { data, error, isLoading, mutate } = useSWR(
    selectedSymbol ? `/api/stocks/live?symbol=${selectedSymbol}` : null,
    fetcher,
    {
      refreshInterval: isAutoRefresh ? refreshInterval : 0,
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if auto-refresh is enabled
    if (isAutoRefresh && selectedSymbol) {
      intervalRef.current = setInterval(() => {
        mutate(); // Force refresh
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedSymbol, refreshInterval, isAutoRefresh, mutate]);

  // Get safe data for charts
  const candlestickData = data?.data?.candlestickData || [];
  const volumeData = data?.data?.volumeData || [];

  // Prepare candlestick options
  const candlestickOptions = {
    chart: {
      type: 'candlestick',
      height: chartHeight,
      id: 'candles',
      toolbar: {
        autoSelected: 'zoom',
        show: true,
      },
      animations: {
        enabled: false,
      },
      background: '#fff',
    },
    title: {
      text: data?.data?.companyName || 'Stock Price',
      align: 'left' as 'left',
    },
    xaxis: {
      type: 'datetime' as 'datetime',
      labels: {
        datetimeUTC: false,
      },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
      labels: {
        formatter: (value: number) => {
          return value.toFixed(2);
        },
      },
    },
    tooltip: {
      enabled: true,
      theme: 'light' as 'light',
      x: {
        format: 'dd MMM HH:mm',
      },
    },
    grid: {
      borderColor: '#f1f1f1',
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#26A69A',
          downward: '#EF5350',
        },
        wick: {
          useFillColor: true,
        },
      },
    },
  };

  // Volume chart options
  const volumeOptions = {
    chart: {
      type: 'bar' as 'bar',
      height: volumeHeight,
      id: 'volume',
      brush: {
        enabled: true,
        target: 'candles',
      },
      selection: {
        enabled: true,
        xaxis: {
          min: candlestickData.length > 0 ? candlestickData[0]?.x : undefined,
          max: candlestickData.length > 0 ? candlestickData[candlestickData.length - 1]?.x : undefined,
        },
        fill: {
          color: '#ccc',
          opacity: 0.4,
        },
        stroke: {
          color: '#0D47A1',
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: 'datetime' as 'datetime',
      labels: {
        datetimeUTC: false,
        format: 'HH:mm',
      },
    },
    yaxis: {
      labels: {
        show: true,
        formatter: (value: number) => {
          // Format large volume numbers
          if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
          if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
          return value.toString();
        },
      },
    },
    colors: ['#008FFB'],
    grid: {
      borderColor: '#f1f1f1',
    },
  };

  // Format price change display
  const formatPriceChange = (change: number, changePercent: number) => {
    const isPositive = change >= 0;
    return (
      <div className={`text-lg font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}
        {change.toFixed(2)} ({isPositive ? '+' : ''}
        {changePercent.toFixed(2)}%)
      </div>
    );
  };

  // Check if we have valid data to render charts
  const hasValidChartData = data?.success && 
                            data.data?.candlestickData && 
                            Array.isArray(data.data.candlestickData) && 
                            data.data.candlestickData.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Live Market Data</h1>
            <p className="text-sm text-gray-500">
              Real-time stock data with 1-minute updates
            </p>
          </div>
          <div className="flex space-x-4 items-center">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={isAutoRefresh}
                onChange={() => setIsAutoRefresh(!isAutoRefresh)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                Auto-refresh
              </label>
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="rounded-md border border-gray-300 p-2 text-sm"
              disabled={!isAutoRefresh}
            >
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
            </select>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="rounded-md border border-gray-300 p-2"
            >
              <option value="">Select a stock</option>
              {stockSymbols.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.name} ({stock.symbol.replace('.NS', '')})
                </option>
              ))}
            </select>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
            Error loading data. Please try again.
          </div>
        )}

        {isLoading && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        )}

        {data && data.success && (
          <>
            {/* Stock summary */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{data.data.companyName}</h2>
                  <p className="text-gray-500">{data.data.symbol}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">₹{(data.data.currentPrice ?? 0).toFixed(2)}</div>
                  {formatPriceChange(data.data.change ?? 0, data.data.changePercent ?? 0)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Open</p>
                  <p className="font-medium">₹{(data.data.open ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Previous Close</p>
                  <p className="font-medium">₹{(data.data.previousClose ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Day High</p>
                  <p className="font-medium">₹{(data.data.high ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Day Low</p>
                  <p className="font-medium">₹{(data.data.low ?? 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-4">
                Last updated: {new Date(data.data.timestamp).toLocaleString()}
                {data.cached && ' (cached)'}
              </div>
            </div>

            {/* Candlestick Chart */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Price Chart</h3>
              </div>

              {hasValidChartData ? (
                <div>
                  {/* Main Candlestick Chart */}
                  <div style={{ height: `${chartHeight}px` }}>
                    <Chart
                      options={candlestickOptions}
                      series={[{ data: candlestickData }]}
                      type="candlestick"
                      height={chartHeight}
                      width="100%"
                    />
                  </div>
                  
                  {/* Volume Chart */}
                  {volumeData && volumeData.length > 0 && (
                    <div style={{ height: `${volumeHeight}px` }} className="mt-2">
                      <Chart
                        options={volumeOptions}
                        series={[{ name: 'Volume', data: volumeData }]}
                        type="bar"
                        height={volumeHeight}
                        width="100%"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center items-center h-96">
                  <p className="text-gray-500">No chart data available for this stock.</p>
                </div>
              )}
            </div>
          </>
        )}

        {!data && !isLoading && !error && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-center items-center h-96">
              <p className="text-gray-500">Select a stock to view live chart data.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveCharts; 