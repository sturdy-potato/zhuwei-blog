// 中文注释：根据页面滚动进度更新顶部阅读进度条宽度。
function updateReadingProgress() {
  const progressBar = document.querySelector(".reading-progress");
  if (!(progressBar instanceof HTMLElement)) return;

  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  const maxScrollable = scrollHeight - clientHeight;
  const percent = maxScrollable > 0 ? (scrollTop / maxScrollable) * 100 : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateReadingProgress, { once: true });
} else {
  updateReadingProgress();
}
