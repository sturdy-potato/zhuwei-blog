import type { APIContext } from "astro";
import rss from "@astrojs/rss";
import { getPostSlug, getPublishedPosts } from "../lib/blog";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: "ZHUWEI.BLOG",
    description: "专注于后端工程、网络协议、AI 自动化与数码折腾的个人技术博客。",
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
