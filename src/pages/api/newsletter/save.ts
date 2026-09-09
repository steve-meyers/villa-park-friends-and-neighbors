import type { APIRoute } from 'astro';
import { REPO_OWNER, REPO_NAME, SAVE_DIR, isValidSlug, jsonResponse, githubHeaders, verifyLoggedIn } from '../../../lib/newsletter-repo';

export const prerender = false;

async function commitFile(token: string, path: string, content: string, message: string): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const headers = { ...githubHeaders(token), 'Content-Type': 'application/json' };

  let sha: string | undefined;
  const existing = await fetch(`${apiUrl}?ref=main`, { headers });
  if (existing.status === 200) {
    const data = await existing.json();
    sha = data.sha;
  } else if (existing.status !== 404) {
    throw new Error(`GitHub returned ${existing.status} while checking for an existing file at ${path}`);
  }

  const base64Content = Buffer.from(content, 'utf-8').toString('base64');
  const putResponse = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: 'main',
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putResponse.ok) {
    const errorBody = await putResponse.text();
    throw new Error(`GitHub returned ${putResponse.status} while saving ${path}: ${errorBody}`);
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const jwt = cookies.get('nf_jwt')?.value;
  if (!jwt || !(await verifyLoggedIn(request, jwt))) {
    return jsonResponse({ error: 'You need to be logged in to save to the repo.' }, 401);
  }

  const token = import.meta.env.GITHUB_CONTENT_TOKEN;
  if (!token) {
    return jsonResponse(
      { error: 'The server is not configured to save to the repo yet (missing GITHUB_CONTENT_TOKEN).' },
      500
    );
  }

  let body: { slug?: unknown; html?: unknown; plainText?: unknown; state?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  if (!isValidSlug(body.slug)) {
    return jsonResponse({ error: 'File name must be lowercase letters, numbers, and hyphens only.' }, 400);
  }
  if (typeof body.html !== 'string' || !body.html.trim()) {
    return jsonResponse({ error: 'Missing HTML content.' }, 400);
  }

  const files = [
    { path: `${SAVE_DIR}/${body.slug}.html`, content: body.html },
    { path: `${SAVE_DIR}/${body.slug}.json`, content: JSON.stringify(body.state ?? {}, null, 2) },
  ];

  const savedFiles: string[] = [];
  for (const file of files) {
    try {
      await commitFile(token, file.path, file.content, `Save newsletter draft: ${body.slug}`);
      savedFiles.push(file.path);
    } catch (err) {
      return jsonResponse(
        {
          error: `Saved ${savedFiles.length} of ${files.length} files before failing on ${file.path}: ${
            err instanceof Error ? err.message : String(err)
          }`,
          savedFiles,
        },
        502
      );
    }
  }

  return jsonResponse({ ok: true, savedFiles }, 200);
};
