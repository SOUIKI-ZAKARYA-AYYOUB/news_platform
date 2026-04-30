-- Newsly Database Schema
-- Run this script in Supabase SQL Editor

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_preferences table (junction table for user-category relationships)
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_id)
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content TEXT,
  summary TEXT,
  neutral_headline VARCHAR(500),
  original_title VARCHAR(500),
  author VARCHAR(255),
  source_url VARCHAR(500),
  image_url VARCHAR(500),
  cluster_id VARCHAR(255),
  story_id VARCHAR(255),
  cluster_type VARCHAR(100),
  cluster_size INT DEFAULT 1,
  source_count INT DEFAULT 1,
  sources JSONB DEFAULT '[]'::jsonb,
  meta_story JSONB,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add story-processing columns to existing installations.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS neutral_headline VARCHAR(500);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS original_title VARCHAR(500);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cluster_id VARCHAR(255);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS story_id VARCHAR(255);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cluster_type VARCHAR(100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cluster_size INT DEFAULT 1;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_count INT DEFAULT 1;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_story JSONB;

-- Create scrape_logs table for tracking background jobs
CREATE TABLE IF NOT EXISTS scrape_logs (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  status VARCHAR(50), -- 'pending', 'completed', 'failed'
  articles_count INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Politics', 'Political news and updates'),
  ('Economy', 'Economic news and market updates'),
  ('Health', 'Health and wellness news'),
  ('Sports', 'Sports news and events'),
  ('Technology', 'Technology and innovation news'),
  ('Science', 'Science and research news'),
  ('Entertainment', 'Entertainment and celebrity news'),
  ('Education', 'Education news and updates'),
  ('Environment', 'Environmental news and sustainability'),
  ('World', 'International and world news')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category_id ON user_preferences(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_story_id ON articles(story_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_category_id ON scrape_logs(category_id);

-- Enable Row Level Security (RLS) for security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only read their own data
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid() = id OR auth.uid() IS NULL);

-- Users can update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can read their own preferences
CREATE POLICY "Users can read their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Users can manage their own preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Everyone can read articles
CREATE POLICY "Everyone can read articles" ON articles
  FOR SELECT USING (true);
