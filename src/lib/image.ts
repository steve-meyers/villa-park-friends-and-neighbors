/**
 * Builds a Netlify Image CDN URL to resize/optimize an image stored in the repo.
 * Works automatically on Netlify with no config; images admins upload full-size
 * via the CMS get served at a reasonable size instead of their original bytes.
 */
export function optimizedImage(src: string, width: number, quality = 75) {
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
