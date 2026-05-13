---
title: "博客 SEO 优化简单记录：让搜索引擎更容易看懂你的网站"
excerpt: "面向新手整理一套博客 SEO 基础优化流程，包括标题描述、canonical、sitemap、robots、旧链接重定向和结构化数据。"
pubDate: 2026-05-13
category: "建站笔记"
section: "技术专栏"
tags:
  - SEO
  - 博客
  - 建站
  - 搜索引擎
  - Astro
color: "green"
icon: "Search"
minutes: 5
views: 0
comments: 0
draft: false
---

## 背景

博客上线之后，很多人第一反应是去搜索引擎里搜自己的站点。

结果经常会遇到几类问题：

- 首页能搜到，但摘要不是最新的
- 搜到了旧页面，点进去已经不是现在的内容
- 搜索结果里标题很乱
- 文章页没有被收录
- `www` 和不带 `www` 的地址同时出现

这些问题不一定是网站坏了，很多时候是 SEO 基础信息没有整理好，搜索引擎还不知道哪个页面才是最重要、最新、最标准的版本。

这篇文章记录一套适合个人博客的新手 SEO 检查流程。

## 先统一网站主地址

一个网站通常会有多种访问形式：

```text
https://example.com
https://www.example.com
http://example.com
http://www.example.com
```

对于搜索引擎来说，如果这些地址都能打开，就可能被当成多个重复页面。

建议只保留一个主地址，比如：

```text
https://example.com
```

其他地址全部 301 重定向到主地址。

如果使用的是静态托管平台，可以配置类似规则：

```text
https://www.example.com/* https://example.com/:splat 301
```

这样搜索引擎会更明确：主站就是不带 `www` 的版本。

## 每个页面都要有标题和描述

页面标题和描述会影响搜索结果里的展示内容。

一个基础页面至少要有：

```html
<title>文章标题 | 站点名称</title>
<meta name="description" content="用一句话说明这篇文章解决什么问题。">
```

标题不要只写“首页”或“博客”，最好能说明页面主题。

比如文章页可以是：

```text
博客 SEO 优化简单记录 | 我的博客
```

描述可以写成：

```text
面向新手整理博客 SEO 的基础优化流程，包括标题、描述、sitemap、robots 和旧链接重定向。
```

描述不是越长越好，重点是让人和搜索引擎都能快速明白页面内容。

## 设置 canonical

`canonical` 的作用是告诉搜索引擎：当前页面的标准地址是哪一个。

例如文章页可以写：

```html
<link rel="canonical" href="https://example.com/blog/my-post/">
```

它可以减少重复收录的问题。

比如下面这些地址可能都能访问到同一篇文章：

```text
https://example.com/blog/my-post
https://example.com/blog/my-post/
https://www.example.com/blog/my-post/
```

有了 canonical，搜索引擎更容易判断应该保留哪一个。

## 准备 sitemap

`sitemap` 是给搜索引擎看的站点地图。

它会列出网站里可以被抓取的重要页面，例如：

```text
/
/blog/
/blog/post-a/
/blog/post-b/
/tags/seo/
```

常见地址是：

```text
https://example.com/sitemap-index.xml
```

如果是 Astro、Next.js 这类框架，一般都有插件可以自动生成 sitemap。

生成之后，建议去搜索引擎站长工具里提交 sitemap。

## 配置 robots.txt

`robots.txt` 用来告诉搜索引擎哪些内容可以抓取，以及 sitemap 在哪里。

个人博客可以先用最简单的版本：

```text
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap-index.xml
```

这表示允许搜索引擎抓取全站，并告诉它 sitemap 的地址。

注意，不要误写成：

```text
Disallow: /
```

这会阻止搜索引擎抓取整个网站。

## 处理旧页面

博客改版后，经常会留下一些旧地址。

比如旧站有：

```text
/question
/tools/date-calculator
/old-post
```

如果这些页面已经不存在，搜索引擎还可能继续展示它们。

这时候有两种处理方式：

1. 如果旧页面有对应的新文章，就 301 到新文章
2. 如果没有对应内容，就 301 到博客归档页或首页

例如：

```text
/question /blog/ 301
/tools/* /blog/ 301
```

这样可以把旧页面的流量接住，也能慢慢让搜索引擎更新索引。

## 增加结构化数据

结构化数据可以帮助搜索引擎理解页面类型。

文章页可以使用 `BlogPosting`：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "文章标题",
  "description": "文章摘要",
  "datePublished": "2026-05-13T00:00:00.000Z",
  "author": {
    "@type": "Person",
    "name": "作者名"
  }
}
</script>
```

首页可以使用 `WebSite` 或 `Blog`。

这不会保证排名立刻提升，但能让搜索引擎更清楚页面是什么。

## 提交给搜索引擎

SEO 改完之后，不是马上就会在搜索结果里变化。

一般还需要去搜索引擎站长工具里做几件事：

```text
1. 添加并验证网站
2. 提交 sitemap
3. 对首页请求重新抓取
4. 对重要文章请求编入索引
5. 检查旧页面是否已经 301
```

Google 对应的是 Google Search Console。

如果面向中文搜索，也可以再看其他搜索平台的站长工具。

## 不要期待当天见效

SEO 是异步更新的。

你今天改了标题、描述、重定向和 sitemap，搜索结果可能几天后才变化。

常见节奏是：

```text
几小时到几天：搜索引擎重新抓取页面
几天到几周：搜索结果摘要逐渐更新
更长时间：旧链接慢慢减少
```

所以 SEO 优化不是只看当天结果，而是看搜索引擎有没有开始抓取正确页面。

## 总结

个人博客 SEO 可以先抓住这些基础项：

```text
1. 统一主域名
2. 每页写好 title 和 description
3. 设置 canonical
4. 生成 sitemap
5. 配置 robots.txt
6. 处理旧页面 301
7. 给文章页加结构化数据
8. 去站长工具提交 sitemap
```

一句话总结：

```text
SEO 的第一步不是堆关键词，而是让搜索引擎知道哪个页面存在、哪个地址是标准地址、页面内容到底是什么。
```
