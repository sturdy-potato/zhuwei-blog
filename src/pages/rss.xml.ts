import type { APIContext } from "astro";
import rss from "@astrojs/rss";
import { getPostSlug, getPublishedPosts } from "../lib/blog";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: "ZHUWEI.BLOG",
    description: "专注于前端工程化、系统架构设计与开源生态的技术博客。",
    site: context.site ?? "https://zhuwei.fun",
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.excerpt,
      link: `/blog/${getPostSlug(post)}/`
    })),
    customData: `<language>zh-cn</language>`
  });
}
