'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface StockSymbol {
  symbol: string;
  name: string;
}

const STOCK_SYMBOLS: StockSymbol[] = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
];

const LiveCharts: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Live Market Data</h1>
            <p className="text-sm text-gray-500">Feature coming soon...</p>
          </div>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
            className="rounded-md border border-gray-300 p-2"
            >
              <option value="">Select a stock</option>
            {STOCK_SYMBOLS.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                {stock.name} ({stock.symbol})
                </option>
              ))}
            </select>
          </div>
          
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-center items-center h-96">
            <p className="text-gray-500">
              Live chart functionality is under development. Please check back later.
            </p>
            </div>
          </div>
      </div>
    </div>
  );
};

export default LiveCharts; 