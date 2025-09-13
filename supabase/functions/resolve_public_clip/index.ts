// Placeholder edge function handler for resolving a public clip by slug
// Implement with Deno runtime when deploying to Supabase Edge Functions
export async function main(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response('Missing slug', { status: 400 });
  // TODO: query bookmarks by public_slug, return payload
  return new Response(JSON.stringify({ slug }), {
    headers: { 'content-type': 'application/json' },
  });
}


