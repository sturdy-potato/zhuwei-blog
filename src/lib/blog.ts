import { getCollection } from "astro:content";

export type ColorName = "blue" | "green" | "purple" | "amber" | "cyan" | "red";
export interface CategoryChildStat {
  name: string;
  slug: string;
  count: number;
}

export interface CategoryStat {
  name: string;
  slug: string;
  count: number;
  color: ColorName;
  children: CategoryChildStat[];
}
const HIDE_ALL_POSTS = false;

export async function getPublishedPosts() {
  if (HIDE_ALL_POSTS) {
    return [];
  }
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

// 中文注释：section 作为一级分类、category 作为二级分类；tags 只服务文章标签页，不再塞进分类侧栏。
export function getCategoryStats<T extends { data: { section: string; category: string; color?: ColorName } }>(posts: T[]): CategoryStat[] {
  const categories = new Map<string, CategoryStat>();

  for (const post of posts) {
    const name = post.data.section.trim();
    let category = categories.get(name);
    if (!category) {
      category = {
        name,
        slug: slugifyTag(name),
        count: 0,
        color: post.data.color ?? "blue",
        children: []
      };
      categories.set(name, category);
    }
    category.count += 1;

    // 中文注释：同一一级分类下按二级分类累计文章数，避免标签过多导致子目录失控。
    const childName = post.data.category.trim();
    const childSlug = slugifyTag(childName);
    const child = category.children.find((item) => item.slug === childSlug);
    if (child) child.count += 1;
    else category.children.push({ name: childName, slug: childSlug, count: 1 });
  }

  // 中文注释：文章多的分类优先展示；数量相同时按中文名称稳定排序，避免构建后顺序漂移。
  return [...categories.values()]
    .map((category) => ({
      ...category,
      children: category.children.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"))
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
}

export function slugifyTag(tag: string) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[\/\s]+/g, "-")
    .replace(/-+/g, "-");
}
