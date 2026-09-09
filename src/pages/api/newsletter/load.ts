import type { APIRoute } from 'astro';
import { REPO_OWNER, REPO_NAME, SAVE_DIR, isValidSlug, jsonResponse, githubHeaders, verifyLoggedIn } from '../../../lib/newsletter-repo';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const jwt = cookies.get('nf_jwt')?.value;
  if (!jwt || !(await verifyLoggedIn(request, jwt))) {
    return jsonResponse({ error: 'You need to be logged in to load a saved newsletter.' }, 401);
  }

  const token = import.meta.env.GITHUB_CONTENT_TOKEN;
  if (!token) {
    return jsonResponse(
      { error: 'The server is not configured to read from the repo yet (missing GITHUB_CONTENT_TOKEN).' },
      500
    );
  }

  const slug = url.searchParams.get('slug');
  if (!isValidSlug(slug)) {
    return jsonResponse({ error: 'Invalid file name.' }, 400);
  }

  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SAVE_DIR}/${slug}.json?ref=main`;
  const response = await fetch(apiUrl, { headers: githubHeaders(token) });

  if (response.status === 404) {
    return jsonResponse({ error: 'That newsletter was not found in the repo.' }, 404);
  }
  if (!response.ok) {
    return jsonResponse({ error: `GitHub returned ${response.status} while loading ${slug}.` }, 502);
  }

  const data = await response.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');

  let state: unknown;
  try {
    state = JSON.parse(content);
  } catch {
    return jsonResponse({ error: 'That saved file is not valid JSON.' }, 502);
  }

  return jsonResponse({ slug, state }, 200);
};
