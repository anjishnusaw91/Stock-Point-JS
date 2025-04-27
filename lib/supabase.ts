import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export type Portfolio = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type PortfolioStock = {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes: string | null;
};

export type Watchlist = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type WatchlistStock = {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_at: string;
  target_price: number | null;
  notes: string | null;
};

export type User = {
  id: string;
  email: string;
  full_name: string | null;
}; 