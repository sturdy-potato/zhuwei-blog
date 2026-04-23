-- 中文注释：文章统计主表，保存每篇文章的聚合阅读、点赞、评论数量。
CREATE TABLE IF NOT EXISTS post_metrics (
  post_slug TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 中文注释：阅读事件表，用来做时间窗口内的轻量去重。
CREATE TABLE IF NOT EXISTS post_view_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_view_events_slug_fingerprint
ON post_view_events(post_slug, fingerprint, created_at);

-- 中文注释：点赞事件表，通过唯一约束保证同一访客对同一文章只点赞一次。
CREATE TABLE IF NOT EXISTS post_like_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_slug, fingerprint)
);

-- 中文注释：评论表，目前默认直接公开，后续可扩展审核状态与后台管理。
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_slug_status_created
ON comments(post_slug, status, created_at DESC);
