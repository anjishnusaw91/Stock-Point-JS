import React from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';
import { TechnicalData } from '@/types/technical';
import ChartContainer from './ChartContainer';

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
      zoom: {
        enabled: false
      }
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
      }
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
    markers: {
      size: 0,
      hover: {
        size: 3,
      }
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (value) => value.toFixed(2)
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
      data: data.indicators.rsi || [],
    },
  ];

  return (
    <ChartContainer title="RSI (14)">
      <Chart 
        options={getChartOptions()} 
        series={getSeries()} 
        type="line" 
        height={250}
      />
    </ChartContainer>
  );
}; 