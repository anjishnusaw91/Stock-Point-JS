'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';
import { TechnicalData } from '@/types/technical';
import { ChartContainer } from './ChartContainer';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div>Loading Chart...</div>
}) as React.ComponentType<any>;

interface RSIChartProps {
  data: TechnicalData;
}

export const RSIChart: React.FC<RSIChartProps> = ({ data }) => {
  // Add state to track chart rendering safety
  const [chartReady, setChartReady] = useState(false);
  
  // Validate data and ensure all required fields exist
  const validData = React.useMemo(() => {
    if (!data?.prices?.length || !data?.indicators?.rsi?.length) {
      return null;
    }

    // Ensure dates and RSI values are properly formatted
    const dates = data.prices.map(price => price.date).filter(Boolean);
    const rsiValues = data.indicators.rsi.map(value => {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }).filter((value): value is number => value !== null);

    if (!dates.length || !rsiValues.length || dates.length !== rsiValues.length) {
      return null;
    }

    // Ensure dates and RSI values are aligned
    const validPoints = dates.map((date, index) => {
      if (index >= rsiValues.length) return null;
      const rsi = rsiValues[index];
      if (!date || rsi === undefined || rsi === null) {
        return null;
      }
      return {
        x: new Date(date).getTime(),
        y: rsi
      };
    }).filter((point): point is NonNullable<typeof point> => point !== null);

    if (!validPoints.length) {
      return null;
    }

    return validPoints;
  }, [data]);

  // Use effect to safely set chart ready state
  useEffect(() => {
    if (validData) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setChartReady(true);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setChartReady(false);
    }
  }, [validData]);

  if (!validData) {
    return (
      <ChartContainer title="RSI (14)">
        <div className="flex items-center justify-center h-[250px] text-gray-500">
          No RSI data available
        </div>
      </ChartContainer>
    );
  }

  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: 'line',
      height: 250,
      toolbar: { show: false },
      animations: { enabled: false },
      zoom: {
        enabled: false
      },
      fontFamily: 'inherit',
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
      labels: {
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        datetimeUTC: false,
        format: 'dd MMM',
        style: {
          fontSize: '10px',
        }
      },
      axisBorder: {
        show: true,
      },
      axisTicks: {
        show: true,
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        style: {
          fontSize: '10px',
        }
      }
    },
    annotations: {
      yaxis: [
        {
          y: 70,
          borderColor: '#FF5252',
          label: {
            borderColor: '#FF5252',
            style: {
              color: '#fff',
              background: '#FF5252',
            },
            text: 'Overbought',
          }
        },
        {
          y: 30,
          borderColor: '#4CAF50',
          label: {
            borderColor: '#4CAF50',
            style: {
              color: '#fff',
              background: '#4CAF50',
            },
            text: 'Oversold',
          }
        }
      ]
    },
    tooltip: {
      shared: false,
      intersect: true,
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (value) => {
          const num = Number(value);
          return isNaN(num) ? 'N/A' : num.toFixed(2);
        }
      }
    },
    colors: ['#FF9800'],
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 250
        }
      }
    }]
  });

  const getSeries = () => [
    {
      name: 'RSI',
      data: validData,
    },
  ];

  return (
    <ChartContainer title="RSI (14)">
      {chartReady ? (
        <div className="w-full h-full">
          <Chart 
            options={getChartOptions()} 
            series={getSeries()} 
            type="line" 
            height="100%"
            width="100%"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-gray-500">
          Preparing RSI chart...
        </div>
      )}
    </ChartContainer>
  );
}; 