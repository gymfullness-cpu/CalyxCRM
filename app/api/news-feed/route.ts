import { NextResponse } from "next/server";
import OpenAI from "openai";
import crypto from "crypto";

export const runtime = "nodejs";

type RawItem = {
  id: string;
  category: "Kredyty" | "Rynek" | "Prawo";
  title: string;
  url: string;
  publishedAt: string | null;
  source: string | null;
  snippet: string | null;
};

type NewsItem = {
  id: string;
  category: "Kredyty" | "Rynek" | "Prawo";
  title: string;
  url: string;
  publishedAt: string | null;
  source: string | null;
  image: string | null;
  summary: string;
  whyItMatters: string;
};

type Top3 = { title: string; why: string; url: string; category: NewsItem["category"] };

type Rates = {
  reference?: { value?: string; date?: string } | null;
  lombard?: { value?: string; date?: string } | null;
  deposit?: { value?: string; date?: string } | null;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/** âś… Cache ostatniej dobrej odpowiedzi (ĹĽeby feed nie znikaĹ‚ przy chwilowych bĹ‚Ä™dach) */
type CachePayload = {
  ok: true;
  generatedAt: string;
  city: string | null;
  rates: Rates | null;
  top3: Top3[];
  items: NewsItem[];
  stale?: boolean;
};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
const FEED_CACHE = new Map<string, { ts: number; payload: CachePayload }>();

function cacheKey(city: string) {
  return (city || "").trim().toLowerCase() || "__all__";
}

function getCached(city: string): CachePayload | null {
  const k = cacheKey(city);
  const x = FEED_CACHE.get(k);
  if (!x) return null;
  if (Date.now() - x.ts > CACHE_TTL_MS) return null;
  return { ...x.payload, stale: true };
}

function setCached(city: string, payload: CachePayload) {
  const k = cacheKey(city);
  FEED_CACHE.set(k, { ts: Date.now(), payload });
}

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

/** âś… Stabilne ID (bez kolizji) */
function makeStableId(category: RawItem["category"], link: string, title: string, pub: string | null) {
  const base = `${category}|${link}|${title}|${pub || ""}`;
  const h = crypto.createHash("sha256").update(base).digest("hex").slice(0, 20);
  return `${category}-${h}`;
}

function parseGoogleNewsRss(xml: string, category: RawItem["category"]): RawItem[] {
  const items: RawItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const it of blocks) {
    const title = pickTag(it, "title");
    const link = pickTag(it, "link");
    const pubDate = pickTag(it, "pubDate") || null;
    const desc = pickTag(it, "description") || null;
    const sourceName = pickTag(it, "source") || null;

    if (!title || !link) continue;

    const id = makeStableId(category, link, title, pubDate);

    items.push({
      id,
      category,
      title,
      url: link,
      publishedAt: pubDate,
      source: sourceName,
      snippet: desc ? desc.slice(0, 320) : null,
    });
  }

  return items;
}

async function fetchText(url: string, revalidateSeconds = 60 * 10) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: revalidateSeconds },
      redirect: "follow",
      signal: ctrl.signal,
    });

    const text = await res.text();
    return { ok: res.ok, status: res.status, text, finalUrl: res.url };
  } finally {
    clearTimeout(t);
  }
}

function pickMeta(html: string, key: string) {
  const re1 = new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i");
  const m1 = html.match(re1);
  if (m1?.[1]) return m1[1].trim();
  const m2 = html.match(re2);
  if (m2?.[1]) return m2[1].trim();
  return null;
}

function pickNameMeta(html: string, name: string) {
  const re1 = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`, "i");
  const m1 = html.match(re1);
  if (m1?.[1]) return m1[1].trim();
  const m2 = html.match(re2);
  if (m2?.[1]) return m2[1].trim();
  return null;
}

/** Podstawowe stopy NBP (prosty parsing strony). */
async function fetchNbpRates(): Promise<Rates | null> {
  const url = "https://nbp.pl/polityka-pieniezna/decyzje-rpp/podstawowe-stopy-procentowe-nbp/";
  const { ok, text } = await fetchText(url, 60 * 60);
  if (!ok) return null;

  const clean = stripHtml(text);

  const grab = (label: string) => {
    const re = new RegExp(`${label}[\\s\\S]{0,140}?([0-9],[0-9]{2})[\\s\\S]{0,140}?(20\\d{2}-\\d{2}-\\d{2})`, "i");
    const m = clean.match(re);
    if (!m) return null;
    return { value: m[1], date: m[2] };
  };

  return {
    reference: grab("Stopa referencyjna"),
    lombard: grab("Stopa lombardowa"),
    deposit: grab("Stopa depozytowa"),
  };
}

async function getRssForQuery(q: string, category: RawItem["category"]) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pl&gl=PL&ceid=PL:pl`;
  const { ok, text } = await fetchText(url, 60 * 10);
  if (!ok) return [];
  return parseGoogleNewsRss(text, category);
}

async function enrichOne(raw: RawItem): Promise<Omit<NewsItem, "summary" | "whyItMatters">> {
  let finalUrl = raw.url;
  let image: string | null = null;
  let source = raw.source;

  try {
    const headCtrl = new AbortController();
    const tt = setTimeout(() => headCtrl.abort(), 10_000);

    try {
      const head = await fetch(raw.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        },
        redirect: "follow",
        next: { revalidate: 60 * 30 },
        signal: headCtrl.signal,
      });

      finalUrl = head.url || raw.url;
    } finally {
      clearTimeout(tt);
    }

    const { ok, text } = await fetchText(finalUrl, 60 * 30);
    if (ok) {
      image = pickMeta(text, "og:image") || pickNameMeta(text, "twitter:image") || null;
      const siteName = pickMeta(text, "og:site_name");
      if (siteName && !source) source = siteName;
    }
  } catch {
    // ignore
  }

  return {
    id: raw.id,
    category: raw.category,
    title: raw.title,
    url: finalUrl,
    publishedAt: raw.publishedAt,
    source: source,
    image,
  };
}

function fallbackSummary(raw: RawItem) {
  const s = raw.snippet ? stripHtml(raw.snippet) : "";
  const base = s ? (s.length > 180 ? s.slice(0, 180) + "â€¦" : s) : "KrĂłtki news z rynku nieruchomoĹ›ci.";
  const why =
    raw.category === "Kredyty"
      ? "WpĹ‚ywa na zdolnoĹ›Ä‡ kredytowÄ… klientĂłw i tempo sprzedaĹĽy."
      : raw.category === "Rynek"
      ? "Pomaga ustawiÄ‡ cenÄ™ i argumenty w rozmowie z klientem."
      : "MoĹĽe zmieniÄ‡ wymagania formalne i ryzyka transakcyjne.";
  return { summary: base, whyItMatters: why };
}

async function aiSummaries(raw: RawItem[], enriched: Omit<NewsItem, "summary" | "whyItMatters">[]) {
  if (!openai) return null;

  const payload = raw.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    snippet: r.snippet || "",
    source: r.source || "",
  }));

  const schema = {
    name: "news_summaries",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              summary: { type: "string" },
              whyItMatters: { type: "string" },
            },
            required: ["id", "summary", "whyItMatters"],
          },
        },
      },
      required: ["items"],
    },
  } as const;

  const prompt = `
JesteĹ› analitykiem rynku nieruchomoĹ›ci w Polsce i doradcÄ… dla agenta.

Dostajesz listÄ™ newsĂłw (nagĹ‚Ăłwki + krĂłtkie zajawki).
Dla KAĹ»DEGO newsa zwrĂłÄ‡:
- summary: 2â€“3 zdania po polsku, konkretnie "co siÄ™ zmieniĹ‚o / co ogĹ‚oszono".
- whyItMatters: 1 zdanie "co to znaczy dla agenta" (sprzedaĹĽ/negocjacje/kredyt/ryzyko).

ZwrĂłÄ‡ JSON zgodny ze schematem. Bez markdown.
`;

  const res = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: [{ type: "input_text", text: prompt }] },
      { role: "user", content: [{ type: "input_text", text: JSON.stringify(payload).slice(0, 24000) }] },
    ],
    text: {
      format: {
        type: "json_schema",
        ...schema,
      },
    },
  });

  try {
    const parsed = JSON.parse(res.output_text || "{}");
    const map = new Map<string, { summary: string; whyItMatters: string }>();
    for (const it of parsed?.items || []) {
      if (it?.id && it?.summary && it?.whyItMatters) map.set(it.id, it);
    }

    const merged: NewsItem[] = enriched.map((e) => {
      const x = map.get(e.id);
      if (!x) {
        const r = raw.find((z) => z.id === e.id);
        const fb = fallbackSummary(r || ({ snippet: "" } as any));
        return { ...e, ...fb };
      }
      return { ...e, summary: x.summary, whyItMatters: x.whyItMatters };
    });

    return merged;
  } catch {
    return null;
  }
}

async function aiTop3(items: NewsItem[]): Promise<Top3[] | null> {
  if (!openai) return null;
  if (!items.length) return [];

  const payload = items.slice(0, 14).map((x) => ({
    title: x.title,
    category: x.category,
    summary: x.summary,
    url: x.url,
    source: x.source || "",
  }));

  const schema = {
    name: "top3_today",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        top3: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              why: { type: "string" },
              url: { type: "string" },
              category: { type: "string" },
            },
            required: ["title", "why", "url", "category"],
          },
        },
      },
      required: ["top3"],
    },
  } as const;

  const prompt = `
Wybierz TOP 3 newsy "na dziĹ›" dla agenta nieruchomoĹ›ci w Polsce.
Kryterium: wpĹ‚yw na sprzedaĹĽ/negocjacje/kredyty/popyt/ryzyko transakcji.

ZwrĂłÄ‡:
- title: krĂłtki tytuĹ‚ (moĹĽe byÄ‡ lekko skrĂłcony)
- why: 1 zdanie: "co to znaczy dla agenta"
- url: link do ĹşrĂłdĹ‚a
- category: Kredyty/Rynek/Prawo

ZwrĂłÄ‡ JSON zgodny ze schematem. Bez markdown.
`;

  const res = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: [{ type: "input_text", text: prompt }] },
      { role: "user", content: [{ type: "input_text", text: JSON.stringify(payload).slice(0, 24000) }] },
    ],
    text: { format: { type: "json_schema", ...schema } },
  });

  try {
    const parsed = JSON.parse(res.output_text || "{}");
    const top3 = Array.isArray(parsed?.top3) ? parsed.top3 : [];
    return top3.slice(0, 3).map((t: any) => ({
      title: String(t.title || "").slice(0, 180),
      why: String(t.why || "").slice(0, 220),
      url: String(t.url || ""),
      category: t.category === "Kredyty" || t.category === "Rynek" || t.category === "Prawo" ? t.category : "Rynek",
    }));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const city = (u.searchParams.get("city") || "").trim();

  try {
    const cityBoost = city ? ` ${city} ` : " ";

    const [k1, r1, p1] = await Promise.all([
      getRssForQuery(`kredyty hipoteczne Polska${cityBoost}stopy procentowe banki`, "Kredyty"),
      getRssForQuery(`rynek nieruchomoĹ›ci Polska${cityBoost}ceny mieszkania sprzedaĹĽ`, "Rynek"),
      getRssForQuery(`ustawa nieruchomoĹ›ci Polska${cityBoost}deweloper uokik regulacje`, "Prawo"),
    ]);

    const rawAll = [...k1.slice(0, 8), ...r1.slice(0, 8), ...p1.slice(0, 8)];

    // deduplikacja po tytule
    const seen = new Set<string>();
    const raw = rawAll.filter((x) => {
      const key = (x.title || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // âś… jeĹ›li Google News nie daĹ‚ nic â€“ nie zwracaj pustki, sprĂłbuj cache
    if (raw.length === 0) {
      const cached = getCached(city);
      if (cached) return NextResponse.json(cached, { status: 200 });
      return NextResponse.json(
        { ok: false, error: "Brak danych z RSS (chwilowo)", details: "Empty RSS" },
        { status: 503 }
      );
    }

    const rates = await fetchNbpRates();

    const limit = 18;
    const rawLimited = raw.slice(0, limit);
    const enriched = await Promise.all(rawLimited.map((r) => enrichOne(r)));

    const ai = await aiSummaries(rawLimited, enriched);

    const final: NewsItem[] = (ai ||
      enriched.map((e) => {
        const r = rawLimited.find((x) => x.id === e.id);
        const fb = fallbackSummary(r || ({ snippet: "" } as any));
        return { ...e, ...fb };
      }))
      .sort((a, b) => {
        const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return db - da;
      });

    const top3 =
      (await aiTop3(final)) ||
      final.slice(0, 3).map((x) => ({
        title: x.title,
        why: x.whyItMatters,
        url: x.url,
        category: x.category,
      }));

    const payload: CachePayload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      city: city || null,
      rates,
      top3,
      items: final,
    };

    // âś… zapisz cache (ostatnia dobra odpowiedĹş)
    setCached(city, payload);

    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    // âś… jak coĹ› padnie, a mamy cache â€“ oddaj cache zamiast pustki (ĹĽeby UI nie migaĹ‚)
    const cached = getCached(city);
    if (cached) return NextResponse.json(cached, { status: 200 });

    return NextResponse.json(
      { ok: false, error: "BĹ‚Ä…d news-feed", details: e?.message || "unknown" },
      { status: 500 }
    );
  }
}

