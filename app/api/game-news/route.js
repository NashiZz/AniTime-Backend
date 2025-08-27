// app/api/game-news/route.js
export const dynamic = "force-dynamic";

// ⬇️ ตัวอย่างฟังก์ชันอ่าน RSS คร่าว ๆ (ถ้าคุณมีของเดิมอยู่แล้ว ใช้ของเดิม + map เพิ่มก็พอ)
async function fetchRss(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error("rss fetch failed");
  const xml = await res.text();

  // ดึง enclosure ถ้ามี
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1];
    const get = (tag) => (block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "").trim();
    const enc = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] || null;
    return {
      id: get("guid") || get("link") || get("title"),
      title: get("title"),
      url: get("link"),
      publishedAt: get("pubDate"),
      source: (new URL(url)).hostname.replace(/^www\./, ""),
      enclosureUrl: enc,
    };
  });

  return items;
}

async function fetchOgImage(url) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/og-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.imageUrl || null;
  } catch {
    return null;
  }
}

// ฟังก์ชันรวมข่าวจากหลายแหล่ง
async function aggregate() {
  // ตัวอย่าง RSS (คุณปรับ/เพิ่มเองได้)
  const feeds = [
    // HoYoLab – ข่าวรวม (ปรับลิงก์ภาษาที่คุณต้องการ)
    "https://www.hoyolab.com/official/article/0?_format=rss", // all
    // Wuthering Waves (Kuro)
    "https://wuthering.gg/news.xml", // สมมติ (ถ้ามี RSS อย่างเป็นทางการให้แทน)
    // ใส่ลิงก์ RSS อื่น ๆ ของ Star Rail, ZZZ, Genshin ที่คุณต้องการ
  ];

  const all = (await Promise.allSettled(feeds.map((f) => fetchRss(f))))
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // unique by URL/ID + เติม imageUrl
  const seen = new Set();
  const items = [];
  for (const it of all) {
    const k = it.url || it.id;
    if (!k || seen.has(k)) continue;
    seen.add(k);

    let imageUrl = it.enclosureUrl || null;
    if (!imageUrl && it.url) {
      imageUrl = await fetchOgImage(it.url); // ดึง og:image
    }
    // fallback เป็น favicon (อย่างน้อยมีรูปเล็ก)
    if (!imageUrl && it.url) {
      try {
        const d = new URL(it.url).hostname;
        imageUrl = `https://www.google.com/s2/favicons?domain=${d}&sz=128`;
      } catch {}
    }

    items.push({ ...it, imageUrl });
  }

  // sort ล่าสุดก่อน
  items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return items.slice(0, 30);
}

export async function GET() {
  try {
    const items = await aggregate();
    return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ items: [] }, { status: 200 });
  }
}
