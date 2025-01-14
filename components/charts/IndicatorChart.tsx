import React from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';
import { Indicator, TechnicalData } from '@/types/technical';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false 
}) as React.ComponentType<any>;

interface IndicatorChartProps {
  indicator: Indicator;
  data: TechnicalData;
}

export const IndicatorChart: React.FC<IndicatorChartProps> = ({ indicator, data }) => {
  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: indicator.id === 'volume' ? 'bar' : 'line',
      height: indicator.height || 200,
      toolbar: { show: false },
      animations: { enabled: false },
    },
    stroke: {
      curve: 'smooth',
      width: indicator.id === 'macd' ? [2, 2, 0] : 2,
    },
    grid: {
      borderColor: '#f1f1f1',
      padding: { left: 10, right: 10 },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format: 'dd MMM',
      },
    },
    yaxis: {
      labels: {
        formatter: (value) => {
          if (indicator.id === 'volume') {
            return value >= 1000000
              ? `${(value / 1000000).toFixed(1)}M`
              : value >= 1000
              ? `${(value / 1000).toFixed(1)}K`
              : value.toString();
          }
          return value.toFixed(2);
        },
      },
      tickAmount: 5,
    },
    tooltip: {
      shared: true,
      x: {
        format: 'dd MMM yyyy',
      },
      y: {
        formatter: (value) => {
          if (indicator.id === 'volume') {
            return value >= 1000000
              ? `${(value / 1000000).toFixed(1)}M`
              : value >= 1000
              ? `${(value / 1000).toFixed(1)}K`
              : value.toString();
          }
          return value.toFixed(2);
        },
      },
    },
    colors: [indicator.color],
  });

  const getMACDSeries = () => {
    if (!data.indicators?.macd) return [];

    const dates = data.prices.map(price => new Date(price.date).getTime());
    const { line, signal, histogram } = data.indicators.macd;

    const validData = dates.map((date, index) => ({
      x: date,
      macd: line[index],
      signal: signal[index],
      histogram: histogram[index],
    })).filter(point => point.macd !== null && point.signal !== null);

    return [
      {
        name: 'MACD',
        type: 'line',
        data: validData.map(point => ({
          x: point.x,
          y: point.macd,
        })),
      },
      {
        name: 'Signal',
        type: 'line',
        data: validData.map(point => ({
          x: point.x,
          y: point.signal,
        })),
      },
      {
        name: 'Histogram',
        type: 'bar',
        data: validData.map(point => ({
          x: point.x,
          y: point.histogram,
        })),
      },
    ];
  };

  const getVolumeSeries = () => {
    if (!data.prices) return [];

    return [{
      name: 'Volume',
      data: data.prices.map(price => ({
        x: new Date(price.date).getTime(),
        y: price.volume,
      })),
    }];
  };

  const getSeries = () => {
    switch (indicator.id) {
      case 'macd':
        return getMACDSeries();
      case 'volume':
        return getVolumeSeries();
      default:
        return [];
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">{indicator.name}</h3>
      <Chart
        options={getChartOptions()}
        series={getSeries()}
        type={indicator.id === 'volume' ? 'bar' : 'line'}
        height={indicator.height || 200}
      />
    </div>
  );
}; 