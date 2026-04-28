import {
  createVisitorFingerprint,
  ensurePostMetrics,
  getPostMetrics,
  json,
  parseJsonBody,
  type Env,
  type PostMetricDefaults
} from "../../../_lib/db";
import type { PagesFunction } from "../../../_lib/cf";

interface ViewPayload {
  initialViews?: number;
  initialLikes?: number;
  initialComments?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug;
  if (!slug) return json({ ok: false, message: "缺少文章 slug" }, { status: 400 });

  const payload = await parseJsonBody<ViewPayload>(context.request);
  const defaults: PostMetricDefaults = {
    views: payload?.initialViews ?? 0,
    likes: payload?.initialLikes ?? 0,
    comments: payload?.initialComments ?? 0
  };

  await ensurePostMetrics(context.env, slug, defaults);

  const fingerprint = await createVisitorFingerprint(context.request);
  const recent = await context.env.BLOG_DB.prepare(
    `
      SELECT id
      FROM post_view_events
      WHERE post_slug = ?1
        AND fingerprint = ?2
        AND created_at > datetime('now', '-6 hours')
      LIMIT 1
    `
  )
    .bind(slug, fingerprint)
    .first<{ id: number }>();

  if (!recent) {
    // 中文注释：同一访客在 6 小时内重复打开同一文章不重复计数，避免统计噪音过大。
    await context.env.BLOG_DB.batch([
      context.env.BLOG_DB.prepare(
        `
          INSERT INTO post_view_events (post_slug, fingerprint)
          VALUES (?1, ?2)
        `
      ).bind(slug, fingerprint),
      context.env.BLOG_DB.prepare(
        `
          UPDATE post_metrics
          SET views = views + 1,
              updated_at = datetime('now')
          WHERE post_slug = ?1
        `
      ).bind(slug)
    ]);
  }

  const metrics = await getPostMetrics(context.env, slug);
  return json({ ok: true, metrics, counted: !recent });
};
