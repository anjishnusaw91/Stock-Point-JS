'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ApexCharts from 'apexcharts';
import { TechnicalData } from '@/types/technical';
import { TECHNICAL_INDICATORS } from '@/constants/indicators';
import { ChartContainer } from './ChartContainer';

type ApexOptions = ApexCharts.ApexOptions;
const Chart = dynamic(() => import('react-apexcharts'), { 
  ssr: false,
  loading: () => <div>Loading Chart...</div>
}) as React.ComponentType<any>;

interface PriceChartProps {
  data: TechnicalData;
  selectedIndicators: string[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ data, selectedIndicators }) => {
  // Add state to track chart rendering safety
  const [chartReady, setChartReady] = useState(false);
  
  // Validate data and ensure all required fields exist
  const validData = React.useMemo(() => {
    if (!data?.prices?.length) {
      return null;
    }

    // Ensure dates and price values are properly formatted
    try {
      const validPoints = data.prices
        .filter(price => price && price.date && price.close !== undefined && price.close !== null)
        .map(price => {
          const close = Number(price.close);
          if (isNaN(close)) {
            return null;
          }
          try {
            const timestamp = new Date(price.date).getTime();
            if (isNaN(timestamp)) {
              return null;
            }
            return {
              x: timestamp,
              y: close
            };
          } catch (e) {
            return null;
          }
        })
        .filter((point): point is NonNullable<typeof point> => point !== null);

      if (!validPoints.length) {
        return null;
      }

      return {
        priceData: validPoints,
        indicators: data.indicators || {}
      };
    } catch (error) {
      console.error("Error processing chart data:", error);
      return null;
    }
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
      <ChartContainer title="Price">
        <div className="flex items-center justify-center h-[250px] text-gray-500">
          No price data available
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
      width: [2, 1, 1, 1, 2, 2],
      dashArray: [0, 0, 0, 0, 0, 0],
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
          return `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },
        style: {
          fontSize: '10px',
        }
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: 'dd MMM yyyy'
      },
      y: {
        formatter: (value) => {
          const num = Number(value);
          if (isNaN(num)) return 'N/A';
          return `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    colors: ['#2E93fA', '#546E7A', '#E91E63', '#FF9800', '#775DD0', '#00E396'],
  });

  const getSeries = () => {
    try {
      if (!validData?.priceData?.length) {
        return [];
      }
      
      const series = [
        {
          name: 'Price',
          type: 'line',
          data: validData.priceData,
        },
      ];

      // Safely add Bollinger Bands
      if (selectedIndicators.includes('bb') && validData.indicators.bollinger) {
        const { upper, middle, lower } = validData.indicators.bollinger;
        if (upper && upper.length && middle && middle.length && lower && lower.length) {
          // Ensure arrays are not empty
          const minLength = Math.min(
            validData.priceData.length,
            upper.length,
            middle.length,
            lower.length
          );
          
          if (minLength > 0) {
            const validPoints = [];
            
            for (let i = 0; i < minLength; i++) {
              const point = validData.priceData[i];
              const upperVal = Number(upper[i]);
              const middleVal = Number(middle[i]);
              const lowerVal = Number(lower[i]);
              
              if (isNaN(upperVal) || isNaN(middleVal) || isNaN(lowerVal)) {
                continue;
              }
              
              validPoints.push({
                x: point.x,
                upper: upperVal,
                middle: middleVal,
                lower: lowerVal
              });
            }

            if (validPoints.length > 0) {
              series.push(
                {
                  name: 'BB Upper',
                  type: 'line',
                  data: validPoints.map(point => ({ x: point.x, y: point.upper })),
                },
                {
                  name: 'BB Middle',
                  type: 'line',
                  data: validPoints.map(point => ({ x: point.x, y: point.middle })),
                },
                {
                  name: 'BB Lower',
                  type: 'line',
                  data: validPoints.map(point => ({ x: point.x, y: point.lower })),
                }
              );
            }
          }
        }
      }

      // Add EMAs if selected and available
      if (selectedIndicators.includes('ema') && validData.indicators.ema) {
        const { ema20, ema50, ema200 } = validData.indicators.ema;
        
        const addEMA = (data: (number | null)[], name: string) => {
          if (!data || !data.length) return;
          
          const validPoints = [];
          const minLength = Math.min(validData.priceData.length, data.length);
          
          for (let i = 0; i < minLength; i++) {
            const point = validData.priceData[i];
            const value = Number(data[i]);
            if (isNaN(value)) continue;
            
            validPoints.push({ 
              x: point.x, 
              y: value 
            });
          }

          if (validPoints.length > 0) {
            series.push({
              name,
              type: 'line',
              data: validPoints,
            });
          }
        };

        if (ema20) addEMA(ema20, 'EMA 20');
        if (ema50) addEMA(ema50, 'EMA 50');
        if (ema200) addEMA(ema200, 'EMA 200');
      }

      return series;
    } catch (error) {
      console.error("Error generating chart series:", error);
      return [{
        name: 'Price',
        type: 'line',
        data: [],
      }];
    }
  };

  return (
    <ChartContainer title="Price">
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
          Preparing price chart...
        </div>
      )}
    </ChartContainer>
  );
}; 