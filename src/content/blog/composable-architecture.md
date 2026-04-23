---
title: 可组合架构模式在前端中的应用——以 Headless UI 为例
excerpt: 从可组合模式出发，解释为什么这次博客改造要把视觉、布局、内容和 SEO 拆成独立模块，而不是继续堆在一个 HTML 文件里。
pubDate: 2026-03-08
category: 设计模式
section: 技术专栏
tags: [系统设计, 工程化]
color: purple
icon: "🧩"
minutes: 16
views: 3291
comments: 28
draft: false
---

可组合架构最大的好处，是把变化点隔离出来。

## 这次博客里哪些点被拆开了

- 视觉框架交给 `BaseLayout`
- 页面头部交给 `Header`
- SEO 交给 `SeoHead`
- 内容数据交给 `src/content/blog`
- 右侧栏交给 `Sidebar`

这样以后你改一个模块，不会牵动整站。
