import { getCollection } from "astro:content";

export type ColorName = "blue" | "green" | "purple" | "amber" | "cyan" | "red";

export async function getPublishedPosts() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);

  // 中文注释：统一按发布时间倒序，避免首页、列表页、标签页排序不一致。
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export async function getPinnedPost() {
  const posts = await getPublishedPosts();
  return posts.find((post) => post.data.pinned) ?? posts[0];
}

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

export function getPostSlug(post: { id: string }) {
  return post.id.replace(/\.(md|mdx)$/u, "");
}

export function groupPostsBySection<T extends { data: { section: string } }>(posts: T[]) {
  return posts.reduce<Record<string, T[]>>((groups, post) => {
    const key = post.data.section;
    if (!groups[key]) groups[key] = [];
    groups[key].push(post);
    return groups;
  }, {});
}

export function slugifyTag(tag: string) {
  return tag.toLowerCase();
}
