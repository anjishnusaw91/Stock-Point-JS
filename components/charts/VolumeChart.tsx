import React from 'react';
import { TechnicalData } from '@/types/technical';

interface VolumeChartProps {
  data: TechnicalData;
}

export const VolumeChart: React.FC<VolumeChartProps> = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Volume</h3>
      <div className="h-[150px] flex items-center justify-center text-gray-500">
        <p>Volume indicator coming soon...</p>
      </div>
    </div>
  );
}; 