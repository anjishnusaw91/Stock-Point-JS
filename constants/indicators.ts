import { Indicator } from '@/types/technical';

export const TECHNICAL_INDICATORS: Indicator[] = [
  {
    id: 'price',
    name: 'Price',
    description: 'Stock Price',
    color: '#2E93fA',
    type: 'overlay',
  },
  {
    id: 'bb',
    name: 'Bollinger Bands',
    description: '20-period, 2 standard deviations',
    color: '#546E7A',
    type: 'overlay',
  },
  {
    id: 'ema',
    name: 'EMA',
    description: '20, 50, 200-period EMAs',
    color: '#E91E63',
    type: 'overlay',
  },
  {
    id: 'rsi',
    name: 'RSI',
    description: '14-period RSI',
    color: '#FF9800',
    type: 'separate',
    height: 200,
    // disabled: true,
  },
  {
    id: 'macd',
    name: 'MACD',
    description: '12-26-9 MACD',
    color: '#26A69A',
    type: 'separate',
    height: 200,
  },
  {
    id: 'volume',
    name: 'Volume',
    description: 'Trading Volume',
    color: '#B388FF',
    type: 'separate',
    height: 150,
  },
]; 
