import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert";

export default defineConfig({
  site: "https://zhuwei.fun",
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGithubBlockquoteAlert],
    shikiConfig: {
      theme: "github-light"
    }
  }
});
