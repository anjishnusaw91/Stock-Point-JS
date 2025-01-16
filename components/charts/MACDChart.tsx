'use client';

import React from 'react';
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
  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: 'line',
      height: 250,
      toolbar: { show: false },
      animations: { enabled: false },
      zoom: {
        enabled: false
      }
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
          formatter: (value: number) => `MACD: ${value.toFixed(2)}`,
        },
        {
          formatter: (value: number) => `Signal: ${value.toFixed(2)}`,
        },
        {
          formatter: (value: number) => `Histogram: ${value.toFixed(2)}`,
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
    if (!data.indicators?.macd) return [];

    const dates = data.prices.map(price => new Date(price.date).getTime());
    const { line, signal, histogram } = data.indicators.macd;

    const validData = dates.map((date, index) => ({
      x: date,
      macd: line[index],
      signal: signal[index],
      histogram: histogram[index],
    })).filter(point => 
      point.macd !== null && 
      point.signal !== null && 
      point.histogram !== null
    );

    return [
      {
        name: 'MACD',
        type: 'line',
        data: validData.map(point => ({
          x: point.x,
          y: Number(point.macd!.toFixed(2)),
        })),
      },
      {
        name: 'Signal',
        type: 'line',
        data: validData.map(point => ({
          x: point.x,
          y: Number(point.signal!.toFixed(2)),
        })),
      },
      {
        name: 'Histogram',
        type: 'line',
        data: validData.map(point => ({
          x: point.x,
          y: Number(point.histogram!.toFixed(2)),
        })),
      },
    ];
  };

  return (
    <ChartContainer title="MACD (12-26-9)">
      <Chart 
        options={getChartOptions()} 
        series={getSeries()} 
        type="line" 
        height={250}
      />
    </ChartContainer>
  );
}; 