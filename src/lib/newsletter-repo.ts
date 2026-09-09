export const REPO_OWNER = 'steve-meyers';
export const REPO_NAME = 'villa-park-friends-and-neighbors';
export const SAVE_DIR = 'email-templates/sent';

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[a-z0-9-]{1,80}$/.test(slug);
}

export function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };
}

/**
 * Confirms the request carries a live Netlify Identity session by asking GoTrue
 * directly, rather than decoding the nf_jwt cookie ourselves — this stays correct
 * regardless of how the Netlify adapter shapes the underlying function runtime.
 */
export async function verifyLoggedIn(request: Request, jwt: string): Promise<boolean> {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/.netlify/identity/user`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  return response.ok;
}
