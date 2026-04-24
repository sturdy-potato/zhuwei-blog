# Codex UI 规范完整版：ZHUWEI.BLOG 博客详情页 To C 改版

> 直接把本文档交给 Codex。目标是把当前博客详情页改造成「现代、精致、To C、产品化」的技术博客详情页。不是重写业务逻辑，而是在保留信息架构的前提下，完成 UI、交互、组件、样式系统的系统化升级。

---

## 0. 给 Codex 的总任务指令

你是一个资深前端 UI 工程师。请基于当前项目代码，把博客详情页重构为一个现代、精致、To C 的技术博客详情页。

核心要求：

1. 保留现有页面的信息结构：顶部导航、左侧正文、右侧侧边栏、文章元信息、文章内容、阅读/点赞/评论数据、评论区、页脚。
2. 不要破坏现有数据字段、路由、SEO、文章渲染逻辑和接口调用逻辑。
3. 优先做视觉系统、布局系统、组件结构和响应式体验升级。
4. 最终效果要接近参考图：浅色背景、白色卡片、蓝紫色品牌强调、圆角、柔和阴影、清晰层级、丰富但不杂乱。
5. 桌面端重点优化；同时保证移动端可读、可操作、不卡布局。
6. 代码需要工程化：组件拆分清晰、样式变量统一、不要把大量重复样式散落在页面里。

如果项目是 Astro / React / Vue / Next / Nuxt 等任意框架，请遵循当前项目已有技术栈和目录规范，不要强行替换框架。

---

## 1. 设计目标

### 1.1 当前问题

当前页面能用，但存在以下 To C 层面的不足：

- 页面整体偏后台/文档站风格，不够消费级产品化。
- 视觉层级较弱，正文、侧边栏、评论、统计模块之间缺少节奏感。
- 文章头图与正文没有形成强记忆点。
- 侧边栏信息密度较高，但展示方式偏列表化，缺少高级感。
- 评论区表单比较基础，互动感不足。
- 品牌色没有形成完整设计系统。

### 1.2 改版目标

改版后的页面需要具备以下特征：

- **大气**：页面留白更充分，卡片更宽松，整体不拥挤。
- **高级**：阴影、边框、渐变、图标、微交互要克制且统一。
- **To C**：页面不是内部后台，而是面向普通读者的内容产品。
- **技术感**：适合前端、系统设计、工程化、开源项目类博客。
- **可维护**：视觉样式统一收敛为设计变量和组件，不要一次性堆样式。

---

## 2. 页面整体信息架构

### 2.1 桌面端结构

页面采用三段式结构：

```text
┌──────────────────────────────────────────────┐
│ 顶部导航 Header                               │
├──────────────────────────────────────────────┤
│ 页面主体 Main                                 │
│  ┌──────────────────────────┐ ┌────────────┐ │
│  │ 文章详情 Article Card     │ │ 右侧栏      │ │
│  │ - 文章头部                │ │ 作者卡片    │ │
│  │ - Hero 图                 │ │ 热门文章    │ │
│  │ - 正文内容                │ │ 标签云      │ │
│  │ - 统计/点赞               │ │ 最近动态    │ │
│  │ - 评论区                  │ │            │ │
│  └──────────────────────────┘ └────────────┘ │
├──────────────────────────────────────────────┤
│ 页脚 Footer                                   │
└──────────────────────────────────────────────┘
```

### 2.2 内容宽度

建议桌面端：

- 页面最大宽度：`1180px` 到 `1240px`。
- 主内容区域：`minmax(0, 1fr)`，建议 760px 到 840px。
- 右侧栏：`300px` 到 `340px`。
- 主体间距：`24px` 到 `32px`。

推荐 CSS：

```css
.page-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}

.article-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 28px;
  align-items: start;
}

@media (max-width: 1024px) {
  .article-layout {
    grid-template-columns: 1fr;
  }
}
```

---

## 3. 视觉风格方向

### 3.1 关键词

- Clean
- Premium
- Soft SaaS
- Tech Blog
- Consumer Facing
- Blue Violet Accent
- Card Based Layout
- High Readability

### 3.2 设计气质

整体风格不要做成炫酷暗黑，也不要做成传统文档站。目标是：

> 像一个成熟的技术内容产品，而不是个人随手搭的博客模板。

### 3.3 视觉原则

1. **背景要轻**：使用浅灰、浅蓝灰、微渐变背景，不使用纯白铺满。
2. **卡片要明确**：正文卡片、侧边栏卡片、评论卡片都要有清晰容器感。
3. **强调色要统一**：主色使用蓝紫系，不要多个高饱和色抢视觉。
4. **正文优先可读**：正文区域不要过度装饰，排版要舒服。
5. **列表要有节奏**：热门文章、最近动态、标签云要分组清晰。
6. **交互要轻**：hover、focus、active 做细节即可，不要大幅跳动。

---

## 4. 色彩系统

### 4.1 基础色

```css
:root {
  --bg-page: #f6f8fc;
  --bg-page-soft: #eef3ff;
  --bg-card: #ffffff;
  --bg-muted: #f3f6fb;
  --bg-muted-2: #eef2f8;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;
  --text-muted: #94a3b8;

  --border-subtle: #e5eaf3;
  --border-strong: #d7deea;

  --brand-primary: #5b5cf6;
  --brand-secondary: #7c3aed;
  --brand-soft: #eef0ff;
  --brand-soft-2: #f4f2ff;

  --success: #16a34a;
  --warning: #f59e0b;
  --danger: #ef4444;

  --shadow-card: 0 18px 45px rgba(15, 23, 42, 0.06);
  --shadow-card-hover: 0 24px 60px rgba(15, 23, 42, 0.10);
  --shadow-soft: 0 8px 22px rgba(15, 23, 42, 0.05);
}
```

### 4.2 渐变

用于按钮、头像、Hero 区域、轻量装饰背景。

```css
:root {
  --gradient-brand: linear-gradient(135deg, #5b5cf6 0%, #7c3aed 100%);
  --gradient-hero: linear-gradient(135deg, #eef2ff 0%, #f7f5ff 45%, #edf8ff 100%);
  --gradient-card: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
}
```

### 4.3 颜色使用规则

| 场景 | 使用方式 |
|---|---|
| 主按钮 | `--gradient-brand` |
| 当前导航 | `--brand-primary` + 下划线 |
| 标签 Badge | `--brand-soft` 背景 + `--brand-primary` 文字 |
| 引用/提示块 | 浅蓝紫背景 + 左侧品牌色边线 |
| 普通正文 | `--text-secondary` |
| 标题 | `--text-primary` |
| 边框 | `--border-subtle` |

---

## 5. 字体与排版

### 5.1 字体族

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

body {
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-page);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

### 5.2 标题层级

| 元素 | 字号 | 行高 | 字重 | 说明 |
|---|---:|---:|---:|---|
| 页面文章标题 | 34px - 40px | 1.18 | 800 | 桌面端主视觉 |
| H2 | 22px - 26px | 1.35 | 750 | 正文章节标题 |
| H3 | 18px - 20px | 1.4 | 700 | 子章节 |
| 正文 | 15.5px - 16.5px | 1.85 | 400 | 阅读舒适 |
| 元信息 | 13px | 1.5 | 500 | 日期、阅读量 |
| 侧边栏标题 | 15px - 16px | 1.5 | 700 | 卡片标题 |

### 5.3 正文排版

正文需要有明显阅读节奏：

```css
.article-content {
  font-size: 16px;
  line-height: 1.86;
  color: var(--text-secondary);
}

.article-content h2 {
  margin: 36px 0 14px;
  padding-left: 12px;
  border-left: 4px solid var(--brand-primary);
  font-size: 24px;
  line-height: 1.35;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.article-content p {
  margin: 14px 0;
}

.article-content ul,
.article-content ol {
  margin: 14px 0 18px;
  padding-left: 1.35em;
}

.article-content li {
  margin: 7px 0;
}
```

---

## 6. 顶部导航 Header 规范

### 6.1 目标

顶部导航要从「普通链接栏」升级为「产品级导航」。要求：

- 白色半透明背景。
- 底部分割线非常轻。
- 当前导航有蓝紫色下划线或胶囊态。
- 搜索框更像产品入口，支持 `⌘K` 快捷键提示。
- 右侧保留主题切换按钮。

### 6.2 布局

```text
Logo | 首页 博客归档 前端开发 系统设计 开源项目 读书笔记 关于 | Search | Theme
```

### 6.3 CSS 建议

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 64px;
  backdrop-filter: blur(18px);
  background: rgba(255, 255, 255, 0.82);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.header-inner {
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 850;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--gradient-brand);
  box-shadow: 0 8px 18px rgba(91, 92, 246, 0.25);
}

.nav-link {
  position: relative;
  padding: 20px 4px;
  font-size: 14px;
  font-weight: 650;
  color: var(--text-secondary);
  text-decoration: none;
}

.nav-link.is-active {
  color: var(--brand-primary);
}

.nav-link.is-active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 999px 999px 0 0;
  background: var(--gradient-brand);
}
```

---

## 7. 主体背景与页面容器

### 7.1 背景

页面背景不能是纯灰块，建议使用轻微径向光斑：

```css
body {
  background:
    radial-gradient(circle at 18% 8%, rgba(91, 92, 246, 0.10), transparent 28%),
    radial-gradient(circle at 82% 12%, rgba(14, 165, 233, 0.08), transparent 24%),
    var(--bg-page);
}
```

### 7.2 主卡片

正文主卡片需要有高级感：

```css
.article-card {
  border: 1px solid var(--border-subtle);
  border-radius: 22px;
  background: var(--gradient-card);
  box-shadow: var(--shadow-card);
  padding: 28px;
}

@media (min-width: 768px) {
  .article-card {
    padding: 32px;
  }
}
```

---

## 8. 文章头部 Article Header

### 8.1 内容顺序

文章头部建议按以下顺序：

1. 分类 Badge。
2. 发布时间、阅读量、阅读时长。
3. 收藏/书签按钮。
4. 大标题。
5. 摘要。
6. 标签列表。
7. Hero 图。
8. 文章导语提示块。

### 8.2 标题样式

```css
.article-title {
  margin: 16px 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.16;
  font-weight: 850;
  letter-spacing: -0.045em;
  color: var(--text-primary);
}

.article-summary {
  max-width: 680px;
  margin: 0;
  font-size: 15.5px;
  line-height: 1.8;
  color: var(--text-secondary);
}
```

### 8.3 元信息

```css
.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.article-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
```

### 8.4 标签

```css
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 650;
  border: 1px solid transparent;
}

.tag-pill:hover {
  border-color: rgba(91, 92, 246, 0.20);
  background: var(--brand-soft);
  color: var(--brand-primary);
}
```

---

## 9. Hero 图 / 文章视觉区

### 9.1 目标

Hero 区域是视觉升级的关键。不要只放普通图片，也不要空着。可以使用：

- 渐变背景。
- SVG/Canvas/CSS 伪 3D 插画。
- 技术架构节点、卡片、连线、立方体等图形。
- 如果当前文章有封面图，则使用封面图；没有封面图时使用默认 CSS/SVG Hero。

### 9.2 默认 Hero 结构

```html
<div class="article-hero">
  <div class="hero-grid"></div>
  <div class="hero-card hero-card-left"></div>
  <div class="hero-cube"></div>
  <div class="hero-card hero-card-right"></div>
</div>
```

### 9.3 CSS 示例

```css
.article-hero {
  position: relative;
  overflow: hidden;
  height: 210px;
  margin: 26px 0 22px;
  border-radius: 16px;
  background: var(--gradient-hero);
  border: 1px solid rgba(91, 92, 246, 0.12);
}

.article-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(91, 92, 246, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 92, 246, 0.08) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at 50% 50%, #000 0%, transparent 72%);
}

.hero-cube {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 86px;
  height: 86px;
  transform: translate(-50%, -50%) rotate(8deg);
  border-radius: 22px;
  background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
  box-shadow: 0 26px 60px rgba(79, 70, 229, 0.35);
}
```

### 9.4 视觉禁忌

- 不要用低清晰度图片。
- 不要用大面积纯色块。
- 不要让 Hero 区抢过文章标题。
- 不要使用过多高饱和颜色。

---

## 10. 正文内容组件规范

### 10.1 信息提示块

```css
.article-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px 16px;
  margin: 18px 0 26px;
  border-radius: 12px;
  background: #f4f6ff;
  color: var(--text-secondary);
  border: 1px solid rgba(91, 92, 246, 0.10);
}

.article-note-icon {
  flex: 0 0 auto;
  color: var(--brand-primary);
}
```

### 10.2 引用块

```css
.article-content blockquote {
  margin: 28px 0;
  padding: 18px 20px;
  border-left: 4px solid var(--brand-primary);
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(91, 92, 246, 0.08), rgba(124, 58, 237, 0.04));
  color: var(--text-secondary);
}
```

### 10.3 代码块

```css
.article-content pre {
  overflow-x: auto;
  margin: 22px 0;
  padding: 18px;
  border-radius: 14px;
  background: #0f172a;
  color: #e2e8f0;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.75;
}

.article-content code:not(pre code) {
  padding: 2px 6px;
  border-radius: 6px;
  background: #eef2ff;
  color: #4f46e5;
  font-family: var(--font-mono);
  font-size: 0.88em;
}
```

### 10.4 有序步骤

对于“后续怎样接 API”这类步骤，建议做成圆形编号：

```css
.step-list {
  counter-reset: step;
  list-style: none;
  padding: 0;
  margin: 16px 0;
}

.step-list li {
  counter-increment: step;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 10px 0;
}

.step-list li::before {
  content: counter(step);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-muted);
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 800;
  flex: 0 0 auto;
}
```

---

## 11. 文章统计与互动区

### 11.1 目标

统计区要从普通数据块升级为“轻互动模块”。包括：

- 阅读量。
- 点赞数。
- 评论数。
- 点赞支持作者按钮。

### 11.2 布局

桌面端一行四列，移动端两列或单列。

```css
.article-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr) 1.2fr;
  gap: 12px;
  margin: 32px 0 28px;
  padding-top: 24px;
  border-top: 1px solid var(--border-subtle);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: var(--shadow-soft);
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-soft);
  color: var(--brand-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.stat-value {
  margin-top: 2px;
  font-size: 22px;
  line-height: 1;
  font-weight: 850;
  color: var(--text-primary);
}

.like-button {
  border: none;
  border-radius: 14px;
  color: #fff;
  font-weight: 750;
  background: var(--gradient-brand);
  box-shadow: 0 14px 28px rgba(91, 92, 246, 0.24);
  cursor: pointer;
}

.like-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 36px rgba(91, 92, 246, 0.32);
}
```

---

## 12. 评论区规范

### 12.1 目标

评论区是 To C 感知很强的模块。要做到：

- 空状态友好。
- 输入框精致。
- 提交按钮明显。
- 保留头像或昵称入口。
- 支持 emoji / 图片 / 链接 / 代码等轻图标入口，即使暂时没有功能也可以先做 UI 占位。

### 12.2 结构

```text
评论 / 39
┌──────────────────────────────┐
│ 空状态：气泡图标 + 文案         │
└──────────────────────────────┘
头像 + 昵称输入
正文输入框
工具栏：emoji 图片 链接 code       发表评论
```

### 12.3 CSS

```css
.comments-section {
  margin-top: 28px;
}

.comments-title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
}

.comment-empty {
  margin-top: 16px;
  padding: 34px 20px;
  border-radius: 16px;
  background: var(--bg-muted);
  border: 1px dashed var(--border-strong);
  text-align: center;
  color: var(--text-secondary);
}

.comment-form {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}

.comment-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.comment-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--gradient-brand);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
}

.comment-input,
.comment-textarea {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: #fff;
  color: var(--text-primary);
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.comment-input {
  height: 38px;
  padding: 0 12px;
}

.comment-textarea {
  min-height: 112px;
  resize: vertical;
  padding: 12px;
}

.comment-input:focus,
.comment-textarea:focus {
  border-color: rgba(91, 92, 246, 0.55);
  box-shadow: 0 0 0 4px rgba(91, 92, 246, 0.10);
}
```

---

## 13. 右侧栏 Sidebar 规范

### 13.1 总体要求

右侧栏是页面高级感的重点。不能只是普通列表。每个模块都要是独立卡片：

1. 作者卡片。
2. 热门文章。
3. 标签云。
4. 最近动态。

侧边栏桌面端可以 sticky：

```css
.sidebar {
  display: grid;
  gap: 20px;
  position: sticky;
  top: 88px;
}

.sidebar-card {
  border: 1px solid var(--border-subtle);
  border-radius: 18px;
  background: #fff;
  box-shadow: var(--shadow-card);
  padding: 20px;
}
```

移动端：侧边栏下沉到正文下方，禁用 sticky。

### 13.2 作者卡片

作者卡片建议包含：

- 卡片标题：关于作者。
- 渐变头像：Z。
- 作者名：ZhuWei。
- 身份 Badge：博主。
- 简介：前端工程师 / 开源爱好者；专注 React 生态 & 架构设计。
- 社交图标。
- 统计：文章、关注、总阅读。

```css
.author-card {
  text-align: center;
}

.author-avatar {
  width: 78px;
  height: 78px;
  margin: 16px auto 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 34px;
  font-weight: 850;
  box-shadow: 0 18px 35px rgba(91, 92, 246, 0.28);
}

.author-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  font-weight: 850;
}

.author-badge {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 11px;
  font-weight: 750;
}
```

### 13.3 热门文章

热门文章要从纯文本列表升级为“排行榜 + 缩略图 + 阅读量”。

结构：

```text
热门文章                         查看更多 >
1 [缩略图] Vite 6 + Turbopack...      8.2k
2 [缩略图] 写了五年代码...            7.9k
...
```

样式要求：

- 前三名编号用强调色，后面用灰色。
- 缩略图 42x42 或 48x48，圆角 10px。
- 标题最多两行，超出省略。
- 阅读量放右下或标题下方，用小图标。

```css
.hot-list {
  display: grid;
  gap: 14px;
}

.hot-item {
  display: grid;
  grid-template-columns: 22px 46px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.hot-rank {
  font-size: 14px;
  font-weight: 850;
  color: var(--text-muted);
}

.hot-item:nth-child(-n+3) .hot-rank {
  color: var(--danger);
}

.hot-thumb {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  object-fit: cover;
  background: var(--bg-muted);
}

.hot-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13.5px;
  line-height: 1.45;
  font-weight: 700;
  color: var(--text-primary);
}
```

### 13.4 标签云

标签云使用圆角胶囊。允许自动换行。

```css
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cloud-tag {
  padding: 7px 10px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 650;
  text-decoration: none;
}

.cloud-tag:hover {
  background: var(--brand-soft);
  color: var(--brand-primary);
}
```

### 13.5 最近动态

最近动态使用时间线风格：

```css
.activity-list {
  display: grid;
  gap: 16px;
}

.activity-item {
  position: relative;
  padding-left: 18px;
}

.activity-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-primary);
}

.activity-title {
  font-size: 13.5px;
  line-height: 1.5;
  font-weight: 700;
  color: var(--text-primary);
}

.activity-date {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
```

---

## 14. 图标规范

优先使用当前项目已有图标库。如果没有图标库，可使用 lucide、heroicons 或内联 SVG。

推荐图标映射：

| 场景 | 图标 |
|---|---|
| 阅读量 | Eye |
| 点赞 | Heart / ThumbsUp |
| 评论 | MessageCircle |
| 日期 | Calendar |
| 阅读时长 | Clock |
| 标签 | Tag |
| 作者 | User |
| 搜索 | Search |
| 收藏 | Bookmark |
| 主题切换 | Moon / Sun |
| 提示块 | Info |

图标尺寸规则：

- 导航和元信息：14px - 16px。
- 统计卡片：18px - 20px。
- 空状态插画：36px - 48px。

---

## 15. 交互动效规范

### 15.1 基础过渡

```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: 160ms var(--ease-out);
  --transition-normal: 220ms var(--ease-out);
}

.interactive {
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast);
}
```

### 15.2 Hover 规则

- 卡片 hover：轻微上浮 `translateY(-2px)`。
- 链接 hover：变品牌色。
- 按钮 hover：阴影变强，最多上浮 1px。
- 输入框 focus：品牌色外发光。

禁忌：

- 不要使用强烈弹跳动画。
- 不要对正文内容做复杂动效。
- 不要让页面滚动时出现卡顿。

---

## 16. 响应式规范

### 16.1 断点

```css
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

### 16.2 桌面端

- Header 完整展示。
- 主体两栏布局。
- Sidebar sticky。
- 文章卡片 padding 32px。

### 16.3 平板端

- 主体变单栏。
- Sidebar 放到正文下方。
- 热门文章可以两列展示。

### 16.4 手机端

- Header nav 可横向滚动，或收起为菜单。
- 搜索框可以隐藏为搜索按钮。
- 文章卡片 padding 降到 18px。
- 标题字号使用 `clamp(26px, 8vw, 34px)`。
- 统计区变两列或单列。
- Hero 高度降到 150px - 170px。

```css
@media (max-width: 640px) {
  .page-shell {
    padding: 18px 14px 48px;
  }

  .article-card {
    border-radius: 18px;
    padding: 18px;
  }

  .article-actions {
    grid-template-columns: 1fr 1fr;
  }

  .like-button {
    grid-column: 1 / -1;
    min-height: 48px;
  }
}
```

---

## 17. 无障碍与可读性

必须满足：

1. 所有按钮要有可访问名称。
2. 表单 input / textarea 要有 label，视觉上可以隐藏。
3. 颜色对比度不能过低。
4. hover 效果不能是唯一信息表达方式。
5. 键盘 focus 状态清晰。
6. 图片要有 `alt`。
7. 文章主体语义使用 `article`、`header`、`aside`、`section`、`footer`。

示例：

```html
<article class="article-card" aria-labelledby="article-title">
  <header class="article-header">
    <h1 id="article-title">从零设计一个高可用的前端微服务框架</h1>
  </header>
</article>
```

---

## 18. SEO 与语义结构

不要因为 UI 改版破坏 SEO。要求：

- 文章页只能有一个 `h1`。
- 正文章节使用 `h2` / `h3`。
- 文章发布时间使用 `time datetime="2026-04-10"`。
- 保留 title、description、canonical、Open Graph、Twitter Card 等已有逻辑。
- 如果有结构化数据，不要删除。
- 图片 alt 要包含文章语义。

---

## 19. 数据字段兼容要求

Codex 改造时不要改变数据来源，优先映射现有字段。建议字段：

```ts
type BlogPost = {
  title: string;
  description?: string;
  category?: string;
  date: string;
  readCount?: number;
  likeCount?: number;
  commentCount?: number;
  readingTime?: string;
  tags?: string[];
  cover?: string;
  content: string;
  prevPost?: { title: string; href: string };
  nextPost?: { title: string; href: string };
};

type SidebarData = {
  author: {
    name: string;
    role?: string;
    bio?: string;
    avatarText?: string;
    articleCount?: number;
    followingCount?: number;
    totalReads?: number;
    links?: Array<{ label: string; href: string; icon?: string }>;
  };
  hotPosts: Array<{
    title: string;
    href: string;
    views?: string;
    thumb?: string;
  }>;
  tags: Array<{ name: string; href: string }>;
  activities: Array<{ title: string; href?: string; date: string }>;
};
```

如果项目已有类型定义，按现有类型改，不要重复造一套冲突类型。

---

## 20. 组件拆分建议

建议拆分：

```text
components/
  layout/
    SiteHeader
    SiteFooter
    PageShell
  blog/
    ArticleHeader
    ArticleHero
    ArticleContent
    ArticleStats
    CommentSection
    Sidebar
    AuthorCard
    HotPostList
    TagCloud
    ActivityList
  ui/
    Badge
    Card
    Button
    IconButton
    StatCard
    EmptyState
```

如果当前项目规模较小，可以只拆 blog 目录下的核心组件，不要过度工程化。

---

## 21. 页面实现伪代码

```tsx
export function BlogPostPage({ post, sidebarData }) {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <div className="article-layout">
          <article className="article-card" aria-labelledby="article-title">
            <ArticleHeader post={post} />
            <ArticleHero post={post} />
            <ArticleContent content={post.content} />
            <ArticleStats post={post} />
            <CommentSection count={post.commentCount} />
          </article>

          <aside className="sidebar" aria-label="博客侧边栏">
            <AuthorCard author={sidebarData.author} />
            <HotPostList posts={sidebarData.hotPosts} />
            <TagCloud tags={sidebarData.tags} />
            <ActivityList items={sidebarData.activities} />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
```

---

## 22. 需要实现的 UI 文案

### 22.1 顶部导航

- ZHUWEI .BLOG
- 首页
- 博客归档
- 前端开发
- 系统设计
- 开源项目
- 读书笔记
- 关于
- 搜索更多文章...

### 22.2 文章页

- 分类：架构设计
- 标题：从零设计一个高可用的前端微服务框架
- 摘要：深入探讨前端微架构的核心设计理念，包括应用隔离、路由分发、样式沙箱、通信机制等关键技术方案。
- 标签：系统设计、前端微前端、工程化、微服务、性能优化
- 提示块：内容型博客真正难的不是盲目视觉，而是把视觉、内容、路由、SEO 和后续接口扩展同时纳入一套结构里。
- 按钮：点赞支持作者

### 22.3 评论区

- 评论 / 39
- 还没有评论，来和作者聊聊吧 👋
- 你可能是第一个评论的人
- 怎么称呼你？
- 写下你的想法...
- 发表评论

### 22.4 侧边栏

- 关于作者
- ZhuWei
- 博主
- 前端工程师 / 开源爱好者
- 专注 React 生态 & 架构设计
- 热门文章
- 查看更多
- 标签云
- 最近动态

---

## 23. 交付要求

Codex 最终需要交付：

1. 页面 UI 改造代码。
2. 新增或修改的组件。
3. 统一的样式变量或 CSS 模块。
4. 移动端适配。
5. 不破坏原有路由和数据逻辑。
6. 简短说明改了哪些文件。
7. 自测说明：桌面端、平板端、手机端分别看过。

---

## 24. 验收标准

### 24.1 视觉验收

- 页面整体比原版更大气，留白更舒服。
- 主文章卡片有明确高级感，不是简单白底容器。
- 标题、摘要、标签、Hero 图层级清楚。
- 右侧栏每个模块都是独立卡片，排列精致。
- 评论区明显比原版更像产品功能区。
- 蓝紫色强调统一，没有杂色。

### 24.2 功能验收

- 文章能正常渲染。
- 评论输入框可输入。
- 点赞按钮有 hover / active 反馈。
- 搜索框样式正常。
- 侧边栏数据正常显示。
- Footer 正常显示。
- 移动端不横向溢出。

### 24.3 代码验收

- 没有大面积重复 CSS。
- 没有写死过多不可维护的 magic number。
- 组件命名清晰。
- 样式变量统一。
- 无明显 console error。
- 不影响构建。

---

## 25. Codex 执行步骤建议

请按以下顺序执行，不要一次性乱改：

1. 阅读当前博客详情页相关文件，确认框架、组件结构、样式写法和数据字段。
2. 找到文章详情页入口、公共布局、Header、Footer、Sidebar、Comment 相关代码。
3. 新增或整理设计变量：颜色、阴影、圆角、字体、间距。
4. 先改主体 layout：页面容器、两栏布局、主卡片、侧边栏卡片。
5. 再改 ArticleHeader：分类、元信息、标题、摘要、标签、收藏按钮。
6. 加 ArticleHero：有 cover 用 cover，没有 cover 用默认渐变插画区。
7. 优化正文样式：h2、p、ul、ol、blockquote、code、pre。
8. 优化互动统计和评论区。
9. 优化 Sidebar：作者卡、热门文章、标签云、最近动态。
10. 做响应式适配。
11. 运行项目构建 / lint / 类型检查。如果没有脚本，至少本地启动并确认页面无报错。
12. 输出变更摘要和自测结果。

---

## 26. 可直接复制给 Codex 的精简 Prompt

```text
请根据仓库现有技术栈，把博客详情页 UI 重构成一个现代、精致、To C 的技术博客详情页。不要破坏原有路由、SEO、数据字段和文章渲染逻辑。

目标效果：浅色背景、白色大卡片、蓝紫色品牌强调、圆角、柔和阴影、清晰层级、主内容左侧、右侧栏卡片化。顶部导航要更产品化，文章头部要有分类、日期、阅读量、阅读时长、标题、摘要、标签、收藏按钮；正文顶部要有高级感 Hero 图；正文排版要优化 h2、p、ul、ol、blockquote、code；文章底部要有阅读量、点赞数、评论数和点赞按钮；评论区要有精致空状态和输入表单；右侧栏要包含作者卡片、热门文章、标签云、最近动态。

请先阅读相关文件，按现有项目风格拆分组件和样式变量。优先保证可维护性、响应式、SEO 语义和无障碍。完成后运行构建或至少说明无法运行的原因，并列出修改文件和自测结果。
```

---

## 27. 最终效果判断

最终页面要让用户产生以下直观感受：

> 这是一个认真运营的技术内容产品，而不是一个普通模板博客。

如果只是在原页面上换颜色、加圆角、调字号，视为未达标。必须完成整体视觉系统、组件节奏、侧边栏质量、评论区质感和移动端体验的系统性提升。
