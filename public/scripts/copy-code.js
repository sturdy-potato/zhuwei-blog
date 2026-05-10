// 中文注释：为文章代码块注入复制按钮，并补齐语言标签来源。
const CODE_BLOCK_SELECTOR = "pre.astro-code";

function resolveLanguage(codeElement) {
  const classNames = (codeElement.className || "").split(/\s+/);
  const languageClass = classNames.find((name) => name.startsWith("language-"));
  if (!languageClass) return "";
  return languageClass.replace("language-", "").trim();
}

function enhanceCodeBlocks() {
  const codeBlocks = document.querySelectorAll(CODE_BLOCK_SELECTOR);
  codeBlocks.forEach((pre) => {
    if (!(pre instanceof HTMLElement)) return;
    if (pre.querySelector(".copy-btn")) return;

    const code = pre.querySelector("code");
    if (!(code instanceof HTMLElement)) return;

    if (!pre.dataset.language) {
      const language = resolveLanguage(code);
      if (language) pre.dataset.language = language;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "copy";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = "copied!";
        window.setTimeout(() => {
          button.textContent = "copy";
        }, 2000);
      } catch {
        button.textContent = "failed";
        window.setTimeout(() => {
          button.textContent = "copy";
        }, 2000);
      }
    });
    pre.appendChild(button);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceCodeBlocks, { once: true });
} else {
  enhanceCodeBlocks();
}
