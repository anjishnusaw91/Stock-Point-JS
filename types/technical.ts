export interface StockSymbol {
  symbol: string;
  name: string;
}

export interface TechnicalData {
  prices: PriceData[];
  indicators: {
    rsi?: number[];
    macd?: {
      line: (number | null)[];
      signal: (number | null)[];
      histogram: (number | null)[];
    };
    bollinger?: {
      upper: number[];
      middle: number[];
      lower: number[];
    };
    ema?: {
      ema20: number[];
      ema50: number[];
      ema200: number[];
    };
    atr?: number[];
    volume?: number[];
  };
}

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicator {
  id: string;
  name: string;
  description: string;
  color: string;
  type: 'overlay' | 'separate';
  height?: number;
  disabled?: boolean;
} 