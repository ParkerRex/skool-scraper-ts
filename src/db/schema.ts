import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  avatar: text('avatar'),
  bio: text('bio'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),
  role: text('role'),
  points: integer('points'),
  postsCount: integer('posts_count').default(0),
  commentsCount: integer('comments_count').default(0),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
});

export const threads = sqliteTable('threads', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => members.id),
  categoryId: text('category_id'),
  categoryName: text('category_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  viewsCount: integer('views_count').notNull().default(0),
  postsCount: integer('posts_count').notNull().default(0),
  likesCount: integer('likes_count').notNull().default(0),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull().references(() => threads.id),
  authorId: text('author_id').notNull().references(() => members.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  likesCount: integer('likes_count').notNull().default(0),
  parentPostId: text('parent_post_id'),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id),
  authorId: text('author_id').notNull().references(() => members.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  likesCount: integer('likes_count').notNull().default(0),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
});

export const likes = sqliteTable('likes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => members.id),
  targetType: text('target_type').notNull(), // 'thread' | 'post' | 'comment'
  targetId: text('target_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull(),
});

export const scrapeProgress = sqliteTable('scrape_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskType: text('task_type').notNull(), // 'members' | 'threads' | 'posts' | 'comments' | 'likes'
  lastProcessedId: text('last_processed_id'),
  lastProcessedPage: integer('last_processed_page'),
  totalProcessed: integer('total_processed').notNull().default(0),
  status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  error: text('error'),
});