'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TECHNICAL_INDICATORS } from '../constants/indicators';
import { StockSymbol, TechnicalData } from '@/types/technical';
import { ChartControls } from './charts/ChartControls';
import { PriceChart } from './charts/PriceChart';
import { IndicatorChart } from './charts/IndicatorChart';
import { RSIChart } from './charts/RSIChart';
import { MACDChart } from './charts/MACDChart';
import { VolumeChart } from './charts/VolumeChart';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TechnicalAnalysis: React.FC = () => {
  const [symbols, setSymbols] = useState<StockSymbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['price']);
  const [technicalData, setTechnicalData] = useState<TechnicalData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSymbols();
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      fetchTechnicalData();
    }
  }, [selectedSymbol, selectedIndicators, dateRange]);

  const fetchSymbols = async () => {
    try {
      const response = await fetch('/api/nseStocks');
      const data = await response.json();
      if (data.success) {
        setSymbols(data.data);
      }
    } catch (error) {
      console.error('Error fetching symbols:', error);
    }
  };

  const fetchTechnicalData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/technicalAnalysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          indicators: selectedIndicators,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setTechnicalData(data.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen flex flex-col">
      <div className="max-w-full mx-auto space-y-4 flex-grow">
        <h1 className="text-2xl font-bold text-gray-900">Technical Analysis</h1>
        
        <ChartControls
          symbols={symbols}
          selectedSymbol={selectedSymbol}
          setSelectedSymbol={setSelectedSymbol}
          selectedIndicators={selectedIndicators}
          setSelectedIndicators={setSelectedIndicators}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-xl text-red-500">{error}</div>
          </div>
        ) : technicalData ? (
          <div className="space-y-4">
            <PriceChart
              data={technicalData}
              selectedIndicators={selectedIndicators}
            />

            {selectedIndicators.includes('rsi') && (
              <RSIChart data={technicalData} />
            )}

            {selectedIndicators.includes('macd') && (
              <MACDChart data={technicalData} />
            )}

            {selectedIndicators.includes('volume') && (
              <VolumeChart data={technicalData} />
            )}

            {selectedIndicators
              .filter(id => 
                TECHNICAL_INDICATORS.find(i => i.id === id)?.type === 'separate'
              )
              .map(id => (
                <IndicatorChart
                  key={id}
                  indicator={TECHNICAL_INDICATORS.find(i => i.id === id)!}
                  data={technicalData}
                />
              ))
            }
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TechnicalAnalysis;

