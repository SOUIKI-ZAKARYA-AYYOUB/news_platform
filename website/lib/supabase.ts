import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackSupabaseUrl = 'https://example.supabase.co';
const fallbackSupabaseAnonKey = 'public-anon-key';

export const supabase = createClient(
  supabaseUrl || fallbackSupabaseUrl,
  supabaseAnonKey || fallbackSupabaseAnonKey
);

// Types for database
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface UserPreference {
  id: number;
  user_id: string;
  category_id: number;
  created_at: string;
}

export interface Article {
  id: number;
  category_id: number;
  title: string;
  description?: string;
  content?: string;
  author?: string;
  source_url?: string;
  image_url?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScrapeLog {
  id: number;
  category_id?: number;
  status: string;
  articles_count: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}
