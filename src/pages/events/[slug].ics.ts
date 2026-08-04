export const prerender = false;

import type { APIRoute } from 'astro';
import { fetchEventByShortId, buildIcsContent, shortIdFromSlug } from '../../lib/calendar';

export const GET: APIRoute = async ({ params }) => {
  const shortId = params.slug ? shortIdFromSlug(params.slug) : undefined;
  let event;
  try {
    event = shortId ? await fetchEventByShortId(shortId) : null;
  } catch (err) {
    console.error('Failed to load event for .ics', err);
    return new Response('Failed to load event', { status: 502 });
  }

  if (!event) {
    return new Response('Event not found', { status: 404 });
  }

  return new Response(buildIcsContent(event), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.id}.ics"`,
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60',
    },
  });
};
