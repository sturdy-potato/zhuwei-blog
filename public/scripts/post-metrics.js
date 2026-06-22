// 中文注释：列表页统一批量读取文章指标，接口不可用时保留构建期的静态数值。
const postNodes = [...document.querySelectorAll("[data-post-slug]")];
const hotNodes = [...document.querySelectorAll("[data-hot-slug]")];
// 中文注释：详情页没有文章列表节点，因此还要收集全局热门文章栏中的 slug，保证排行与阅读量可以同步更新。
const slugs = [
  ...new Set([
    ...postNodes.map((node) => node.dataset.postSlug),
    ...hotNodes.map((node) => node.dataset.hotSlug)
  ].filter(Boolean))
];

function updateMetric(selector, value) {
  for (const node of document.querySelectorAll(selector)) {
    const valueNode = node.querySelector("span");
    if (valueNode) valueNode.textContent = Number(value || 0).toLocaleString("zh-CN");
  }
}

// 中文注释：接口可能只返回已经写入 D1 的文章，缺失记录必须继续使用页面中的构建期初始值。
function readFallbackViews(slug) {
  // 中文注释：详情页只有热门文章节点，因此优先读取列表数据，不存在时再读取热门栏中的构建期数值。
  const valueNode = document.querySelector(`[data-post-views="${CSS.escape(slug)}"] span`)
    ?? document.querySelector(`[data-hot-views="${CSS.escape(slug)}"] span`);
  if (!valueNode) return 0;
  return Number((valueNode.textContent || "0").replaceAll(",", "")) || 0;
}

// 中文注释：热门文章初始顺序使用 frontmatter；接口返回后再按 D1 阅读量重排，避免显示真实数字却保留旧排行。
function sortHotPosts(metrics) {
  for (const list of document.querySelectorAll(".platform-hot-list")) {
    const items = [...list.querySelectorAll("[data-hot-item]")];
    items.sort((a, b) => {
      const aSlug = a.dataset.hotSlug || "";
      const bSlug = b.dataset.hotSlug || "";
      const aViews = metrics[aSlug]?.views ?? readFallbackViews(aSlug);
      const bViews = metrics[bSlug]?.views ?? readFallbackViews(bSlug);
      return Number(bViews || 0) - Number(aViews || 0);
    });

    items.forEach((item, index) => {
      const rank = item.querySelector(".platform-hot-rank");
      if (rank) {
        rank.textContent = String(index + 1);
        rank.classList.toggle("is-top", index < 3);
      }
      list.append(item);
    });
  }
}

if (slugs.length) {
  fetch(`/api/posts/metrics?slugs=${encodeURIComponent(slugs.join(","))}`)
    .then((response) => response.json())
    .then((result) => {
      if (!result?.ok || !result.metrics) return;

      let totalViews = 0;
      for (const slug of slugs) {
        const metric = result.metrics[slug];
        totalViews += metric ? Number(metric.views || 0) : readFallbackViews(slug);
        if (!metric) continue;
        updateMetric(`[data-post-views="${CSS.escape(slug)}"]`, metric.views);
        updateMetric(`[data-post-comments="${CSS.escape(slug)}"]`, metric.comment_count);
        updateMetric(`[data-hot-views="${CSS.escape(slug)}"]`, metric.views);
      }

      const totalViewsNode = document.querySelector("[data-total-views] strong");
      if (totalViewsNode) totalViewsNode.textContent = totalViews.toLocaleString("zh-CN");
      sortHotPosts(result.metrics);
    })
    .catch(() => {});
}
