import type { APIRoute } from 'astro';
import { REPO_OWNER, REPO_NAME, SAVE_DIR, jsonResponse, githubHeaders, verifyLoggedIn } from '../../../lib/newsletter-repo';

export const prerender = false;

interface GitHubContentEntry {
  name: string;
  type: string;
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const jwt = cookies.get('nf_jwt')?.value;
  if (!jwt || !(await verifyLoggedIn(request, jwt))) {
    return jsonResponse({ error: 'You need to be logged in to view saved newsletters.' }, 401);
  }

  const token = import.meta.env.GITHUB_CONTENT_TOKEN;
  if (!token) {
    return jsonResponse(
      { error: 'The server is not configured to read from the repo yet (missing GITHUB_CONTENT_TOKEN).' },
      500
    );
  }

  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SAVE_DIR}?ref=main`;
  const response = await fetch(apiUrl, { headers: githubHeaders(token) });

  if (response.status === 404) {
    return jsonResponse({ items: [] }, 200);
  }
  if (!response.ok) {
    return jsonResponse({ error: `GitHub returned ${response.status} while listing saved newsletters.` }, 502);
  }

  const data: GitHubContentEntry[] = await response.json();
  const items = Array.isArray(data)
    ? data
        .filter((entry) => entry.type === 'file' && entry.name.endsWith('.json'))
        .map((entry) => entry.name.replace(/\.json$/, ''))
        .sort()
        .reverse()
    : [];

  return jsonResponse({ items }, 200);
};
