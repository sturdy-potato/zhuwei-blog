import { ensurePostMetrics, getPostMetrics, getStatDefaultsFromRequest, json, type Env } from "../../../_lib/db";
import type { PagesFunction } from "../../../_lib/cf";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug;
  if (!slug) return json({ ok: false, message: "缺少文章 slug" }, { status: 400 });

  const defaults = getStatDefaultsFromRequest(context.request);
  await ensurePostMetrics(context.env, slug, defaults);
  const metrics = await getPostMetrics(context.env, slug);

  return json({ ok: true, metrics });
};
