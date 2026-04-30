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
  category?: string;
  title: string;
  description?: string;
  content?: string;
  summary?: string;
  neutral_headline?: string;
  original_title?: string;
  author?: string;
  source_url?: string;
  image_url?: string;
  published_at?: string;
  cluster_id?: string;
  story_id?: string;
  cluster_type?: string;
  cluster_size?: number;
  source_count?: number;
  sources?: Array<{
    source?: string;
    title?: string | null;
    url?: string | null;
    published_at?: string | null;
    category?: string | null;
  }>;
  meta_story?: Record<string, unknown>;
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
