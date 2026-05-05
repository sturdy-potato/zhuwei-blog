import { json, type Env } from "../../_lib/db";
import type { PagesFunction } from "../../_lib/cf";

interface MetricRow {
  post_slug: string;
  views: number;
  likes: number;
  comment_count: number;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const rawSlugs = url.searchParams.get("slugs") ?? "";
  const slugs = rawSlugs
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (!slugs.length) {
    return json({ ok: true, metrics: {} });
  }

  const placeholders = slugs.map((_, index) => `?${index + 1}`).join(", ");
  const statement = context.env.BLOG_DB.prepare(
    `
      SELECT post_slug, views, likes, comment_count
      FROM post_metrics
      WHERE post_slug IN (${placeholders})
    `
  ).bind(...slugs);

  const { results = [] } = await statement.all<MetricRow>();
  const metricMap = Object.fromEntries(
    results.map((row) => [
      row.post_slug,
      {
        views: Number(row.views || 0),
        likes: Number(row.likes || 0),
        comment_count: Number(row.comment_count || 0)
      }
    ])
  );

  return json({ ok: true, metrics: metricMap });
};
