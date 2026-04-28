import type { D1Database } from "./cf";

export interface Env {
  BLOG_DB: D1Database;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export interface PostMetricDefaults {
  views?: number;
  likes?: number;
  comments?: number;
}

export interface PostMetrics {
  post_slug: string;
  views: number;
  likes: number;
  comment_count: number;
}

// 中文注释：统一初始化文章统计行，保证阅读、点赞、评论三套接口共用同一份基线数据。
export async function ensurePostMetrics(env: Env, slug: string, defaults: PostMetricDefaults = {}) {
  await env.BLOG_DB.prepare(
    `
      INSERT INTO post_metrics (post_slug, views, likes, comment_count)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(post_slug) DO NOTHING
    `
  )
    .bind(slug, defaults.views ?? 0, defaults.likes ?? 0, defaults.comments ?? 0)
    .run();
}

export async function getPostMetrics(env: Env, slug: string) {
  const result = await env.BLOG_DB.prepare(
    `
      SELECT post_slug, views, likes, comment_count
      FROM post_metrics
      WHERE post_slug = ?1
      LIMIT 1
    `
  )
    .bind(slug)
    .first<PostMetrics>();

  return result ?? { post_slug: slug, views: 0, likes: 0, comment_count: 0 };
}

// 中文注释：把 IP 和 UA 摘要成固定指纹，用来做轻量去重，不直接把原始信息落库。
export async function createVisitorFingerprint(request: Request) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown-ip";
  const ua = request.headers.get("User-Agent") ?? "unknown-ua";
  const raw = `${ip}::${ua}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function getStatDefaultsFromRequest(request: Request) {
  const url = new URL(request.url);
  return {
    views: Number(url.searchParams.get("initialViews") ?? 0) || 0,
    likes: Number(url.searchParams.get("initialLikes") ?? 0) || 0,
    comments: Number(url.searchParams.get("initialComments") ?? 0) || 0
  };
}

export async function parseJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {})
    }
  });
}

// 中文注释：评论接口默认可直接使用，若后续开启 Turnstile，则只在服务端校验通过后放行。
export async function verifyTurnstileIfNeeded(env: Env, token?: string | null, ip?: string | null) {
  if (env.TURNSTILE_ENABLED !== "true") return { ok: true };
  if (!env.TURNSTILE_SECRET_KEY) return { ok: false, message: "服务端缺少 Turnstile 密钥配置" };
  if (!token) return { ok: false, message: "缺少人机校验令牌" };

  const formData = new URLSearchParams();
  formData.set("secret", env.TURNSTILE_SECRET_KEY);
  formData.set("response", token);
  if (ip) formData.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });
  const result = (await response.json()) as { success?: boolean };
  return result.success ? { ok: true } : { ok: false, message: "人机校验未通过" };
}
