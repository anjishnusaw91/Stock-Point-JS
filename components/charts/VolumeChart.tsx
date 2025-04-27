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

interface VolumeChartProps {
  data: TechnicalData;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  // Add state to track chart rendering safety
  const [chartReady, setChartReady] = useState(false);
  
  // Validate data and ensure all required fields exist
  const validData = React.useMemo(() => {
    if (!data?.prices?.length) {
      return null;
    }

    // Ensure dates and volume values are properly formatted
    const validPoints = data.prices
      .filter(price => price && price.date && price.volume !== undefined && price.volume !== null)
      .map(price => {
        const volume = Number(price.volume);
        if (isNaN(volume)) {
          return null;
        }
        try {
          const timestamp = new Date(price.date).getTime();
          if (isNaN(timestamp)) {
            return null;
          }
          return {
            x: timestamp,
            y: volume
          };
        } catch (e) {
          return null;
        }
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);

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
      <ChartContainer title="Volume">
        <div className="flex items-center justify-center h-[250px] text-gray-500">
          No volume data available
        </div>
      </ChartContainer>
    );
  }

  const getChartOptions = (): ApexOptions => ({
    chart: {
      type: 'bar',
      height: 250,
      toolbar: { show: false },
      animations: { enabled: false },
      zoom: {
        enabled: false
      },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        columnWidth: '80%',
        distributed: false,
        dataLabels: {
          position: 'top',
        },
      }
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
        formatter: (value) => {
          const num = Number(value);
          if (isNaN(num)) return 'N/A';
          return num >= 1000000
            ? `${(num / 1000000).toFixed(1)}M`
            : num >= 1000
            ? `${(num / 1000).toFixed(1)}K`
            : num.toLocaleString();
        },
        style: {
          fontSize: '10px',
        }
      }
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
          if (isNaN(num)) return 'N/A';
          return num.toLocaleString();
        }
      }
    },
    colors: ['#26A69A'],
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 250
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
        name: 'Volume',
        data: validData,
      },
    ];
  };

  return (
    <ChartContainer title="Volume">
      {chartReady ? (
        <div className="w-full h-full">
          <Chart 
            options={getChartOptions()} 
            series={getSeries()} 
            type="bar" 
            height="100%"
            width="100%"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-gray-500">
          Preparing volume chart...
        </div>
      )}
    </ChartContainer>
  );
}; 