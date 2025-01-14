import React from 'react';
import { TechnicalData } from '@/types/technical';

interface RSIChartProps {
  data: TechnicalData;
}

export const RSIChart: React.FC<RSIChartProps> = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Relative Strength Index (RSI-14)</h3>
      <div className="h-[200px] flex items-center justify-center text-gray-500">
        <p>RSI indicator coming soon...</p>
      </div>
    </div>
  );
}; 