// 中文注释：归档搜索只过滤已经静态输出的文章，不依赖额外接口，JavaScript 失败时仍展示完整列表。
const params = new URLSearchParams(window.location.search);
const keyword = (params.get("q") || "").trim().toLocaleLowerCase("zh-CN");
const searchInput = document.querySelector("#site-search");
const resultNode = document.querySelector("[data-search-result]");
const emptyNode = document.querySelector("[data-search-empty]");

if (searchInput instanceof HTMLInputElement && keyword) searchInput.value = params.get("q") || "";

if (keyword) {
  let visibleCount = 0;
  for (const article of document.querySelectorAll("[data-search-text]")) {
    const matched = (article.dataset.searchText || "").includes(keyword);
    article.hidden = !matched;
    if (matched) visibleCount += 1;
  }

  if (resultNode) resultNode.textContent = `“${params.get("q")}” 找到 ${visibleCount} 篇文章`;
  if (emptyNode instanceof HTMLElement) emptyNode.hidden = visibleCount > 0;
}
