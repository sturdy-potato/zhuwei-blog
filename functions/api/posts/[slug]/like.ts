import type { PagesFunction } from "@cloudflare/workers-types";
import {
  createVisitorFingerprint,
  ensurePostMetrics,
  getPostMetrics,
  json,
  parseJsonBody,
  type Env,
  type PostMetricDefaults
} from "../../../_lib/db";

interface LikePayload {
  initialViews?: number;
  initialLikes?: number;
  initialComments?: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug;
  if (!slug) return json({ ok: false, message: "缺少文章 slug" }, { status: 400 });

  const payload = await parseJsonBody<LikePayload>(context.request);
  const defaults: PostMetricDefaults = {
    views: payload?.initialViews ?? 0,
    likes: payload?.initialLikes ?? 0,
    comments: payload?.initialComments ?? 0
  };

  await ensurePostMetrics(context.env, slug, defaults);

  const fingerprint = await createVisitorFingerprint(context.request);

  try {
    // 中文注释：点赞通过唯一指纹约束去重，同一访客对同一篇文章只能成功点赞一次。
    await context.env.BLOG_DB.batch([
      context.env.BLOG_DB.prepare(
        `
          INSERT INTO post_like_events (post_slug, fingerprint)
          VALUES (?1, ?2)
        `
      ).bind(slug, fingerprint),
      context.env.BLOG_DB.prepare(
        `
          UPDATE post_metrics
          SET likes = likes + 1,
              updated_at = datetime('now')
          WHERE post_slug = ?1
        `
      ).bind(slug)
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("UNIQUE")) {
      return json({ ok: false, message: "点赞失败，请稍后重试" }, { status: 500 });
    }
  }

  const metrics = await getPostMetrics(context.env, slug);
  const liked = await context.env.BLOG_DB.prepare(
    `
      SELECT 1
      FROM post_like_events
      WHERE post_slug = ?1
        AND fingerprint = ?2
      LIMIT 1
    `
  )
    .bind(slug, fingerprint)
    .first();

  return json({ ok: true, metrics, liked: Boolean(liked) });
};
