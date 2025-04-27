import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yahooFinance from 'yahoo-finance2';

// Cache the stock symbols to avoid repeated API calls
let cachedSymbols: any[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Add export config to mark as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (cachedSymbols && now - lastCacheTime < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedSymbols
      });
    }

    // Path to the local JSON file
    const filePath = path.join(process.cwd(), 'data', 'nse_symbols.json');
    
    // Try to load from file first
    try {
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const symbols = JSON.parse(fileData);
        
        // Update cache
        cachedSymbols = symbols;
        lastCacheTime = now;
        
        return NextResponse.json({
          success: true,
          data: symbols
        });
      }
    } catch (fileError) {
      console.error('Error reading from local file:', fileError);
      // Continue to Yahoo Finance API if file read fails
    }

    // If no file exists, fetch from Yahoo Finance API
    // These are the top 100 NSE stocks by market cap
    const symbols = [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd' },
      { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
      { symbol: 'INFY.NS', name: 'Infosys Ltd' },
      { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd' },
      { symbol: 'HDFC.NS', name: 'Housing Development Finance Corporation Ltd' },
      { symbol: 'SBIN.NS', name: 'State Bank of India' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd' },
      { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd' },
      { symbol: 'ITC.NS', name: 'ITC Ltd' },
      { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd' },
      { symbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd' },
      { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd' },
      { symbol: 'AXISBANK.NS', name: 'Axis Bank Ltd' },
      { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd' },
      { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd' },
      { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd' },
      { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd' },
      { symbol: 'TITAN.NS', name: 'Titan Company Ltd' },
      { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd' },
      { symbol: 'WIPRO.NS', name: 'Wipro Ltd' },
      { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd' },
      { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd' },
      { symbol: 'TECHM.NS', name: 'Tech Mahindra Ltd' },
      { symbol: 'NTPC.NS', name: 'NTPC Ltd' },
      { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India Ltd' },
      { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corporation Ltd' },
      { symbol: 'GRASIM.NS', name: 'Grasim Industries Ltd' },
      { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance Company Ltd' },
      { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd' },
      { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Ltd' },
      { symbol: 'HINDALCO.NS', name: 'Hindalco Industries Ltd' },
      { symbol: 'DIVISLAB.NS', name: 'Divi\'s Laboratories Ltd' },
      { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance Company Ltd' },
      { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories Ltd' },
      { symbol: 'CIPLA.NS', name: 'Cipla Ltd' },
      { symbol: 'EICHERMOT.NS', name: 'Eicher Motors Ltd' },
      { symbol: 'IOC.NS', name: 'Indian Oil Corporation Ltd' },
      { symbol: 'ADANIPORTS.NS', name: 'Adani Ports and Special Economic Zone Ltd' },
      { symbol: 'M&M.NS', name: 'Mahindra & Mahindra Ltd' },
      { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Ltd' },
      { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank Ltd' },
      { symbol: 'NESTLEIND.NS', name: 'Nestle India Ltd' },
      { symbol: 'COALINDIA.NS', name: 'Coal India Ltd' },
      { symbol: 'BPCL.NS', name: 'Bharat Petroleum Corporation Ltd' },
      { symbol: 'BRITANNIA.NS', name: 'Britannia Industries Ltd' },
      { symbol: 'TATACONSUM.NS', name: 'Tata Consumer Products Ltd' },
      { symbol: 'SHREECEM.NS', name: 'Shree Cement Ltd' },
      { symbol: 'UPL.NS', name: 'UPL Ltd' }
    ];
    
    // Populate with additional symbols from Nifty 500 or other indices as needed
    
    // Update cache
    cachedSymbols = symbols;
    lastCacheTime = now;
    
    // Try to save to file for future use
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(symbols, null, 2), 'utf-8');
    } catch (saveError) {
      console.error('Error saving symbols to file:', saveError);
    }
    
    return NextResponse.json({
      success: true,
      data: symbols
    });
  } catch (err) {
    console.error('Error fetching NSE stocks:', err);
    return NextResponse.json(
      { 
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch NSE stocks'
      },
      { status: 500 }
    );
  }
} 