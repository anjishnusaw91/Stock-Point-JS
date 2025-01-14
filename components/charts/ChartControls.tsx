import React from 'react';
import { StockSymbol } from '@/types/technical';
import { TECHNICAL_INDICATORS } from '@/constants/indicators';

interface ChartControlsProps {
  symbols: StockSymbol[];
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedIndicators: string[];
  setSelectedIndicators: (indicators: string[]) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  symbols,
  selectedSymbol,
  setSelectedSymbol,
  selectedIndicators,
  setSelectedIndicators,
  dateRange,
  setDateRange,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Stock
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a stock</option>
            {symbols.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.name} ({stock.symbol})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Technical Indicators
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {TECHNICAL_INDICATORS.map((indicator) => (
            <button
              key={indicator.id}
              onClick={() => {
                if (!indicator.disabled) {
                  setSelectedIndicators(
                    selectedIndicators.includes(indicator.id)
                      ? selectedIndicators.filter((id) => id !== indicator.id)
                      : [...selectedIndicators, indicator.id]
                  );
                }
              }}
              className={`p-2 rounded-md text-sm transition-colors ${
                indicator.disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : selectedIndicators.includes(indicator.id)
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              } border`}
            >
              <div className="font-medium">{indicator.name}</div>
              <div className="text-xs text-gray-500">{indicator.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}; 