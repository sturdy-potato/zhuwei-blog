---
title: React Server Components 深度实践：性能优化与踩坑记录
excerpt: 记录从 CSR 迁移到 Server Components 的真实经验，同时解释为什么博客站本身并不需要为了“技术先进”而盲目重客户端渲染。
pubDate: 2026-04-05
category: React
section: 最新文章
tags: [React, 性能优化]
color: green
icon: "🧪"
minutes: 18
views: 5109
comments: 41
draft: false
---

内容站和应用站的技术决策不一样。

## 博客为什么不该默认做重交互

博客最重要的是：

- 首屏 HTML 足够完整
- CSS 风格稳定
- 文章可读性高
- 搜索引擎能直接抓到内容

这也是为什么当前骨架选择 Astro，而不是一开始就上很重的客户端框架。

## React 仍然有位置

如果后面你要做这些功能，React 组件依然可以局部接入：

- 评论互动面板
- 搜索建议
- 后台编辑工具
- 数据可视化

Astro 的价值就在于让这些交互只出现在真正需要的地方。
