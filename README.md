# Zhuwei Blog

这是一个基于 `Astro` 的内容型博客项目，当前部署到 `Cloudflare Pages`。

线上信息：

- GitHub 仓库：`sturdy-potato/zhuwei-blog`
- Pages 项目：`zhuwei-blog`
- 线上域名：`zhuwei.fun` / `www.zhuwei.fun`

## 项目规则

### 1. 发布规则

这个项目当前使用的是：

- 框架：`Astro`
- 构建输出：`dist/`
- 部署平台：`Cloudflare Pages`
- Pages 项目名：`zhuwei-blog`

本地发布流程：

1. 安装依赖
   `npm install`
2. 本地检查
   `npm run check`
3. 本地构建
   `npm run build`
4. 发布到 Cloudflare Pages
   `npx wrangler pages deploy dist --project-name zhuwei-blog`

如果只是在本地预览：

1. 启动开发环境
   `npm run dev`

### 2. 部署相关文件

发布时主要依赖这些文件：

- `package.json`
  定义 `dev / build / check` 等命令
- `astro.config.mjs`
  定义 Astro 站点配置
- `wrangler.jsonc`
  定义 Cloudflare Pages 构建输出目录
- `public/`
  放 `robots.txt`、OG 图片等静态资源
- `src/pages/`
  页面路由
- `src/content/`
  文章内容源

### 3. 不要随便改的地方

- 不要随意删除或重构 `src/content.config.ts`
  这里定义了文章 frontmatter 的数据结构
- 不要随意改 `src/lib/blog.ts` 里的 slug、排序和标签逻辑
  首页、归档页、标签页、RSS 都依赖它
- 不要把 `wrangler.jsonc` 改回 Workers 静态资源模式
  当前项目明确走 `Cloudflare Pages`
- `blog.html` 是最初的单页视觉参考稿
  现在不参与正式路由，但后续做 UI 调整时可以参考它

## 互动功能说明

### 1. 当前已经实现的互动能力

这个项目当前已经接入了三类互动功能：

- 阅读统计
- 点赞
- 评论

它们都挂在文章详情页底部的互动区里。

### 2. 互动功能技术栈

当前互动功能使用的是这套组合：

- 前端页面：`Astro`
- 部署平台：`Cloudflare Pages`
- 服务端接口：`Cloudflare Pages Functions`
- 数据库：`Cloudflare D1`
- 前端互动组件：`src/components/PostEngagement.astro`

也就是说：

- 博客正文和 SEO 仍然是静态页面
- 阅读、点赞、评论通过浏览器异步请求接口
- 接口再把数据写入 D1

这套方案的优点是：

- SEO 不受影响
- 页面首屏仍然是静态 HTML
- 动态功能可以逐步扩展
- 不需要单独再起一套后端服务

### 3. 阅读统计原理

阅读统计的接口是：

- `functions/api/posts/[slug]/view.ts`

工作方式：

1. 用户打开文章页
2. 前端组件自动请求 `POST /api/posts/:slug/view`
3. 服务端根据 `IP + User-Agent` 生成访客指纹
4. 如果同一个访客在 6 小时内重复打开同一篇文章，就不重复计数
5. 如果没有命中去重条件，就给 `post_metrics.views` 加 1

对应表：

- `post_metrics`
- `post_view_events`

这样做的目的不是做“绝对精确”的统计，而是做一个足够稳定、不会明显灌水的阅读数。

### 4. 点赞原理

点赞接口是：

- `functions/api/posts/[slug]/like.ts`

工作方式：

1. 用户点击点赞按钮
2. 前端请求 `POST /api/posts/:slug/like`
3. 服务端同样根据 `IP + User-Agent` 生成访客指纹
4. `post_like_events` 表对 `post_slug + fingerprint` 做唯一约束
5. 如果同一个访客已经点过这篇文章，就不会重复加赞
6. 如果是第一次点赞，就给 `post_metrics.likes` 加 1

对应表：

- `post_metrics`
- `post_like_events`

这是一种轻量防重复方案，不追求账号级精确控制，但足够适合个人博客。

### 5. 评论原理

评论接口是：

- `functions/api/posts/[slug]/comments.ts`

工作方式：

1. 用户在文章页填写昵称和评论内容
2. 前端请求 `POST /api/posts/:slug/comments`
3. 服务端做基础校验：
   - 昵称长度
   - 内容长度
4. 校验通过后，把评论写入 `comments` 表
5. 同时更新 `post_metrics.comment_count`
6. 前端再请求 `GET /api/posts/:slug/comments` 拉取最新评论列表

对应表：

- `comments`
- `post_metrics`

当前版本里：

- 评论默认直接公开
- 没有开启审核流
- 没有开启 Turnstile

如果以后要升级，可以继续加：

- 评论审核状态
- 管理后台
- 敏感词过滤
- Turnstile 防刷

### 6. 数据库结构

数据库初始化 SQL 在：

- `migrations/0001_engagement.sql`

当前主要表：

- `post_metrics`
  每篇文章的聚合统计
- `post_view_events`
  阅读事件，用于时间窗口去重
- `post_like_events`
  点赞事件，用于唯一约束去重
- `comments`
  评论内容表

### 7. 互动功能相关文件

如果后面要让别的 AI 工具修改这套互动逻辑，重点会涉及这些文件：

- `wrangler.jsonc`
  D1 绑定和环境变量
- `functions/_lib/db.ts`
  数据库访问、指纹生成、JSON 响应、Turnstile 预留逻辑
- `functions/api/posts/[slug]/stats.ts`
  拉取文章统计
- `functions/api/posts/[slug]/view.ts`
  阅读统计写入
- `functions/api/posts/[slug]/like.ts`
  点赞写入
- `functions/api/posts/[slug]/comments.ts`
  评论读取和写入
- `migrations/0001_engagement.sql`
  数据表结构
- `src/components/PostEngagement.astro`
  前端互动组件
- `src/layouts/PostLayout.astro`
  文章页接入点
- `src/styles/global.css`
  互动区样式

### 8. 修改互动功能时的注意事项

- 不要只改前端，不改服务端接口
  否则页面显示和数据库逻辑会脱节
- 不要随意修改 `post_metrics` 的字段名
  前后端接口都依赖这些字段
- 不要删除指纹去重逻辑
  否则阅读和点赞会非常容易被重复刷新灌水
- 不要直接把原始 IP 存入数据库
  当前是通过摘要指纹来做轻量去重
- 如果要启用 Turnstile，优先复用 `functions/_lib/db.ts` 里已经预留的校验入口

## 新增文章指南

### 1. 新增文章时要动哪些文件

正常新增一篇文章，通常只需要新增这一个文件：

- `src/content/blog/你的文章文件名.md`

大多数情况下，**不需要**改别的文件。

原因是这些页面都是自动生成的：

- 首页：自动读取文章集合
- 博客归档页：自动读取文章集合
- 标签页：自动按 tags 生成
- RSS：自动读取文章集合
- sitemap：自动生成

### 2. 文章文件放在哪里

所有文章都放在：

- `src/content/blog/`

文件名建议使用英文短横线风格，例如：

- `my-new-post.md`
- `react-rendering-notes.md`
- `cloudflare-pages-deploy-guide.md`

这个文件名会直接成为文章 URL 的一部分，例如：

- `src/content/blog/my-new-post.md`
- 对应 URL：`/blog/my-new-post/`

### 3. 每篇文章必须写的 frontmatter

每篇 Markdown 文章顶部都要包含这些字段：

```md
---
title: 文章标题
excerpt: 文章摘要
pubDate: 2026-04-23
category: 分类名
section: 最新文章
tags: [React, 工程化]
color: blue
icon: "📘"
minutes: 10
views: 100
comments: 0
draft: false
---
```

### 4. 字段含义

- `title`
  文章标题
- `excerpt`
  首页和列表页显示的摘要
- `pubDate`
  发布时间，格式建议 `YYYY-MM-DD`
- `category`
  卡片上的分类标签，例如 `React`、`工程化`、`系统设计`
- `section`
  首页分组，目前常用值：
  - `最新文章`
  - `技术专栏`
  - `生活随想`
- `tags`
  标签数组，会自动生成标签页
- `color`
  控制卡片视觉颜色，只能用这些值：
  - `blue`
  - `green`
  - `purple`
  - `amber`
  - `cyan`
  - `red`
- `icon`
  卡片前面的 emoji 图标
- `minutes`
  预计阅读时长
- `views`
  初始阅读数
- `comments`
  初始评论数
- `draft`
  是否草稿，`true` 时不会出现在正式页面

### 5. 哪些字段是可选的

这些字段可以按需写：

- `updatedDate`
- `featured`
- `pinned`
- `toDelete`
  - 测试文章清理标记，写法：`toDelete: true`
  - 仅用于后续批量删除，不影响当前页面展示逻辑

示例：

```md
---
title: 示例文章
excerpt: 这是摘要
pubDate: 2026-04-23
updatedDate: 2026-04-24
category: 系统设计
section: 技术专栏
tags: [系统设计, Cloudflare]
color: purple
icon: "🏛️"
minutes: 12
views: 320
comments: 4
featured: true
pinned: false
draft: false
---
```

### 6. 新文章发布后的自动影响

只要文章 frontmatter 合法，新增文章后会自动影响这些位置：

- `/`
  首页文章列表
- `/blog/`
  归档页
- `/blog/文章slug/`
  文章详情页
- `/tags/.../`
  标签页
- `/rss.xml`
  RSS 订阅
- `/sitemap-index.xml`
  站点地图

### 7. 新增文章时不要做的事

- 不要手动去改首页文章卡片列表
  首页是自动生成的
- 不要手动改标签页文件内容
  标签页是自动生成的
- 不要把文章写到 `src/pages/` 里
  正式文章应该放在 `src/content/blog/`
- 不要使用未定义的 `color`
  会破坏卡片样式映射
- 不要漏写 `excerpt`
  首页和 SEO 都会受影响

### 8. 测试文章清理约定

如果某篇文章只是临时测试内容，可以在 frontmatter 加：

```md
toDelete: true
```

后续需要清理时，直接全局搜索 `toDelete: true`，把这些文件统一删除即可。

## 给其他 AI 工具的最短指令模板

如果你后面要让别的 AI 工具直接帮你写文章，可以把下面这段一起发给它：

```text
这是一个 Astro 博客项目。

新增文章时只允许新增或修改 src/content/blog/*.md，不要手动改首页、标签页、归档页内容，因为这些页面都是自动生成的。

文章必须包含合法 frontmatter，字段至少包括：
title
excerpt
pubDate
category
section
tags
color
icon
minutes
views
comments
draft

color 只能使用：
blue
green
purple
amber
cyan
red

section 常用值：
最新文章
技术专栏
生活随想
```
