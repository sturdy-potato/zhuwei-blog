// 中文注释：基于可见标题更新目录高亮状态，保持阅读位置感知。
function updateActiveToc() {
  const headingNodes = Array.from(document.querySelectorAll(".article-content h2[id], .article-content h3[id]"));
  const tocLinks = Array.from(document.querySelectorAll(".toc a[data-toc-link]"));
  if (!headingNodes.length || !tocLinks.length) return;

  const linkMap = new Map();
  tocLinks.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    const id = link.dataset.tocLink;
    if (id) linkMap.set(id, link);
  });

  const setActive = (id) => {
    tocLinks.forEach((link) => link.classList.remove("active"));
    const target = linkMap.get(id);
    if (target) target.classList.add("active");
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const topEntry = visible[0];
      const id = topEntry.target.getAttribute("id");
      if (id) setActive(id);
    },
    { rootMargin: "0px 0px -80% 0px", threshold: 0.01 }
  );

  headingNodes.forEach((node) => observer.observe(node));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateActiveToc, { once: true });
} else {
  updateActiveToc();
}
