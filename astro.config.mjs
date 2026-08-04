// @ts-check
import { defineConfig } from 'astro/config';

import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';
import { rehypeOptimizeImages } from './src/lib/rehype-optimize-images.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://villaparkfans.com',
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    rehypePlugins: [rehypeOptimizeImages]
  }
});