import React from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { TechnicalData } from '@/types/technical';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface MACDChartProps {
  data: TechnicalData;
}

export const MACDChart: React.FC<MACDChartProps> = ({ data }) => {
  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: 'bar',
      height: 200,
      toolbar: { show: false },
      animations: { enabled: false },
      background: 'transparent',
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
        datetimeUTC: false,
        format: 'dd MMM',
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
        formatter: (value) => value.toFixed(2),
      },
      tickAmount: 5,
      forceNiceScale: true,
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
          y: Number(point.macd.toFixed(2)),
        })),
      },
      {
        name: 'Signal',
        type: 'line',
        data: validData.map(point => ({
          x: point.x,
          y: Number(point.signal.toFixed(2)),
        })),
      },
      {
        name: 'Histogram',
        type: 'bar',
        data: validData.map(point => ({
          x: point.x,
          y: Number(point.histogram.toFixed(2)),
        })),
      },
    ];
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">MACD (12-26-9)</h3>
      <Chart
        options={getChartOptions()}
        series={getSeries()}
        type="bar"
        height={200}
      />
    </div>
  );
}; 