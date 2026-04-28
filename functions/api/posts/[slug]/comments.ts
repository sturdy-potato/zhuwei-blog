import {
  createVisitorFingerprint,
  ensurePostMetrics,
  getPostMetrics,
  json,
  parseJsonBody,
  type Env,
  verifyTurnstileIfNeeded
} from "../../../_lib/db";
import type { PagesFunction } from "../../../_lib/cf";

interface CommentPayload {
  nickname?: string;
  content?: string;
  turnstileToken?: string | null;
  initialViews?: number;
  initialLikes?: number;
  initialComments?: number;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug;
  if (!slug) return json({ ok: false, message: "缺少文章 slug" }, { status: 400 });

  const comments = await context.env.BLOG_DB.prepare(
    `
      SELECT id, nickname, content, created_at
      FROM comments
      WHERE post_slug = ?1
        AND status = 'approved'
      ORDER BY id DESC
    `
  )
    .bind(slug)
    .all<{ id: number; nickname: string; content: string; created_at: string }>();

  return json({ ok: true, comments: comments.results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug;
  if (!slug) return json({ ok: false, message: "缺少文章 slug" }, { status: 400 });

  const payload = await parseJsonBody<CommentPayload>(context.request);
  const nickname = payload?.nickname?.trim() ?? "";
  const content = payload?.content?.trim() ?? "";

  if (nickname.length < 2 || nickname.length > 24) {
    return json({ ok: false, message: "昵称长度需要在 2 到 24 个字符之间" }, { status: 400 });
  }
  if (content.length < 3 || content.length > 500) {
    return json({ ok: false, message: "评论内容长度需要在 3 到 500 个字符之间" }, { status: 400 });
  }

  const turnstileCheck = await verifyTurnstileIfNeeded(
    context.env,
    payload?.turnstileToken,
    context.request.headers.get("CF-Connecting-IP")
  );
  if (!turnstileCheck.ok) {
    return json({ ok: false, message: turnstileCheck.message }, { status: 400 });
  }

  await ensurePostMetrics(context.env, slug, {
    views: payload?.initialViews ?? 0,
    likes: payload?.initialLikes ?? 0,
    comments: payload?.initialComments ?? 0
  });

  const fingerprint = await createVisitorFingerprint(context.request);

  // 中文注释：评论默认直接公开，后续如需审核只要把 status 改成 pending 并补后台审核即可。
  await context.env.BLOG_DB.batch([
    context.env.BLOG_DB.prepare(
      `
        INSERT INTO comments (post_slug, nickname, content, fingerprint, status)
        VALUES (?1, ?2, ?3, ?4, 'approved')
      `
    ).bind(slug, nickname, content, fingerprint),
    context.env.BLOG_DB.prepare(
      `
        UPDATE post_metrics
        SET comment_count = comment_count + 1,
            updated_at = datetime('now')
        WHERE post_slug = ?1
      `
    ).bind(slug)
  ]);

  const metrics = await getPostMetrics(context.env, slug);
  return json({ ok: true, metrics });
};
