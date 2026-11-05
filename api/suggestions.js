export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const urlObj = new URL(req.url);
  const query = (urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || '').trim();

  if (!query) {
    return new Response(JSON.stringify({ success: true, suggestions: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  let suggestions = [];
  try {
    const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const resp = await fetch(suggestUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data?.[1])) {
        suggestions = data[1].slice(0, 8);
      }
    }
  } catch (err) {
    console.warn('[Suggestions Edge] Error:', err.message);
  }

  return new Response(JSON.stringify({
    success: true,
    query,
    suggestions
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200'
    }
  });
}
