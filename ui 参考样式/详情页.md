<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>从零设计一个高可用的前端微服务框架 - ZHUWEI.BLOG</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #4f63f5;
    --primary-light: #eef0ff;
    --primary-mid: #818cf8;
    --bg: #f4f5f9;
    --surface: #ffffff;
    --border: #e8eaf0;
    --text-primary: #1a1d2e;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --tag-bg: #f0f1f8;
    --tag-text: #4b5585;
    --red: #ef4444;
    --orange: #f97316;
    --rank-1: #ef4444;
    --rank-2: #f97316;
    --rank-3: #eab308;
    --rank-n: #d1d5db;
    --radius: 8px;
    --radius-lg: 12px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
    --shadow: 0 4px 16px rgba(0,0,0,.07);
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }

  /* ═══════════════════ NAVBAR ═══════════════════ */
  .navbar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
    height: 58px;
  }
  .nav-inner {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 24px;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 0;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    text-decoration: none;
    margin-right: 36px;
    flex-shrink: 0;
  }
  .logo-dot {
    width: 10px; height: 10px;
    background: #f97316;
    border-radius: 50%;
  }
  .logo span { letter-spacing: -.3px; }
  .logo .logo-accent { color: var(--primary); }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    list-style: none;
  }
  .nav-links a {
    display: block;
    padding: 6px 13px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    border-radius: var(--radius);
    transition: color .15s, background .15s;
    position: relative;
  }
  .nav-links a:hover { color: var(--primary); background: var(--primary-light); }
  .nav-links a.active {
    color: var(--primary);
    font-weight: 600;
  }
  .nav-links a.active::after {
    content: '';
    position: absolute;
    bottom: -16px;
    left: 13px; right: 13px;
    height: 2px;
    background: var(--primary);
    border-radius: 2px;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 5px 12px;
    cursor: pointer;
    transition: border-color .15s;
  }
  .search-box:hover { border-color: var(--primary-mid); }
  .search-box span {
    font-size: 13px;
    color: var(--text-muted);
  }
  .search-kbd {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
  }
  .icon-btn {
    width: 34px; height: 34px;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius);
    cursor: pointer;
    color: var(--text-secondary);
    transition: background .15s, color .15s;
    background: transparent;
    border: none;
  }
  .icon-btn:hover { background: var(--bg); color: var(--primary); }

  /* ═══════════════════ LAYOUT ═══════════════════ */
  .page-wrap {
    max-width: 1140px;
    margin: 0 auto;
    padding: 32px 24px 80px;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 28px;
    align-items: start;
  }

  /* ═══════════════════ MAIN ARTICLE ═══════════════════ */
  .article-card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .article-body {
    padding: 36px 40px;
  }

  /* Meta row */
  .article-meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    background: var(--primary-light);
    color: var(--primary);
    font-size: 12px;
    font-weight: 600;
    border-radius: 20px;
  }
  .meta-sep { color: var(--border); }
  .meta-info {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .meta-info span { display: flex; align-items: center; gap: 4px; }
  .bookmark-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 4px;
    border-radius: 6px;
    transition: color .15s;
  }
  .bookmark-btn:hover { color: var(--primary); }

  /* Title & description */
  .article-title {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.35;
    color: var(--text-primary);
    margin-bottom: 14px;
    letter-spacing: -.3px;
  }
  .article-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: 18px;
  }

  /* Tag chips */
  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 24px;
  }
  .chip {
    background: var(--tag-bg);
    color: var(--tag-text);
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 20px;
    cursor: pointer;
    transition: background .15s;
  }
  .chip:hover { background: var(--primary-light); color: var(--primary); }

  /* Hero image */
  .hero-img {
    width: 100%;
    height: 200px;
    background: linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 30%, #818cf8 60%, #6366f1 100%);
    border-radius: var(--radius-lg);
    margin-bottom: 28px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hero-img::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 50%, rgba(255,255,255,.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255,255,255,.1) 0%, transparent 40%);
  }
  /* Isometric decorative shapes inside hero */
  .hero-shapes {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32px;
  }
  .iso-box {
    position: relative;
  }
  .iso-box svg { filter: drop-shadow(0 8px 24px rgba(79,99,245,.3)); }

  /* Callout */
  .callout {
    background: #f8f9ff;
    border: 1px solid #dde1ff;
    border-radius: var(--radius);
    padding: 14px 18px;
    margin-bottom: 32px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 14px;
    color: var(--text-secondary);
  }
  .callout-icon { color: var(--primary); flex-shrink: 0; margin-top: 2px; }

  /* Article content */
  .article-content h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 28px 0 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .article-content h2::before {
    content: '';
    display: block;
    width: 4px; height: 20px;
    background: var(--primary);
    border-radius: 2px;
    flex-shrink: 0;
  }
  .article-content p {
    font-size: 14.5px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 14px;
  }
  .article-content ul {
    list-style: none;
    margin: 10px 0 18px 4px;
  }
  .article-content ul li {
    position: relative;
    padding-left: 18px;
    font-size: 14.5px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    line-height: 1.7;
  }
  .article-content ul li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 6px; height: 6px;
    background: var(--primary);
    border-radius: 50%;
  }
  .article-content ol {
    margin: 10px 0 18px 0;
    list-style: none;
    counter-reset: ol-counter;
  }
  .article-content ol li {
    counter-increment: ol-counter;
    position: relative;
    padding-left: 28px;
    font-size: 14.5px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    line-height: 1.7;
  }
  .article-content ol li::before {
    content: counter(ol-counter);
    position: absolute;
    left: 0;
    top: 1px;
    width: 20px; height: 20px;
    background: var(--primary-light);
    color: var(--primary);
    font-size: 12px;
    font-weight: 700;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 20px;
  }
  .blockquote {
    border-left: 3px solid var(--primary);
    background: #f8f9ff;
    padding: 14px 20px;
    border-radius: 0 var(--radius) var(--radius) 0;
    margin: 24px 0;
    font-size: 14.5px;
    color: var(--text-secondary);
    position: relative;
  }
  .blockquote::before {
    content: '"';
    position: absolute;
    left: 14px;
    top: 10px;
    font-size: 22px;
    color: var(--primary);
    font-family: Georgia, serif;
    line-height: 1;
  }
  .blockquote p { margin: 0; padding-left: 16px; }

  /* Article footer stats */
  .article-stats {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 20px 40px;
    border-top: 1px solid var(--border);
    background: #fafbff;
  }
  .stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  .stat-icon { color: var(--text-muted); }
  .stat-icon.like { color: #ef4444; }
  .stat-icon.comment { color: var(--primary); }
  .stat-label {
    font-size: 12px;
    color: var(--text-muted);
    display: block;
    line-height: 1.2;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    display: block;
    line-height: 1.2;
  }
  .like-btn {
    background: var(--primary);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    padding: 10px 22px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background .15s, transform .1s;
    flex-shrink: 0;
  }
  .like-btn:hover { background: #3b4fd8; transform: translateY(-1px); }
  .like-btn:active { transform: none; }

  /* ═══════════════════ COMMENTS ═══════════════════ */
  .comments-section {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    margin-top: 16px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .comments-header {
    padding: 22px 40px 18px;
    border-bottom: 1px solid var(--border);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .empty-comments {
    padding: 48px 40px;
    text-align: center;
  }
  .empty-icon {
    width: 64px; height: 64px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .empty-comments h3 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .empty-comments p {
    font-size: 13px;
    color: var(--text-muted);
  }
  .comment-form {
    padding: 0 40px 28px;
    border-top: 1px solid var(--border);
  }
  .comment-user-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 0 12px;
  }
  .avatar-sm {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .comment-name {
    font-size: 13px;
    color: var(--text-muted);
  }
  .comment-input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-primary);
    resize: vertical;
    min-height: 80px;
    outline: none;
    background: var(--bg);
    transition: border-color .15s;
    margin-bottom: 12px;
  }
  .comment-input:focus { border-color: var(--primary); background: var(--surface); }
  .comment-input::placeholder { color: var(--text-muted); }
  .comment-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .toolbar-icons {
    display: flex;
    gap: 4px;
  }
  .toolbar-icon {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 6px;
    cursor: pointer;
    color: var(--text-muted);
    transition: background .15s, color .15s;
    border: none;
    background: transparent;
  }
  .toolbar-icon:hover { background: var(--bg); color: var(--primary); }
  .submit-btn {
    background: var(--primary);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background .15s;
  }
  .submit-btn:hover { background: #3b4fd8; }

  /* ═══════════════════ SIDEBAR ═══════════════════ */
  .sidebar { display: flex; flex-direction: column; gap: 20px; }
  .card {
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 0;
    margin-bottom: 14px;
  }
  .card-title {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .card-title-dot {
    width: 8px; height: 8px;
    background: var(--primary);
    border-radius: 50%;
  }
  .card-link {
    font-size: 12px;
    color: var(--text-muted);
    text-decoration: none;
    transition: color .15s;
  }
  .card-link:hover { color: var(--primary); }

  /* Author card */
  .author-card-body {
    padding: 0 20px 20px;
    text-align: center;
  }
  .author-avatar {
    width: 64px; height: 64px;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 26px;
    font-weight: 700;
    margin: 0 auto 10px;
  }
  .author-name-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .author-name { font-size: 16px; font-weight: 700; }
  .author-badge {
    background: var(--primary-light);
    color: var(--primary);
    font-size: 11px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 20px;
  }
  .author-role {
    font-size: 12.5px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .author-spec {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 14px;
  }
  .author-social {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  .social-icon {
    width: 30px; height: 30px;
    background: var(--bg);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted);
    cursor: pointer;
    transition: background .15s, color .15s;
    font-size: 14px;
    border: 1px solid var(--border);
    text-decoration: none;
  }
  .social-icon:hover { background: var(--primary-light); color: var(--primary); border-color: var(--primary-mid); }
  .author-stats {
    display: flex;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }
  .author-stat {
    flex: 1;
    text-align: center;
  }
  .author-stat + .author-stat {
    border-left: 1px solid var(--border);
  }
  .author-stat-val {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    display: block;
  }
  .author-stat-label {
    font-size: 11px;
    color: var(--text-muted);
    display: block;
    margin-top: 2px;
  }

  /* Hot articles */
  .hot-list { padding: 0 20px 16px; }
  .hot-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid #f3f4f8;
    cursor: pointer;
    transition: background .1s;
  }
  .hot-item:last-child { border-bottom: none; }
  .hot-rank {
    width: 20px;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
    text-align: center;
  }
  .hot-rank.r1 { color: var(--rank-1); }
  .hot-rank.r2 { color: var(--rank-2); }
  .hot-rank.r3 { color: var(--rank-3); }
  .hot-rank.rn { color: var(--rank-n); }
  .hot-thumb {
    width: 48px; height: 36px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
    background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  .hot-info { flex: 1; min-width: 0; }
  .hot-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 3px;
  }
  .hot-views {
    font-size: 11.5px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 3px;
  }

  /* Tag cloud */
  .tag-cloud-body {
    padding: 0 20px 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cloud-tag {
    background: var(--tag-bg);
    color: var(--tag-text);
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 20px;
    cursor: pointer;
    transition: background .15s, color .15s;
    border: 1px solid transparent;
  }
  .cloud-tag:hover { background: var(--primary-light); color: var(--primary); border-color: #c7d2fe; }

  /* Recent activity */
  .activity-list { padding: 0 20px 16px; }
  .activity-item {
    display: flex;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f3f4f8;
  }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    margin-top: 7px;
    flex-shrink: 0;
  }
  .activity-dot.green { background: #22c55e; }
  .activity-dot.blue { background: var(--primary); }
  .activity-dot.purple { background: #a855f7; }
  .activity-dot.orange { background: #f97316; }
  .activity-text {
    font-size: 12.5px;
    color: var(--text-secondary);
    line-height: 1.5;
    flex: 1;
  }
  .activity-date {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 3px;
  }

  /* ═══════════════════ FOOTER ═══════════════════ */
  footer {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 28px 24px;
    text-align: center;
  }
  .footer-links {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .footer-links a {
    font-size: 13px;
    color: var(--text-muted);
    text-decoration: none;
    padding: 0 8px;
    transition: color .15s;
    position: relative;
  }
  .footer-links a:hover { color: var(--primary); }
  .footer-links a + a::before {
    content: '·';
    position: absolute;
    left: -3px;
    color: var(--border);
  }
  .footer-copy {
    font-size: 12px;
    color: var(--text-muted);
  }
  .footer-copy strong { font-weight: 600; color: var(--text-secondary); }

  /* back to top */
  .back-top {
    position: fixed;
    right: 28px;
    bottom: 32px;
    width: 38px; height: 38px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow);
    color: var(--text-secondary);
    transition: background .15s, color .15s, box-shadow .15s;
    z-index: 50;
  }
  .back-top:hover { background: var(--primary); color: #fff; border-color: var(--primary); }
</style>
</head>
<body>

<!-- ════════════════════════════ NAVBAR ════════════════════════════ -->
<nav class="navbar">
  <div class="nav-inner">
    <a href="#" class="logo">
      <div class="logo-dot"></div>
      <span>ZHUWEI<span class="logo-accent">.BLOG</span></span>
    </a>
    <ul class="nav-links">
      <li><a href="#">首页</a></li>
      <li><a href="#" class="active">博客归档</a></li>
      <li><a href="#">前端开发</a></li>
      <li><a href="#">系统设计</a></li>
      <li><a href="#">开源项目</a></li>
      <li><a href="#">读书笔记</a></li>
      <li><a href="#">关于</a></li>
    </ul>
    <div class="nav-actions">
      <div class="search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span>搜索更多文章...</span>
        <kbd class="search-kbd">⌘K</kbd>
      </div>
      <button class="icon-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  </div>
</nav>

<!-- ════════════════════════════ PAGE ════════════════════════════ -->
<div class="page-wrap">

  <!-- ─── MAIN ─── -->
  <main>
    <article class="article-card">
      <div class="article-body">

        <!-- Meta row -->
        <div class="article-meta-row">
          <span class="tag-pill">架构设计</span>
          <div class="meta-info">
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              2026-04-10
            </span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              4,822 阅读
            </span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              14 分钟
            </span>
          </div>
          <button class="bookmark-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          </button>
        </div>

        <!-- Title -->
        <h1 class="article-title">从零设计一个高可用的前端微服务框架</h1>

        <!-- Description -->
        <p class="article-desc">
          深入探讨前端微服务架构的核心设计理念，包括应用隔离、路由分发、样式沙箱、通信机制等关键技术方案。<br>
          本篇将保留了原始文章的"理论优先是一气呵成，同时把它拆成可复用的内容系统。"
        </p>

        <!-- Tag chips -->
        <div class="tag-chips">
          <span class="chip"># 系统设计</span>
          <span class="chip"># 前端前端</span>
          <span class="chip"># 工程化</span>
          <span class="chip"># 微服务</span>
          <span class="chip"># 性能优化</span>
        </div>

        <!-- Hero image -->
        <div class="hero-img">
          <svg viewBox="0 0 520 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;position:absolute;inset:0">
            <!-- left screen -->
            <g transform="translate(60,30)">
              <rect x="0" y="0" width="110" height="78" rx="6" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>
              <rect x="8" y="8" width="94" height="12" rx="3" fill="rgba(255,255,255,.25)"/>
              <rect x="8" y="26" width="60" height="7" rx="3" fill="rgba(255,255,255,.2)"/>
              <rect x="8" y="38" width="80" height="7" rx="3" fill="rgba(255,255,255,.15)"/>
              <rect x="8" y="50" width="50" height="7" rx="3" fill="rgba(255,255,255,.15)"/>
              <rect x="8" y="62" width="70" height="7" rx="3" fill="rgba(255,255,255,.1)"/>
              <!-- stand -->
              <rect x="47" y="78" width="16" height="10" rx="1" fill="rgba(255,255,255,.2)"/>
              <rect x="36" y="88" width="38" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
            </g>
            <!-- center cube (isometric) -->
            <g transform="translate(210,18)">
              <!-- top face -->
              <polygon points="48,0 96,24 48,48 0,24" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.4)" stroke-width=".8"/>
              <!-- right face -->
              <polygon points="96,24 96,82 48,106 48,48" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
              <!-- left face -->
              <polygon points="0,24 48,48 48,106 0,64" fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
              <!-- inner lines top -->
              <line x1="48" y1="0" x2="48" y2="48" stroke="rgba(255,255,255,.2)" stroke-width=".6"/>
              <line x1="0" y1="24" x2="96" y2="24" stroke="rgba(255,255,255,.15)" stroke-width=".6"/>
              <!-- floating small cube -->
              <polygon points="68,4 84,12 68,20 52,12" fill="rgba(255,255,255,.5)" stroke="rgba(255,255,255,.6)" stroke-width=".6"/>
              <polygon points="84,12 84,28 68,36 68,20" fill="rgba(255,255,255,.25)" stroke="rgba(255,255,255,.4)" stroke-width=".6"/>
              <polygon points="52,12 68,20 68,36 52,28" fill="rgba(255,255,255,.35)" stroke="rgba(255,255,255,.4)" stroke-width=".6"/>
            </g>
            <!-- right screen -->
            <g transform="translate(360,40)">
              <rect x="0" y="0" width="100" height="72" rx="6" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.35)" stroke-width="1"/>
              <rect x="8" y="8" width="84" height="10" rx="3" fill="rgba(255,255,255,.25)"/>
              <rect x="8" y="24" width="55" height="6" rx="3" fill="rgba(255,255,255,.2)"/>
              <rect x="8" y="36" width="72" height="6" rx="3" fill="rgba(255,255,255,.15)"/>
              <rect x="8" y="48" width="45" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
              <rect x="8" y="60" width="65" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
              <rect x="42" y="72" width="16" height="9" rx="1" fill="rgba(255,255,255,.2)"/>
              <rect x="30" y="81" width="40" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
            </g>
            <!-- connecting lines -->
            <line x1="170" y1="68" x2="218" y2="78" stroke="rgba(255,255,255,.25)" stroke-width="1" stroke-dasharray="4,3"/>
            <line x1="368" y1="76" x2="315" y2="82" stroke="rgba(255,255,255,.25)" stroke-width="1" stroke-dasharray="4,3"/>
            <!-- dots -->
            <circle cx="170" cy="68" r="3" fill="rgba(255,255,255,.5)"/>
            <circle cx="368" cy="76" r="3" fill="rgba(255,255,255,.5)"/>
            <!-- small floating icons -->
            <g transform="translate(130,100)">
              <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
              <text x="-7" y="5" font-size="12" fill="rgba(255,255,255,.7)">⚡</text>
            </g>
            <g transform="translate(390,105)">
              <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
              <text x="-7" y="5" font-size="12" fill="rgba(255,255,255,.7)">🔗</text>
            </g>
          </svg>
        </div>

        <!-- Callout -->
        <div class="callout">
          <span class="callout-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </span>
          <span>内容型博客真正难的不是盲目视觉，而是把视觉、内容、路由、SEO 和后续接口扩展同时纳入一套结构构里。</span>
        </div>

        <!-- Content -->
        <div class="article-content">
          <h2>为什么先做骨架</h2>
          <p>单页 HTML 适合做设计稿，但不适合长期写博客。随着文章变多，你会很快遇到这些问题：</p>
          <ul>
            <li>首页内容全集中导致加载拥堵</li>
            <li>标签和归档无法自动生成</li>
            <li>新增文章时容易漏掉 SEO 元信息</li>
            <li>以后要加接口时，前台结构需要重写</li>
          </ul>

          <h2>这次拆分的设计原则</h2>
          <p>这套 Astro 骨架保留了原有页面的几个关键视觉判断：</p>
          <ul>
            <li>顶部保持"产品后台式"的聚焦导航</li>
            <li>Hero 区继续使用偏理性和信息超前风格的文章布局</li>
            <li>文章卡片继续采用弱边框、轻微浮起、颜色映射分类</li>
            <li>右侧栏保留作者、热门文章、标签云、最近动态四块信息结构</li>
          </ul>

          <h2>后续怎样接 API</h2>
          <p>现在首页、归档页、详情页都可以继续保持预渲染。让搜索引擎抓取完整 HTML。</p>
          <p>如果以后要加接口，推荐这样做：</p>
          <ol>
            <li>先在 <code style="background:var(--primary-light);color:var(--primary);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px">/api/*</code> 放轻量接口。</li>
            <li>如果逻辑变复杂，再引入 Hono 统一处理。</li>
            <li>评论和订阅先落 D1，图片优先落 R2。</li>
          </ol>

          <div class="blockquote">
            <p>一个长期可维护的博客，首先是一套内容系统，其次才是一个前端页面。</p>
          </div>
        </div>

      </div>

      <!-- Stats bar -->
      <div class="article-stats">
        <div class="stat-item">
          <span class="stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
          <div>
            <span class="stat-label">阅读量</span>
            <span class="stat-value">4,822</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon like">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
          <div>
            <span class="stat-label">点赞数</span>
            <span class="stat-value">263</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon comment">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </span>
          <div>
            <span class="stat-label">评论数</span>
            <span class="stat-value">39</span>
          </div>
        </div>
        <button class="like-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          点赞支持作者
        </button>
      </div>
    </article>

    <!-- Comments -->
    <section class="comments-section">
      <div class="comments-header">评论 / 39</div>
      <div class="empty-comments">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3>还没有评论，来和作者聊聊吧 👋</h3>
        <p>你可能是第一个评论的人</p>
      </div>
      <div class="comment-form">
        <div class="comment-user-row">
          <div class="avatar-sm">Z</div>
          <span class="comment-name">怎么称呼你？</span>
        </div>
        <textarea class="comment-input" placeholder="写下你的想法..."></textarea>
        <div class="comment-toolbar">
          <div class="toolbar-icons">
            <button class="toolbar-icon" title="表情">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </button>
            <button class="toolbar-icon" title="图片">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
            <button class="toolbar-icon" title="链接">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <button class="toolbar-icon" title="代码">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </button>
          </div>
          <button class="submit-btn">发表评论</button>
        </div>
      </div>
    </section>
  </main>

  <!-- ─── SIDEBAR ─── -->
  <aside class="sidebar">

    <!-- Author -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-dot"></div>
          关于作者
        </div>
      </div>
      <div class="author-card-body">
        <div class="author-avatar">Z</div>
        <div class="author-name-row">
          <span class="author-name">ZhuWei</span>
          <span class="author-badge">博主</span>
        </div>
        <p class="author-role">前端工程师 / 开源爱好者</p>
        <p class="author-spec">专注 React 生态 &amp; 架构设计</p>
        <div class="author-social">
          <a class="social-icon" title="GitHub">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          </a>
          <a class="social-icon" title="Twitter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
          </a>
          <a class="social-icon" title="RSS">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
          </a>
          <a class="social-icon" title="邮件">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </a>
        </div>
        <div class="author-stats">
          <div class="author-stat">
            <span class="author-stat-val">10</span>
            <span class="author-stat-label">文章</span>
          </div>
          <div class="author-stat">
            <span class="author-stat-val">0</span>
            <span class="author-stat-label">关注</span>
          </div>
          <div class="author-stat">
            <span class="author-stat-val">16.1K</span>
            <span class="author-stat-label">总阅读</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Hot articles -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-dot"></div>
          热门文章
        </div>
        <a href="#" class="card-link">查看更多 &rsaquo;</a>
      </div>
      <div class="hot-list">
        <div class="hot-item">
          <span class="hot-rank r1">1</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#fde68a,#f59e0b)">⚡</div>
          <div class="hot-info">
            <div class="hot-title">Vite 6 + Turbopack：下一代...</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              8.2k
            </div>
          </div>
        </div>
        <div class="hot-item">
          <span class="hot-rank r2">2</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#bbf7d0,#22c55e)">💡</div>
          <div class="hot-info">
            <div class="hot-title">写了五年代码，我对「好代码」的...</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              7.9k
            </div>
          </div>
        </div>
        <div class="hot-item">
          <span class="hot-rank r3">3</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#c7d2fe,#6366f1)">🔄</div>
          <div class="hot-info">
            <div class="hot-title">大型前端应用的状态管理漫迹：...</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              6.7k
            </div>
          </div>
        </div>
        <div class="hot-item">
          <span class="hot-rank rn">4</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#fee2e2,#ef4444)">⚛️</div>
          <div class="hot-info">
            <div class="hot-title">React Server Components 深度...</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              5.1k
            </div>
          </div>
        </div>
        <div class="hot-item">
          <span class="hot-rank rn">5</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#fce7f3,#ec4899)">🛡️</div>
          <div class="hot-info">
            <div class="hot-title">前端安全实践指南：XSS、CSRF...</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              6k
            </div>
          </div>
        </div>
        <div class="hot-item">
          <span class="hot-rank rn">6</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#e0e7ff,#6366f1)">🏗️</div>
          <div class="hot-info">
            <div class="hot-title">从零设计一个高可用的前端微服务</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              4.8k
            </div>
          </div>
        </div>
        <div class="hot-item">
          <span class="hot-rank rn">7</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#d1fae5,#10b981)">🚀</div>
          <div class="hot-info">
            <div class="hot-title">K8s + GitHub Actions：打造零...</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              4.6k
            </div>
          </div>
        </div>
        <div class="hot-item">
          <span class="hot-rank rn">8</span>
          <div class="hot-thumb" style="background:linear-gradient(135deg,#fef3c7,#d97706)">📘</div>
          <div class="hot-info">
            <div class="hot-title">TypeScript 5.6 新特性完全解读...</div>
            <div class="hot-views">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              3.8k
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tag cloud -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-dot"></div>
          标签云
        </div>
      </div>
      <div class="tag-cloud-body">
        <span class="cloud-tag">系统设计</span>
        <span class="cloud-tag">微前端</span>
        <span class="cloud-tag">工程化</span>
        <span class="cloud-tag">TypeScript</span>
        <span class="cloud-tag">React</span>
        <span class="cloud-tag">性能优化</span>
        <span class="cloud-tag">DevOps</span>
        <span class="cloud-tag">Docker</span>
        <span class="cloud-tag">K8s</span>
        <span class="cloud-tag">读书</span>
        <span class="cloud-tag">思考</span>
        <span class="cloud-tag">Web 安全</span>
      </div>
    </div>

    <!-- Recent activity -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-dot"></div>
          最近动态
        </div>
      </div>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-dot green"></div>
          <div>
            <div class="activity-text">发布新文章《从零设计一个高可用的前端微服务框架》</div>
            <div class="activity-date">2026-04-10</div>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-dot blue"></div>
          <div>
            <div class="activity-text">发布新文章《TypeScript 5.6 新特性完全解读：从编译器到类型体操》</div>
            <div class="activity-date">2026-04-08</div>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-dot purple"></div>
          <div>
            <div class="activity-text">发布新文章《React Server Components 深度实践：性能优化与架构记录》</div>
            <div class="activity-date">2026-04-05</div>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-dot orange"></div>
          <div>
            <div class="activity-text">发布新文章《Vite 6 + Turbopack：下一代构建工具的体验对比》</div>
            <div class="activity-date">2026-03-28</div>
          </div>
        </div>
      </div>
    </div>

  </aside>
</div>

<!-- ════════════════════════════ FOOTER ════════════════════════════ -->
<footer>
  <div class="footer-links">
    <a href="#">关于博主</a>
    <a href="#">博客归档</a>
    <a href="#">RSS 订阅</a>
    <a href="#">GitHub</a>
    <a href="#">联系我</a>
  </div>
  <div class="footer-copy">
    © 2026 ZHUWEI.BLOG &nbsp;·&nbsp; <strong>用代码书写，以文字沉淀</strong>
  </div>
</footer>

<!-- Back to top -->
<button class="back-top" onclick="window.scrollTo({top:0,behavior:'smooth'})">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
</button>

</body>
</html>