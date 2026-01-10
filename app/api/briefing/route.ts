import { NextResponse } from "next/server";

type FeedItem = {
  source: string;
  title: string;
  url: string;
  publishedAt?: string | null;
  summary?: string | null;
  category?: string;
};

type Rates = {
  reference?: { value?: string; date?: string } | null;
  lombard?: { value?: string; date?: string } | null;
  deposit?: { value?: string; date?: string } | null;
  discount?: { value?: string; date?: string } | null;
  rediscount?: { value?: string; date?: string } | null;
  rawText?: string | null;
};

const FEEDS: { source: string; url: string; category: string }[] = [
  // NBP RSS (kursy) â€“ dziaĹ‚a jako XML, pobieramy tylko jako news/ĹşrĂłdĹ‚o oficjalne
  { source: "NBP (RSS)", url: "https://rss.nbp.pl/kursy/TabelaA.xml", category: "Makro" },

  // UOKiK RSS (moĹĽe dotyczyÄ‡ rynku/umĂłw/deweloperĂłw)
  { source: "UOKiK (RSS)", url: "https://uokik.gov.pl/feed", category: "Prawo / Rynek" },

  // PAP SamorzÄ…d (czÄ™sto: mieszkaniĂłwka, planowanie, podaĹĽ)
  { source: "PAP SamorzÄ…d (RSS)", url: "https://samorzad.pap.pl/rss.xml", category: "Rynek / Regulacje" },
];

function stripHtml(s: string) {
  return (s || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(block: string, tag: string) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m?.[1] ? stripHtml(m[1]) : "";
}

function pickAttr(block: string, tag: string, attr: string) {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*\\/?>`, "i");
  const m = block.match(re);
  return m?.[1] ? m[1].trim() : "";
}

function parseRssOrAtom(xml: string, source: string, category: string): FeedItem[] {
  const items: FeedItem[] = [];

  // RSS <item>
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const it of rssItems) {
    const title = pickTag(it, "title");
    const url = pickTag(it, "link");
    const publishedAt = pickTag(it, "pubDate") || pickTag(it, "dc:date") || null;
    const summary = pickTag(it, "description") || null;
    if (title && url) {
      items.push({ source, title, url, publishedAt, summary, category });
    }
  }

  // Atom <entry>
  if (items.length === 0) {
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    for (const e of entries) {
      const title = pickTag(e, "title");
      const url = pickAttr(e, "link", "href") || pickTag(e, "id");
      const publishedAt = pickTag(e, "updated") || pickTag(e, "published") || null;
      const summary = pickTag(e, "summary") || pickTag(e, "content") || null;
      if (title && url) {
        items.push({ source, title, url, publishedAt, summary, category });
      }
    }
  }

  return items;
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (CalyxAI; +https://example.local)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    // cache w Next (ĹĽeby nie mieliÄ‡ non stop)
    next: { revalidate: 60 * 15 }, // 15 minut
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

/**
 * Pobiera podstawowe stopy NBP z oficjalnej strony (HTML).
 * To nie jest API, ale jest stabilne i szybkie.
 */
async function fetchNbpRates(): Promise<Rates> {
  const url = "https://nbp.pl/polityka-pieniezna/decyzje-rpp/podstawowe-stopy-procentowe-nbp/";
  const { ok, text } = await fetchText(url);
  if (!ok) return { rawText: null };

  // bardzo proste wyĹ‚uskanie liczb typu "4,00" i daty "2025-12-04" ze strony
  // (dziaĹ‚a â€śwystarczajÄ…coâ€ť dla UI; jak NBP zmieni HTML â€“ Ĺ‚atwo poprawiÄ‡)
  const clean = stripHtml(text);

  const grab = (label: string) => {
    // szukamy: "Stopa referencyjna ... 4,00 ... 2025-12-04"
    const re = new RegExp(`${label}[\\s\\S]{0,120}?([0-9],[0-9]{2})[\\s\\S]{0,120}?(20\\d{2}-\\d{2}-\\d{2})`, "i");
    const m = clean.match(re);
    if (!m) return null;
    return { value: m[1], date: m[2] };
  };

  return {
    reference: grab("Stopa referencyjna"),
    lombard: grab("Stopa lombardowa"),
    deposit: grab("Stopa depozytowa"),
    rediscount: grab("Stopa redyskontowa"),
    discount: grab("Stopa dyskontowa"),
    rawText: null,
  };
}

export async function GET() {
  try {
    const rates = await fetchNbpRates();

    const all: FeedItem[] = [];
    for (const f of FEEDS) {
      try {
        const { ok, text } = await fetchText(f.url);
        if (!ok || !text) continue;
        const parsed = parseRssOrAtom(text, f.source, f.category);
        all.push(...parsed);
      } catch {
        // ignore
      }
    }

    // sort po dacie (jak siÄ™ da), inaczej po prostu zostaje kolejnoĹ›Ä‡
    const sorted = all
      .slice()
      .sort((a, b) => {
        const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return db - da;
      })
      .slice(0, 50);

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      rates,
      items: sorted,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "BĹ‚Ä…d prasĂłwki", details: e?.message || "unknown" },
      { status: 500 }
    );
  }
}

