// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { rehypeOptimizeImages } from './src/lib/rehype-optimize-images.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://villaparkfans.com',
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    rehypePlugins: [rehypeOptimizeImages]
  }
});