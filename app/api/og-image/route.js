// app/api/og-image/route.js
export const dynamic = "force-dynamic";

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}

function extractOgImage(html, baseUrl) {
  // หา og:image
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  let url = m?.[1];

  // ถ้าเป็น path relative → ทำให้เป็น absolute
  try {
    if (url) url = new URL(url, baseUrl).toString();
  } catch (_) {
    url = null;
  }

  // สำรอง: twitter:image
  if (!url) {
    const t = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    let turl = t?.[1];
    try { if (turl) turl = new URL(turl, baseUrl).toString(); } catch (_) { turl = null; }
    url = turl || null;
  }
  return url;
}

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return Response.json({ imageUrl: null }, { status: 400 });
    const html = await fetchHtml(url);
    const imageUrl = extractOgImage(html, url) || null;
    return Response.json({ imageUrl });
  } catch (e) {
    return Response.json({ imageUrl: null }, { status: 200 });
  }
}
