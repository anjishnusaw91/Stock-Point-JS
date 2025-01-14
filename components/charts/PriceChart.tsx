import React from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';
import { TechnicalData } from '@/types/technical';
import { TECHNICAL_INDICATORS } from '@/constants/indicators';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false 
}) as React.ComponentType<any>;

interface PriceChartProps {
  data: TechnicalData;
  selectedIndicators: string[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ data, selectedIndicators }) => {
  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: 'line',
      height: 500,
      animations: { enabled: false },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
    },
    stroke: {
      curve: 'smooth',
      width: [2, 1, 1, 1, 2, 2],
      dashArray: [0, 0, 0, 0, 0, 0],
    },
    grid: {
      borderColor: '#f1f1f1',
      row: {
        colors: ['transparent', 'transparent'],
        opacity: 0.5,
      },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format: 'dd MMM yyyy',
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => `₹${value.toFixed(2)}`,
      },
      tickAmount: 8,
      forceNiceScale: true,
    },
    tooltip: {
      shared: true,
      x: {
        format: 'dd MMM yyyy',
      },
      y: {
        formatter: (value) => `₹${value.toFixed(2)}`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    colors: ['#2E93fA', '#546E7A', '#E91E63', '#FF9800', '#775DD0', '#00E396'],
  });

  const getSeries = () => {
    const series = [
      {
        name: 'Price',
        type: 'line',
        data: data.prices.map((price) => ({
          x: new Date(price.date).getTime(),
          y: price.close,
        })),
      },
    ];

    // Safely add Bollinger Bands
    if (selectedIndicators.includes('bb') && data.indicators?.bollinger) {
      const { upper, middle, lower } = data.indicators.bollinger;
      if (upper && middle && lower) {
        series.push(
          {
            name: 'BB Upper',
            type: 'line',
            data: upper.map((value, index) => ({
              x: new Date(data.prices[index].date).getTime(),
              y: value,
            })),
          },
          {
            name: 'BB Middle',
            type: 'line',
            data: middle.map((value, index) => ({
              x: new Date(data.prices[index].date).getTime(),
              y: value,
            })),
          },
          {
            name: 'BB Lower',
            type: 'line',
            data: lower.map((value, index) => ({
              x: new Date(data.prices[index].date).getTime(),
              y: value,
            })),
          }
        );
      }
    }

    // Add EMAs if selected and available
    if (selectedIndicators.includes('ema') && data.indicators?.ema) {
      const { ema20, ema50, ema200 } = data.indicators.ema;
      const dates = data.prices.map(price => new Date(price.date).getTime());

      if (ema20?.length === data.prices.length) {
        series.push({
          name: 'EMA 20',
          type: 'line',
          data: ema20.map((value, index) => 
            value === null ? null : {
              x: dates[index],
              y: value
            }
          ).filter((point): point is { x: number; y: number } => point !== null),
        });
      }

      if (ema50?.length === data.prices.length) {
        series.push({
          name: 'EMA 50',
          type: 'line',
          data: ema50.map((value, index) => 
            value === null ? null : {
              x: dates[index],
              y: value
            }
          ).filter((point): point is { x: number; y: number } => point !== null),
        });
      }

      if (ema200?.length === data.prices.length) {
        series.push({
          name: 'EMA 200',
          type: 'line',
          data: ema200.map((value, index) => 
            value === null ? null : {
              x: dates[index],
              y: value
            }
          ).filter((point): point is { x: number; y: number } => point !== null),
        });
      }
    }

    return series;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <Chart
        options={getChartOptions()}
        series={getSeries()}
        type="line"
        height={500}
      />
    </div>
  );
}; 