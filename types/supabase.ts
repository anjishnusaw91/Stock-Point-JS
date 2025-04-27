/**
 * Supabase Database Type Definitions
 * 
 * This file contains TypeScript interfaces that match our Supabase database schema.
 * These types should be used when interacting with the database to ensure type safety.
 */

/**
 * User Profile in Supabase database
 */
export interface Profile {
  id: string;
  full_name: string | null;
  email?: string;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  investment_style?: string | null;
  risk_tolerance?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  [key: string]: any; // Allow for any other properties
}

/**
 * Portfolio in Supabase database
 */
export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

/**
 * Watchlist in Supabase database
 */
export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
}

/**
 * Stock Item in a Watchlist
 */
export interface WatchlistStock {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_at?: string;
  target_price?: number | null;
  notes?: string | null;
}

/**
 * Stock Item in a Portfolio
 */
export interface PortfolioStock {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string | null;
} 