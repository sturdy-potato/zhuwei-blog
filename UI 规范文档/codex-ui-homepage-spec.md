# Codex UI 实现规范：ZHUWEI.BLOG 首页升级版

> 用途：把本文件直接交给 Codex / AI 编程工具，让它基于现有博客首页实现一个更美观、更大气、更偏 To C 的高品质博客首页。
>
> 建议文件名：`AGENTS.md` 或作为一次性需求文档粘贴给 Codex。若项目已有 `AGENTS.md`，请把本文中「核心任务」「视觉规范」「组件规范」「验收标准」部分合并进去。

---

## 1. 核心任务

请基于当前博客首页，重新实现一个高品质、现代化、To C 感更强的个人技术博客首页。

目标不是做企业官网，也不是纯 SaaS 落地页，而是一个「高级、耐看、内容导向、可长期维护」的技术博客首页。页面应保留原有信息架构，但显著提升视觉层次、点击欲望、空间节奏和内容质感。

最终效果应接近以下方向：

- 明亮、干净、现代、具有高级感。
- 首页第一屏有明确记忆点。
- 卡片更精致，留白更舒服，信息层级更清楚。
- 视觉上更像成熟的 To C 内容产品，而不是后台管理页面。
- 保留技术博客的理性气质，但减少单调、灰、散、弱的问题。

---

## 2. 页面结构总览

首页采用标准桌面端双栏布局：

```text
┌──────────────────────────────────────────────┐
│ 顶部导航 Header                               │
├──────────────────────────────────────────────┤
│ Hero 首屏介绍区                               │
├──────────────────────────────────────────────┤
│ 分类筛选栏 Category Tabs                      │
├──────────────────────────────────────────────┤
│ 数据概览 Stats Strip                          │
├──────────────────────────────┬───────────────┤
│ 主内容区 Main Content         │ 右侧边栏       │
│ - 置顶文章 Featured Card      │ - 关于作者     │
│ - 最新文章 Latest List        │ - 热门文章     │
└──────────────────────────────┴───────────────┘
│ Footer                                        │
└──────────────────────────────────────────────┘
```

桌面端推荐布局宽度：

- 页面最大宽度：`1280px` 或 `1320px`
- 主内容区：约 `820px ~ 880px`
- 侧边栏：约 `320px ~ 360px`
- 栅格间距：`24px ~ 32px`
- 页面左右边距：`24px` 起步，大屏居中

---

## 3. 视觉关键词

请按照以下视觉关键词执行：

- Premium editorial
- Modern tech blog
- Consumer-facing
- Bright SaaS aesthetic
- Soft gradient
- Refined cards
- Rounded corners
- Subtle shadow
- Strong hierarchy
- Spacious rhythm
- Content-first design

不要做成：

- 后台管理系统
- 纯组件库默认样式
- 过度赛博朋克
- 过度暗黑风
- 信息密度过高的门户站
- 花哨但不可读的视觉稿

---

## 4. 品牌与配色规范

### 4.1 品牌名称

顶部品牌保留：

```text
ZHUWEI.BLOG
```

建议表现：

- `ZHUWEI` 使用深色加粗。
- 中间的点或 `.BLOG` 可使用蓝色强调。
- 整体不需要复杂 logo，保持简洁专业。

### 4.2 主色

使用蓝紫渐变作为核心品牌色。

```css
--brand-blue: #2563eb;
--brand-indigo: #4f46e5;
--brand-purple: #8b5cf6;
--brand-cyan: #06b6d4;
```

推荐渐变：

```css
background: linear-gradient(135deg, #2563eb 0%, #7c3aed 55%, #a855f7 100%);
```

### 4.3 中性色

```css
--text-primary: #0f172a;
--text-secondary: #475569;
--text-muted: #64748b;
--border: #e2e8f0;
--bg-page: #f8fafc;
--bg-card: #ffffff;
```

### 4.4 状态色

```css
--success: #10b981;
--warning: #f59e0b;
--danger: #ef4444;
```

状态色只用于标签、增长、小徽标，不要大面积铺色。

---

## 5. 字体与排版规范

### 5.1 字体栈

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

### 5.2 字号建议

```css
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 32px;
--text-4xl: 44px;
--text-5xl: 56px;
```

### 5.3 标题层级

Hero 主标题：

- 桌面端：`48px ~ 56px`
- 字重：`800 / 900`
- 行高：`1.08 ~ 1.15`
- 重点词「独立思考」使用蓝紫渐变文字。

文章卡片标题：

- 置顶文章标题：`24px ~ 28px`，`font-weight: 800`
- 最新文章标题：`17px ~ 19px`，`font-weight: 700`

正文摘要：

- `14px ~ 15px`
- 行高：`1.7`
- 颜色：`#475569` 或 `#64748b`

---

## 6. 顶部导航 Header 规范

### 6.1 内容

顶部导航包含：

- 左侧品牌：`ZHUWEI.BLOG`
- 中间导航：
  - 首页
  - 博客归档
  - 前端开发
  - 系统设计
  - 开源项目
  - 读书笔记
  - 关于
- 右侧搜索框：`搜索文章、关键词...`
- 搜索框右侧可加快捷键提示：`⌘K`

### 6.2 视觉

Header 应保持轻盈：

```css
height: 64px;
background: rgba(255, 255, 255, 0.86);
backdrop-filter: blur(16px);
border-bottom: 1px solid rgba(226, 232, 240, 0.8);
position: sticky;
top: 0;
z-index: 50;
```

导航 active 状态：

- 首页文字蓝色。
- 底部有 `2px ~ 3px` 蓝色短线。
- 不要使用过重的背景块。

搜索框：

- 圆角：`10px ~ 12px`
- 高度：`36px ~ 40px`
- 边框：浅灰
- 聚焦后边框变蓝，出现轻微阴影。

---

## 7. Hero 首屏区规范

### 7.1 目标

Hero 是首页的第一记忆点，要从原来的普通标题区升级为「有品牌感、有氛围、有技术内容调性」的首屏介绍区。

### 7.2 文案

建议文案：

```text
技术写作 · 持续更新

代码、设计与独立思考

专注于前端工程化、系统架构设计与开源生态，
记录技术成长路上的每一步。
```

其中「独立思考」必须做渐变文字强调。

### 7.3 布局

Hero 分左右两栏：

- 左侧：徽标、主标题、副标题。
- 右侧：代码 / 浏览器 / 内容创作相关插画或抽象图形。

推荐高度：

```css
min-height: 280px;
padding: 56px 0 48px;
```

### 7.4 背景

使用轻柔的白到蓝紫渐变：

```css
background:
  radial-gradient(circle at 78% 30%, rgba(139, 92, 246, 0.24), transparent 34%),
  radial-gradient(circle at 16% 84%, rgba(37, 99, 235, 0.12), transparent 26%),
  linear-gradient(180deg, #ffffff 0%, #f8fbff 62%, #f6f7ff 100%);
```

可以加入很淡的点阵、网格、光斑，但透明度要低，不能影响阅读。

### 7.5 插画方向

右侧插画应包含技术博客相关元素：

- 浏览器窗口
- 代码符号 `</>`
- 浮动卡片
- 图表圆环
- 数据库圆柱
- 轨道线、微小粒子

风格要求：

- 半 3D / soft illustration / glassmorphism 都可。
- 颜色控制在蓝、紫、淡青、白。
- 不要使用低质卡通插画。
- 不要喧宾夺主。

---

## 8. 分类筛选栏 Category Tabs

### 8.1 分类内容

保留并美化以下分类：

```text
全部 / 系统设计 / 微前端 / 工程化 / TypeScript / React / 性能优化 / DevOps / Docker / K8s / 读书 / 思考 / Web 安全
```

### 8.2 视觉规范

分类应为横向 pill 按钮：

```css
height: 38px;
padding: 0 16px;
border-radius: 12px;
border: 1px solid #e2e8f0;
background: #ffffff;
box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
```

active「全部」：

```css
background: linear-gradient(135deg, #2563eb, #4f46e5);
color: #ffffff;
box-shadow: 0 8px 20px rgba(37, 99, 235, 0.24);
```

hover：

- 边框变蓝。
- 背景微蓝。
- 位移 `translateY(-1px)`。

---

## 9. 数据概览 Stats Strip

### 9.1 数据项

```text
文章总数 10
总字数 242
总阅读量 51,611 ▲ 5.1%
今日访客 2,486 ●
```

### 9.2 布局

使用一个横向白色大卡片，内部四列分隔。

```css
border-radius: 16px;
background: #ffffff;
border: 1px solid rgba(226, 232, 240, 0.9);
box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
```

每个指标包含：

- 左侧小图标容器
- 上方小标题
- 下方大数字
- 可选增长或状态点

图标容器：

```css
width: 36px;
height: 36px;
border-radius: 10px;
background: #eff6ff;
color: #2563eb;
```

---

## 10. 主内容区布局

### 10.1 外层布局

```css
.main-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 28px;
  align-items: start;
}
```

### 10.2 响应式

- `>= 1024px`：双栏布局。
- `< 1024px`：变成单栏，侧边栏下沉。
- `< 768px`：分类横向滚动，统计卡片两列或单列。

---

## 11. 置顶文章 Featured Card

### 11.1 内容

```text
标签：架构设计
日期：2026-04-10
标题：从零设计一个高可用的前端微服务框架
摘要：深入探讨微前端架构的核心设计理念，包括应用隔离、路由分发、样式沙箱、通信机制等关键技术方案。本方案保留了原始单页设计的“理性收敛器”气质，同时把它炼成真正可维护的内容系统。
状态：PINNED
```

### 11.2 卡片视觉

```css
border-radius: 18px;
overflow: hidden;
background: #ffffff;
border: 1px solid rgba(226, 232, 240, 0.95);
box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
```

hover：

```css
transform: translateY(-3px);
box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
```

### 11.3 封面图

封面图高度：`170px ~ 220px`。

视觉方向：

- 深蓝科技背景。
- 中心有发光 `</>`。
- 有少量 3D 方块、光线、星点。
- 不要太暗到影响整体明亮感。

可以用 CSS 实现，也可以使用项目已有图片资源。

### 11.4 PINNED 标签

```css
position: absolute;
top: 14px;
right: 14px;
font-size: 11px;
font-weight: 800;
letter-spacing: 0.06em;
color: #ef4444;
background: #fff1f2;
border: 1px solid #fecdd3;
border-radius: 8px;
padding: 5px 8px;
```

---

## 12. 最新文章列表 Latest Articles

### 12.1 标题

区块标题：

```text
最新文章
```

左侧加蓝色竖线或小图标，形成栏目感。

### 12.2 文章项结构

每条文章包含：

- 左侧图标块
- 分类标签
- 日期
- 标题
- 摘要
- 元信息：阅读量 / 评论数 / 阅读时间
- 可选 `NEW` 标签

### 12.3 示例文章

```text
TypeScript 5.6 新特性完全解读：从编译器到类型体操
深入解析 TS 5.6 的类型能力与工程价值，同时用它做精审内容 schema 校验，减少手工维护 frontmatter 的错误。
3,842 / 27 / 12 min
```

```text
React Server Components 深度实践：性能优化与踩坑记录
深入剖析 RSC 架构与实际项目的坑点与应对方案，打造更快、更稳、更友好的渲染体验。
2,134 / 19 / 8 min
```

```text
写了五年代码，我对「好代码」的理解变了
从追求抽象到重视具体，从追求一步到位到接受渐进式重构。这也是这次博客改造背后的方法论。
7,891 / 86 / 10 min
```

### 12.4 卡片样式

```css
.article-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 16px;
  padding: 22px 24px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  transition: 180ms ease;
}
```

hover：

- 背景略变蓝白。
- 标题变蓝。
- 卡片轻微上浮。

左侧图标块：

```css
width: 48px;
height: 48px;
border-radius: 14px;
display: grid;
place-items: center;
background: #eff6ff;
```

不同分类可以用不同弱背景色：

- TypeScript：蓝色
- React：青色
- 思考：黄色
- 架构设计：紫色

---

## 13. 关于作者卡片

### 13.1 内容

```text
关于作者

ZhuWei
前端工程师 / 开源爱好者
专注 React 生态 & 架构设计

10 文章
0.0w 字数
5.16M 阅读
```

### 13.2 视觉

卡片样式：

```css
border-radius: 18px;
background: #ffffff;
border: 1px solid #e2e8f0;
box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
padding: 24px;
```

头像：

```css
width: 72px;
height: 72px;
border-radius: 50%;
background: linear-gradient(135deg, #2563eb, #8b5cf6);
color: #ffffff;
font-size: 34px;
font-weight: 800;
box-shadow: 0 10px 24px rgba(79, 70, 229, 0.25);
```

社交按钮：

- GitHub
- 掘金或技术社区
- 知乎
- 邮箱

按钮样式：

```css
width: 38px;
height: 38px;
border-radius: 12px;
background: #f8fafc;
border: 1px solid #e2e8f0;
```

hover：变蓝、轻微上浮。

---

## 14. 热门文章卡片

### 14.1 内容

```text
热门文章

1. Vite 6 + Turbopack：下一代构建工具的终极对比  8.2k
2. 写了五年代码，我对「好代码」的理解变了  7.9k
3. 大型前端应用的状态管理演进：从 Redux 到 Signals  6.7k
4. React Server Components 深度实践：性能优化与踩坑记录  5.1k
```

### 14.2 视觉

- 标题左侧使用火焰图标。
- 排名数字使用小色块。
- 每行之间有浅分割线。
- 标题可 hover 变蓝。
- 阅读量右对齐，颜色弱化。

排名色建议：

```css
.rank-1 { background: #fee2e2; color: #ef4444; }
.rank-2 { background: #ffedd5; color: #f97316; }
.rank-3 { background: #fef3c7; color: #d97706; }
.rank-4 { background: #f1f5f9; color: #64748b; }
```

---

## 15. Footer 规范

Footer 内容：

```text
关于博主 · 博客归档 · RSS 订阅 · GitHub · 联系我
© 2026 ZHUWEI.BLOG · 用代码书写，以文字沉淀
```

样式：

- 背景：白色或极浅灰。
- 上边框：`1px solid #e2e8f0`
- 文本居中。
- 字号：`13px ~ 14px`
- 间距：`32px ~ 40px`

---

## 16. 交互动效规范

动效必须轻，不要花哨。

推荐统一 transition：

```css
transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, color 180ms ease, background 180ms ease;
```

交互规则：

- 卡片 hover：上浮 `-2px ~ -4px`。
- 按钮 hover：边框变蓝、背景变浅蓝。
- 文章标题 hover：变品牌蓝。
- 搜索框 focus：蓝色边框 + 外发光。
- 不要大面积旋转、弹跳、闪烁。

---

## 17. 响应式规范

### 17.1 Desktop >= 1200px

- 双栏布局。
- Hero 左右分布。
- 分类完整横排。

### 17.2 Tablet 768px ~ 1199px

- Header 保持横向，但搜索框可缩短。
- 主内容与侧边栏改为单栏。
- Hero 插画缩小或降低透明度。

### 17.3 Mobile < 768px

- Header 可简化：品牌 + 搜索 / 菜单。
- Hero 单栏。
- 主标题字号降低到 `36px ~ 42px`。
- 分类横向滚动，不换成多行挤压。
- Stats 改为两列或单列。
- 文章列表图标可缩小。

---

## 18. 可访问性与可读性要求

- 文本对比度必须足够，不要用过浅灰色承载正文。
- 所有可点击项必须有 hover/focus 状态。
- 图片必须提供 `alt`。
- 搜索框必须有 `aria-label`。
- 卡片不能只靠颜色表达状态。
- 移动端点击热区不小于 `40px`。
- 不要为了视觉效果牺牲阅读体验。

---

## 19. 技术实现建议

根据项目技术栈选择实现方式。

### 19.1 如果是 React / Next.js

推荐组件拆分：

```text
components/
  BlogHeader.tsx
  BlogHero.tsx
  CategoryTabs.tsx
  StatsStrip.tsx
  FeaturedArticleCard.tsx
  LatestArticleList.tsx
  AuthorCard.tsx
  PopularPostsCard.tsx
  BlogFooter.tsx
```

数据建议单独抽离：

```text
data/blog-home.ts
```

### 19.2 如果是 Vue

推荐组件拆分：

```text
components/blog-home/
  BlogHeader.vue
  BlogHero.vue
  CategoryTabs.vue
  StatsStrip.vue
  FeaturedArticleCard.vue
  LatestArticleList.vue
  AuthorCard.vue
  PopularPostsCard.vue
  BlogFooter.vue
```

### 19.3 如果是普通 HTML/CSS

也要保证结构清晰：

```text
<header>
<section class="hero">
<nav class="category-tabs">
<section class="stats-strip">
<main class="main-layout">
  <section class="content-column">
  <aside class="sidebar">
<footer>
```

---

## 20. 关键 CSS Token

请优先使用 CSS 变量统一风格。

```css
:root {
  --brand-blue: #2563eb;
  --brand-indigo: #4f46e5;
  --brand-purple: #8b5cf6;
  --brand-gradient: linear-gradient(135deg, #2563eb 0%, #4f46e5 48%, #8b5cf6 100%);

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;

  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --border: #e2e8f0;

  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 24px;

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 18px 48px rgba(15, 23, 42, 0.12);
}
```

---

## 21. 必须保留的内容资产

请不要删除这些核心内容：

- 品牌：`ZHUWEI.BLOG`
- 标题：`代码、设计与独立思考`
- 分类：系统设计、微前端、工程化、TypeScript、React、性能优化、DevOps、Docker、K8s、读书、思考、Web 安全
- 置顶文章：`从零设计一个高可用的前端微服务框架`
- 最新文章列表中的三篇文章
- 关于作者：`ZhuWei`
- 热门文章列表
- Footer 链接与版权

可以优化文案，但不要改变页面的基本定位。

---

## 22. 禁止项

不要做以下事情：

1. 不要把首页改成纯产品营销页。
2. 不要删除博客列表和热门文章。
3. 不要使用大面积深色背景覆盖整个页面。
4. 不要引入过多动画导致页面显得廉价。
5. 不要使用默认 Bootstrap / Ant Design 风格直接拼装。
6. 不要让分类栏、统计栏、文章列表视觉权重混乱。
7. 不要用太小的字号压缩信息。
8. 不要让右侧边栏比主文章区更抢眼。
9. 不要为了装饰加入无意义的复杂背景。
10. 不要破坏现有路由、数据结构和文章跳转逻辑。

---

## 23. 验收标准

完成后请按以下标准自检：

### 23.1 视觉验收

- 第一眼能看出这是一个高质量个人技术博客。
- Hero 区有明显品牌记忆点。
- 页面比原版更亮、更精致、更 To C。
- 卡片、标签、统计区、侧边栏风格统一。
- 主内容优先级清晰，置顶文章最突出。
- 不像后台管理页。

### 23.2 内容验收

- 原首页核心内容没有丢失。
- 分类、统计、置顶文章、最新文章、作者信息、热门文章、Footer 都存在。
- 中文排版无明显错位、溢出、重叠。

### 23.3 工程验收

- 组件拆分清晰。
- 样式变量统一。
- 响应式可用。
- 没有破坏现有路由。
- 没有明显 console error。
- 不引入不必要的大型依赖。

### 23.4 体验验收

- 鼠标 hover 有细腻反馈。
- 搜索框 focus 状态明确。
- 文章卡片可点击区域合理。
- 移动端不横向溢出。
- 首屏加载不应因装饰图过重而明显变慢。

---

## 24. 推荐交付方式

请按以下步骤执行：

1. 先阅读现有首页组件、样式文件和数据来源。
2. 不要直接大规模删除逻辑，先确认当前页面结构。
3. 抽离或复用数据，优先重构 UI 层。
4. 实现 Header、Hero、Category、Stats、Main、Sidebar、Footer。
5. 补齐 hover/focus/responsive。
6. 本地运行并检查桌面、平板、移动端。
7. 最后清理无用样式与重复代码。

---

## 25. 一句话目标

把当前首页从「可用的个人技术博客」升级成「有品牌感、有内容产品气质、用户愿意继续点击阅读的高品质技术博客首页」。
