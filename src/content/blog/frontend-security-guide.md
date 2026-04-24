---
title: 前端安全实践指南：XSS、CSRF、CSP 与 Supply Chain 攻击防护
excerpt: 一份前端安全检查清单，同时提醒内容站也需要做好 robots、canonical、站点元信息与部署边界控制。
pubDate: 2026-02-28
category: Web 安全
section: 技术专栏
tags: [系统设计, Web 安全]
color: blue
icon: "🔐"
minutes: 14
views: 4982
comments: 37
toDelete: true
draft: false
---

安全并不只属于后台。

## 内容站也要注意这些

- 自定义域名和 canonical 一致
- RSS 和 sitemap 输出正常
- 公开页面不要暴露敏感接口
- API 路由与静态页面职责明确

这也是为什么这次我先把 SEO 和结构补齐，再去考虑更复杂的功能。
