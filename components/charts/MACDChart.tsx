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

interface MACDChartProps {
  data: TechnicalData;
}

export const MACDChart: React.FC<MACDChartProps> = ({ data }) => {
  // Add state to track chart rendering safety
  const [chartReady, setChartReady] = useState(false);
  
  // Validate data and ensure all required fields exist
  const validData = React.useMemo(() => {
    if (!data?.prices?.length || !data?.indicators?.macd) {
      return null;
    }

    // Ensure dates and MACD values are properly formatted
    const dates = data.prices.map(price => price.date).filter(Boolean);
    const { line, signal, histogram } = data.indicators.macd;

    if (!dates.length || !line?.length || !signal?.length || !histogram?.length) {
      return null;
    }

    // Ensure all arrays have the same length
    const minLength = Math.min(dates.length, line.length, signal.length, histogram.length);
    if (minLength === 0) {
      return null;
    }

    const validPoints = [];
    for (let i = 0; i < minLength; i++) {
      const date = dates[i];
      const macd = Number(line[i]);
      const sig = Number(signal[i]);
      const hist = Number(histogram[i]);

      if (!date || isNaN(macd) || isNaN(sig) || isNaN(hist)) {
        continue;
      }

      validPoints.push({
        x: new Date(date).getTime(),
        macd,
        signal: sig,
        histogram: hist
      });
    }

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
      <ChartContainer title="MACD (12-26-9)">
        <div className="flex items-center justify-center h-[250px] text-gray-500">
          No MACD data available
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
      width: [2, 2, 0],
      curve: 'straight',
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
      labels: {
        style: {
          fontSize: '10px',
        }
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: 'dd MMM yyyy',
      },
      y: [
        {
          formatter: (value) => {
            const num = Number(value);
            return isNaN(num) ? 'N/A' : `MACD: ${num.toFixed(2)}`;
          },
        },
        {
          formatter: (value) => {
            const num = Number(value);
            return isNaN(num) ? 'N/A' : `Signal: ${num.toFixed(2)}`;
          },
        },
        {
          formatter: (value) => {
            const num = Number(value);
            return isNaN(num) ? 'N/A' : `Histogram: ${num.toFixed(2)}`;
          },
        },
      ],
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    plotOptions: {
      bar: {
        columnWidth: '60%',
      },
    },
    colors: ['#2E93fA', '#FF9800', '#26A69A'],
    fill: {
      opacity: 1,
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 0,
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 250
        },
        legend: {
          position: 'bottom',
          offsetY: 7
        }
      }
    }]
  });

  const getSeries = () => {
    if (!validData || validData.length === 0) {
      return [];
    }
    
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

  return (
    <ChartContainer title="MACD (12-26-9)">
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
          Preparing MACD chart...
        </div>
      )}
    </ChartContainer>
  );
}; 