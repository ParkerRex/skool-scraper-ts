export interface SkoolMember {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  joinedAt: Date;
  lastActiveAt?: Date;
  role?: string;
  points?: number;
  postsCount?: number;
  commentsCount?: number;
}

export interface SkoolThread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  categoryId?: string;
  categoryName?: string;
  createdAt: Date;
  updatedAt?: Date;
  isPinned: boolean;
  isLocked: boolean;
  viewsCount: number;
  postsCount: number;
  likesCount: number;
}

export interface SkoolPost {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likesCount: number;
  parentPostId?: string; // For nested replies
}

export interface SkoolComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  likesCount: number;
}

export interface SkoolLike {
  id: string;
  userId: string;
  targetType: 'thread' | 'post' | 'comment';
  targetId: string;
  createdAt: Date;
}

export interface ScrapeProgress {
  id: number;
  taskType: 'members' | 'threads' | 'posts' | 'comments' | 'likes';
  lastProcessedId?: string;
  lastProcessedPage?: number;
  totalProcessed: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}