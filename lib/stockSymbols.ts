import stockSymbolsData from '../data/nse_symbols.json';

export interface StockSymbol {
  symbol: string;
  name: string;
}

// Type assertion for imported JSON
export const stockSymbols: StockSymbol[] = stockSymbolsData as StockSymbol[];

// Get a stock by its symbol
export const getStockBySymbol = (symbol: string): StockSymbol | undefined => {
  // Strip the .NS suffix if comparing with symbols that don't have it
  const normalizedSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
  return stockSymbols.find(
    (stock) => stock.symbol === symbol || stock.symbol === normalizedSymbol
  );
};

// Get a stock's name by its symbol
export const getStockName = (symbol: string): string => {
  const stock = getStockBySymbol(symbol);
  return stock ? stock.name : symbol;
};

// Get top N stocks (useful for demo data)
export const getTopStocks = (count: number = 5): StockSymbol[] => {
  return stockSymbols.slice(0, count);
};

// Get random stocks from the list
export const getRandomStocks = (count: number = 5): StockSymbol[] => {
  const shuffled = [...stockSymbols].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Default export for convenience
export default stockSymbols; 