import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string(),
    section: z.string(),
    tags: z.array(z.string()),
    color: z.enum(["blue", "green", "purple", "amber", "cyan", "red"]),
    icon: z.string(),
    minutes: z.number(),
    views: z.number(),
    comments: z.number(),
    featured: z.boolean().default(false),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false)
  })
});

export const collections = { blog };
