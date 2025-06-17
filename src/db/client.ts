import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('./db/skool.db');
export const db = drizzle(sqlite, { schema });

export function initializeDatabase() {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      joined_at INTEGER NOT NULL,
      last_active_at INTEGER,
      role TEXT,
      points INTEGER,
      posts_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      scraped_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES members(id),
      category_id TEXT,
      category_name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      posts_count INTEGER NOT NULL DEFAULT 0,
      likes_count INTEGER NOT NULL DEFAULT 0,
      scraped_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id),
      author_id TEXT NOT NULL REFERENCES members(id),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      likes_count INTEGER NOT NULL DEFAULT 0,
      parent_post_id TEXT,
      scraped_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id),
      author_id TEXT NOT NULL REFERENCES members(id),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      likes_count INTEGER NOT NULL DEFAULT 0,
      scraped_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES members(id),
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      scraped_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scrape_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_type TEXT NOT NULL,
      last_processed_id TEXT,
      last_processed_page INTEGER,
      total_processed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at INTEGER,
      completed_at INTEGER,
      error TEXT
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_threads_author ON threads(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id);
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
    CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
  `);

  console.log('Database initialized successfully');
}