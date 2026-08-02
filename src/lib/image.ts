/**
 * Builds a Netlify Image CDN URL to resize/optimize an image stored in the repo.
 * Works automatically on Netlify with no config; images admins upload full-size
 * via the CMS get served at a reasonable size instead of their original bytes.
 * The CDN endpoint only exists on deployed Netlify sites, so in local dev we
 * fall back to the original image to keep previews working.
 */
export function optimizedImage(src: string, width: number, quality = 75) {
  if (import.meta.env.DEV) return src;
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
