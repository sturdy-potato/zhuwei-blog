---
title: 大型前端应用的状态管理演进：从 Redux 到 Signals
excerpt: 回顾状态管理的技术演进路线，并借这个话题说明信息架构和组件架构一样，都需要随着规模变化而演进。
pubDate: 2026-03-15
category: 系统设计
section: 技术专栏
tags: [系统设计, React]
color: purple
icon: "🏛️"
minutes: 22
views: 6744
comments: 52
draft: false
---

博客本身也是一种“状态管理”问题。

当文章少的时候，手写一个 HTML 就够了；当文章多起来以后，内容集合、标签页、归档页和 SEO 元信息就都需要自动管理。

## 信息架构的演进规律

它和前端工程一样：

- 先解决“能跑”
- 再解决“能维护”
- 最后解决“能扩展”

这次 Astro 骨架，就是从“能跑”走向“能维护”的阶段。
