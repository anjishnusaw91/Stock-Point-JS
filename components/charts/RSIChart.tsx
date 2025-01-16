import React from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';
import { TechnicalData } from '@/types/technical';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false }) as React.ComponentType<any>;

interface RSIChartProps {
  data: TechnicalData;
}

export const RSIChart: React.FC<RSIChartProps> = ({ data }) => {
  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: 'line',
      height: 200,
      toolbar: { show: false },
      animations: { enabled: false },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    grid: {
      borderColor: '#f1f1f1',
      padding: { left: 10, right: 10 },
    },
    xaxis: {
      type: 'datetime',
      categories: data.prices.map(price => price.date),
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
    },
    markers: {
      size: 0,
    },
    colors: ['#FF9800'],
  });

  const getSeries = () => [
    {
      name: 'RSI',
      data: data.indicators.rsi || [],
    },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow w-full overflow-x-auto">
      <h3 className="text-lg font-semibold mb-2">RSI (14)</h3>
      <div className="min-w-[600px]">
        <Chart options={getChartOptions()} series={getSeries()} type="line" height={200} />
      </div>
    </div>
  );
}; 