import { visit } from 'unist-util-visit';
import { optimizedImage } from './image';

/**
 * Rewrites <img> tags in rendered markdown content (blog post bodies, etc.)
 * to route through the Netlify Image CDN, same as featured images. Only
 * touches local/relative paths — external image URLs are left untouched.
 */
export function rehypeOptimizeImages() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img' || !node.properties?.src) return;
      const src = node.properties.src;
      if (typeof src !== 'string' || !src.startsWith('/')) return;
      node.properties.src = optimizedImage(src, 1400);
    });
  };
}
