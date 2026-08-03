import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string().default('Neighborhood Team'),
    summary: z.string().optional(),
    image: z.string().optional(),
    circles: z.array(z.string()).optional(),
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: z.object({
    title: z.string(),
    url: z.string().url().optional(),
    order: z.number().default(0),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
  }),
});

const circles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/circles' }),
  schema: z.object({
    title: z.string(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    url: z.string().url(),
    category: z.string(),
    order: z.number().default(0),
  }),
});

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gallery' }),
  schema: z.object({
    photos: z
      .array(
        z.object({
          image: z.string(),
          alt: z.string().default(''),
        })
      )
      .default([]),
  }),
});

export const collections = { blog, resources, pages, circles, news, gallery };
